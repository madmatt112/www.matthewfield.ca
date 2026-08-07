/**
 * verify-requirements-coverage.test.mjs
 *
 * Unit tests for the markdown-table matrix parser (profile-resume Task 22).
 * Runs via `node --test scripts/verify-requirements-coverage.test.mjs`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  coversAtLeastOneTask,
  parseMatrixTableRow,
  verifySpecTexts,
} from "./verify-requirements-coverage.mjs";

const SCRIPT = fileURLToPath(new URL("./verify-requirements-coverage.mjs", import.meta.url));

/** Run `fn`, returning everything it wrote to stderr. */
function captureStderr(fn) {
  const original = process.stderr.write;
  let captured = "";
  process.stderr.write = (chunk) => {
    captured += chunk;
    return true;
  };
  try {
    fn();
  } finally {
    process.stderr.write = original;
  }
  return captured;
}

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

test("parseMatrixTableRow rejects rows whose AC cell is not a list of requirement IDs", () => {
  // Kills the mutant that drops the ID_TOKEN_RE check on the AC cell: without
  // it the header row and the NFR rows (AC cell is an em-dash) would be read
  // as coverage rows.
  assert.equal(parseMatrixTableRow("| Requirement | Acceptance criteria | Covering tasks |"), null);
  assert.equal(parseMatrixTableRow("| NFR Performance | — | 23 |"), null);
  assert.equal(parseMatrixTableRow("|---|---|---|"), null);
  assert.equal(parseMatrixTableRow("| R1 — Thing | 1.1 | 2 | 4 |"), null);
  // An empty AC cell must not pass — `[].every(...)` is vacuously true, so the
  // ID check alone would let this through and cite tasks against no AC.
  assert.equal(parseMatrixTableRow("| R1 — Thing |  | 2, 4 |"), null);
});

test("coversAtLeastOneTask requires a task number or the explicit n/a sentinel", () => {
  // Non-emptiness is not coverage. Each of these is non-empty and names zero
  // tasks, so each must be rejected.
  for (const cell of ["", "   ", "(18)", "TBD", "—", "tesk 18", "(no route created)"]) {
    assert.equal(coversAtLeastOneTask(cell), false, `expected "${cell}" to assert no coverage`);
  }
  for (const cell of ["2, 4", "4", "3 (rehypeSlug in shared array)", "n/a", "N/A — by absence"]) {
    assert.equal(coversAtLeastOneTask(cell), true, `expected "${cell}" to assert coverage`);
  }
  // A leading token that merely starts with the sentinel letters is not it.
  assert.equal(coversAtLeastOneTask("n/available soon"), false);
});

test("verifySpecTexts passes when every AC cites at least one real task", () => {
  const tasks = tasksDoc(["| R1 — Thing | 1.1 | 2, 4 |", "| | 1.2 | 4 |"]);
  const { failures, summary } = verifySpecTexts(REQUIREMENTS, tasks, "fixture");
  assert.deepEqual(failures, []);
  assert.match(summary, /2 requirements matched/);
});

test("verifySpecTexts reports an AC whose covering-tasks cell names no task as an orphan", () => {
  // Every one of these cells is non-empty yet yields zero task numbers after
  // parenthetical stripping. Non-emptiness must not pass for coverage.
  for (const cell of ["", "  ", "(18)", "TBD", "—", "tesk 18"]) {
    const tasks = tasksDoc(["| R1 — Thing | 1.1 | 2, 4 |", `| | 1.2 | ${cell} |`]);
    const { failures } = verifySpecTexts(REQUIREMENTS, tasks, "fixture");
    assert.equal(failures.length, 1, `cell "${cell}" should produce exactly one failure`);
    assert.match(failures[0], /ORPHAN \(fixture\)/);
    assert.match(failures[0], /- 1\.2/);
  }
});

test("verifySpecTexts accepts the explicit n/a sentinel as deliberate no-coverage", () => {
  // A genuine negative requirement (verified by absence) has no covering
  // task; it stays valid only via the sentinel, never by accident.
  const tasks = tasksDoc([
    "| R1 — Thing | 1.1 | 2, 4 |",
    "| | 1.2 | n/a — nothing is built; verified by absence |",
  ]);
  let result;
  const stderr = captureStderr(() => {
    result = verifySpecTexts(REQUIREMENTS, tasks, "fixture");
  });
  assert.deepEqual(result.failures, []);
  assert.match(result.summary, /2 requirements matched/);
  // The sentinel's rationale prose must not be mistaken for task numbers,
  // nor produce "cannot parse task-number token" noise on every run.
  assert.match(result.summary, /2 tasks referenced/);
  assert.equal(stderr, "");
});

test("a covering-tasks cell that names no task gets a named diagnostic", () => {
  // The silent-pass this closes had no diagnostic at all. Each rejection must
  // say which row was dropped and why.
  const tasks = tasksDoc(["| R1 — Thing | 1.1 | 2, 4 |", "| | 1.2 | (18) |"]);
  const stderr = captureStderr(() => verifySpecTexts(REQUIREMENTS, tasks, "fixture"));
  assert.match(stderr, /covering-tasks cell "\(18\)" names no task number/);
  assert.match(stderr, /n\/a/);
  assert.match(stderr, /1\.2/);
});

test("the entrypoint guard runs the script through a symlink under a path with a space", () => {
  // The naive `import.meta.url === \`file://${process.argv[1]}\`` guard is
  // false in both situations, so the script exited 0 having done nothing.
  const dir = mkdtempSync(path.join(tmpdir(), "verify-entry-"));
  try {
    const spaced = path.join(dir, "dir with space");
    mkdirSync(spaced);
    const link = path.join(spaced, "verify-requirements-coverage.mjs");
    symlinkSync(SCRIPT, link);
    const stdout = execFileSync(process.execPath, [link], { encoding: "utf8" });
    assert.match(stdout, /\[verify-requirements-coverage\]/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("verifySpecTexts ignores rows whose AC cell names no requirement", () => {
  // Kills the mutants that drop the AC-cell guards: without them these rows
  // are read as coverage rows and tasks 98/99 raise UNKNOWN-TASK.
  const tasks = tasksDoc([
    "| R1 — Thing | 1.1 | 2, 4 |",
    "| | 1.2 | 4 |",
    "| NFR Performance | — | 99 |",
    "| Stray row |  | 98 |",
  ]);
  const { failures } = verifySpecTexts(REQUIREMENTS, tasks, "fixture");
  assert.deepEqual(failures, []);
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
