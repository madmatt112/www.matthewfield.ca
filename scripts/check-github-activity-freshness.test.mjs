/**
 * check-github-activity-freshness.test.mjs
 *
 * Self-tests for scripts/check-github-activity-freshness.mjs. Runs via
 * `node --test` and is wired as its own CI step (Req 9.8), so the criterion
 * does not mandate shelfware.
 *
 * Vitest's include pattern targets `src/**`, so this file lives outside
 * Vitest's scope on purpose — invoke with
 * `node --test scripts/check-github-activity-freshness.test.mjs`.
 *
 * Every case drives `evaluate()` against a **pinned clock** and a synthetic
 * YAML string, so no test depends on `content/github-activity.yaml` and none
 * of them rots as the real file ages.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import {
  evaluate,
  CONTENT_REL,
  STALENESS_THRESHOLD_DAYS,
  MIN_COVERAGE_DAYS,
} from "./check-github-activity-freshness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "check-github-activity-freshness.mjs");

const MS_PER_DAY = 86_400_000;

/** Pinned build clock: 2026-08-10T00:00:00Z. */
const NOW = Date.UTC(2026, 7, 10);

/** @param {number} ms */
function iso(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * A contiguous run of `days` records ending on `endMs` (inclusive).
 *
 * @param {number} endMs
 * @param {number} days
 * @param {(i: number) => number} [countFn]
 * @returns {string} YAML text in the same shape as the real content file
 */
function series(endMs, days, countFn = (i) => i % 5) {
  const lines = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    lines.push(`- date: "${iso(endMs - i * MS_PER_DAY)}"`, `  count: ${countFn(days - 1 - i)}`);
  }
  return `${lines.join("\n")}\n`;
}

// --- The seven input states ---

test("state 1 — file absent → one terminal FILE ABSENT warning", () => {
  const warnings = evaluate(null, NOW);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /FILE ABSENT/);
  assert.ok(warnings[0].includes(CONTENT_REL));
});

test("state 2 — zero-byte file → one terminal EMPTY FILE warning", () => {
  const warnings = evaluate("", NOW);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /EMPTY FILE/);
});

test("state 2 — explicit `null` payload → same terminal EMPTY FILE warning", () => {
  assert.deepEqual(evaluate("null\n", NOW), evaluate("", NOW));
});

test("state 3 — file present but `[]` → one terminal EMPTY LIST warning", () => {
  const warnings = evaluate("[]\n", NOW);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /EMPTY LIST/);
});

test("state 4 — records present but every count is zero → ALL COUNTS ZERO", () => {
  const warnings = evaluate(
    series(NOW, 200, () => 0),
    NOW,
  );
  assert.equal(warnings.length, 1, `unexpected extra warnings: ${warnings.join(" | ")}`);
  assert.match(warnings[0], /ALL COUNTS ZERO/);
});

test("state 5 — anchorDate older than 45 days → STALE", () => {
  const warnings = evaluate(series(NOW - 60 * MS_PER_DAY, 200), NOW);
  assert.equal(warnings.length, 1, `unexpected extra warnings: ${warnings.join(" | ")}`);
  assert.match(warnings[0], /STALE/);
  assert.ok(warnings[0].includes("60 days old"));
  assert.ok(warnings[0].includes(String(STALENESS_THRESHOLD_DAYS)));
});

test("state 6 — anchorDate ahead of the build clock → IMPOSSIBLE DATE", () => {
  const warnings = evaluate(series(NOW + MS_PER_DAY, 200), NOW);
  assert.equal(warnings.length, 1, `unexpected extra warnings: ${warnings.join(" | ")}`);
  assert.match(warnings[0], /IMPOSSIBLE DATE/);
});

test("state 7 — span shorter than 182 days → INCOMPLETE COVERAGE", () => {
  const warnings = evaluate(series(NOW, 100), NOW);
  assert.equal(warnings.length, 1, `unexpected extra warnings: ${warnings.join(" | ")}`);
  assert.match(warnings[0], /INCOMPLETE COVERAGE/);
  assert.ok(warnings[0].includes("100 days"));
});

test("healthy file — fresh, covering, non-degenerate → no warnings", () => {
  assert.deepEqual(evaluate(series(NOW, 200), NOW), []);
});

test("the seven state messages are distinct and name their state", () => {
  const messages = [
    evaluate(null, NOW)[0],
    evaluate("", NOW)[0],
    evaluate("[]\n", NOW)[0],
    evaluate(
      series(NOW, 200, () => 0),
      NOW,
    )[0],
    evaluate(series(NOW - 60 * MS_PER_DAY, 200), NOW)[0],
    evaluate(series(NOW + MS_PER_DAY, 200), NOW)[0],
    evaluate(series(NOW, 100), NOW)[0],
  ];
  assert.equal(new Set(messages).size, 7, `messages not distinct: ${messages.join("\n")}`);
});

// --- Stacking: no early return past the terminal file-level states ---

test("stacking — simultaneously stale and under-covering emits both, in order", () => {
  const warnings = evaluate(series(NOW - 60 * MS_PER_DAY, 100), NOW);
  assert.equal(warnings.length, 2, `got: ${warnings.join(" | ")}`);
  assert.match(warnings[0], /STALE/);
  assert.match(warnings[1], /INCOMPLETE COVERAGE/);
});

test("stacking — all-zero + stale + under-covering emits all three, in order", () => {
  const warnings = evaluate(
    series(NOW - 60 * MS_PER_DAY, 100, () => 0),
    NOW,
  );
  assert.equal(warnings.length, 3, `got: ${warnings.join(" | ")}`);
  assert.match(warnings[0], /ALL COUNTS ZERO/);
  assert.match(warnings[1], /STALE/);
  assert.match(warnings[2], /INCOMPLETE COVERAGE/);
});

test("terminal states do not stack — `[]` never reaches the date checks", () => {
  assert.equal(evaluate("[]\n", NOW).length, 1);
  assert.equal(evaluate("", NOW).length, 1);
  assert.equal(evaluate(null, NOW).length, 1);
});

// --- Thresholds ---

test("staleness threshold — exactly 45 days is not stale, 46 is", () => {
  const at45 = evaluate(series(NOW - STALENESS_THRESHOLD_DAYS * MS_PER_DAY, 200), NOW);
  assert.deepEqual(at45, []);
  const at46 = evaluate(series(NOW - (STALENESS_THRESHOLD_DAYS + 1) * MS_PER_DAY, 200), NOW);
  assert.equal(at46.length, 1);
  assert.match(at46[0], /STALE/);
});

test("anchorDate equal to the build-clock day is neither stale nor impossible", () => {
  assert.deepEqual(evaluate(series(NOW, 200), NOW), []);
});

test("coverage threshold — a span of exactly 182 days passes, 181 warns", () => {
  assert.deepEqual(evaluate(series(NOW, MIN_COVERAGE_DAYS), NOW), []);
  const short = evaluate(series(NOW, MIN_COVERAGE_DAYS - 1), NOW);
  assert.equal(short.length, 1);
  assert.match(short[0], /INCOMPLETE COVERAGE/);
});

// --- Defensive branches: outside the seven, kept so nothing can throw ---

test("malformed YAML → one warning, no throw", () => {
  const warnings = evaluate("- date: [unclosed\n", NOW);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /UNREADABLE|UNEXPECTED SHAPE/);
});

test("payload that is not a list of day records → one warning, no throw", () => {
  assert.match(evaluate("total: 2003\n", NOW)[0], /UNEXPECTED SHAPE/);
  assert.match(evaluate('- date: "not-a-date"\n  count: 1\n', NOW)[0], /UNEXPECTED SHAPE/);
});

// --- CLI: the always-exit-0 contract ---

function makeTmp() {
  const dir = mkdtempSync(path.join(tmpdir(), "check-github-activity-freshness-"));
  mkdirSync(path.join(dir, "content"), { recursive: true });
  return dir;
}

/** @param {string} cwd */
function runScript(cwd) {
  return spawnSync(process.execPath, [SCRIPT], { cwd, encoding: "utf8" });
}

/**
 * @param {string | null} contents
 * @param {(r: { status: number | null, stdout: string, stderr: string }) => void} assertions
 */
function withFile(contents, assertions) {
  const dir = makeTmp();
  try {
    if (contents !== null) writeFileSync(path.join(dir, CONTENT_REL), contents);
    assertions(runScript(dir));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("CLI — absent file → exit 0, bare ::warning:: naming the state", () => {
  withFile(null, (r) => {
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /^::warning::.*FILE ABSENT/m);
    // Bare annotation: no file=/line= parameters (Req 9.6).
    assert.doesNotMatch(r.stdout, /::warning file=/);
  });
});

test("CLI — zero-byte file → exit 0, EMPTY FILE warning", () => {
  withFile("", (r) => {
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /^::warning::.*EMPTY FILE/m);
  });
});

test("CLI — `[]` file → exit 0, EMPTY LIST warning", () => {
  withFile("[]\n", (r) => {
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /^::warning::.*EMPTY LIST/m);
  });
});

test("CLI — long-stale file → exit 0 despite warning", () => {
  // Anchored in 2020, so this is stale under any real build clock.
  withFile(series(Date.UTC(2020, 5, 30), 200), (r) => {
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /^::warning::.*STALE/m);
  });
});

test("CLI — healthy file (generated against the real clock) → exit 0, no ::warning::", () => {
  // Built relative to Date.now() so this case cannot rot.
  const today = Math.floor(Date.now() / MS_PER_DAY) * MS_PER_DAY;
  withFile(series(today, 200), (r) => {
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.doesNotMatch(r.stdout, /::warning::/);
  });
});

// --- CLI: present-but-unreadable is not the absent state, and never "ok" ---

test("CLI — a directory at the content path → exit 0, UNREADABLE FILE warning, no ok", () => {
  const dir = makeTmp();
  try {
    mkdirSync(path.join(dir, CONTENT_REL), { recursive: true });
    const r = runScript(dir);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /^::warning::.*UNREADABLE FILE/m);
    assert.doesNotMatch(r.stdout, /ok — /);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI — unreadable file (chmod 000) → exit 0, UNREADABLE FILE warning, no ok", (t) => {
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    t.skip("running as root: chmod 000 is not enforced");
    return;
  }
  const dir = makeTmp();
  const abs = path.join(dir, CONTENT_REL);
  try {
    writeFileSync(abs, series(NOW, 200));
    chmodSync(abs, 0o000);
    const r = runScript(dir);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /^::warning::.*UNREADABLE FILE/m);
    assert.doesNotMatch(r.stdout, /ok — /);
  } finally {
    // Restore permissions so the tmpdir can be removed cleanly.
    try {
      chmodSync(abs, 0o644);
    } catch {
      /* already gone */
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
