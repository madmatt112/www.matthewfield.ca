#!/usr/bin/env node
/**
 * verify-content-canary-regex-pair.mjs
 *
 * Mechanical defense for the CONTENT chokepoint canary ↔ regex-list
 * pair-update contract (contributions-and-resources Task 11). This is a
 * SEPARATE gate from verify-canary-regex-pair.mjs (the projects pair):
 * the two pairs evolve independently, so they get independent gates with
 * independent TRACKED_SETs. Coupling them into one flat set would FAIL a
 * future single-pair PR (r3 finding #4).
 *
 * The content chokepoint canary fixture and the regex list inside
 * `src/lib/build/check-content-chokepoint.test.ts` must evolve together —
 * extending one without the other silently breaks the chokepoint invariant.
 *
 * TRACKED PAIR (TWO files):
 *   - src/__fixtures__/content-chokepoint-canary.ts
 *   - src/lib/build/check-content-chokepoint.test.ts
 *
 * PAIR RULE: BOTH present OR NEITHER. Strict subset → exit non-zero.
 *
 * REVERT-SHAPE DETECTION: a single-commit revert of a paired change
 * (HEAD message matches /^Revert "?/) restores the broken-pair window.
 * Treat any strict subset (including the empty subset) of the tracked
 * pair as a violation when HEAD is a revert. Remediation: a
 * 'revert + paired re-apply' two-commit sequence, or opening a PR
 * whose branch reaches the paired state.
 *
 * MERGE-QUEUE / SQUASH-MERGE SEMANTICS:
 *   - GitHub's squash-merge collapses commits before main; the
 *     resulting main HEAD touches both paths in one squashed commit
 *     → passes the all-or-none check.
 *   - Merge-queue events set GITHUB_BASE_REF per merge attempt → the
 *     gate runs per-attempt and gates each attempt independently.
 *   - On `push` events (direct-to-main or merge), GITHUB_BASE_REF is
 *     unset; we fall back to `origin/main`. The revert-shape detection
 *     catches direct-push-to-main reverts.
 *
 * TESTABILITY SEAM: the core check function `verifyContentCanaryRegexPair`
 * accepts `{ changedFiles, headSubject }` as plain arguments. The CLI
 * entrypoint `main()` collects those inputs from git subprocesses,
 * then delegates. Self-tests bypass git entirely by importing
 * `verifyContentCanaryRegexPair` and passing fixture-derived inputs. The
 * CLI runs only when invoked directly (guarded via
 * `process.argv[1] === fileURLToPath(import.meta.url)`).
 *
 * NO external deps beyond Node built-ins + `git` subprocess.
 *
 * CLI: `node scripts/verify-content-canary-regex-pair.mjs`
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const TRACKED_SET = Object.freeze([
  "src/__fixtures__/content-chokepoint-canary.ts",
  "src/lib/build/check-content-chokepoint.test.ts",
]);

const REVERT_RE = /^Revert "?/;

/**
 * Core check.
 *
 * @param {object} input
 * @param {string[]} input.changedFiles - paths from `git diff --name-only`
 * @param {string} input.headSubject - HEAD commit subject (first line)
 * @returns {{ ok: boolean, exitCode: 0|1, diagnostic: string, kase: string }}
 */
export function verifyContentCanaryRegexPair({ changedFiles, headSubject }) {
  const tracked = new Set(TRACKED_SET);
  const touched = changedFiles.filter((p) => tracked.has(p));
  const present = TRACKED_SET.filter((p) => touched.includes(p));
  const missing = TRACKED_SET.filter((p) => !touched.includes(p));

  const isRevert = REVERT_RE.test(headSubject ?? "");

  // Revert-shape: any strict subset (including empty) of the tracked
  // pair on a revert HEAD is a violation. A FULL re-application
  // (both files present) on a revert HEAD is the legitimate
  // 'revert + paired re-apply' end-state and passes.
  if (isRevert && present.length < TRACKED_SET.length) {
    return {
      ok: false,
      exitCode: 1,
      kase: "revert-shape-subset",
      diagnostic:
        `Revert-shape commit touches paired files: a single-commit revert of a ` +
        `content-canary↔regex-list paired change restores the broken-pair window. Use a ` +
        `'revert + paired re-apply' two-commit sequence, OR open a PR with the ` +
        `revert and reach the paired state via the PR's branch.\n` +
        `  HEAD subject: ${JSON.stringify(headSubject ?? "")}\n` +
        `  present in diff (${present.length}/${TRACKED_SET.length}): ${
          present.length ? present.join(", ") : "<none>"
        }\n` +
        `  missing from diff: ${missing.length ? missing.join(", ") : "<none>"}`,
    };
  }

  // Non-revert path. Both OR neither.
  if (present.length === 0) {
    return {
      ok: true,
      exitCode: 0,
      kase: "none-touched",
      diagnostic:
        "verify-content-canary-regex-pair: PASS (none-touched) — no tracked files in diff",
    };
  }
  if (present.length === TRACKED_SET.length) {
    return {
      ok: true,
      exitCode: 0,
      kase: "all-touched",
      diagnostic:
        "verify-content-canary-regex-pair: PASS (all-touched) — both paired files in diff",
    };
  }

  // Strict subset — non-zero with diagnostic that NAMES the actually-missing path(s).
  return {
    ok: false,
    exitCode: 1,
    kase: "strict-subset",
    diagnostic:
      `Content-canary↔regex-list paired-merge violation: tracked PAIR of ${TRACKED_SET.length} files ` +
      `must be BOTH present or NEITHER — strict subset detected.\n` +
      `  present in diff (${present.length}/${TRACKED_SET.length}): ${present.join(", ")}\n` +
      `  missing from diff: ${missing.join(", ")}`,
  };
}

/**
 * Resolve the diff base (BASE...HEAD). `GITHUB_BASE_REF` is set on
 * `pull_request` events; on `push` events fall back to `origin/main`.
 */
function resolveBase() {
  const baseRef = process.env.GITHUB_BASE_REF;
  if (baseRef && baseRef.trim() !== "") {
    return `origin/${baseRef.trim()}`;
  }
  return "origin/main";
}

function gitChangedFiles(base) {
  try {
    const out = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], {
      encoding: "utf8",
    });
    return out
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  } catch (err) {
    process.stderr.write(
      `verify-content-canary-regex-pair: WARN unable to compute diff against ${base}: ` +
        `${err instanceof Error ? err.message : String(err)}\n` +
        `verify-content-canary-regex-pair: assuming empty diff (non-PR context skip)\n`,
    );
    return [];
  }
}

function gitHeadSubject() {
  try {
    return execFileSync("git", ["log", "-1", "--format=%s", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch (err) {
    process.stderr.write(
      `verify-content-canary-regex-pair: WARN unable to read HEAD subject: ` +
        `${err instanceof Error ? err.message : String(err)}\n`,
    );
    return "";
  }
}

function main() {
  const base = resolveBase();
  const changedFiles = gitChangedFiles(base);
  const headSubject = gitHeadSubject();

  const result = verifyContentCanaryRegexPair({ changedFiles, headSubject });
  if (result.ok) {
    process.stdout.write(`${result.diagnostic}\n`);
    process.exit(0);
  }
  process.stderr.write(`verify-content-canary-regex-pair: FAIL (${result.kase})\n`);
  process.stderr.write(`${result.diagnostic}\n`);
  process.exit(result.exitCode);
}

// Run when invoked directly (not when imported by self-tests).
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
