#!/usr/bin/env node
/**
 * check-github-activity-freshness.mjs
 *
 * Advisory CI check for `content/github-activity.yaml` (Req 9).
 *
 * This step is contracted to **never block**: it emits GitHub Actions
 * annotations and **always exits 0** (Req 9.5). A stale or partially covered
 * heatmap is honest-but-limited, and Reqs 7.2/7.3 already disclose it to
 * visitors; turning any of these states into a red build would be wrong.
 *
 * Reads `content/github-activity.yaml` **directly** with the `yaml` package
 * (already imported by `scripts/verify-ci-topology.mjs` and
 * `scripts/check-velite-output.mjs`) rather than `.velite/githubActivity.json`,
 * because `.velite` collapses a missing file and an empty file into the same
 * `[]` and Req 9.7 needs those two states distinct.
 *
 * Seven input states (design §Error Handling), evaluated in this order.
 * Warnings **stack** — there is no early return — except for the three
 * file-level states, which are terminal because no dates exist to check:
 *
 *   1. file absent                                   (terminal)
 *   2. file zero-byte or `null` payload              (terminal)
 *   3. file present but `[]`                         (terminal)
 *   4. records present but every `count` is zero
 *   5. stale — `anchorDate` older than 45 days
 *   6. impossible — `anchorDate` ahead of the build clock
 *   7. incomplete coverage — `anchorDate − dataStart + 1 < 182`
 *
 * Each emits a distinct message naming the state (Req 9.7).
 *
 * **Two of the seven are unreachable in CI at any position.** Velite runs at
 * `postinstall` (`ci.yml:26-27`, the first substantive step) and rejects both
 * an impossible date (Req 1.3's schema bound) and a zero-byte/`null` payload
 * (the loader's envelope error) before this script can ever run. They are
 * implemented and tested anyway because the script is also run by hand and
 * because Req 1.3's bound could later be relaxed — the design says so plainly
 * rather than claiming CI exercises them.
 *
 * If the file has not been seeded yet, the absent / `[]` branch is the live
 * one and warning on it is correct behaviour, not a false positive.
 *
 * Output format (Req 9.6): a **bare** `::warning::<message>` line on stdout,
 * one per applicable state — no `file=`/`line=` parameters, since there is no
 * source position to point at. Matches `scripts/check-vercel-auto-deploy.mjs`
 * and `scripts/warn-no-pagefind.mjs`.
 *
 * The pure core `evaluate(fileContents | null, nowMs)` is exported so the
 * colocated self-test (Req 9.8) can drive every state against a pinned clock
 * without touching the real content file.
 *
 * CLI:
 *   node scripts/check-github-activity-freshness.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse as yamlParse } from "yaml";

const TAG = "[check-github-activity-freshness]";

/** Content file this script inspects, relative to the repo root. */
export const CONTENT_REL = "content/github-activity.yaml";

/**
 * Staleness threshold in days. Pinned by Req 9.4 and documented by Req 10.1 —
 * this is a contract, not a tunable.
 */
export const STALENESS_THRESHOLD_DAYS = 45;

/**
 * Minimum covered span, in days, for the 26-week frame.
 *
 * This is a **span** rule, so it needs no `windowEnd`, no Saturday alignment
 * and no second copy of the window arithmetic that `src/lib/github-activity.ts`
 * already owns. `windowStart = anchorDate + k − 181` for `k ∈ [0,6]` (the
 * anchor's distance to the following Saturday), so `dataStart > windowStart`
 * ⟺ `span < 182 − k`. Testing `span < 182` therefore has **no false
 * negatives** and over-warns on at most `k` span values — six at a Sunday
 * anchor, zero at a Saturday. Over-warning only, never silence.
 */
export const MIN_COVERAGE_DAYS = 182;

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Midnight-UTC epoch ms for an ISO `YYYY-MM-DD` date, or NaN if unparseable.
 *
 * @param {string} iso
 * @returns {number}
 */
function isoToUtcMs(iso) {
  if (typeof iso !== "string" || !ISO_DATE.test(iso)) return NaN;
  return Date.parse(`${iso}T00:00:00Z`);
}

/**
 * Midnight-UTC epoch ms for the day containing `ms`. Day granularity keeps
 * both clock checks reproducible: "older than 45 days" and "ahead of the build
 * clock" compare whole days, not partial ones.
 *
 * @param {number} ms
 * @returns {number}
 */
function startOfUtcDay(ms) {
  return Math.floor(ms / MS_PER_DAY) * MS_PER_DAY;
}

/**
 * Pure core. Returns an ordered list of warning message strings — empty when
 * the file is fresh, complete and non-degenerate. Never throws.
 *
 * @param {string | null | undefined} fileContents raw YAML text, or `null` when the file is absent
 * @param {number} nowMs build clock, epoch ms
 * @returns {string[]}
 */
export function evaluate(fileContents, nowMs) {
  // --- State 1: file absent (terminal) ---
  // Correct-but-noisy for the one commit before seeding; after seeding it is
  // the only detector of a silent deletion (Req 9.7).
  if (fileContents === null || fileContents === undefined) {
    return [
      `${TAG} FILE ABSENT: ${CONTENT_REL} does not exist. The GitHub activity ` +
        `section will not render. If it was previously seeded, it has been deleted.`,
    ];
  }

  let parsed;
  try {
    parsed = yamlParse(fileContents);
  } catch (err) {
    // Not one of the seven states: malformed YAML is a hard build failure at
    // the loader (Req 11.1), and Velite runs at postinstall, so CI can never
    // reach this branch. It exists only so a hand run cannot throw and break
    // the always-exit-0 contract.
    return [
      `${TAG} UNREADABLE: ${CONTENT_REL} is not parseable YAML ` +
        `(${err && err.message ? err.message : String(err)}). The build will fail at the loader.`,
    ];
  }

  // --- State 2: zero-byte or `null` payload (terminal) ---
  // Unreachable in CI: the loader's envelope error rejects it at postinstall.
  // Kept because the script is also run by hand, and because an uncaught throw
  // here would turn a Req 9.5 soft failure into a red build.
  if (parsed === null || parsed === undefined) {
    return [
      `${TAG} EMPTY FILE: ${CONTENT_REL} is zero-byte or parses to null. ` +
        `No day records to check.`,
    ];
  }

  if (!Array.isArray(parsed)) {
    // Also outside the seven states, and also a loader failure at postinstall.
    return [
      `${TAG} UNEXPECTED SHAPE: ${CONTENT_REL} is not a list of day records. ` +
        `The build will fail at the loader.`,
    ];
  }

  // --- State 3: file present but `[]` (terminal) ---
  // Reachable by an ordinary merge resolution, and cheaper to reach than
  // deletion — Reqs 1.9, 3.8 and 2.10 all report it healthy (Req 9.7).
  if (parsed.length === 0) {
    return [
      `${TAG} EMPTY LIST: ${CONTENT_REL} holds \`[]\` — no day records. ` +
        `The GitHub activity section will not render.`,
    ];
  }

  const usable = parsed.every(
    (r) =>
      r !== null &&
      typeof r === "object" &&
      !Array.isArray(r) &&
      ISO_DATE.test(r.date) &&
      Number.isFinite(r.count),
  );
  if (!usable) {
    return [
      `${TAG} UNEXPECTED SHAPE: ${CONTENT_REL} contains entries that are not ` +
        `\`{ date: YYYY-MM-DD, count: <number> }\`. The build will fail at the schema.`,
    ];
  }

  // ISO dates sort lexicographically in chronological order.
  let anchorDate = parsed[0].date;
  let dataStart = parsed[0].date;
  for (const { date } of parsed) {
    if (date > anchorDate) anchorDate = date;
    if (date < dataStart) dataStart = date;
  }

  const warnings = [];

  // --- State 4: every count zero --- (stacks)
  // Reachable from a mis-parameterised refresh query (Req 9.7).
  if (parsed.every((r) => r.count === 0)) {
    warnings.push(
      `${TAG} ALL COUNTS ZERO: every one of ${parsed.length} day records in ` +
        `${CONTENT_REL} has \`count: 0\`. The grid will render empty — check the refresh query.`,
    );
  }

  const todayMs = startOfUtcDay(nowMs);
  const anchorMs = isoToUtcMs(anchorDate);
  const dataStartMs = isoToUtcMs(dataStart);
  const ageDays = Math.round((todayMs - anchorMs) / MS_PER_DAY);

  // --- State 5: stale --- (stacks)
  if (ageDays > STALENESS_THRESHOLD_DAYS) {
    warnings.push(
      `${TAG} STALE: anchorDate ${anchorDate} in ${CONTENT_REL} is ${ageDays} days old, ` +
        `past the ${STALENESS_THRESHOLD_DAYS}-day threshold. Refresh the file.`,
    );
  }

  // --- State 6: impossible --- (stacks)
  // Unreachable in CI: Req 1.3's schema bound rejects a future date at
  // postinstall. Kept as the backstop if that bound is ever relaxed.
  if (ageDays < 0) {
    warnings.push(
      `${TAG} IMPOSSIBLE DATE: anchorDate ${anchorDate} in ${CONTENT_REL} is ahead of ` +
        `the build clock (${new Date(todayMs).toISOString().slice(0, 10)}).`,
    );
  }

  // --- State 7: incomplete coverage --- (stacks)
  const spanDays = Math.round((anchorMs - dataStartMs) / MS_PER_DAY) + 1;
  if (spanDays < MIN_COVERAGE_DAYS) {
    warnings.push(
      `${TAG} INCOMPLETE COVERAGE: ${CONTENT_REL} spans ${spanDays} days ` +
        `(${dataStart} → ${anchorDate}), fewer than the ${MIN_COVERAGE_DAYS} days the ` +
        `26-week frame needs. The published range will be shorter than the grid.`,
    );
  }

  return warnings;
}

/**
 * CLI entry point. Reads the file, calls `evaluate`, prints bare `::warning::`
 * lines, and **always exits 0**.
 *
 * @param {string} cwd
 */
export function main(cwd) {
  let warnings;

  try {
    const abs = path.join(cwd, CONTENT_REL);
    const contents = existsSync(abs) ? readFileSync(abs, "utf8") : null;
    warnings = evaluate(contents, Date.now());
  } catch (err) {
    // readFileSync can still throw (EACCES, EISDIR, …) — the file is present
    // but unreadable, which is *not* the absent state and must not fall
    // through to the "ok" line. This step is contracted never to block
    // (Req 9.5), so warn and still exit 0.
    process.stderr.write(`${TAG} could not read ${CONTENT_REL}: ${err.message}\n`);
    warnings = [
      `${TAG} UNREADABLE FILE: ${CONTENT_REL} exists but could not be read ` +
        `(${err && err.message ? err.message : String(err)}). Freshness and coverage were not checked.`,
    ];
  }

  for (const message of warnings) {
    console.log(`::warning::${message}`);
  }

  if (warnings.length === 0) {
    console.log(`${TAG} ok — ${CONTENT_REL} is present, fresh and covers the frame.`);
  }

  process.exit(0);
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.cwd());
}
