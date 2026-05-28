#!/usr/bin/env node
/**
 * check-lighthouse-cadence.mjs
 *
 * Lighthouse re-verification cadence check (Req 12.0, Task 28.4).
 *
 * Counts published, non-fixture projects in `.velite/projects.json` and
 * compares against the most recent run entry recorded in
 * `docs/projects-showcase-lighthouse-runs.md`. Fires red (exit non-zero) when
 *   (current_count - last_count) >= 3 AND current_count % 3 === 0
 * — i.e. another batch of three real projects has shipped since the last
 * Lighthouse run was logged. Otherwise exits 0 with a short summary.
 *
 * Wired into CI as a final step after Build 2 in .github/workflows/ci.yml
 * (step name: "Check Lighthouse cadence"). Also runnable on-demand via the
 * workflow_dispatch trigger on the CI workflow.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const PROJECTS_JSON = path.join(repoRoot, ".velite/projects.json");
const RUNS_LOG = path.join(repoRoot, "docs/projects-showcase-lighthouse-runs.md");
const CADENCE_N = 3;

function fail(msg) {
  console.error(`[lighthouse-cadence] ${msg}`);
  process.exit(1);
}

if (!existsSync(PROJECTS_JSON)) {
  fail(
    `missing ${path.relative(repoRoot, PROJECTS_JSON)} — run \`pnpm build\` (Build 2) before this script.`,
  );
}

let projects;
try {
  projects = JSON.parse(readFileSync(PROJECTS_JSON, "utf-8"));
} catch (err) {
  fail(`failed to parse ${path.relative(repoRoot, PROJECTS_JSON)}: ${err.message}`);
}

if (!Array.isArray(projects)) {
  fail(
    `${path.relative(repoRoot, PROJECTS_JSON)} is not an array — velite output shape changed?`,
  );
}

const currentCount = projects.filter(
  (p) => !p.draft && !/^fixture-/.test(p.slug),
).length;

// Parse the most-recent run entry's published-count line from the runs log.
// Format pinned in docs/projects-showcase-lighthouse-runs.md:
//   - Published projects at run time: N
// We take the FIRST such line in the file (run entries are appended in
// reverse-chronological order: Run 1 — launch is the latest entry until a
// new run is added above it). To be robust to either ordering, we instead
// take the LAST occurrence — runs appended at the bottom of the file are
// then the latest. The runs-log heading discipline appends Run K above the
// previous entry, so "first occurrence" is the latest. We match that style.
let lastCount = 0;
if (existsSync(RUNS_LOG)) {
  const logText = readFileSync(RUNS_LOG, "utf-8");
  const match = logText.match(/^-\s*Published projects at run time:\s*(\d+)\s*$/m);
  if (match) {
    lastCount = Number.parseInt(match[1], 10);
    if (!Number.isFinite(lastCount) || lastCount < 0) {
      fail(
        `parsed invalid last_count (${match[1]}) from ${path.relative(repoRoot, RUNS_LOG)}.`,
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

if (delta >= CADENCE_N && currentCount % CADENCE_N === 0) {
  console.error(
    `[lighthouse-cadence] CADENCE TRIGGER — ${currentCount} published projects ` +
      `(fixtures excluded), last Lighthouse run at ${lastCount}. ` +
      `Run Lighthouse against /projects and a representative /projects/<slug>, ` +
      `then append a new run entry to ${path.relative(repoRoot, RUNS_LOG)} ` +
      `with "- Published projects at run time: ${currentCount}".`,
  );
  process.exit(1);
}

console.log(
  `[lighthouse-cadence] OK — ${currentCount} published (fixtures excluded), ` +
    `last run at ${lastCount}, next check at ${nextCheckAt}`,
);
process.exit(0);
