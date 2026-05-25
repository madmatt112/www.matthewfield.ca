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
 * Node built-ins + regex only. No external deps.
 *
 * CLI: `node scripts/verify-requirements-coverage.mjs`
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const REQUIREMENTS_PATH = path.join(
  repoRoot,
  ".spec-workflow/specs/blog-core/requirements.md",
);
const TASKS_PATH = path.join(
  repoRoot,
  ".spec-workflow/specs/blog-core/tasks.md",
);

// ---------------------------------------------------------------------------
// Pinned regexes (mechanical contract — do not "simplify" without re-checking
// the matrix shape in tasks.md and the requirements.md AC numbering).
// ---------------------------------------------------------------------------

// Major requirement header: "### Requirement 7: Draft handling"
const REQ_HEADER_RE = /^###\s+Requirement\s+(\d+)\s*:/;

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

// Inside the bullet LHS, IDs are comma-separated. Each ID may be either
// "N" (whole requirement) or "N.M" or "N.Ma".
const ID_TOKEN_RE = /^\s*(\d+)(?:\.(\d+)([a-z])?)?\s*$/;

// Inside the bolded RHS, task numbers may be "N" or "N.M" possibly followed
// by parenthetical notes (e.g. "3 (rehypeSlug in shared rehype array)").
// We strip parenthetical notes then split on commas.
const TASK_TOKEN_RE = /^\s*(\d+(?:\.\d+)?)\s*$/;

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
function extractRequirementIds(text) {
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
function extractTaskNumbers(text) {
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
 * Parse the Requirements Coverage Matrix section. Returns:
 *   {
 *     citedRequirementIds: Set<string>,
 *     citedTaskNumbers: Map<taskNum, lineNumber>,
 *     bullets: Array<{ line: number, ids: string[], tasks: string[] }>,
 *   }
 */
function parseMatrix(text) {
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

    const m = MATRIX_BULLET_RE.exec(line);
    if (!m) continue;

    const lhs = m[1];
    const rhs = m[2];

    // Split LHS on commas, validate each token.
    /** @type {string[]} */
    const ids = [];
    for (const tok of lhs.split(",")) {
      const t = ID_TOKEN_RE.exec(tok.trim());
      if (!t) {
        process.stderr.write(
          `[verify-requirements-coverage] line ${i + 1}: cannot parse requirement-id token "${tok.trim()}" in bullet LHS\n`,
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
    for (const rawTok of rhs.split(",")) {
      const tok = rawTok.replace(/\([^)]*\)/g, "").trim();
      if (!tok) continue;
      const t = TASK_TOKEN_RE.exec(tok);
      if (!t) {
        process.stderr.write(
          `[verify-requirements-coverage] line ${i + 1}: cannot parse task-number token "${rawTok.trim()}" in bullet RHS\n`,
        );
        continue;
      }
      tasks.push(t[1]);
      if (!citedTaskNumbers.has(t[1])) citedTaskNumbers.set(t[1], i + 1);
    }

    bullets.push({ line: i + 1, ids, tasks });
  }

  if (!started) {
    process.stderr.write(
      `[verify-requirements-coverage] FATAL: "## Requirements Coverage Matrix" heading not found in tasks.md\n`,
    );
    process.exit(2);
  }

  return { citedRequirementIds, citedTaskNumbers, bullets };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const reqText = readFile(REQUIREMENTS_PATH);
  const tasksText = readFile(TASKS_PATH);

  const declaredRequirementIds = extractRequirementIds(reqText);
  const declaredTaskNumbers = extractTaskNumbers(tasksText);
  const { citedRequirementIds, citedTaskNumbers, bullets } =
    parseMatrix(tasksText);

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
      `[verify-requirements-coverage] ORPHAN: the following requirement IDs are declared in requirements.md but NOT cited in the Requirements Coverage Matrix:\n  - ${uncited.sort(idCompare).join("\n  - ")}`,
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
      `[verify-requirements-coverage] DANGLING: the following requirement IDs are cited in the matrix but NOT declared in requirements.md:\n  - ${dangling.sort(idCompare).join("\n  - ")}`,
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
      `[verify-requirements-coverage] UNKNOWN-TASK: the following task numbers are cited in the matrix but NOT declared in tasks.md:\n  - ${unknownTasks.join("\n  - ")}`,
    );
  }

  if (failures.length > 0) {
    for (const f of failures) process.stderr.write(f + "\n");
    process.exit(1);
  }

  // Count: requirements matched = number of declared AC-shaped IDs (N.M / N.Ma)
  const acIds = [...declaredRequirementIds].filter(
    (id) => id.includes(".") && !id.endsWith(".0"),
  );
  const cited = acIds.filter((id) => citedRequirementIds.has(id));
  process.stdout.write(
    `[verify-requirements-coverage] OK — ${cited.length} requirements matched, ${citedTaskNumbers.size} tasks referenced (across ${bullets.length} matrix bullets)\n`,
  );
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

main();
