#!/usr/bin/env node
/**
 * run-lhci.mjs
 *
 * Wrapper around `lhci autorun` that cleans up the user-data-dir
 * directories chrome-launcher (1.2.x) leaks into the repo root under WSL.
 *
 * Root cause (chrome-launcher utils.js `makeTmpDir`): the WSL case falls
 * through (no `break`) to `makeWin32TmpDir`, which builds a tmpdir name
 * out of `process.env.PATH` matched against `/mnt/c/Users/.../AppData/`.
 * `path.join` on Linux treats `\` as a regular char, so `mkdirSync` ends
 * up creating a single directory with literal Windows-style backslashes
 * in its name inside the CWD. Two flavours have been observed:
 *
 *   - `C:\Users\<user>\AppData\Local\lighthouse.NNNNNN` (when PATH
 *     contains a Windows `/mnt/c/Users/.../AppData/` entry).
 *   - `\\wsl.localhost\Ubuntu\<cwd>\undefined:\Users\undefined\AppData\Local\lighthouse.NNNNNN`
 *     (when PATH has no such entry — `getWSLLocalAppDataPath` then returns
 *     a string with literal `undefined` segments which `wslpath -u` rewrites
 *     to a UNC path through the current cwd).
 *
 * The cleanest fix is a patch to chrome-launcher (add `break;` after the
 * WSL case so it lands in `makeUnixTmpDir`). Until that ships upstream,
 * this wrapper:
 *   1. Snapshots the entries under the repo root before lhci runs.
 *   2. Invokes lhci with the user's args forwarded.
 *   3. Deletes any new top-level entries whose names start with `C:` or
 *      `\\` (the two leak flavours) post-run, regardless of lhci's exit
 *      status.
 *
 * Usage: `node scripts/run-lhci.mjs [lhci args...]` (or `pnpm lhci ...`).
 */
import { readdirSync, rmSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function snapshotRepoTopLevel() {
  return new Set(readdirSync(repoRoot));
}

function isLeakName(name) {
  return name.startsWith("C:") || name.startsWith("\\\\") || name.startsWith("\\");
}

function cleanupLeaks(before) {
  const after = readdirSync(repoRoot);
  let removed = 0;
  for (const name of after) {
    if (before.has(name)) continue;
    if (!isLeakName(name)) continue;
    const abs = path.join(repoRoot, name);
    try {
      const stat = statSync(abs);
      if (!stat.isDirectory()) continue;
    } catch {
      continue;
    }
    try {
      rmSync(abs, { recursive: true, force: true });
      removed += 1;
    } catch (err) {
      process.stderr.write(
        `run-lhci: failed to remove leaked dir "${name}": ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }
  if (removed > 0) {
    process.stderr.write(
      `run-lhci: cleaned up ${removed} chrome-launcher leak director${removed === 1 ? "y" : "ies"}.\n`,
    );
  }
}

const before = snapshotRepoTopLevel();

const env = {
  ...process.env,
  // Default to the local Chromium binary so headless Chrome doesn't try to
  // launch the Windows-side install over WSL interop (which would expand
  // the WSL UNC leak further).
  CHROME_PATH: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
};

const args = ["exec", "lhci", "autorun", ...process.argv.slice(2)];
const child = spawn("pnpm", args, { stdio: "inherit", cwd: repoRoot, env });

function exitWith(code) {
  cleanupLeaks(before);
  process.exit(code);
}

child.on("exit", (code, signal) => exitWith(signal ? 1 : (code ?? 0)));
child.on("error", (err) => {
  process.stderr.write(`run-lhci: failed to spawn pnpm exec lhci: ${err.message}\n`);
  exitWith(1);
});
process.on("SIGINT", () => {
  try {
    child.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  exitWith(130);
});
process.on("SIGTERM", () => {
  try {
    child.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  exitWith(143);
});
