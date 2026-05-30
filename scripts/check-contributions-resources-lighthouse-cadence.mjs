#!/usr/bin/env node
/**
 * check-contributions-resources-lighthouse-cadence.mjs
 *
 * Lighthouse re-verification cadence check for the contributions-and-resources
 * feature (Req NFR-Performance, Task 23).
 *
 * Structural clone of `scripts/check-lighthouse-cadence.mjs` (the N=3
 * project-showcase guard), adapted for the two-page feature:
 *   count = contributions.length + resources.length
 *           (from `.velite/contributions.json` + `.velite/resources.json`)
 * compared against the most recent run entry recorded in
 * `docs/contributions-and-resources-lighthouse-runs.md`. Fires red (exit
 * non-zero) when
 *   (current_count - last_count) >= 10
 * — i.e. another batch of ten entries has shipped across the two pages since
 * the last Lighthouse run was logged. Otherwise exits 0 with a short summary.
 *
 * Two-file-missing semantics: if EITHER .velite JSON is absent, this is a
 * broken build (NOT a count of 0) — exit non-zero NAMING the missing file.
 *
 * CI wiring is Task 24 (after Build 2, where .velite/*.json exist).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const CONTRIBUTIONS_JSON = path.join(repoRoot, ".velite/contributions.json");
const RESOURCES_JSON = path.join(repoRoot, ".velite/resources.json");
const RUNS_LOG = path.join(
  repoRoot,
  "docs/contributions-and-resources-lighthouse-runs.md",
);
const CADENCE_N = 10;

function fail(msg) {
  console.error(`[contrib-resources-lighthouse-cadence] ${msg}`);
  process.exit(1);
}

// Two-file-missing semantics (r3 5e): a missing .velite JSON is a broken build,
// not a count of 0. Exit non-zero naming the offending file.
function loadCollection(jsonPath) {
  if (!existsSync(jsonPath)) {
    fail(
      `missing ${path.relative(repoRoot, jsonPath)} — run \`pnpm build\` (Build 2) before this script.`,
    );
  }

  let data;
  try {
    data = JSON.parse(readFileSync(jsonPath, "utf-8"));
  } catch (err) {
    fail(`failed to parse ${path.relative(repoRoot, jsonPath)}: ${err.message}`);
  }

  if (!Array.isArray(data)) {
    fail(
      `${path.relative(repoRoot, jsonPath)} is not an array — velite output shape changed?`,
    );
  }

  return data;
}

const contributions = loadCollection(CONTRIBUTIONS_JSON);
const resources = loadCollection(RESOURCES_JSON);

const currentCount = contributions.length + resources.length;

// Parse the latest run entry's count line from the runs log.
// Format pinned in docs/contributions-and-resources-lighthouse-runs.md:
//   - Entries at run time (contributions + resources): N
// Ordering contract: new run entries are APPENDED AT THE BOTTOM of the file, so
// the parser takes the LAST matching line — `match()` (first match) would
// silently couple lastCount to the launch entry forever and prevent the guard
// from clearing after its first fire.
let lastCount = 0;
if (existsSync(RUNS_LOG)) {
  const logText = readFileSync(RUNS_LOG, "utf-8");
  const matches = [
    ...logText.matchAll(
      /^-\s*Entries at run time \(contributions \+ resources\):\s*(\d+)\s*$/gm,
    ),
  ];
  const lastMatch = matches.at(-1);
  if (lastMatch) {
    lastCount = Number.parseInt(lastMatch[1], 10);
    if (!Number.isFinite(lastCount) || lastCount < 0) {
      fail(
        `parsed invalid last_count (${lastMatch[1]}) from ${path.relative(repoRoot, RUNS_LOG)}.`,
      );
    }
  } else {
    // Log file present but no run entry yet — treat as last_count = 0.
    lastCount = 0;
  }
} else {
  // No log file at all — treat as last_count = 0.
  lastCount = 0;
}

const delta = currentCount - lastCount;
const nextCheckAt = lastCount + CADENCE_N;

// Trigger on delta alone (no absolute-count modulo gate) — Req NFR-Performance
// asks for re-verification every CADENCE_N entries; `delta >= CADENCE_N` is the
// faithful expression of that intent and does not silently skip batch-adds.
if (delta >= CADENCE_N) {
  console.error(
    `[contrib-resources-lighthouse-cadence] CADENCE TRIGGER — ${currentCount} ` +
      `entries (contributions + resources), last Lighthouse run at ${lastCount}. ` +
      `Run Lighthouse against /contributions and /resources, then append a new ` +
      `run entry to ${path.relative(repoRoot, RUNS_LOG)} with ` +
      `"- Entries at run time (contributions + resources): ${currentCount}".`,
  );
  process.exit(1);
}

console.log(
  `[contrib-resources-lighthouse-cadence] OK — ${currentCount} entries ` +
    `(contributions + resources), last run at ${lastCount}, next check at ${nextCheckAt}`,
);
process.exit(0);
