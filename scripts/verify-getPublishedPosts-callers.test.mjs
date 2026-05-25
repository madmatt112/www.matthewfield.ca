// verify-getPublishedPosts-callers.test.mjs (blog-enhanced Task 26, v4)
//
// Runs via `node --test scripts/verify-getPublishedPosts-callers.test.mjs`.
//
// Spec adapts the design's "Vitest test" requirement to node:test because
// vitest's test.include glob only picks up files under src/, not scripts/.
// scripts/*.test.mjs are run via `node --test` (matches the convention set
// by verify-chosen-path.test.mjs et al.).
//
// Asserts that running scripts/verify-getPublishedPosts-callers.mjs against
// the current codebase:
//   (a) exits 0,
//   (b) prints "OK",
//   (c) does NOT list src/lib/blog-taxonomy.ts as a violation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const verifier = path.join(repoRoot, "scripts/verify-getPublishedPosts-callers.mjs");

test("verifier exits 0 against current codebase and prints OK", () => {
  let stdout = "";
  let exitCode = 0;
  try {
    stdout = execSync(`node ${JSON.stringify(verifier)}`, {
      cwd: repoRoot,
      encoding: "utf-8",
    });
  } catch (err) {
    exitCode = err.status ?? 1;
    stdout = (err.stdout ?? "") + (err.stderr ?? "");
  }
  assert.equal(exitCode, 0, `expected exit 0, got ${exitCode}; output:\n${stdout}`);
  assert.match(stdout, /OK/);
  // Belt-and-braces: blog-taxonomy.ts must never appear as a violation.
  assert.ok(
    !/src\/lib\/blog-taxonomy\.ts/.test(stdout),
    `src/lib/blog-taxonomy.ts unexpectedly appeared in verifier output:\n${stdout}`,
  );
});
