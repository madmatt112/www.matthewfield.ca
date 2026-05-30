/**
 * verify-content-canary-regex-pair.test.mjs
 *
 * Self-tests for scripts/verify-content-canary-regex-pair.mjs. Runs via
 * `node --test`.
 *
 * Vitest's include pattern (vitest.config.ts) targets `src/**`, so this
 * file lives outside Vitest's scope on purpose — invoke with
 * `node --test scripts/verify-content-canary-regex-pair.test.mjs`.
 *
 * The verifier exposes
 * `verifyContentCanaryRegexPair({ changedFiles, headSubject })` as a pure
 * function — these tests bypass `git` entirely by reading fixture diffs
 * (newline-separated paths) and pairing each with a fixture-appropriate
 * HEAD subject.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  verifyContentCanaryRegexPair,
  TRACKED_SET,
} from "./verify-content-canary-regex-pair.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixDir = path.join(__dirname, "__fixtures__/content-canary-pair");

function readDiff(name) {
  const raw = readFileSync(path.join(fixDir, name), "utf8");
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const NORMAL_SUBJECT =
  "test(contributions-and-resources): extend content chokepoint canary + regex list";
const REVERT_SUBJECT =
  'Revert "extend content chokepoint canary + regex list"';

test("good-both.diff — both paths present → exit 0 (all-touched)", () => {
  const result = verifyContentCanaryRegexPair({
    changedFiles: readDiff("good-both.diff"),
    headSubject: NORMAL_SUBJECT,
  });
  assert.equal(result.exitCode, 0, `diagnostic: ${result.diagnostic}`);
  assert.equal(result.kase, "all-touched");
});

test("good-neither.diff — neither path present → exit 0 (none-touched)", () => {
  const result = verifyContentCanaryRegexPair({
    changedFiles: readDiff("good-neither.diff"),
    headSubject: NORMAL_SUBJECT,
  });
  assert.equal(result.exitCode, 0, `diagnostic: ${result.diagnostic}`);
  assert.equal(result.kase, "none-touched");
});

test("bad-only-canary.diff — only canary → non-zero, names test file", () => {
  const result = verifyContentCanaryRegexPair({
    changedFiles: readDiff("bad-only-canary.diff"),
    headSubject: NORMAL_SUBJECT,
  });
  assert.notEqual(result.exitCode, 0);
  assert.equal(result.kase, "strict-subset");
  assert.match(
    result.diagnostic,
    /src\/lib\/build\/check-content-chokepoint\.test\.ts/,
  );
});

test("bad-only-test.diff — only test file → non-zero, names canary", () => {
  const result = verifyContentCanaryRegexPair({
    changedFiles: readDiff("bad-only-test.diff"),
    headSubject: NORMAL_SUBJECT,
  });
  assert.notEqual(result.exitCode, 0);
  assert.equal(result.kase, "strict-subset");
  assert.match(
    result.diagnostic,
    /src\/__fixtures__\/content-chokepoint-canary\.ts/,
  );
});

test("revert HEAD + empty diff → non-zero (revert-shape)", () => {
  const result = verifyContentCanaryRegexPair({
    changedFiles: [],
    headSubject: REVERT_SUBJECT,
  });
  assert.notEqual(result.exitCode, 0);
  assert.equal(result.kase, "revert-shape-subset");
  assert.match(result.diagnostic, /Revert-shape commit touches paired files/);
});

test("revert HEAD + strict subset (only canary) → non-zero (revert-shape)", () => {
  const result = verifyContentCanaryRegexPair({
    changedFiles: readDiff("bad-only-canary.diff"),
    headSubject: REVERT_SUBJECT,
  });
  assert.notEqual(result.exitCode, 0);
  assert.equal(result.kase, "revert-shape-subset");
  assert.match(result.diagnostic, /Revert-shape commit touches paired files/);
  assert.match(
    result.diagnostic,
    /src\/lib\/build\/check-content-chokepoint\.test\.ts/,
  );
});

test("revert HEAD + full re-apply (both files) → exit 0 (all-touched)", () => {
  const result = verifyContentCanaryRegexPair({
    changedFiles: readDiff("good-both.diff"),
    headSubject: REVERT_SUBJECT,
  });
  assert.equal(result.exitCode, 0, `diagnostic: ${result.diagnostic}`);
  assert.equal(result.kase, "all-touched");
});

test("TRACKED_SET sanity — exactly two paths, independent of projects pair", () => {
  assert.equal(TRACKED_SET.length, 2);
  assert.ok(
    TRACKED_SET.includes("src/__fixtures__/content-chokepoint-canary.ts"),
  );
  assert.ok(
    TRACKED_SET.includes("src/lib/build/check-content-chokepoint.test.ts"),
  );
  // Must NOT carry the projects-pair paths (separate gate).
  assert.ok(!TRACKED_SET.includes("src/__fixtures__/chokepoint-canary.ts"));
  assert.ok(!TRACKED_SET.includes("src/lib/projects.test.ts"));
});
