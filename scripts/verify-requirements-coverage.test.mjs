/**
 * verify-requirements-coverage.test.mjs
 *
 * Unit tests for the markdown-table matrix parser (profile-resume Task 22).
 * Runs via `node --test scripts/verify-requirements-coverage.test.mjs`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMatrixTableRow, verifySpecTexts } from "./verify-requirements-coverage.mjs";

/** Minimal requirements.md declaring ACs 1.1 and 1.2. */
const REQUIREMENTS = [
  "# Requirements",
  "",
  "### Requirement 1 — Thing",
  "",
  "#### Acceptance Criteria",
  "",
  "1. WHEN a thing happens THEN the system SHALL respond",
  "2. WHEN another thing happens THEN the system SHALL respond",
  "",
].join("\n");

/** Build a tasks.md whose matrix table is the supplied rows. */
function tasksDoc(rows) {
  return [
    "# Tasks",
    "",
    "- [ ] 2. Author the schema",
    "  - _Depends on: (none — root task)_",
    "",
    "- [ ] 4. Wire the loader",
    "  - _Depends on: 2_",
    "",
    "---",
    "",
    "## Requirements Coverage Matrix",
    "",
    "| Requirement | Acceptance criteria | Covering tasks |",
    "|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

test("parseMatrixTableRow parses a normal covered row", () => {
  const row = parseMatrixTableRow("| R1 — Thing | 1.1 | 2, 4 |");
  assert.deepEqual(row, { lhs: "1.1", rhs: "2, 4" });
});

test("parseMatrixTableRow rejects a row whose covering-tasks cell is empty", () => {
  // The bullet form's `**tasks**` segment must be non-empty; the table form
  // must be no laxer. A row asserting no coverage is not a coverage row.
  assert.equal(parseMatrixTableRow("| | 1.1 |  |"), null);
  assert.equal(parseMatrixTableRow("| R1 — Thing | 1.1 ||"), null);
});

test("verifySpecTexts passes when every AC cites at least one real task", () => {
  const tasks = tasksDoc(["| R1 — Thing | 1.1 | 2, 4 |", "| | 1.2 | 4 |"]);
  const { failures, summary } = verifySpecTexts(REQUIREMENTS, tasks, "fixture");
  assert.deepEqual(failures, []);
  assert.match(summary, /2 requirements matched/);
});

test("verifySpecTexts reports an AC whose covering-tasks cell is empty as an orphan", () => {
  const tasks = tasksDoc(["| R1 — Thing | 1.1 | 2, 4 |", "| | 1.2 |  |"]);
  const { failures } = verifySpecTexts(REQUIREMENTS, tasks, "fixture");
  assert.equal(failures.length, 1);
  assert.match(failures[0], /ORPHAN \(fixture\)/);
  assert.match(failures[0], /- 1\.2/);
});

test("verifySpecTexts reports an AC with no matrix row at all as an orphan", () => {
  const tasks = tasksDoc(["| R1 — Thing | 1.1 | 2, 4 |"]);
  const { failures } = verifySpecTexts(REQUIREMENTS, tasks, "fixture");
  assert.equal(failures.length, 1);
  assert.match(failures[0], /ORPHAN \(fixture\)/);
  assert.match(failures[0], /- 1\.2/);
});

test("verifySpecTexts reports a matrix task number that tasks.md never declares", () => {
  const tasks = tasksDoc(["| R1 — Thing | 1.1 | 2, 4 |", "| | 1.2 | 99 |"]);
  const { failures } = verifySpecTexts(REQUIREMENTS, tasks, "fixture");
  assert.equal(failures.length, 1);
  assert.match(failures[0], /UNKNOWN-TASK \(fixture\)/);
  assert.match(failures[0], /task 99/);
});
