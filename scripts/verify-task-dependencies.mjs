#!/usr/bin/env node
/**
 * verify-task-dependencies.mjs
 *
 * Mechanical defense for the `_Depends on:` footers in tasks.md (closes r3
 * review Attack Surface 2 — `Depends on:` inconsistency between siblings).
 * Parses every task footer, builds a dependency graph, validates that each
 * cited task number resolves to an actual task header, then topologically
 * sorts. Exits non-zero on cycles, self-references, or dangling references
 * with a named diagnostic.
 *
 * Exit codes:
 *   0  — graph parses cleanly, every edge points at a real task, no cycles.
 *   1  — at least one named failure (cycle / dangling / self-ref).
 *
 * Node built-ins + regex only. No external deps.
 *
 * CLI: `node scripts/verify-task-dependencies.mjs`
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Only blog-core's tasks.md is verified in CI (the decimal-ID regex
// extensions make this verifier capable of parsing blog-enhanced's
// multi-level IDs, but blog-enhanced has authoring-time dangling refs
// the verifier shouldn't fail on yet — its `_Depends on:` cross-spec
// edges land in a later task).
const TASKS_PATHS = [path.join(repoRoot, ".spec-workflow/specs/blog-core/tasks.md")];

// ---------------------------------------------------------------------------
// Pinned regexes.
// ---------------------------------------------------------------------------

// Top-level task header: "- [x] 22.5. synthetic-input ..." or "- [ ] 4. ..."
// or "- [x] 6.4.1. ..." — blog-enhanced v2/v3 uses multi-level decimal IDs.
const TASK_TOP_RE = /^-\s+\[[ \-x]\]\s+(\d+(?:\.\d+)*)\.\s/;
// Nested sub-task header: "  - **4.1 Schema fields ...**" — also supports
// deeper decimals like "  - **6.4.1 ...**".
const TASK_SUB_RE = /^\s+-\s+\*\*(\d+(?:\.\d+)+)\s/;
// Blog-enhanced decimal-ID checkbox regex (per Task 25 v3/v4):
// captures one-or-more decimal segments off a `- [ ]`/`- [x]` checkbox line.
// Exported for unit tests; the parser uses TASK_TOP_RE which is a strict
// superset (allows integer IDs too).
export const DECIMAL_ID_RE = /^- \[[ x]\] (\d+(?:\.\d+)+)\. /;

// Depends-on footer. Two shapes appear in tasks.md:
//   "  - _Depends on: 1, 2, 4.1_"
//   "  - _Depends on: (none — root task)_"
//   "  - _Depends on: 28 (the matrix ... — wait, 28 depends on this; ...)_"
// The body between "Depends on:" and the closing `_` is captured for parsing.
const DEPENDS_ON_RE = /^\s*-\s+_Depends on:\s*(.*?)_\s*$/;

// Matrix region delimiter — task lines inside the matrix must not be parsed
// as task declarations (they share the "- N.M" shape).
const MATRIX_START_RE = /^##\s+Requirements Coverage Matrix\s*$/;
const NEXT_SECTION_RE = /^##\s+/;

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse the file into a list of task records:
 *   { id: string, line: number, deps: string[] }
 *
 * For each task header we look ahead within the same task's footer block for
 * a "_Depends on: ..._" line and harvest the cited task numbers. The footer
 * block ends at the next task header (top or sub) OR at the matrix section.
 */
export function parseTasks(text) {
  const lines = text.split(/\r?\n/);
  /** @type {Array<{ id: string, line: number, deps: string[], depsLine: number | null, depsRaw: string | null }>} */
  const tasks = [];
  /** @type {Set<string>} */
  const declared = new Set();
  let inMatrix = false;

  // First pass: collect task headers and their start-line indices.
  /** @type {Array<{ id: string, line: number }>} */
  const headers = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
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
      headers.push({ id: top[1], line: i });
      declared.add(top[1]);
      continue;
    }
    const sub = TASK_SUB_RE.exec(line);
    if (sub) {
      headers.push({ id: sub[1], line: i });
      declared.add(sub[1]);
    }
  }

  // Second pass: for each task header, scan the lines from its header up to
  // (but not including) the next header for a Depends-on footer.
  for (let h = 0; h < headers.length; h += 1) {
    const { id, line: startLine } = headers[h];
    const endLine = h + 1 < headers.length ? headers[h + 1].line : lines.length;

    /** @type {{ deps: string[], depsLine: number | null, depsRaw: string | null }} */
    const record = { deps: [], depsLine: null, depsRaw: null };
    for (let i = startLine + 1; i < endLine; i += 1) {
      const m = DEPENDS_ON_RE.exec(lines[i]);
      if (!m) continue;
      record.depsLine = i + 1;
      record.depsRaw = m[1];
      record.deps = parseDepsBody(m[1]);
      break;
    }
    tasks.push({ id, line: startLine + 1, ...record });
  }

  return { tasks, declared };
}

/**
 * Parse the body of a "_Depends on: ..._" footer. Returns the list of
 * referenced task numbers. Handles:
 *   - "(none — root task)" / "(none — ...)"  → []
 *   - "1, 2, 4.1"                           → ["1", "2", "4.1"]
 *   - "28 (the matrix and depends-on ...)"  → ["28"]  (parenthetical stripped)
 *
 * Returns the array of task-number strings; tokens that don't match
 * `\d+(?:\.\d+)?` after parenthetical stripping are silently skipped (the
 * caller flags an empty result via the raw body).
 */
function parseDepsBody(raw) {
  // Strip parenthetical notes (the longest paren group on the line wins).
  // We do a single non-greedy pass — nested parens are not used.
  const noParens = raw.replace(/\([^)]*\)/g, "").trim();
  if (!noParens) return [];
  // After paren-strip, "none" or empty body means no dependencies.
  if (/^none\b/i.test(noParens)) return [];

  /** @type {string[]} */
  const out = [];
  for (const rawTok of noParens.split(",")) {
    const tok = rawTok.trim();
    if (!tok) continue;
    const m = /^(\d+(?:\.\d+)*)$/.exec(tok);
    if (!m) continue;
    out.push(m[1]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Topological sort (Kahn's algorithm). Returns either the order or the set of
// nodes in a cycle.
// ---------------------------------------------------------------------------

/**
 * @param {string[]} nodes
 * @param {Map<string, string[]>} edgesFrom    node → list of nodes it depends on
 * @returns {{ order: string[] } | { cycle: string[] }}
 */
function topoSort(nodes, edgesFrom) {
  // We compute in-degree as the number of incoming edges from "the dependee
  // side": for each (task A depends on B), B → A. Kahn processes nodes with
  // in-degree 0 first.
  /** @type {Map<string, number>} */
  const inDegree = new Map();
  /** @type {Map<string, string[]>} */
  const outAdj = new Map();
  for (const n of nodes) {
    inDegree.set(n, 0);
    outAdj.set(n, []);
  }
  for (const [from, tos] of edgesFrom) {
    for (const to of tos) {
      // edge: `to` (dependency) → `from` (dependent)
      if (!outAdj.has(to)) outAdj.set(to, []);
      outAdj.get(to).push(from);
      inDegree.set(from, (inDegree.get(from) ?? 0) + 1);
    }
  }

  /** @type {string[]} */
  const queue = [];
  for (const [n, d] of inDegree) if (d === 0) queue.push(n);
  queue.sort(taskIdCompare); // deterministic

  /** @type {string[]} */
  const order = [];
  while (queue.length > 0) {
    const n = queue.shift();
    order.push(n);
    for (const succ of outAdj.get(n) ?? []) {
      inDegree.set(succ, inDegree.get(succ) - 1);
      if (inDegree.get(succ) === 0) {
        // insertion-sorted for determinism
        let lo = 0;
        let hi = queue.length;
        while (lo < hi) {
          const mid = (lo + hi) >>> 1;
          if (taskIdCompare(queue[mid], succ) < 0) lo = mid + 1;
          else hi = mid;
        }
        queue.splice(lo, 0, succ);
      }
    }
  }

  if (order.length !== nodes.length) {
    /** @type {string[]} */
    const cycle = [];
    for (const [n, d] of inDegree) if (d > 0) cycle.push(n);
    return { cycle };
  }
  return { order };
}

function taskIdCompare(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Verify a single tasks.md file. Returns `{ failures, nodes, edgeCount }`.
 * Exported for unit-test use.
 */
export function verifyTasksText(text, label = "tasks.md") {
  const { tasks, declared } = parseTasks(text);

  /** @type {string[]} */
  const failures = [];

  // Self-references.
  for (const t of tasks) {
    if (t.deps.includes(t.id)) {
      failures.push(
        `[verify-task-dependencies] SELF-REF (${label}): task ${t.id} (line ${t.line}) lists itself in its _Depends on:_ footer`,
      );
    }
  }

  // Dangling references.
  for (const t of tasks) {
    for (const dep of t.deps) {
      if (!declared.has(dep)) {
        failures.push(
          `[verify-task-dependencies] DANGLING (${label}): task ${t.id} (line ${t.line}) depends on task ${dep}, which is not declared anywhere in ${label}`,
        );
      }
    }
  }

  // Build edges map for topo sort (only edges with both endpoints declared,
  // and skipping self-edges so a single self-ref doesn't masquerade as a
  // cycle).
  /** @type {Map<string, string[]>} */
  const edgesFrom = new Map();
  let edgeCount = 0;
  for (const t of tasks) {
    /** @type {string[]} */
    const filtered = [];
    for (const d of t.deps) {
      if (d === t.id) continue;
      if (!declared.has(d)) continue;
      filtered.push(d);
      edgeCount += 1;
    }
    edgesFrom.set(t.id, filtered);
  }

  const nodes = tasks.map((t) => t.id);
  const result = topoSort(nodes, edgesFrom);
  if ("cycle" in result) {
    failures.push(
      `[verify-task-dependencies] CYCLE (${label}): the following tasks participate in one or more dependency cycles:\n  - ${result.cycle.sort(taskIdCompare).join(", ")}`,
    );
  }

  return { failures, nodes, edgeCount };
}

function main() {
  /** @type {string[]} */
  const allFailures = [];
  let totalNodes = 0;
  let totalEdges = 0;

  for (const p of TASKS_PATHS) {
    let text;
    try {
      text = readFileSync(p, "utf8");
    } catch {
      // Optional file — skip if absent.
      continue;
    }
    const label = path.relative(repoRoot, p) || p;
    const { failures, nodes, edgeCount } = verifyTasksText(text, label);
    allFailures.push(...failures);
    totalNodes += nodes.length;
    totalEdges += edgeCount;
  }

  if (allFailures.length > 0) {
    for (const f of allFailures) process.stderr.write(f + "\n");
    process.exit(1);
  }

  process.stdout.write(
    `[verify-task-dependencies] OK — ${totalNodes} tasks, ${totalEdges} edges, topological order verified\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
