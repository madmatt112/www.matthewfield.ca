#!/usr/bin/env node
/**
 * check-velite-output.mjs
 *
 * Fail-loud CI gate for project-showcase (Task 19.5).
 *
 * Two modes:
 *
 * 1. Default (presence + shape gate)
 *    - Reads `.velite/projects.json` (relative to process.cwd()).
 *    - If missing → exit non-zero with a diagnostic pointing at
 *      `pnpm velite build` / `pnpm build`.
 *    - Parses the JSON, asserts it's an array, and (if non-empty) asserts
 *      each entry has the keys `slug`, `title`, `date`, `draft`. Shape
 *      failures exit non-zero, naming the offending entry's index.
 *    - On success: writes `[check-velite-output] OK — N entries
 *      (D drafts, P published)` to stdout.
 *
 * 2. `--verify-ci-wiring` (structural invariant)
 *    - Reads `.github/workflows/ci.yml`, parses via the `yaml` npm package,
 *      walks the steps under the `ci` job, and counts steps whose
 *      `name === "Check velite output before tests"`.
 *    - Asserts the count is EXACTLY 2 (one per build flavor).
 *    - On count ≠ 2, exits non-zero with `expected 2, got N`.
 *
 * Stale-detection note: this gate does NOT detect a stale `.velite/`
 * (file exists but reflects an older build). The dual-build CI's
 * `rm -rf .velite .next` between builds is the operational mitigation.
 *
 * CLI:
 *   node scripts/check-velite-output.mjs
 *   node scripts/check-velite-output.mjs --verify-ci-wiring
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse as yamlParse } from "yaml";

const STEP_NAME = "Check velite output before tests";
const CI_JOB_NAME = "ci";
/** @type {Record<string, "string" | "boolean">} */
const REQUIRED_ENTRY_SHAPE = {
  slug: "string",
  title: "string",
  date: "string",
  draft: "boolean",
};

/**
 * Presence + shape check on a parsed projects-json value.
 *
 * @param {unknown} parsed
 * @returns {{ ok: boolean, exitCode: 0|1, diagnostic: string }}
 */
export function checkProjectsShape(parsed) {
  if (!Array.isArray(parsed)) {
    return {
      ok: false,
      exitCode: 1,
      diagnostic: `[check-velite-output] .velite/projects.json is not an array (got ${typeof parsed})`,
    };
  }
  for (let i = 0; i < parsed.length; i++) {
    const entry = parsed[i];
    if (entry === null || typeof entry !== "object") {
      return {
        ok: false,
        exitCode: 1,
        diagnostic: `[check-velite-output] entry at index ${i} is not an object (got ${entry === null ? "null" : typeof entry})`,
      };
    }
    for (const [key, expectedType] of Object.entries(REQUIRED_ENTRY_SHAPE)) {
      const value = /** @type {Record<string, unknown>} */ (entry)[key];
      if (typeof value === "undefined") {
        return {
          ok: false,
          exitCode: 1,
          diagnostic: `[check-velite-output] entry at index ${i} is missing required key \`${key}\``,
        };
      }
      if (typeof value !== expectedType) {
        return {
          ok: false,
          exitCode: 1,
          diagnostic: `[check-velite-output] entry at index ${i} has wrong type for \`${key}\`: expected ${expectedType}, got ${typeof value}`,
        };
      }
    }
  }
  const drafts = parsed.filter((e) => e.draft === true).length;
  const published = parsed.length - drafts;
  return {
    ok: true,
    exitCode: 0,
    diagnostic: `[check-velite-output] OK — ${parsed.length} entries (${drafts} drafts, ${published} published)`,
  };
}

/**
 * Count the steps named STEP_NAME under the `ci` job in a parsed workflow.
 * Iterates ONLY the `ci` job — a future second job adding a step with the
 * same name must not inflate the count.
 *
 * @param {unknown} workflow
 * @returns {number}
 */
export function countCheckVeliteSteps(workflow) {
  if (workflow === null || typeof workflow !== "object") return 0;
  const jobs = /** @type {Record<string, unknown>} */ (workflow).jobs;
  if (jobs === null || typeof jobs !== "object") return 0;
  const job = /** @type {Record<string, unknown>} */ (jobs)[CI_JOB_NAME];
  if (job === null || typeof job !== "object") return 0;
  const steps = /** @type {Record<string, unknown>} */ (job).steps;
  if (!Array.isArray(steps)) return 0;
  let count = 0;
  for (const step of steps) {
    if (step !== null && typeof step === "object" && step.name === STEP_NAME) {
      count++;
    }
  }
  return count;
}

/**
 * --verify-ci-wiring mode.
 *
 * @param {string} ciFilePath
 * @returns {{ ok: boolean, exitCode: 0|1, diagnostic: string }}
 */
export function verifyCiWiring(ciFilePath) {
  if (!existsSync(ciFilePath)) {
    return {
      ok: false,
      exitCode: 1,
      diagnostic: `[check-velite-output --verify-ci-wiring] workflow file not found: ${ciFilePath}`,
    };
  }
  const raw = readFileSync(ciFilePath, "utf8");
  let workflow;
  try {
    workflow = yamlParse(raw);
  } catch (err) {
    return {
      ok: false,
      exitCode: 1,
      diagnostic: `[check-velite-output --verify-ci-wiring] yaml parse failed for ${ciFilePath}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  const count = countCheckVeliteSteps(workflow);
  if (count !== 2) {
    return {
      ok: false,
      exitCode: 1,
      diagnostic: `[check-velite-output --verify-ci-wiring] step "${STEP_NAME}" must appear exactly twice in ${ciFilePath}: expected 2, got ${count}`,
    };
  }
  return {
    ok: true,
    exitCode: 0,
    diagnostic: `[check-velite-output --verify-ci-wiring] OK — step "${STEP_NAME}" appears exactly 2 times`,
  };
}

/**
 * Default mode entry point.
 */
function runDefaultMode() {
  const veliteOutput = path.join(process.cwd(), ".velite/projects.json");
  if (!existsSync(veliteOutput)) {
    process.stderr.write(
      "[check-velite-output] .velite/projects.json is absent — run `pnpm velite build` (or `pnpm build`) before tests\n",
    );
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(veliteOutput, "utf8"));
  } catch (err) {
    process.stderr.write(
      `[check-velite-output] failed to parse ${veliteOutput}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
  const result = checkProjectsShape(parsed);
  if (result.ok) {
    process.stdout.write(`${result.diagnostic}\n`);
    process.exit(0);
  }
  process.stderr.write(`${result.diagnostic}\n`);
  process.exit(result.exitCode);
}

function parseArgs(argv) {
  const args = { verifyCiWiring: false };
  for (const a of argv) {
    if (a === "--verify-ci-wiring") {
      args.verifyCiWiring = true;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.verifyCiWiring) {
    const ciFilePath = path.join(process.cwd(), ".github/workflows/ci.yml");
    const result = verifyCiWiring(ciFilePath);
    if (result.ok) {
      process.stdout.write(`${result.diagnostic}\n`);
      process.exit(0);
    }
    process.stderr.write(`${result.diagnostic}\n`);
    process.exit(result.exitCode);
  }
  runDefaultMode();
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
