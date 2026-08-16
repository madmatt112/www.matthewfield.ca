/**
 * check-github-activity-payload.test.mjs
 *
 * Req 4.9's self-test for `scripts/check-github-activity-payload.mjs` — the
 * gate's decision logic. Runs via `node --test` and is wired as its own CI
 * step, because Req 4.9 asks for a test that is *executed*, not merely present.
 *
 * Vitest's include pattern targets `src/**`, so this file lives outside
 * Vitest's scope on purpose — invoke with
 * `node --test scripts/check-github-activity-payload.test.mjs`.
 *
 * Every case drives `evaluatePayload({ fileContents, nowMs })` against a
 * **pinned clock** and a synthetic YAML string. Nothing here reads
 * `content/github-activity.yaml` and nothing reads the real clock, so no case
 * rots as the real file ages.
 *
 * Why this file matters more than its size suggests: the gate is the one place
 * where a wrong classification ships bad data to the default branch with every
 * signal green. A state misfiled from "block" to "warn" produces a green run
 * and a broken production build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { evaluate, CONTENT_REL } from "./check-github-activity-freshness.mjs";
import { PULL_RANGE_DAYS } from "./sync-github-activity.mjs";
import { evaluatePayload, ANCHOR_RECENCY_DAYS } from "./check-github-activity-payload.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAYLOAD_URL = pathToFileURL(path.join(__dirname, "check-github-activity-payload.mjs")).href;
const FRESHNESS_URL = pathToFileURL(
  path.join(__dirname, "check-github-activity-freshness.mjs"),
).href;

const MS_PER_DAY = 86_400_000;

/** Pinned build clock: 2026-08-10T00:00:00Z. Matches the freshness self-test. */
const NOW = Date.UTC(2026, 7, 10);

/** @param {number} ms */
function iso(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * A contiguous run of `days` records ending on `endMs` (inclusive), in the same
 * shape as the real content file. Same helper as the freshness self-test.
 *
 * @param {number} endMs
 * @param {number} days
 * @param {(i: number) => number} [countFn]
 * @returns {string}
 */
function series(endMs, days, countFn = (i) => i % 5) {
  const lines = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    lines.push(`- date: "${iso(endMs - i * MS_PER_DAY)}"`, `  count: ${countFn(days - 1 - i)}`);
  }
  return `${lines.join("\n")}\n`;
}

/**
 * @param {string | null} fileContents
 * @param {number} [nowMs]
 */
function gate(fileContents, nowMs = NOW) {
  return evaluatePayload({ fileContents, nowMs });
}

/** @param {{ causes: { cause: string, detail: string }[] }} result */
function details(result) {
  return result.causes.map((c) => c.detail);
}

/** A payload that passes every check: full length, anchored on the clock day. */
const HEALTHY = series(NOW, PULL_RANGE_DAYS);

// ---------------------------------------------------------------------------
// Req 4.3's table, exhaustively.
//
// One row per state `evaluate` can emit — all nine, enumerated rather than
// sampled. `verdict` is the row's expected classification: `"block"` puts the
// message in `causes`, `"warn"` puts it in `warnings`. Flipping any row's
// `verdict` must fail the suite.
// ---------------------------------------------------------------------------

/**
 * @type {{ state: string, verdict: "block" | "warn", yaml: string | null, match: RegExp }[]}
 */
const ROWS = [
  { state: "FILE ABSENT", verdict: "block", yaml: null, match: /FILE ABSENT/ },
  { state: "EMPTY FILE", verdict: "block", yaml: "", match: /EMPTY FILE/ },
  { state: "EMPTY LIST", verdict: "block", yaml: "[]\n", match: /EMPTY LIST/ },
  {
    state: "UNEXPECTED SHAPE",
    verdict: "block",
    yaml: "total: 2003\n",
    match: /UNEXPECTED SHAPE/,
  },
  {
    // Which of the two a malformed file produces is unpinned upstream
    // (`check-github-activity-freshness.test.mjs:186` asserts only the same
    // alternation), so this row asserts the verdict the two share rather than
    // pinning a boundary this gate deliberately does not depend on.
    state: "UNREADABLE",
    verdict: "block",
    yaml: "- date: [unclosed\n",
    match: /UNREADABLE|UNEXPECTED SHAPE/,
  },
  {
    state: "IMPOSSIBLE DATE",
    verdict: "block",
    yaml: series(NOW + MS_PER_DAY, PULL_RANGE_DAYS),
    match: /IMPOSSIBLE DATE/,
  },
  {
    state: "INCOMPLETE COVERAGE",
    verdict: "block",
    yaml: series(NOW, 100),
    match: /INCOMPLETE COVERAGE/,
  },
  {
    // Req 5.6: a full-length all-zero payload is truer data, not worse data.
    state: "ALL COUNTS ZERO",
    verdict: "warn",
    yaml: series(NOW, PULL_RANGE_DAYS, () => 0),
    match: /ALL COUNTS ZERO/,
  },
  {
    // Non-blocking here; check (c) blocks the same payload independently.
    state: "STALE",
    verdict: "warn",
    yaml: series(NOW - 60 * MS_PER_DAY, PULL_RANGE_DAYS),
    match: /STALE/,
  },
];

for (const row of ROWS) {
  test(`Req 4.3 — ${row.state} ⇒ ${row.verdict}`, () => {
    const result = gate(row.yaml);
    const blocking = details(result).filter((d) => row.match.test(d));
    const warning = result.warnings.filter((w) => row.match.test(w));

    if (row.verdict === "block") {
      assert.equal(
        blocking.length,
        1,
        `expected ${row.state} among causes, got: ${details(result).join(" | ")}`,
      );
      assert.equal(warning.length, 0, `${row.state} must not be a warning`);
      assert.equal(result.blocked, true);
    } else {
      assert.equal(
        warning.length,
        1,
        `expected ${row.state} among warnings, got: ${result.warnings.join(" | ")}`,
      );
      assert.equal(blocking.length, 0, `${row.state} must not be a blocking cause`);
    }
  });
}

test("Req 4.3's table is exhaustive — nine distinct states, one row each", () => {
  assert.equal(ROWS.length, 9);
  assert.equal(new Set(ROWS.map((r) => r.state)).size, 9);

  // Each row's fixture really does drive the state it claims, through the real
  // `evaluate` — no row is asserting against a message the script cannot emit.
  const emitted = ROWS.map((r) => evaluate(r.yaml, NOW));
  for (const [i, messages] of emitted.entries()) {
    assert.ok(
      messages.some((m) => ROWS[i].match.test(m)),
      `${ROWS[i].state}: evaluate() emitted ${messages.join(" | ")}`,
    );
  }

  // ... and the nine fixtures produce nine distinct messages, so no two rows
  // are testing the same string.
  assert.equal(new Set(emitted.map((m) => m[0])).size, 9);
});

test("every blocking outcome carries the single `gate-rejected` slug", () => {
  for (const row of ROWS) {
    for (const cause of gate(row.yaml).causes) {
      assert.equal(cause.cause, "gate-rejected", `${row.state}: ${cause.detail}`);
    }
  }
});

// ---------------------------------------------------------------------------
// The two warn rows, driven end-to-end from real `evaluate` output.
//
// Asserting *string identity* with what `evaluate` returned is what exercises
// the TAG prefix end to end: the classifier only reaches `WARNING_STATES` if it
// strips `[check-github-activity-freshness] ` first. A shared misreading of the
// prefix between this file and the classifier cannot pass, because this file
// never writes the message.
// ---------------------------------------------------------------------------

test("ALL COUNTS ZERO — the exact string evaluate() returns lands in warnings, and does not block", () => {
  const yaml = series(NOW, PULL_RANGE_DAYS, () => 0);
  const emitted = evaluate(yaml, NOW);
  assert.equal(emitted.length, 1, `unexpected extra messages: ${emitted.join(" | ")}`);
  assert.match(emitted[0], /ALL COUNTS ZERO/);

  const result = gate(yaml);
  assert.deepEqual(result.causes, [], `unexpected causes: ${details(result).join(" | ")}`);
  assert.equal(result.blocked, false);
  // String identity, not a regex: the classifier passed the message through
  // untouched, which it can only do having parsed the tag correctly.
  assert.deepEqual(result.warnings, emitted);
});

test("STALE — warns on the exact evaluate() string, while check (c) blocks the same payload", () => {
  const yaml = series(NOW - 60 * MS_PER_DAY, PULL_RANGE_DAYS);
  const emitted = evaluate(yaml, NOW);
  assert.equal(emitted.length, 1, `unexpected extra messages: ${emitted.join(" | ")}`);
  assert.match(emitted[0], /STALE/);

  const result = gate(yaml);
  assert.deepEqual(result.warnings, emitted);

  // STALE's own verdict is `warn`, but the payload is still blocked — by the
  // anchor-recency check, which fires above 2 days where STALE needs 45. That
  // is why STALE's classification is observable only in `warnings`: flipping it
  // to blocking would not change `blocked` for any payload that can reach it.
  assert.equal(result.blocked, true);
  assert.equal(result.causes.length, 1, details(result).join(" | "));
  assert.match(result.causes[0].detail, /ANCHOR_RECENCY_DAYS/);
  assert.doesNotMatch(result.causes[0].detail, /STALE/);
});

// ---------------------------------------------------------------------------
// Fail-closed: a state this table has never seen.
//
// `evaluate` cannot emit an unrecognised state today — all ten of its emission
// sites are in the table — so the branch is reached by stubbing the freshness
// module for one dynamic import, using `node:module`'s synchronous hooks. No
// new dependency, and the real module the rest of this file imports is
// untouched.
// ---------------------------------------------------------------------------

const STUB_MESSAGES = [
  // A future upstream state, correctly shaped: tag, name, colon.
  "[check-github-activity-freshness] BRAND NEW STATE: something upstream started reporting.",
  // A message with no tag and no colon at all.
  "not a freshness message",
];

/** Imports the payload module with `evaluate` replaced by a stub. */
async function importWithStubbedEvaluate() {
  const stubUrl = `${FRESHNESS_URL}?stub`;
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      const resolved = nextResolve(specifier, context);
      if (context.parentURL === `${PAYLOAD_URL}?stub` && resolved.url === FRESHNESS_URL) {
        return { ...resolved, url: stubUrl, shortCircuit: true };
      }
      return resolved;
    },
    load(url, context, nextLoad) {
      if (url === stubUrl) {
        return {
          format: "module",
          shortCircuit: true,
          source:
            `export const CONTENT_REL = ${JSON.stringify(CONTENT_REL)};\n` +
            `export function evaluate() { return ${JSON.stringify(STUB_MESSAGES)}; }\n`,
        };
      }
      return nextLoad(url, context);
    },
  });
  try {
    return await import(`${PAYLOAD_URL}?stub`);
  } finally {
    hooks.deregister();
  }
}

test("an unrecognised freshness state blocks, and says why", async () => {
  const stubbed = await importWithStubbedEvaluate();
  const result = stubbed.evaluatePayload({ fileContents: null, nowMs: NOW });

  assert.equal(result.blocked, true);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.causes.length, STUB_MESSAGES.length);
  for (const [i, cause] of result.causes.entries()) {
    assert.equal(cause.cause, "gate-rejected");
    assert.match(cause.detail, /unrecognised freshness state, treated as blocking/);
    assert.ok(cause.detail.includes(STUB_MESSAGES[i]), cause.detail);
  }
});

// ---------------------------------------------------------------------------
// Req 4.4 — the record count no inherited check can see.
// ---------------------------------------------------------------------------

test(`Req 4.4 — exactly ${PULL_RANGE_DAYS} records passes`, () => {
  const result = gate(HEALTHY);
  assert.deepEqual(result.causes, [], details(result).join(" | "));
  assert.deepEqual(result.warnings, []);
  assert.equal(result.blocked, false);
});

for (const count of [PULL_RANGE_DAYS - 1, PULL_RANGE_DAYS + 1]) {
  test(`Req 4.4 — ${count} records blocks`, () => {
    const result = gate(series(NOW, count));
    assert.equal(result.blocked, true);
    assert.equal(result.causes.length, 1, details(result).join(" | "));
    assert.ok(result.causes[0].detail.includes(`${count} day records`), result.causes[0].detail);
    assert.ok(result.causes[0].detail.includes(String(PULL_RANGE_DAYS)));
    assert.ok(result.causes[0].detail.includes(CONTENT_REL));
  });
}

// ---------------------------------------------------------------------------
// Req 4.5 — anchor recency, against the pinned clock.
//
// Req 4.5 states a *distance*, so the four offsets do not test one mechanism.
// −3 is outside the window and blocks on anchor recency; −2 and 0 are inside it
// and pass; **+1 passes the anchor check** — its distance is 1 — and is blocked
// instead by `evaluate`'s IMPOSSIBLE DATE. Anyone who reads Req 4.5 as "not in
// the future" reaches for ANCHOR_RECENCY_DAYS to catch +1, which is exactly the
// change these four cases exist to fail.
// ---------------------------------------------------------------------------

test("Req 4.5 — an anchor 3 days before the clock blocks on anchor recency", () => {
  const result = gate(series(NOW - 3 * MS_PER_DAY, PULL_RANGE_DAYS));
  assert.equal(result.blocked, true);
  assert.equal(result.causes.length, 1, details(result).join(" | "));
  assert.match(result.causes[0].detail, /is 3 days from the run's UTC date/);
  assert.ok(result.causes[0].detail.includes(String(ANCHOR_RECENCY_DAYS)));
  assert.ok(result.causes[0].detail.includes(iso(NOW)));
});

for (const offsetDays of [-2, 0]) {
  test(`Req 4.5 — an anchor ${offsetDays} days from the clock passes`, () => {
    const result = gate(series(NOW + offsetDays * MS_PER_DAY, PULL_RANGE_DAYS));
    assert.deepEqual(result.causes, [], details(result).join(" | "));
    assert.deepEqual(result.warnings, []);
    assert.equal(result.blocked, false);
  });
}

test("Req 4.5 — an anchor 1 day ahead passes the anchor check and blocks as IMPOSSIBLE DATE", () => {
  const result = gate(series(NOW + MS_PER_DAY, PULL_RANGE_DAYS));
  assert.equal(result.blocked, true);
  assert.equal(result.causes.length, 1, details(result).join(" | "));
  assert.match(result.causes[0].detail, /IMPOSSIBLE DATE/);
  // The distinguishing assertion: the anchor-recency check did *not* fire.
  assert.doesNotMatch(result.causes[0].detail, /ANCHOR_RECENCY_DAYS/);
});

test("Req 4.5 — the window boundary is a distance: ±2 passes, ±3 blocks", () => {
  for (const offsetDays of [-ANCHOR_RECENCY_DAYS, ANCHOR_RECENCY_DAYS]) {
    const detail = details(gate(series(NOW + offsetDays * MS_PER_DAY, PULL_RANGE_DAYS)));
    assert.equal(detail.filter((d) => /ANCHOR_RECENCY_DAYS/.test(d)).length, 0, detail.join(" | "));
  }
  for (const offsetDays of [-(ANCHOR_RECENCY_DAYS + 1), ANCHOR_RECENCY_DAYS + 1]) {
    const detail = details(gate(series(NOW + offsetDays * MS_PER_DAY, PULL_RANGE_DAYS)));
    assert.equal(detail.filter((d) => /ANCHOR_RECENCY_DAYS/.test(d)).length, 1, detail.join(" | "));
  }
});

// ---------------------------------------------------------------------------
// "Never throws" — the promise the whole fail-closed design rests on.
// ---------------------------------------------------------------------------

test("a clock that is not a usable timestamp blocks rather than throwing", () => {
  const unusable = [
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NaN,
    9e15,
    -9e15,
    8.64e15 + MS_PER_DAY,
  ];
  for (const nowMs of unusable) {
    const result = evaluatePayload({ fileContents: HEALTHY, nowMs });
    assert.equal(result.blocked, true, `nowMs ${nowMs} should block`);
    assert.equal(result.causes.length, 1, details(result).join(" | "));
    assert.equal(result.causes[0].cause, "gate-rejected");
    assert.match(result.causes[0].detail, /build clock .* is not a usable timestamp/);
    assert.deepEqual(result.warnings, []);
  }
});

test("the extremes of the representable clock range are still evaluated, not rejected", () => {
  for (const nowMs of [8.64e15, -8.64e15]) {
    const result = evaluatePayload({ fileContents: HEALTHY, nowMs });
    assert.equal(details(result).filter((d) => /usable timestamp/.test(d)).length, 0);
  }
});

test("no argument at all returns a normal blocking result", () => {
  const result = evaluatePayload();
  assert.equal(result.blocked, true);
  assert.match(result.causes[0].detail, /FILE ABSENT/);
  assert.deepEqual(result.warnings, []);
});
