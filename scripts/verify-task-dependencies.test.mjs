/**
 * verify-task-dependencies.test.mjs
 *
 * Unit tests for the decimal-ID regex extension (blog-enhanced Task 25).
 * Runs via `node --test scripts/verify-task-dependencies.test.mjs`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DECIMAL_ID_RE, parseTasks, verifyTasksText } from "./verify-task-dependencies.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixDir = path.join(__dirname, "__fixtures__/task-deps");

test("DECIMAL_ID_RE captures 6.4", () => {
  const m = DECIMAL_ID_RE.exec("- [ ] 6.4. Velite API investigation");
  assert.ok(m);
  assert.equal(m[1], "6.4");
});

test("DECIMAL_ID_RE captures 6.4.1 (three-level)", () => {
  const m = DECIMAL_ID_RE.exec("- [x] 6.4.1. Series-order collision");
  assert.ok(m);
  assert.equal(m[1], "6.4.1");
});

test("DECIMAL_ID_RE captures 17.6", () => {
  const m = DECIMAL_ID_RE.exec("- [ ] 17.6. Preview-route infrastructure");
  assert.ok(m);
  assert.equal(m[1], "17.6");
});

test("DECIMAL_ID_RE does NOT match plain integer task IDs", () => {
  // The decimal regex requires at least one `.\d+` group.
  assert.equal(DECIMAL_ID_RE.exec("- [x] 25. Some integer task"), null);
});

test("parseTasks recognizes 6.4, 6.4.1, 17.6 in a fixture", () => {
  const text = readFileSync(path.join(fixDir, "decimal-ids.md"), "utf8");
  const { tasks, declared } = parseTasks(text);
  const ids = tasks.map((t) => t.id);
  assert.ok(ids.includes("6.4"), `expected 6.4 in ${JSON.stringify(ids)}`);
  assert.ok(ids.includes("6.4.1"), `expected 6.4.1 in ${JSON.stringify(ids)}`);
  assert.ok(ids.includes("17.6"), `expected 17.6 in ${JSON.stringify(ids)}`);
  assert.ok(declared.has("6.4.1"));
});

test("verifyTasksText on decimal-id fixture passes cleanly", () => {
  const text = readFileSync(path.join(fixDir, "decimal-ids.md"), "utf8");
  const { failures } = verifyTasksText(text, "decimal-ids.md");
  assert.deepEqual(failures, []);
});
