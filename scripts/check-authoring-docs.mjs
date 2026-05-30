#!/usr/bin/env node
/**
 * check-authoring-docs.mjs
 *
 * Fail-loud heading-drift gate for the contributions-and-resources author
 * doc (Task 22, Req 8.2).
 *
 * Reads `docs/contributions-and-resources-authoring.md` and asserts that
 * each canonical section heading from Req 8.1 appears as an EXACT line.
 *
 * Behavior:
 *   - Missing heading → bare `::warning::<message>` on stdout (GitHub
 *     Actions annotation; precedent warn-no-pagefind.mjs:103) AND exit
 *     non-zero. CI and local behave identically (Req 8.2).
 *   - Doc file not found → exit non-zero, stderr error, NO annotation.
 *   - Doc zero-byte (or otherwise contentless) → warning per heading, exit
 *     non-zero (every heading is missing).
 *
 * The pure core `checkHeadings(docText)` is exported so the self-test does
 * not depend on the real doc file for synthetic cases.
 *
 * CLI:
 *   node scripts/check-authoring-docs.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const TAG = "[check-authoring-docs]";

const DOC_REL_PATH = "docs/contributions-and-resources-authoring.md";

/** Canonical headings from Req 8.1 — each must appear as an exact line. */
export const CANONICAL_HEADINGS = [
  "## Contributions YAML shape",
  "## Link kinds",
  "## Resources YAML shape",
  "## Resource categories",
  "## Seeding added for legacy bookmarks",
  "## Sort order",
  "## Empty-file behavior",
  "## No-draft policy and removal latency",
  "## Deep-link anchor stability",
];

/**
 * Pure core: assert each canonical heading appears as an exact line in the
 * doc text.
 *
 * @param {string} docText
 * @returns {{ exitCode: 0|1, missing: string[] }}
 */
export function checkHeadings(docText) {
  const lines = new Set(docText.split(/\r?\n/));
  const missing = CANONICAL_HEADINGS.filter((h) => !lines.has(h));
  return { exitCode: missing.length === 0 ? 0 : 1, missing };
}

/**
 * CLI entry point.
 */
function main() {
  const docPath = path.join(process.cwd(), DOC_REL_PATH);

  if (!existsSync(docPath)) {
    process.stderr.write(`${TAG} author doc not found: ${docPath}\n`);
    process.exit(1);
  }

  const docText = readFileSync(docPath, "utf8");
  const { exitCode, missing } = checkHeadings(docText);

  for (const heading of missing) {
    console.log(
      `::warning::${TAG} canonical heading missing from ${DOC_REL_PATH}: "${heading}"`,
    );
  }

  process.exit(exitCode);
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
