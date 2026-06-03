#!/usr/bin/env node
/**
 * verify-ci-topology.mjs
 *
 * Mechanical defense for the CI topology contract (design.md "CI build
 * separation" + r3 review Attack Surface 4). Parses the GitHub Actions
 * workflow at `.github/workflows/ci.yml` (or a path passed via argv) using
 * the `yaml` package and asserts five structural pins:
 *
 *   (a) BLOG_INCLUDE_DRAFTS is NOT present in workflow-level `env:` NOR in
 *       any job-level `env:` block.
 *   (b) The step `name: "Build 2 (production-mode)"` does NOT carry
 *       BLOG_INCLUDE_DRAFTS in its step-level `env:` block.
 *   (c) The step `name: "Clean for Build 2"` carries `if: always()`.
 *   (d) `"Touch Build 1 sentinel"` runs BEFORE `"Run e2e (Build 1)"` and
 *       `"Validate feed (Build 1)"`.
 *   (e) `"Verify production build (Build 2)"` runs AFTER
 *       `"Build 2 (production-mode)"` in the same job.
 *
 * Missing-step is FATAL — if any expected literal `name:` cannot be located,
 * the script exits non-zero naming the missing step.
 *
 * blog-enhanced extension (Task 25): nine additional ordered step literals
 * are checked when the transitional flag is enabled. Gating:
 *
 *   - `BLOG_ENHANCED_CI_LITERALS_REQUIRED=1` activates the new checks.
 *   - The marker file `scripts/__ci-topology-state.txt` holds either
 *     `PHASE_PRE_23` (default, flag optional) or `PHASE_POST_23.3`
 *     (flag REQUIRED — verifier fails if unset).
 *
 * CLI: `node scripts/verify-ci-topology.mjs [path-to-ci.yml]`
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const DRAFT_ENV = "BLOG_INCLUDE_DRAFTS";
const STATE_FILE = path.join(__dirname, "__ci-topology-state.txt");
const PHASE_PRE = "PHASE_PRE_23";
const PHASE_POST = "PHASE_POST_23.3";

const STEP_NAMES = {
  build2: "Build 2 (production-mode)",
  clean: "Clean for Build 2",
  sentinel: "Touch Build 1 sentinel",
  e2e: "Run e2e (Build 1)",
  validateFeed: "Validate feed (Build 1)",
  verify: "Verify production build (Build 2)",
};

/**
 * Ordered list of step literals introduced by blog-enhanced Task 23.x.
 * Order matters: each entry must appear AFTER the previous one in the
 * same job. The first entry pins position relative to the existing
 * "Typecheck" / "Unit tests" steps.
 */
const ENHANCED_STEPS_ORDERED = [
  "Verify getPublishedPosts callers",
  "Pagefind crawl (Build 2)",
  "Verify Pagefind index (Build 2)",
  "Upload Pagefind manifest",
  "Check Vercel auto-deploy status",
  "Vercel build",
  "Verify Pagefind artifact in .vercel/output",
  "Vercel deploy (Build 2)",
  "Warn deploying without Pagefind",
];

/**
 * Read the phase marker. Returns `PHASE_PRE_23` if the file is missing
 * (defensive default) — callers can still gate via the env var.
 */
function readPhaseMarker() {
  if (!existsSync(STATE_FILE)) return PHASE_PRE;
  const raw = readFileSync(STATE_FILE, "utf8").trim();
  if (raw === PHASE_POST) return PHASE_POST;
  return PHASE_PRE;
}

/**
 * Locate the job that contains the existing blog-core anchor step names.
 * That job is the canonical "Build 2 job" — the new Vercel deploy step
 * MUST appear inside the same job.
 */
function findBuild2Job(jobs) {
  for (const [jobId, job] of Object.entries(jobs)) {
    if (!job || typeof job !== "object") continue;
    const steps = Array.isArray(job.steps) ? job.steps : [];
    const hasBuild2 = steps.some((s) => s && typeof s === "object" && s.name === STEP_NAMES.build2);
    const hasVerify = steps.some((s) => s && typeof s === "object" && s.name === STEP_NAMES.verify);
    if (hasBuild2 && hasVerify) return jobId;
  }
  return null;
}

export function verify(yamlText, label = "ci.yml", opts = {}) {
  // Per spec v4 task-25 meta-gate:
  //   unset → emit a noisy warning naming the env var, but proceed (exit 0
  //     unless other checks fail)
  //   explicit "0" → FAIL (gate must remain enabled)
  //   "1" → proceed silently
  const envFlag =
    opts.literalsRequired !== undefined
      ? opts.literalsRequired === true
        ? "1"
        : opts.literalsRequired === false
          ? "0"
          : String(opts.literalsRequired)
      : process.env.BLOG_ENHANCED_CI_LITERALS_REQUIRED;
  const phase = opts.phase ?? readPhaseMarker();

  const errors = [];
  const fail = (msg) => errors.push(`${label}: ${msg}`);
  const warn = (msg) => {
    if (opts.silent) return;
    process.stderr.write(`verify-ci-topology: WARN ${label}: ${msg}\n`);
  };

  // Meta-gate: at PHASE_POST_23.3, the env var MUST NOT be =0.
  // Unset is a warn-only state to keep local Task 38 invocations green;
  // CI sets it to "1" explicitly so the warning never fires in CI.
  if (phase === PHASE_POST) {
    if (envFlag === "0") {
      fail(
        `[verify-ci-topology] meta-gate: env var BLOG_ENHANCED_CI_LITERALS_REQUIRED is explicitly =0 at PHASE_POST_23.3 — gate must remain enabled`,
      );
      return errors;
    }
    if (envFlag !== "1") {
      warn(
        `[verify-ci-topology] meta-gate: env var BLOG_ENHANCED_CI_LITERALS_REQUIRED is unset at PHASE_POST_23.3 — set it to "1" to silence this warning (CI sets it explicitly; local invocations should too)`,
      );
    }
  }

  let doc;
  try {
    doc = parse(yamlText);
  } catch (err) {
    fail(`YAML parse failed: ${err instanceof Error ? err.message : String(err)}`);
    return errors;
  }
  if (!doc || typeof doc !== "object") {
    fail("workflow root is not a mapping");
    return errors;
  }

  // (a) workflow-level env
  if (doc.env && Object.prototype.hasOwnProperty.call(doc.env, DRAFT_ENV)) {
    fail(`pin (a): workflow-level env contains ${DRAFT_ENV}`);
  }

  const jobs = doc.jobs;
  if (!jobs || typeof jobs !== "object") {
    fail("no `jobs:` mapping found");
    return errors;
  }

  for (const [jobId, job] of Object.entries(jobs)) {
    if (!job || typeof job !== "object") continue;

    // (a) job-level env
    if (job.env && Object.prototype.hasOwnProperty.call(job.env, DRAFT_ENV)) {
      fail(`pin (a): job "${jobId}" env contains ${DRAFT_ENV}`);
    }

    const steps = Array.isArray(job.steps) ? job.steps : [];
    const idx = {};
    for (const key of Object.keys(STEP_NAMES)) idx[key] = -1;
    steps.forEach((step, i) => {
      if (!step || typeof step !== "object") return;
      for (const [key, name] of Object.entries(STEP_NAMES)) {
        if (step.name === name) idx[key] = i;
      }
    });

    // Missing-step is fatal — only for jobs that look like the CI job
    // (i.e. contain at least one of the expected step names). If a job has
    // none of these names, skip — it's a different job, not the CI build
    // job. The real ci.yml has exactly one job containing all of them.
    const anyFound = Object.values(idx).some((v) => v >= 0);
    if (!anyFound) continue;

    for (const [key, name] of Object.entries(STEP_NAMES)) {
      if (idx[key] < 0) {
        fail(`missing step: no step named "${name}" found in job "${jobId}"`);
      }
    }

    // (b) Build 2 step env must not contain DRAFT_ENV
    if (idx.build2 >= 0) {
      const s = steps[idx.build2];
      if (s.env && Object.prototype.hasOwnProperty.call(s.env, DRAFT_ENV)) {
        fail(`pin (b): step "${STEP_NAMES.build2}" env contains ${DRAFT_ENV}`);
      }
    }

    // (c) Clean for Build 2 must carry if: always()
    if (idx.clean >= 0) {
      const s = steps[idx.clean];
      const cond = typeof s.if === "string" ? s.if.trim() : "";
      if (cond !== "always()") {
        fail(
          `pin (c): step "${STEP_NAMES.clean}" missing \`if: always()\` ` +
            `(found: ${cond ? JSON.stringify(cond) : "<unset>"})`,
        );
      }
    }

    // (d) Sentinel before e2e and validate-feed
    if (idx.sentinel >= 0 && idx.e2e >= 0 && idx.sentinel >= idx.e2e) {
      fail(
        `pin (d): step "${STEP_NAMES.sentinel}" (index ${idx.sentinel}) ` +
          `must precede "${STEP_NAMES.e2e}" (index ${idx.e2e})`,
      );
    }
    if (idx.sentinel >= 0 && idx.validateFeed >= 0 && idx.sentinel >= idx.validateFeed) {
      fail(
        `pin (d): step "${STEP_NAMES.sentinel}" (index ${idx.sentinel}) ` +
          `must precede "${STEP_NAMES.validateFeed}" (index ${idx.validateFeed})`,
      );
    }

    // (e) Verify after Build 2
    if (idx.verify >= 0 && idx.build2 >= 0 && idx.verify <= idx.build2) {
      fail(
        `pin (e): step "${STEP_NAMES.verify}" (index ${idx.verify}) ` +
          `must follow "${STEP_NAMES.build2}" (index ${idx.build2})`,
      );
    }
  }

  // -------------------------------------------------------------------
  // blog-enhanced (Task 25) — flag-gated extensions
  // -------------------------------------------------------------------
  // At PHASE_POST_23.3 the literals MUST exist; treat unset as effectively
  // on so the topology gates still run (warning was already emitted above).
  // At PHASE_PRE_23 the flag is opt-in.
  const flagOn = envFlag === "1" || phase === PHASE_POST;
  if (!flagOn) return errors;

  // Locate the canonical Build 2 job (the one carrying the blog-core
  // anchor steps). Required for step-GROUP assertion.
  const build2JobId = findBuild2Job(jobs);

  // Aggregate every step across all jobs so we can answer "does this
  // literal exist anywhere?" and "in which job?".
  /** @type {Array<{ name: string, jobId: string, index: number }>} */
  const allSteps = [];
  for (const [jobId, job] of Object.entries(jobs)) {
    if (!job || typeof job !== "object") continue;
    const steps = Array.isArray(job.steps) ? job.steps : [];
    steps.forEach((s, i) => {
      if (s && typeof s === "object" && typeof s.name === "string") {
        allSteps.push({ name: s.name, jobId, index: i });
      }
    });
  }

  const findStep = (name) => allSteps.find((s) => s.name === name) ?? null;

  // Missing-step is fatal under the flag.
  for (const name of ENHANCED_STEPS_ORDERED) {
    if (!findStep(name)) {
      fail(`missing step: no step named "${name}" found (blog-enhanced literals)`);
    }
  }

  // Ordering pin: each enhanced literal must appear AFTER the previous
  // one. We compare only when both endpoints were located AND live in
  // the same job (cross-job ordering is meaningless in GHA serial-step
  // semantics).
  const located = ENHANCED_STEPS_ORDERED.map(findStep);
  for (let i = 1; i < located.length; i += 1) {
    const prev = located[i - 1];
    const cur = located[i];
    if (!prev || !cur) continue;
    if (prev.jobId !== cur.jobId) continue;
    if (cur.index <= prev.index) {
      fail(
        `enhanced-order: step "${cur.name}" (index ${cur.index}) ` +
          `must follow "${prev.name}" (index ${prev.index}) in job "${cur.jobId}"`,
      );
    }
  }

  // Step-GROUP assertion: "Vercel deploy (Build 2)" must live in the
  // same job as the blog-core Build 2 anchors.
  const deployStep = findStep("Vercel deploy (Build 2)");
  if (deployStep && build2JobId && deployStep.jobId !== build2JobId) {
    fail(
      `enhanced-group: step "Vercel deploy (Build 2)" found in job ` +
        `"${deployStep.jobId}" but must live in Build 2 job "${build2JobId}"`,
    );
  }

  // "Verify getPublishedPosts callers" must sit AFTER Typecheck and
  // BEFORE Unit tests (spec'd anchor pair).
  const typecheck = findStep("Typecheck");
  const unitTests = findStep("Unit tests");
  const callers = findStep("Verify getPublishedPosts callers");
  if (callers && typecheck && callers.jobId === typecheck.jobId) {
    if (callers.index <= typecheck.index) {
      fail(
        `enhanced-anchor: step "Verify getPublishedPosts callers" ` +
          `(index ${callers.index}) must follow "Typecheck" (index ${typecheck.index})`,
      );
    }
  }
  if (callers && unitTests && callers.jobId === unitTests.jobId) {
    if (callers.index >= unitTests.index) {
      fail(
        `enhanced-anchor: step "Verify getPublishedPosts callers" ` +
          `(index ${callers.index}) must precede "Unit tests" (index ${unitTests.index})`,
      );
    }
  }

  return errors;
}

function main() {
  const argPath = process.argv[2];
  const target = argPath
    ? path.resolve(process.cwd(), argPath)
    : path.join(repoRoot, ".github/workflows/ci.yml");
  const label = path.relative(repoRoot, target) || target;

  let text;
  try {
    text = readFileSync(target, "utf8");
  } catch (err) {
    process.stderr.write(
      `verify-ci-topology: cannot read ${target}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(2);
  }

  const errors = verify(text, label);
  if (errors.length === 0) {
    process.stdout.write(`verify-ci-topology: PASS (${label})\n`);
    process.exit(0);
  }
  for (const e of errors) process.stderr.write(`verify-ci-topology: ${e}\n`);
  process.exit(1);
}

// Run when invoked directly (not when imported by the self-tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
