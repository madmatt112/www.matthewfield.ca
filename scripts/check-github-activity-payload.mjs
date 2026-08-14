#!/usr/bin/env node
/**
 * check-github-activity-payload.mjs
 *
 * The decision half of Req 4's validation gate — G3 in `pnpm gate:github-activity`
 * (design §The gate, §Component 2).
 *
 * It reads the **refreshed payload on disk** and answers one question: may this
 * be committed? Three checks, none of which any inherited pipeline performs:
 *
 *   (a) Req 4.3's decision rule over `evaluate()` from the freshness script;
 *   (b) Req 4.4's record count — exactly `PULL_RANGE_DAYS` records;
 *   (c) Req 4.5's anchor recency — within `ANCHOR_RECENCY_DAYS` of the run date.
 *
 * **Why `evaluate` is imported rather than the script being run (design
 * §Component 2, [v3]).** Req 4.3 says the gate "SHALL run
 * `node scripts/check-github-activity-freshness.mjs` and apply this decision
 * rule". Running it as a command cannot satisfy the second half: that script is
 * contracted never to block and always exits 0
 * (`check-github-activity-freshness.mjs:276`), which is Req 4.3's own stated
 * reason the decision rule exists. Its verdict is only reachable by parsing
 * stdout or by importing the pure core it exports for exactly this purpose
 * (`:119`). **Nothing in that script is modified, re-implemented or re-tuned
 * here (Req 9.5)** — this module classifies its *messages*; it does not
 * re-derive `STALENESS_THRESHOLD_DAYS` or `MIN_COVERAGE_DAYS`, and imports
 * neither.
 *
 * **What this component does NOT detect: gaps and duplicate dates.** Those are
 * `runGithubActivityInvariants`' (`velite.config.ts:569-571`), run as G2 —
 * adding them here would re-implement inherited logic. `INCOMPLETE COVERAGE` is
 * a **span** test upstream, not a gap test. Req 5.1's states are split across
 * the two checks deliberately.
 *
 * **The payload is read from disk, never from `git show HEAD:…`** (Req 4.1's
 * [v4] note): at gate time `content/github-activity.yaml` *is* the new payload,
 * and Req 13.4's seed path has no committed file at all — pointing this at the
 * index would make `FILE ABSENT ⇒ block` fire unconditionally on the one path
 * that exists to break that deadlock.
 *
 * Runnable outside a workflow (Req 4.8):
 *   node scripts/check-github-activity-payload.mjs
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse as yamlParse } from "yaml";
import { CONTENT_REL, evaluate } from "./check-github-activity-freshness.mjs";
import { PULL_RANGE_DAYS } from "./sync-github-activity.mjs";

/**
 * Prefix on every line this script emits.
 *
 * **Reason (design §Cause vocabulary, [v7]):** five things in this spec can
 * write a cause and all five emit `::error::[sync] <cause> <detail>`. The tag
 * is the spec's own prefix rather than this file's name — that is what makes a
 * cause greppable in a run log beside `ci.yml`'s output.
 */
const TAG = "[sync]";

/**
 * The one cause slug available to this component.
 *
 * design §Cause vocabulary scopes `gate-rejected` to **the whole gate step** —
 * G1–G4 and the `$RUNNER_TEMP` copy that ends it — so every blocking outcome
 * here carries it and the *detail* string is what names which check failed.
 */
const CAUSE = "gate-rejected";

/**
 * Maximum distance, in whole UTC days, between the payload's anchor and the
 * run's UTC date (Req 4.5).
 *
 * **Reason (design §Pinned Constants):** two rather than zero because it
 * absorbs a late-running cron crossing midnight, and any API lag, while still
 * catching a frozen year by three orders of magnitude. Declared here exactly
 * once.
 */
export const ANCHOR_RECENCY_DAYS = 2;

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The largest magnitude `new Date(ms)` can represent (ECMA-262 time-value
 * range). Beyond it, `toISOString()` throws `RangeError: Invalid time value`.
 */
const MAX_TIME_VALUE = 8_640_000_000_000_000;

/**
 * A freshness message's **state name**: everything between the leading
 * `[…]` tag and the first colon.
 *
 * **Why the tag must be stripped rather than matched past.** Every string
 * `evaluate` returns is `` `${TAG} <STATE>: …` `` at all ten of its emission
 * sites, so `message.startsWith("FILE ABSENT")` matches *nothing* — and under
 * the fail-closed rule below that would silently make every state blocking,
 * including the two Reqs 4.3 and 5.6 require to warn.
 *
 * **Why up-to-the-first-colon rather than the first whitespace token.** Seven
 * of the nine state names contain spaces — every one except `UNREADABLE` and
 * `STALE` — so a token rule fail-closes `ALL COUNTS ZERO` on the word `ALL`,
 * which is Req 5.6's state, on exactly the genuinely quiet year Req 5.6 exists
 * to protect.
 *
 * The tag is matched structurally (`[…]`) rather than as a literal so a rename
 * upstream degrades to "unrecognised ⇒ block" rather than to silence.
 */
const STATE_NAME = /^\s*\[[^\]]*\]\s*([^:]+):/;

/**
 * Req 4.3's blocking rows. `UNREADABLE` is the unparseable-YAML state at
 * `check-github-activity-freshness.mjs:139`; that script's `UNREADABLE FILE`
 * string lives inside its own `main()` and can never be returned by
 * `evaluate` — if it ever were, it would block as an unrecognised state, which
 * is the same verdict. The gate deliberately does not depend on which of
 * `UNREADABLE` or `UNEXPECTED SHAPE` a malformed file produces: that boundary
 * is unpinned upstream (`check-github-activity-freshness.test.mjs:186`) and
 * both block.
 */
const BLOCKING_STATES = new Set([
  "FILE ABSENT",
  "EMPTY FILE",
  "EMPTY LIST",
  "UNEXPECTED SHAPE",
  "IMPOSSIBLE DATE",
  "INCOMPLETE COVERAGE",
  "UNREADABLE",
]);

/**
 * Req 4.3's two non-blocking rows.
 *
 * `ALL COUNTS ZERO` is Req 5.6: a full-length all-zero payload is not worse
 * data, it is *truer* data, and refusing to write it would keep publishing a
 * heatmap of work that is no longer being done.
 *
 * `STALE` is classified non-blocking here, but check (c) blocks the same
 * payload independently — `STALE` needs an age above 45 days while check (c)
 * blocks above `ANCHOR_RECENCY_DAYS` — so every payload that produces `STALE`
 * also fails the anchor check. Its verdict is therefore observable only in
 * `warnings`, never in `blocked`; `ALL COUNTS ZERO` is the only warn state
 * whose verdict shows up in `blocked`. Anyone who does not know this reaches
 * for `ANCHOR_RECENCY_DAYS`, which Req 4.5 forbids.
 */
const WARNING_STATES = new Set(["ALL COUNTS ZERO", "STALE"]);

/**
 * Midnight-UTC epoch ms for the day containing `ms`. Day granularity keeps the
 * anchor comparison reproducible: "within 2 days" compares whole days.
 *
 * @param {number} ms
 * @returns {number}
 */
function startOfUtcDay(ms) {
  return Math.floor(ms / MS_PER_DAY) * MS_PER_DAY;
}

/**
 * `true` when `nowMs` is a clock this module can do date arithmetic with:
 * finite, and still inside `Date`'s representable range once floored to a UTC
 * day.
 *
 * **Why this exists.** `evaluatePayload` is contracted to *never throw*, but
 * check (c) builds its detail string with `new Date(todayMs).toISOString()`,
 * which raises `RangeError: Invalid time value` for `Infinity`, `NaN` or any
 * magnitude past `MAX_TIME_VALUE`. `main` only ever passes `Date.now()`, so
 * that is unreachable in the workflow — but a throw would replace the named
 * `gate-rejected` cause with a raw Node stack trace, which is precisely the
 * failure mode Req 9.2 forbids on a fail-closed gate.
 *
 * @param {number} ms
 * @returns {boolean}
 */
function isUsableClock(ms) {
  return Number.isFinite(ms) && Math.abs(startOfUtcDay(ms)) <= MAX_TIME_VALUE;
}

/**
 * The day records in `fileContents`, or `null` when the payload is not a list.
 *
 * Checks (b) and (c) need the records themselves, which `evaluate` does not
 * return, so the payload is parsed once more here. This is not a second copy of
 * `evaluate`'s decisions: a payload that fails to parse, or is not a list, has
 * already been classified terminally by (a), and this returns `null` so the
 * arithmetic below is simply skipped.
 *
 * @param {string | null | undefined} fileContents
 * @returns {unknown[] | null}
 */
function parseRecords(fileContents) {
  if (typeof fileContents !== "string") return null;
  let parsed;
  try {
    parsed = yamlParse(fileContents);
  } catch {
    return null;
  }
  return Array.isArray(parsed) ? parsed : null;
}

/**
 * The gate's pure decision core. Clock injected, no I/O, **never throws**.
 *
 * Every blocking outcome carries the single slug `gate-rejected`; the detail
 * string is what distinguishes a short payload from a stale anchor from an
 * unreadable file. `main` concatenates the details into **one** `::error::`
 * line rather than emitting one line per cause.
 *
 * @param {{ fileContents?: string | null, nowMs?: number }} [input]
 * @returns {{ blocked: boolean, causes: { cause: string, detail: string }[], warnings: string[] }}
 */
export function evaluatePayload({ fileContents = null, nowMs = 0 } = {}) {
  /** @type {{ cause: string, detail: string }[]} */
  const causes = [];
  /** @type {string[]} */
  const warnings = [];

  const block = (detail) => causes.push({ cause: CAUSE, detail });

  // A clock that cannot be represented as a `Date` would make check (c)'s
  // detail string throw. Fail closed with a named cause instead, so the
  // "never throws" promise above holds for every input (see `isUsableClock`).
  if (!isUsableClock(nowMs)) {
    block(
      `build clock ${String(nowMs)} is not a usable timestamp; ` +
        `${CONTENT_REL} was not validated.`,
    );
    return { blocked: true, causes, warnings };
  }

  // --- (a) Req 4.3's decision rule over the freshness script's messages ---
  for (const message of evaluate(fileContents, nowMs)) {
    const match = STATE_NAME.exec(message);
    const state = match ? match[1].trim() : null;

    if (state !== null && WARNING_STATES.has(state)) {
      warnings.push(message);
    } else if (state !== null && BLOCKING_STATES.has(state)) {
      block(message);
    } else {
      // Fail closed. A state added upstream that this table has never seen
      // blocks rather than passing unnoticed (design §Component 2).
      block(`unrecognised freshness state, treated as blocking: ${message}`);
    }
  }

  const records = parseRecords(fileContents);

  if (records !== null && records.length > 0) {
    // --- (b) Req 4.4: the record count no inherited check can see ---
    // A 100-record contiguous truncation passes `velite build` with exit 0,
    // because `checkCoverageContiguity` derives its range from the data itself
    // and the freshness floor is 182 days, not 364.
    if (records.length !== PULL_RANGE_DAYS) {
      block(
        `${CONTENT_REL} holds ${records.length} day records, expected exactly ` +
          `${PULL_RANGE_DAYS} (PULL_RANGE_DAYS).`,
      );
    }

    // --- (c) Req 4.5: the anchor is within ANCHOR_RECENCY_DAYS of the run ---
    const dates = records
      .map((r) => (r !== null && typeof r === "object" ? r.date : null))
      .filter((d) => typeof d === "string" && ISO_DATE.test(d));

    if (dates.length > 0) {
      // ISO dates sort lexicographically in chronological order.
      let anchorDate = dates[0];
      for (const date of dates) {
        if (date > anchorDate) anchorDate = date;
      }

      const todayMs = startOfUtcDay(nowMs);
      const ageDays = Math.round((todayMs - Date.parse(`${anchorDate}T00:00:00Z`)) / MS_PER_DAY);

      // Req 4.5 states a *distance*, so a future anchor passes this check and
      // is blocked instead by `evaluate`'s `IMPOSSIBLE DATE`.
      if (Math.abs(ageDays) > ANCHOR_RECENCY_DAYS) {
        block(
          `anchorDate ${anchorDate} in ${CONTENT_REL} is ${Math.abs(ageDays)} days from the ` +
            `run's UTC date ${new Date(todayMs).toISOString().slice(0, 10)}, outside the ` +
            `${ANCHOR_RECENCY_DAYS}-day window (ANCHOR_RECENCY_DAYS).`,
        );
      }
    }
  }

  return { blocked: causes.length > 0, causes, warnings };
}

/**
 * The one emitter, and **total** — it never throws, under any condition.
 *
 * `::error::` goes to stdout **first and unconditionally**, then the run-summary
 * line is attempted **only when `GITHUB_STEP_SUMMARY` is set**:
 * `appendFileSync(undefined, …)` throws `ERR_INVALID_ARG_TYPE`, and an unset
 * variable is the normal case for the bare invocation Req 4.8 mandates.
 *
 * The append is *also* caught, because the variable can be set and the path
 * still unwritable — a directory, a read-only mount. An `appendFileSync` that
 * threw out of here would propagate into the caller and produce a second,
 * contradictory `::error::` line plus a raw Node stack trace, breaking both the
 * "exactly one `::error::` cause per terminating path" rule and Req 9.2's named
 * cause. A summary that cannot be written degrades quietly: stdout is the
 * record Req 9.2 is about, and the summary is the convenience.
 *
 * @param {string} detail one-line diagnostic, never containing a credential
 * @param {NodeJS.ProcessEnv} env
 * @returns {1} the abort exit code, for `return fail(…)` at each call site
 */
function fail(detail, env) {
  console.log(`::error::${TAG} ${CAUSE} ${detail}`);
  if (env.GITHUB_STEP_SUMMARY) {
    try {
      appendFileSync(env.GITHUB_STEP_SUMMARY, `FAILED — ${CAUSE}\n`);
    } catch {
      /* the cause is already on stdout; the summary is not worth a second one */
    }
  }
  return 1;
}

/**
 * CLI entry point. Reads the payload from disk, prints one `::warning::` per
 * non-blocking state and **exactly one** `::error::` line when blocked, and
 * returns the process exit code.
 *
 * @param {string} cwd repo root the payload is resolved against
 * @param {number} nowMs build clock, epoch ms
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {number} `0` when the payload may be committed, `1` when it may not
 */
export function main(cwd, nowMs, env = process.env) {
  const abs = path.join(cwd, CONTENT_REL);

  let fileContents;
  try {
    // `null` is the absent state, which `evaluate` classifies as `FILE ABSENT`.
    fileContents = existsSync(abs) ? readFileSync(abs, "utf8") : null;
  } catch (err) {
    // Present but unreadable (EACCES, EISDIR, EIO) is neither the absent state
    // nor a parse failure, and `evaluatePayload`'s "never throws" is a promise
    // about the pure core, not about the I/O wrapped around it. Req 9.2 needs a
    // named cause here, never an uncaught stack trace.
    const errno = err?.code ?? err?.name ?? "unknown";
    return fail(
      `could not read ${CONTENT_REL}: ${errno} (${err?.message ?? String(err)}). ` +
        `The payload was not validated.`,
      env,
    );
  }

  const { blocked, causes, warnings } = evaluatePayload({ fileContents, nowMs });

  for (const message of warnings) {
    console.log(`::warning::${message}`);
  }

  if (blocked) {
    // One `::error::` line, all blocking details concatenated into its detail
    // string. The exactly-one rule is a property of this script, not of the
    // run: when G3 blocks, the Gate step's own inline emitter fires afterwards
    // and prints a second line naming the same slug. The detail-bearing line
    // comes first.
    return fail(causes.map((c) => c.detail).join(" | "), env);
  }

  console.log(
    `${TAG} gate ok — ${CONTENT_REL} passed the payload checks ` +
      `(${PULL_RANGE_DAYS} records, anchor within ${ANCHOR_RECENCY_DAYS} days).`,
  );
  return 0;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.cwd(), Date.now());
}
