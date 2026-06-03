#!/usr/bin/env node
/**
 * verify-chosen-path.mjs (blog-enhanced Task 25, v4)
 *
 * Reads the `CHOSEN_PATH:` first line of
 *   .spec-workflow/specs/blog-enhanced/Implementation Logs/task-6.4-velite-api-spike.md
 * and asserts the current working-tree diff aligns with that choice:
 *
 *   CHOSEN_PATH: HOOK
 *     - diff MUST modify velite.config.ts
 *     - diff MUST NOT add scripts/verify-series-order.mjs
 *     - diff MUST NOT modify package.json `scripts.build`
 *
 *   CHOSEN_PATH: SCRIPT
 *     - diff MUST add scripts/verify-series-order.mjs
 *     - diff MUST modify package.json `scripts.build`
 *     - diff MUST NOT add a collision-check clause to velite.config.ts
 *
 * Closes r3 attack 2 (implementer-cognitive-judgment risk) by mechanically
 * gating the runtime that Task 6.4.1's implementation paired with the
 * logged decision.
 *
 * For self-test use, the verifier accepts a unified-diff string via
 * `--diff-file <path>` and a chosen-path override via
 * `--chosen-path HOOK|SCRIPT`.
 *
 * CLI: `node scripts/verify-chosen-path.mjs [--diff-file <path>] [--chosen-path HOOK|SCRIPT]`
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const LOG_PATH = path.join(
  repoRoot,
  ".spec-workflow/specs/blog-enhanced/Implementation Logs/task-6.4-velite-api-spike.md",
);

/**
 * Read the CHOSEN_PATH directive from the spike log's first line.
 * Returns "HOOK" | "SCRIPT" | null.
 */
export function readChosenPath(logText) {
  const firstLine = logText.split(/\r?\n/, 1)[0]?.trim() ?? "";
  const m = /^CHOSEN_PATH:\s*(HOOK|SCRIPT)\b/.exec(firstLine);
  return m ? m[1] : null;
}

/**
 * Parse a unified-diff into a small structural summary:
 *   { modifiedFiles, addedFiles, deletedFiles, hunksByFile }
 *
 * `hunksByFile` is { [path]: string } — the concatenated `+`/`-` body
 * for the file, used by callers to look for specific substrings.
 */
export function parseDiff(diffText) {
  /** @type {Set<string>} */
  const modifiedFiles = new Set();
  /** @type {Set<string>} */
  const addedFiles = new Set();
  /** @type {Set<string>} */
  const deletedFiles = new Set();
  /** @type {Record<string, string>} */
  const hunksByFile = {};

  const lines = diffText.split(/\r?\n/);
  /** @type {string | null} */
  let curFile = null;
  /** @type {"modify" | "add" | "delete"} */
  let curMode = "modify";

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const dh = /^diff --git a\/(\S+) b\/(\S+)/.exec(line);
    if (dh) {
      curFile = dh[2];
      curMode = "modify";
      hunksByFile[curFile] = hunksByFile[curFile] ?? "";
      continue;
    }
    if (line.startsWith("new file mode") && curFile) {
      curMode = "add";
      addedFiles.add(curFile);
      continue;
    }
    if (line.startsWith("deleted file mode") && curFile) {
      curMode = "delete";
      deletedFiles.add(curFile);
      continue;
    }
    if (line.startsWith("--- ") || line.startsWith("+++ ")) continue;
    if (line.startsWith("@@")) continue;
    if (curFile && (line.startsWith("+") || line.startsWith("-"))) {
      hunksByFile[curFile] += line + "\n";
      if (curMode === "modify") modifiedFiles.add(curFile);
    }
  }

  // A file is "modified" if it's in any hunk and not purely add/delete.
  for (const f of addedFiles) modifiedFiles.delete(f);
  for (const f of deletedFiles) modifiedFiles.delete(f);

  return { modifiedFiles, addedFiles, deletedFiles, hunksByFile };
}

/**
 * Apply the chosen-path rules against a parsed diff. Returns an array
 * of human-readable failure strings (empty = pass).
 */
export function checkChosenPath(chosen, diff) {
  /** @type {string[]} */
  const errors = [];
  const veliteTouched =
    diff.modifiedFiles.has("velite.config.ts") || diff.addedFiles.has("velite.config.ts");
  const verifyScriptAdded = diff.addedFiles.has("scripts/verify-series-order.mjs");
  const pkgJsonHunk = diff.hunksByFile["package.json"] ?? "";
  const pkgBuildModified = /"build"\s*:/.test(pkgJsonHunk);
  const veliteHunk = diff.hunksByFile["velite.config.ts"] ?? "";
  // Detect the collision-check clause by looking for hook keys (prepare/
  // complete) OR a textual marker like `seriesOrder` in added lines.
  const veliteHasCollisionClause = /^\+.*(prepare\b|complete\b|seriesOrder)/m.test(veliteHunk);

  if (chosen === "HOOK") {
    if (!veliteTouched) {
      errors.push(
        `[verify-chosen-path] HOOK: diff must modify velite.config.ts, but no such hunks found`,
      );
    }
    if (verifyScriptAdded) {
      errors.push(
        `[verify-chosen-path] HOOK: diff must NOT add scripts/verify-series-order.mjs, but it was added`,
      );
    }
    if (pkgBuildModified) {
      errors.push(
        `[verify-chosen-path] HOOK: diff must NOT modify package.json scripts.build, but it was changed`,
      );
    }
  } else if (chosen === "SCRIPT") {
    if (!verifyScriptAdded) {
      errors.push(
        `[verify-chosen-path] SCRIPT: diff must add scripts/verify-series-order.mjs, but it was not added`,
      );
    }
    if (!pkgBuildModified) {
      errors.push(
        `[verify-chosen-path] SCRIPT: diff must modify package.json scripts.build, but no such change found`,
      );
    }
    if (veliteHasCollisionClause) {
      errors.push(
        `[verify-chosen-path] SCRIPT: diff must NOT add a collision-check clause to velite.config.ts, but one was added`,
      );
    }
  } else {
    errors.push(`[verify-chosen-path] CHOSEN_PATH is "${chosen}" — expected "HOOK" or "SCRIPT"`);
  }

  return errors;
}

function parseArgs(argv) {
  const out = { diffFile: null, chosenPath: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--diff-file") out.diffFile = argv[++i];
    else if (argv[i] === "--chosen-path") out.chosenPath = argv[++i];
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  let chosen = args.chosenPath;
  if (!chosen) {
    if (!existsSync(LOG_PATH)) {
      process.stderr.write(
        `[verify-chosen-path] cannot read ${LOG_PATH} — task-6.4 spike log missing\n`,
      );
      process.exit(2);
    }
    chosen = readChosenPath(readFileSync(LOG_PATH, "utf8"));
    if (!chosen) {
      process.stderr.write(
        `[verify-chosen-path] could not parse "CHOSEN_PATH: HOOK|SCRIPT" from first line of ${LOG_PATH}\n`,
      );
      process.exit(2);
    }
  }

  let diffText;
  if (args.diffFile) {
    diffText = readFileSync(args.diffFile, "utf8");
  } else {
    // Working-tree diff vs HEAD, including new (untracked) files.
    // `git diff HEAD` skips untracked; we layer on a separate listing of
    // untracked-but-tracked-eligible files and synthesize a minimal
    // "new file mode" header for each.
    try {
      diffText = execSync("git diff HEAD", {
        cwd: repoRoot,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
      });
      const untracked = execSync("git ls-files --others --exclude-standard", {
        cwd: repoRoot,
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
      })
        .split(/\r?\n/)
        .filter(Boolean);
      for (const f of untracked) {
        diffText += `diff --git a/${f} b/${f}\nnew file mode 100644\n--- /dev/null\n+++ b/${f}\n`;
      }
    } catch (err) {
      process.stderr.write(
        `[verify-chosen-path] git diff failed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      process.exit(2);
    }
  }

  const diff = parseDiff(diffText);
  const errors = checkChosenPath(chosen, diff);
  if (errors.length === 0) {
    process.stdout.write(`[verify-chosen-path] OK — CHOSEN_PATH=${chosen}, diff aligns\n`);
    process.exit(0);
  }
  for (const e of errors) process.stderr.write(e + "\n");
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
