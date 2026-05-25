import path from "node:path";

/**
 * Exact roster of fixture-post slugs used by Velite + the Pagefind verifiers
 * + the crawl orchestrator. Single source of truth; do not duplicate.
 *
 * @type {Set<string>}
 */
export const KNOWN_FIXTURE_SLUGS = new Set([
  "fixture-draft",
  "fixture-code",
  "fixture-reading-time",
  "fixture-toc",
  "fixture-footnotes",
  "fixture-related-a",
  "fixture-related-b",
  "fixture-series-1",
  "fixture-series-2",
  "fixture-search",
]);

/**
 * Derive a post slug from its file path and frontmatter. Returns
 * `frontmatter.slug` when set; otherwise the basename with `.mdx` stripped.
 * `.md` files keep their full basename (helper strips `.mdx` only).
 *
 * @param {string} filePath
 * @param {{ slug?: string }} frontmatter
 * @returns {string}
 */
export function derivePostSlug(filePath, frontmatter) {
  if (frontmatter && typeof frontmatter.slug === "string" && frontmatter.slug.length > 0) {
    return frontmatter.slug;
  }
  return path.basename(filePath, ".mdx");
}
