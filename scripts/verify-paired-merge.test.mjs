/**
 * verify-paired-merge.test.mjs
 *
 * Self-tests for scripts/verify-paired-merge.mjs. Runs via `node --test`.
 *
 * Vitest's include pattern (vitest.config.ts) targets `src/**`, so this
 * file lives outside Vitest's scope on purpose — invoke with
 * `node --test scripts/verify-paired-merge.test.mjs`.
 *
 * The verifier exposes `verifyPairedMerge({ changedFiles, headSubject })`
 * as a pure function — these tests bypass `git` entirely by reading
 * fixture diffs (newline-separated paths) and pairing each with a
 * fixture-appropriate HEAD subject.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyPairedMerge, TRACKED_SET } from "./verify-paired-merge.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixDir = path.join(__dirname, "__fixtures__/paired-merge");

function readDiff(name) {
  const raw = readFileSync(path.join(fixDir, name), "utf8");
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const NORMAL_SUBJECT = "feat(project-showcase): wire next.config + paired imports";
const REVERT_SUBJECT = 'Revert "Wire next.config + paired imports"';

test("good.diff — all four present → exit 0 (all-touched)", () => {
  const result = verifyPairedMerge({
    changedFiles: readDiff("good.diff"),
    headSubject: NORMAL_SUBJECT,
  });
  assert.equal(result.exitCode, 0, `diagnostic: ${result.diagnostic}`);
  assert.equal(result.kase, "all-touched");
});

test("bad-only-test.diff — only test file → non-zero, names other three", () => {
  const result = verifyPairedMerge({
    changedFiles: readDiff("bad-only-test.diff"),
    headSubject: NORMAL_SUBJECT,
  });
  assert.notEqual(result.exitCode, 0);
  assert.equal(result.kase, "strict-subset");
  assert.match(result.diagnostic, /next\.config\.ts/);
  assert.match(result.diagnostic, /src\/lib\/project-errors\.ts/);
  assert.match(result.diagnostic, /src\/lib\/blog-errors\.ts/);
});

test("bad-only-config.diff — only next.config.ts → non-zero, names other three", () => {
  const result = verifyPairedMerge({
    changedFiles: readDiff("bad-only-config.diff"),
    headSubject: NORMAL_SUBJECT,
  });
  assert.notEqual(result.exitCode, 0);
  assert.equal(result.kase, "strict-subset");
  assert.match(result.diagnostic, /src\/__tests__\/next-config-imports\.test\.ts/);
  assert.match(result.diagnostic, /src\/lib\/project-errors\.ts/);
  assert.match(result.diagnostic, /src\/lib\/blog-errors\.ts/);
});

test("bad-only-project-errors.diff — only project-errors.ts → non-zero, names other three", () => {
  const result = verifyPairedMerge({
    changedFiles: readDiff("bad-only-project-errors.diff"),
    headSubject: NORMAL_SUBJECT,
  });
  assert.notEqual(result.exitCode, 0);
  assert.equal(result.kase, "strict-subset");
  assert.match(result.diagnostic, /src\/__tests__\/next-config-imports\.test\.ts/);
  assert.match(result.diagnostic, /next\.config\.ts/);
  assert.match(result.diagnostic, /src\/lib\/blog-errors\.ts/);
});

test("bad-only-blog-errors.diff — only blog-errors.ts → non-zero, names other three", () => {
  const result = verifyPairedMerge({
    changedFiles: readDiff("bad-only-blog-errors.diff"),
    headSubject: NORMAL_SUBJECT,
  });
  assert.notEqual(result.exitCode, 0);
  assert.equal(result.kase, "strict-subset");
  assert.match(result.diagnostic, /src\/__tests__\/next-config-imports\.test\.ts/);
  assert.match(result.diagnostic, /next\.config\.ts/);
  assert.match(result.diagnostic, /src\/lib\/project-errors\.ts/);
});

test("good-revert.diff — revert HEAD + empty diff → non-zero (revert-shape)", () => {
  const result = verifyPairedMerge({
    changedFiles: readDiff("good-revert.diff"),
    headSubject: REVERT_SUBJECT,
  });
  assert.notEqual(result.exitCode, 0);
  assert.equal(result.kase, "revert-shape-subset");
  assert.match(result.diagnostic, /Revert-shape commit touches paired files/);
});

test("bad-revert-partial.diff — revert HEAD + strict subset → non-zero (revert-shape)", () => {
  const result = verifyPairedMerge({
    changedFiles: readDiff("bad-revert-partial.diff"),
    headSubject: REVERT_SUBJECT,
  });
  assert.notEqual(result.exitCode, 0);
  assert.equal(result.kase, "revert-shape-subset");
  assert.match(result.diagnostic, /Revert-shape commit touches paired files/);
  // The missing list should name the three NOT present.
  assert.match(result.diagnostic, /src\/__tests__\/next-config-imports\.test\.ts/);
  assert.match(result.diagnostic, /src\/lib\/project-errors\.ts/);
  assert.match(result.diagnostic, /src\/lib\/blog-errors\.ts/);
});

test("TRACKED_SET sanity — exactly four paths", () => {
  assert.equal(TRACKED_SET.length, 4);
});
