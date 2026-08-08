#!/usr/bin/env node
/**
 * check-authoring-docs.mjs
 *
 * Fail-loud heading-drift gate for the authoring docs listed in AUTHORING_DOCS.
 *
 * Behavior per doc:
 *   - Missing heading → bare `::warning::<message>` on stdout (GitHub
 *     Actions annotation) AND exit non-zero.
 *   - Doc file not found → exit non-zero, stderr error, NO annotation.
 *   - Doc zero-byte (or otherwise contentless) → warning per heading, exit
 *     non-zero (every heading is missing).
 *
 * All docs are checked before exiting (no early exit on first failure).
 *
 * The pure core `checkHeadings(docText, headings)` is exported so the
 * self-test does not depend on real doc files for synthetic cases.
 *
 * CLI:
 *   node scripts/check-authoring-docs.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const TAG = "[check-authoring-docs]";

/** Canonical headings for contributions-and-resources-authoring.md (Req 8.1). */
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

/** Canonical headings for slash-pages-authoring.md. */
export const SLASH_PAGES_HEADINGS = [
  "## Page frontmatter contract",
  "## Which file renders which page",
  "## Updating /now",
  "## Seed content expectation",
];

/** Canonical headings for playground-authoring.md. */
export const PLAYGROUND_HEADINGS = [
  "## Where item modules live",
  "## Adding a manifest entry",
  "## Choosing an isolation mode",
  "## CSS Modules and the no-global-CSS rule",
  "## Import boundaries",
  "## Overlay containment (M2)",
  "## Launch constraints",
];

/** Canonical headings for experience-authoring.md. */
export const EXPERIENCE_HEADINGS = [
  "## Source of truth",
  "## Experience YAML shape",
  "## Dates and the current role",
  "## Deliveries and project links",
  "## Skills YAML shape",
  "## Education YAML shape",
  "## The professional summary",
  "## The R3 curation checklist",
  "## One interests list and one voice",
  "## What the build checks and what it cannot",
];

/** All authoring docs to check. */
export const AUTHORING_DOCS = [
  {
    path: "docs/contributions-and-resources-authoring.md",
    headings: CANONICAL_HEADINGS,
  },
  {
    path: "docs/slash-pages-authoring.md",
    headings: SLASH_PAGES_HEADINGS,
  },
  {
    path: "docs/playground-authoring.md",
    headings: PLAYGROUND_HEADINGS,
  },
  {
    path: "docs/experience-authoring.md",
    headings: EXPERIENCE_HEADINGS,
  },
];

/**
 * Pure core: assert each heading appears as an exact line in the doc text.
 *
 * @param {string} docText
 * @param {string[]} headings
 * @returns {{ exitCode: 0|1, missing: string[] }}
 */
export function checkHeadings(docText, headings) {
  const lines = new Set(docText.split(/\r?\n/));
  const missing = headings.filter((h) => !lines.has(h));
  return { exitCode: missing.length === 0 ? 0 : 1, missing };
}

/**
 * CLI entry point. Iterates all docs and aggregates exit code.
 *
 * @param {{ path: string, headings: string[] }[]} docs
 */
export function main(docs) {
  let exitCode = 0;

  for (const { path: rel, headings } of docs) {
    const docPath = path.join(process.cwd(), rel);

    if (!existsSync(docPath)) {
      process.stderr.write(`${TAG} author doc not found: ${docPath}\n`);
      exitCode = 1;
      continue;
    }

    const docText = readFileSync(docPath, "utf8");
    const { exitCode: docExit, missing } = checkHeadings(docText, headings);

    for (const heading of missing) {
      console.log(`::warning::${TAG} canonical heading missing from ${rel}: "${heading}"`);
    }

    if (docExit !== 0) exitCode = 1;
  }

  process.exit(exitCode);
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main(AUTHORING_DOCS);
}
