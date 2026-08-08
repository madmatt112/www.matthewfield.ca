#!/usr/bin/env node
/**
 * verify-requirements-coverage.mjs
 *
 * Mechanical defense for the Requirements Coverage Matrix (tasks.md, section
 * `## Requirements Coverage Matrix`). Closes r3 review Attack Surface 1 by
 * surfacing orphan requirements (an AC ID present in requirements.md that no
 * matrix entry cites) and dangling matrix references (an ID cited in the
 * matrix that requirements.md no longer defines, or a task number cited in
 * the matrix that tasks.md no longer defines).
 *
 * Exit codes:
 *   0  — every requirement ID is cited at least once in the matrix; every ID
 *        cited in the matrix exists in requirements.md; every task number
 *        cited in the matrix exists in tasks.md.
 *   1  — at least one orphan, dangling, or unknown-task reference; each
 *        failure prints a named diagnostic to stderr.
 *
 * A matrix row only counts as coverage when its covering-tasks cell names at
 * least one task number. A genuine negative requirement — one verified by the
 * ABSENCE of an artefact, so no task can cover it — states that deliberately
 * with a leading `n/a` token plus a rationale (see NO_COVERAGE_SENTINEL_RE).
 * Nothing else counts: a cell holding "TBD", an em-dash, or a bare
 * parenthetical names zero tasks and its criteria are reported as ORPHAN.
 *
 * Node built-ins + regex only. No external deps.
 *
 * CLI: `node scripts/verify-requirements-coverage.mjs`
 */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Specs whose coverage matrix this verifier checks. Paths are repo-relative.
// A spec whose documents are not present in the current checkout is reported
// as SKIPPED rather than silently ignored, so a clean run cannot be mistaken
// for a verified one.
const SPEC_SLUGS = ["blog-core", "profile-resume"];
const SPECS = SPEC_SLUGS.map((slug) => ({
  slug,
  requirementsPath: path.join(repoRoot, `.spec-workflow/specs/${slug}/requirements.md`),
  tasksPath: path.join(repoRoot, `.spec-workflow/specs/${slug}/tasks.md`),
}));

// ---------------------------------------------------------------------------
// Pinned regexes (mechanical contract — do not "simplify" without re-checking
// the matrix shape in tasks.md and the requirements.md AC numbering).
// ---------------------------------------------------------------------------

// Major requirement header. Two punctuations are in use across specs:
//   blog-core:       "### Requirement 7: Draft handling"
//   profile-resume:  "### Requirement 7 — Machine-readable professional data"
const REQ_HEADER_RE = /^###\s+Requirement\s+(\d+)\s*[:—–-]/;

// Numbered acceptance criterion line at column 0, e.g. "7.  WHEN ..."
// Tolerates leading bold markers like "5. **Author-controlled `updated`**".
const AC_LINE_RE = /^(\d+)\.\s/;

// Lettered sub-ID appearing inside body text, e.g. "**6.4a — Shared remark ...**"
// Captured anywhere on a line — these IDs are referenced by the matrix.
const SUB_ID_RE = /\b(\d+)\.(\d+)([a-z])\b/g;

// Matrix section delimiter — start.
const MATRIX_START_RE = /^##\s+Requirements Coverage Matrix\s*$/;
// Any subsequent top-level `## ` heading ends the matrix.
const NEXT_SECTION_RE = /^##\s+/;

// Inside the matrix, each "Req N (tag)" sub-section is a `### Req N (...)`.
const MATRIX_REQ_HEADER_RE = /^###\s+Req\s+(\d+)\s*\(/;

// Matrix bullet line, e.g.
//   - 1.0 — collection exists — **4.1, 4.4**
//   - 2.1, 2.3, 2.4 — index rendering, reverse-chrono — **11**
//   - 10 — `prose ...` container — **12**
//   - 6.4a — minimum-1-minute clamp — **4.3, 22**
// The LHS (before the first em-dash) lists requirement IDs; the bolded
// trailing segment lists task numbers.
const MATRIX_BULLET_RE = /^-\s+(.+?)\s+—\s+.+?\s+—\s+\*\*(.+?)\*\*\s*$/;

// profile-resume states the same matrix as a three-column markdown table
// rather than blog-core's bullet list:
//   | R1 — Experience as validated structured content | 1.1 | 2, 4, 6 |
//   |                                                 | 1.2 | 2, 4, 9 |
// Column 2 carries the acceptance-criterion IDs, column 3 the covering tasks
// — the same two payloads the bullet form puts either side of the em-dashes.
const MATRIX_TABLE_ROW_RE = /^\|(.+)\|\s*$/;
const TABLE_SEPARATOR_CELL_RE = /^:?-{2,}:?$/;

// Inside the bullet LHS, IDs are comma-separated. Each ID may be either
// "N" (whole requirement) or "N.M" or "N.Ma".
const ID_TOKEN_RE = /^\s*(\d+)(?:\.(\d+)([a-z])?)?\s*$/;

// Inside the covering-tasks cell, task numbers may be "N" or "N.M" possibly
// followed by parenthetical notes (e.g. "3 (rehypeSlug in shared rehype
// array)"). We strip parenthetical notes then split on commas.
const TASK_TOKEN_RE = /^\s*(\d+(?:\.\d+)?)\s*$/;

// Explicit "this requirement is covered by no task" sentinel.
//
// A genuine negative requirement — an AC verified by the ABSENCE of an
// artefact, e.g. "no /resume route exists" — legitimately has no covering
// task. But a cell that merely FAILS to name a task ("(18)", "TBD", "—", a
// typo) covers nothing either, and must not pass for coverage just because
// it is non-empty. So no-coverage must be stated deliberately, with a
// leading `n/a` token followed by the rationale:
//
//   | | 6.1 | n/a — no `/resume` route created; verified by absence |
//
// An em-dash, "TBD", and an empty cell are deliberately NOT accepted as
// sentinels: a typo or an unfinished edit produces those, which would
// re-open exactly the hole this closes. `n/a` cannot be typed by accident
// and is greppable across the spec documents.
const NO_COVERAGE_SENTINEL_RE = /^n\/a\b/i;

// Task header line, e.g. "- [x] 22.5. synthetic-input ..." or "- [ ] 4.1 Schema fields ..."
// Captures the task number. Sub-task numbering (e.g. "4.1") is the same shape.
// We accept top-level "- [ ] N." headers AND nested sub-task headers like
// "  - **4.1 Schema fields ...**" — both forms appear in tasks.md.
const TASK_TOP_RE = /^-\s+\[[ \-x]\]\s+(\d+(?:\.\d+)?)\.\s/;
const TASK_SUB_RE = /^\s+-\s+\*\*(\d+\.\d+)\s/;

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

function readFile(p) {
  return readFileSync(p, "utf8");
}

/**
 * Extract the universe of valid requirement IDs from requirements.md.
 *
 * Yields IDs of three shapes:
 *   "N"      — the major requirement as a whole (matrix uses N.0 for this;
 *               also accepted bare as in "Req 10" / "Req 12")
 *   "N.M"    — numbered acceptance criterion under "#### Acceptance Criteria"
 *   "N.Ma"   — lettered sub-ID embedded in body text
 *
 * Numbered AC lines may also appear in non-Requirements sections (e.g. the
 * Introduction's numbered lists); to avoid false positives we only count
 * numbered lines while inside a "### Requirement N:" section AND before the
 * next "### Requirement" header.
 */
export function extractRequirementIds(text) {
  const lines = text.split(/\r?\n/);
  /** @type {Set<string>} */
  const ids = new Set();
  let currentReq = null;

  for (const line of lines) {
    const header = REQ_HEADER_RE.exec(line);
    if (header) {
      currentReq = header[1];
      ids.add(`${currentReq}`); // bare "N"
      ids.add(`${currentReq}.0`); // matrix sometimes uses "N.0"
      continue;
    }
    if (currentReq === null) continue;

    // A new top-level "## " section closes the requirements block.
    if (/^##\s+/.test(line) && !/^###/.test(line)) {
      currentReq = null;
      continue;
    }

    const ac = AC_LINE_RE.exec(line);
    if (ac) {
      ids.add(`${currentReq}.${ac[1]}`);
    }

    // Lettered sub-IDs may appear anywhere in body text.
    let m;
    SUB_ID_RE.lastIndex = 0;
    while ((m = SUB_ID_RE.exec(line)) !== null) {
      // Only accept sub-IDs whose major number matches the current req — this
      // filters out incidental "6.4a" mentions in unrelated sections.
      if (m[1] === currentReq) {
        ids.add(`${m[1]}.${m[2]}${m[3]}`);
      }
    }
  }

  return ids;
}

/**
 * Extract the set of declared task numbers from tasks.md (excludes the
 * Requirements Coverage Matrix region so matrix bullets are not mistaken for
 * task declarations).
 */
export function extractTaskNumbers(text) {
  const lines = text.split(/\r?\n/);
  /** @type {Set<string>} */
  const tasks = new Set();
  let inMatrix = false;

  for (const line of lines) {
    if (MATRIX_START_RE.test(line)) {
      inMatrix = true;
      continue;
    }
    if (inMatrix && NEXT_SECTION_RE.test(line) && !MATRIX_START_RE.test(line)) {
      inMatrix = false;
    }
    if (inMatrix) continue;

    const top = TASK_TOP_RE.exec(line);
    if (top) {
      tasks.add(top[1]);
      continue;
    }
    const sub = TASK_SUB_RE.exec(line);
    if (sub) {
      tasks.add(sub[1]);
    }
  }

  return tasks;
}

/**
 * Split a markdown table row into `{ lhs, rhs }` — the acceptance-criterion
 * cell and the covering-tasks cell — or null when the row is not a coverage
 * row. Returns null for the header row, the `|---|` separator, and NFR rows
 * whose AC cell is an em-dash rather than a list of IDs.
 *
 * This function decides SHAPE only. Whether the covering-tasks cell actually
 * names a task is decided in one place for both matrix shapes — see
 * `coversAtLeastOneTask` and its use in `parseMatrix` — so that a bad cell
 * gets the same named diagnostic whichever shape it is written in.
 *
 * @param {string} line
 * @returns {{ lhs: string, rhs: string } | null}
 */
export function parseMatrixTableRow(line) {
  const m = MATRIX_TABLE_ROW_RE.exec(line);
  if (!m) return null;
  const cells = m[1].split("|").map((c) => c.trim());
  if (cells.length !== 3) return null;
  const idCell = cells[1];
  // Named fast path for the `|---|` separator. Not load-bearing: no string
  // this matches can also match ID_TOKEN_RE below, so the ID check would
  // reject it anyway. It is here so the separator case reads explicitly.
  if (TABLE_SEPARATOR_CELL_RE.test(idCell)) return null;
  const idTokens = idCell
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  // Load-bearing: `[].every(...)` is true, so without this an AC cell that is
  // empty would pass the ID check below and its task numbers would be cited
  // against no requirement at all.
  if (idTokens.length === 0) return null;
  if (!idTokens.every((t) => ID_TOKEN_RE.test(t))) return null;
  return { lhs: idCell, rhs: cells[2] };
}

/**
 * Split a covering-tasks cell into candidate task tokens. Parenthetical notes
 * are stripped across the WHOLE cell before splitting, so a note containing a
 * comma ("2 (schema permits, no task authors it)") does not shred into
 * unparseable fragments.
 *
 * @param {string} cell
 * @returns {string[]}
 */
function taskCellTokens(cell) {
  return cell
    .replace(/\([^)]*\)/g, "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * True when a covering-tasks cell asserts coverage: it either names at least
 * one task number, or carries the explicit `n/a` no-coverage sentinel.
 *
 * Non-emptiness is NOT enough. "(18)", "TBD", "—", and a bare typo are all
 * non-empty and all name zero tasks; each must fall through to ORPHAN.
 *
 * @param {string} cell
 * @returns {boolean}
 */
export function coversAtLeastOneTask(cell) {
  if (NO_COVERAGE_SENTINEL_RE.test(cell.trim())) return true;
  return taskCellTokens(cell).some((t) => TASK_TOKEN_RE.test(t));
}

/**
 * Parse the Requirements Coverage Matrix section. Returns:
 *   {
 *     citedRequirementIds: Set<string>,
 *     citedTaskNumbers: Map<taskNum, lineNumber>,
 *     bullets: Array<{ line: number, ids: string[], tasks: string[] }>,
 *   }
 */
export function parseMatrix(text, label = "tasks.md") {
  const lines = text.split(/\r?\n/);
  /** @type {Set<string>} */
  const citedRequirementIds = new Set();
  /** @type {Map<string, number>} */
  const citedTaskNumbers = new Map();
  /** @type {Array<{ line: number, ids: string[], tasks: string[] }>} */
  const bullets = [];

  let inMatrix = false;
  let started = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (MATRIX_START_RE.test(line)) {
      inMatrix = true;
      started = true;
      continue;
    }
    if (inMatrix && NEXT_SECTION_RE.test(line) && !MATRIX_START_RE.test(line)) {
      inMatrix = false;
      break;
    }
    if (!inMatrix) continue;

    // Two matrix shapes are in use: blog-core's bullet list and
    // profile-resume's markdown table. Both yield the same two payloads.
    const bullet = MATRIX_BULLET_RE.exec(line);
    const row = bullet ? { lhs: bullet[1], rhs: bullet[2] } : parseMatrixTableRow(line);
    if (!row) continue;

    const lhs = row.lhs;
    const rhs = row.rhs;

    // A row only asserts coverage if its covering-tasks cell yields at least
    // one task number, or carries the explicit `n/a` sentinel. Anything else
    // — empty, "(18)", "TBD", "—", a typo — covers nothing, so the row is
    // discarded and its acceptance criteria fall through to the ORPHAN check.
    if (!coversAtLeastOneTask(rhs)) {
      process.stderr.write(
        `[verify-requirements-coverage] ${label} line ${i + 1}: covering-tasks cell "${rhs.trim()}" names no task number and is not the \`n/a\` no-coverage sentinel — row ignored; its acceptance criteria (${lhs.trim()}) will be reported as ORPHAN\n`,
      );
      continue;
    }

    // Split LHS on commas, validate each token.
    /** @type {string[]} */
    const ids = [];
    for (const tok of lhs.split(",")) {
      const t = ID_TOKEN_RE.exec(tok.trim());
      if (!t) {
        process.stderr.write(
          `[verify-requirements-coverage] ${label} line ${i + 1}: cannot parse requirement-id token "${tok.trim()}" in matrix requirement cell\n`,
        );
        continue;
      }
      const id = t[3]
        ? `${t[1]}.${t[2]}${t[3]}`
        : t[2] !== undefined
          ? `${t[1]}.${t[2]}`
          : `${t[1]}`;
      ids.push(id);
      citedRequirementIds.add(id);
    }

    // Strip parenthetical notes from each RHS task token: "3 (rehypeSlug...)" → "3"
    /** @type {string[]} */
    const tasks = [];
    // An `n/a` sentinel row cites no tasks by design — its rationale prose is
    // not a task list, so don't try to parse it as one.
    if (!NO_COVERAGE_SENTINEL_RE.test(rhs.trim())) {
      for (const rawTok of taskCellTokens(rhs)) {
        const t = TASK_TOKEN_RE.exec(rawTok);
        if (!t) {
          process.stderr.write(
            `[verify-requirements-coverage] ${label} line ${i + 1}: cannot parse task-number token "${rawTok}" in matrix task cell\n`,
          );
          continue;
        }
        tasks.push(t[1]);
        if (!citedTaskNumbers.has(t[1])) citedTaskNumbers.set(t[1], i + 1);
      }
    }

    bullets.push({ line: i + 1, ids, tasks });
  }

  if (!started) {
    process.stderr.write(
      `[verify-requirements-coverage] FATAL: "## Requirements Coverage Matrix" heading not found in ${label}\n`,
    );
    process.exit(2);
  }

  return { citedRequirementIds, citedTaskNumbers, bullets };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Verify one spec's coverage matrix from its two document bodies. Returns the
 * (possibly empty) failure list plus a one-line summary for the OK path.
 * Exported for unit-test use.
 *
 * @param {string} reqText     requirements.md contents
 * @param {string} tasksText   tasks.md contents
 * @param {string} label       spec slug, used in diagnostics
 */
export function verifySpecTexts(reqText, tasksText, label) {
  const declaredRequirementIds = extractRequirementIds(reqText);
  const declaredTaskNumbers = extractTaskNumbers(tasksText);
  const { citedRequirementIds, citedTaskNumbers, bullets } = parseMatrix(
    tasksText,
    `${label}/tasks.md`,
  );

  /** @type {string[]} */
  const failures = [];

  // (a) orphan requirement IDs — declared but never cited in the matrix.
  // We only flag IDs of the AC shapes the matrix actually uses: N.M and
  // N.Ma. The bare "N" and synthetic "N.0" are accepted shorthands but not
  // independently required — if a requirement has at least one AC and ANY
  // of its acceptance-criterion IDs (N.M or N.Ma) is cited, the requirement
  // is covered.
  //
  // Build per-requirement coverage: for each major requirement N, mark
  // covered if ANY id starting with "N." (or bare "N") is cited.
  const byMajor = new Map();
  for (const id of declaredRequirementIds) {
    const major = id.includes(".") ? id.slice(0, id.indexOf(".")) : id;
    if (!byMajor.has(major)) byMajor.set(major, new Set());
    byMajor.get(major).add(id);
  }
  /** @type {string[]} */
  const uncited = [];
  for (const id of declaredRequirementIds) {
    if (!id.includes(".")) continue; // skip bare "N"
    if (id.endsWith(".0")) continue; // skip synthetic "N.0"
    if (!citedRequirementIds.has(id)) {
      uncited.push(id);
    }
  }
  if (uncited.length > 0) {
    failures.push(
      `[verify-requirements-coverage] ORPHAN (${label}): the following requirement IDs are declared in requirements.md but NOT cited in the Requirements Coverage Matrix:\n  - ${uncited.sort(idCompare).join("\n  - ")}`,
    );
  }

  // (b) dangling matrix references — IDs in matrix not in requirements.md.
  /** @type {string[]} */
  const dangling = [];
  for (const id of citedRequirementIds) {
    if (!declaredRequirementIds.has(id)) {
      dangling.push(id);
    }
  }
  if (dangling.length > 0) {
    failures.push(
      `[verify-requirements-coverage] DANGLING (${label}): the following requirement IDs are cited in the matrix but NOT declared in requirements.md:\n  - ${dangling.sort(idCompare).join("\n  - ")}`,
    );
  }

  // (c) unknown task numbers in matrix RHS.
  /** @type {string[]} */
  const unknownTasks = [];
  for (const [task, lineNumber] of citedTaskNumbers) {
    if (!declaredTaskNumbers.has(task)) {
      unknownTasks.push(`task ${task} (matrix line ${lineNumber})`);
    }
  }
  if (unknownTasks.length > 0) {
    failures.push(
      `[verify-requirements-coverage] UNKNOWN-TASK (${label}): the following task numbers are cited in the matrix but NOT declared in tasks.md:\n  - ${unknownTasks.join("\n  - ")}`,
    );
  }

  // Count: requirements matched = number of declared AC-shaped IDs (N.M / N.Ma)
  const acIds = [...declaredRequirementIds].filter((id) => id.includes(".") && !id.endsWith(".0"));
  const cited = acIds.filter((id) => citedRequirementIds.has(id));

  return {
    failures,
    summary: `${label}: ${cited.length} requirements matched, ${citedTaskNumbers.size} tasks referenced (across ${bullets.length} matrix entries)`,
  };
}

/**
 * Read one spec's documents off disk and verify its coverage matrix.
 *
 * @param {{ slug: string, requirementsPath: string, tasksPath: string }} spec
 */
function verifySpec(spec) {
  return verifySpecTexts(readFile(spec.requirementsPath), readFile(spec.tasksPath), spec.slug);
}

function main() {
  /** @type {string[]} */
  const allFailures = [];
  /** @type {string[]} */
  const summaries = [];

  for (const spec of SPECS) {
    if (!existsSync(spec.requirementsPath) || !existsSync(spec.tasksPath)) {
      // Not present in this checkout — announce it, don't pretend it passed.
      process.stdout.write(
        `[verify-requirements-coverage] SKIPPED — .spec-workflow/specs/${spec.slug} not present in this checkout\n`,
      );
      continue;
    }
    const { failures, summary } = verifySpec(spec);
    allFailures.push(...failures);
    summaries.push(summary);
  }

  if (allFailures.length > 0) {
    for (const f of allFailures) process.stderr.write(f + "\n");
    process.exit(1);
  }

  process.stdout.write(`[verify-requirements-coverage] OK — ${summaries.join("; ")}\n`);
}

function idCompare(a, b) {
  const pa = a.split(/[.\-]/).map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  const pb = b.split(/[.\-]/).map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const x = pa[i];
    const y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return x - y;
    return String(x).localeCompare(String(y));
  }
  return 0;
}

/**
 * True when this module is the process entrypoint rather than an import.
 *
 * The naive `import.meta.url === \`file://${process.argv[1]}\`` comparison
 * silently no-ops (exit 0, no output) in two real cases, because the two
 * sides are not the same kind of string:
 *   - `import.meta.url` is percent-encoded, `process.argv[1]` is not, so any
 *     path containing a space (or any other encoded character) mismatches;
 *   - `import.meta.url` is realpath-resolved by the ESM loader while
 *     `process.argv[1]` keeps the path as typed, so invocation through a
 *     symlink mismatches.
 * Decoding one side with `fileURLToPath` fixes only the first. Realpathing
 * the other side fixes both.
 */
function isProcessEntrypoint() {
  const entry = process.argv[1];
  if (!entry) return false;
  const self = fileURLToPath(import.meta.url);
  try {
    return realpathSync(entry) === self;
  } catch {
    return entry === self; // entry is not a real file (e.g. `node --eval`)
  }
}

if (isProcessEntrypoint()) {
  main();
}
