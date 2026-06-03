#!/usr/bin/env node
import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const sourceDir = "public/pagefind";
const targetDir = ".vercel/output/static/pagefind";

if (!existsSync(sourceDir)) {
  console.error(`[verify-pagefind-artifact] missing source: ${sourceDir}`);
  process.exit(1);
}
if (!existsSync(targetDir)) {
  console.error(
    `[verify-pagefind-artifact] missing target: ${targetDir} — vercel build did not preserve public/pagefind/`,
  );
  process.exit(1);
}

function checksum(dir) {
  return execSync(`(cd ${dir} && find . -type f | sort | xargs sha256sum) | sha256sum`, {
    encoding: "utf-8",
    shell: "/bin/bash",
  }).trim();
}

const sourceSum = checksum(sourceDir);
const targetSum = checksum(targetDir);

if (sourceSum !== targetSum) {
  // Print per-file diff for diagnosis. `diff` exits with code 1 when files
  // differ — use spawnSync so a non-zero exit doesn't throw.
  const result = spawnSync(
    "/bin/bash",
    [
      "-c",
      `diff <(cd ${sourceDir} && find . -type f | sort) <(cd ${targetDir} && find . -type f | sort)`,
    ],
    { encoding: "utf-8" },
  );
  const diff = result.stdout || "(file lists identical — content differs)";
  console.error(
    `[verify-pagefind-artifact] mismatch:\n  source(${sourceDir}) = ${sourceSum}\n  target(${targetDir}) = ${targetSum}\n${diff}`,
  );
  process.exit(1);
}

console.log(`[verify-pagefind-artifact] OK (${sourceSum.slice(0, 8)}…)`);
