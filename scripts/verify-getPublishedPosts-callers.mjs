#!/usr/bin/env node
/**
 * verify-getPublishedPosts-callers.mjs (blog-enhanced Task 26, v4)
 *
 * Enforces the allow-list of files permitted to call `getPublishedPosts()`
 * directly. All list-context callers MUST go through
 * `getVisiblePublishedPosts()` instead, so that `hiddenFromLists: true`
 * posts are filtered out everywhere lists render.
 *
 * Design ref: blog-enhanced design.md §"scripts/verify-getPublishedPosts-callers.mjs"
 */
import { execSync } from "node:child_process";

const ALLOWED_CALLERS = new Set([
  "src/lib/blog.ts", // self-reference + getVisiblePublishedPosts
  "src/lib/blog.test.ts", // unit tests
  "src/app/(site)/blog/[slug]/page.tsx", // direct-URL lookup via getPostBySlug + neighbors
  // Add new entries explicitly via PR review.
  // NOTE: src/lib/blog-taxonomy.ts is INTENTIONALLY NOT here — taxonomy
  // helpers MUST go through getVisiblePublishedPosts().
]);

let output = "";
try {
  output = execSync(
    `git grep -nE "\\bgetPublishedPosts\\(\\)" -- 'src/**/*.ts' 'src/**/*.tsx'`,
    { encoding: "utf-8" },
  ).trim();
} catch (err) {
  // `git grep` exits non-zero when there are no matches. That's a clean state.
  if (err && typeof err.status === "number" && err.status === 1) {
    output = "";
  } else {
    throw err;
  }
}

const violations = [];
for (const line of output.split("\n").filter(Boolean)) {
  // Format: "path:linenum:content"
  const [filePath, , ...contentParts] = line.split(":");
  const rawContent = contentParts.join(":");
  // v4 — strip inline trailing `//` comments. Splits at the first "//".
  // Naive split is acceptable because the regex above already requires the
  // line to contain `getPublishedPosts()` — a function call is not inside a
  // string literal in practice for the codebases we audit.
  const codeOnly = rawContent.split("//")[0];
  const content = codeOnly.trim();
  // Skip JSDoc continuation lines and full-line block-comment openers.
  if (/^\s*(\*|\/\/|\/\*)/.test(rawContent)) continue;
  // Skip backtick-quoted strings containing the function name as docs.
  if (/`[^`]*getPublishedPosts[^`]*`/.test(content)) continue;
  // After comment strip, re-check that the function name still appears.
  if (!/\bgetPublishedPosts\(\)/.test(content)) continue;
  if (!ALLOWED_CALLERS.has(filePath)) {
    violations.push(`${filePath}: ${content.slice(0, 100)}`);
  }
}

if (violations.length > 0) {
  console.error(
    `[verify-getPublishedPosts-callers] Found getPublishedPosts() calls outside the allow-list:\n` +
      violations.map((v) => `  - ${v}`).join("\n") +
      `\n\nList-context callers must use getVisiblePublishedPosts() instead. ` +
      `If the new caller is genuinely a direct-URL / neighbors context, add it to the ALLOWED_CALLERS set in this script.`,
  );
  process.exit(1);
}
console.log(`[verify-getPublishedPosts-callers] OK`);
