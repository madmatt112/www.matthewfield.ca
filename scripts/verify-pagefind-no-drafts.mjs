#!/usr/bin/env node
/**
 * verify-pagefind-no-drafts — smoke check that the Pagefind index is
 * (a) free of draft slugs and (b) not silently empty.
 *
 * Both assertions run independently and report independently. Exits 0 on
 * full pass, non-zero on any failure.
 *
 * Manifest source (Pagefind 1.x):
 *   - URLs are sourced from `public/pagefind/fragment/*.pf_fragment`.
 *     Pagefind 1.x's `pagefind-entry.json` contains only version metadata
 *     (no URL enumeration), so it is not consulted.
 *   - Each fragment is typically gzip-compressed JSON; we detect the gzip
 *     magic bytes (0x1f 0x8b) and gunzip before regex-matching the URL.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import matter from "gray-matter";
import { derivePostSlug } from "../src/lib/build/derive-post-slug.mjs";

const PAGEFIND_DIR = "public/pagefind";
const FRAGMENT_DIR = path.join(PAGEFIND_DIR, "fragment");
const POSTS_DIR = "content/posts";
const TAG = "[verify-pagefind-no-drafts]";

/** @param {string} url */
function urlToSlug(url) {
  return url.replace(/^\/blog\//, "").replace(/\/$/, "");
}

/**
 * Collect indexed URLs from the Pagefind output directory.
 * @returns {{ urls: string[], source: string }}
 */
function collectIndexedUrls() {
  if (!existsSync(PAGEFIND_DIR)) {
    return { urls: [], source: `missing dir ${PAGEFIND_DIR}` };
  }

  // pagefind-entry.json contains only version metadata; URL set is sourced from fragment/*.pf_fragment.
  if (existsSync(FRAGMENT_DIR) && statSync(FRAGMENT_DIR).isDirectory()) {
    const urls = [];
    const files = readdirSync(FRAGMENT_DIR).filter((f) => f.endsWith(".pf_fragment"));
    for (const file of files) {
      const full = path.join(FRAGMENT_DIR, file);
      const buf = readFileSync(full);
      // Pagefind 1.x fragments are gzip-compressed JSON; detect magic bytes
      // (0x1f 0x8b) and gunzip. Fall through to raw buffer if uncompressed.
      let body = buf;
      if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
        try {
          body = zlib.gunzipSync(buf);
        } catch (err) {
          console.error(`${TAG} warning: could not gunzip ${file}: ${err.message}`);
          continue;
        }
      }
      const text = body.toString("utf-8");
      const match = text.match(/"url"\s*:\s*"([^"]+)"/);
      if (match) urls.push(match[1]);
    }
    return { urls, source: `${FRAGMENT_DIR}/*.pf_fragment (${files.length} files)` };
  }

  return { urls: [], source: `${PAGEFIND_DIR} (no fragment data found)` };
}

/**
 * Read all `content/posts/*.mdx` and partition by draft / visible.
 * @returns {{ drafts: string[], visible: string[], hidden: string[] }}
 *   - drafts: slugs of `draft: true` posts (should NOT be in the index)
 *   - visible: slugs of `draft: false` AND `hiddenFromLists !== true`
 *   - hidden: slugs of `draft: false` AND `hiddenFromLists: true` (e.g. fixture-search)
 */
function partitionPosts() {
  const drafts = [];
  const visible = [];
  const hidden = [];
  if (!existsSync(POSTS_DIR)) {
    throw new Error(`${TAG} missing ${POSTS_DIR}`);
  }
  const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx"));
  for (const file of files) {
    const full = path.join(POSTS_DIR, file);
    const { data } = matter(readFileSync(full, "utf-8"));
    const slug = derivePostSlug(full, data);
    if (data.draft === true) {
      drafts.push(slug);
    } else if (data.hiddenFromLists === true) {
      hidden.push(slug);
    } else {
      visible.push(slug);
    }
  }
  return { drafts, visible, hidden };
}

const failures = [];

const { urls, source } = collectIndexedUrls();
const indexedSlugs = new Set(urls.map(urlToSlug).filter((s) => s.length > 0));
const { drafts, visible, hidden } = partitionPosts();

// Assertion 1: no draft slug appears in the manifest.
const leaked = drafts.filter((s) => indexedSlugs.has(s));
if (leaked.length > 0) {
  failures.push(
    `${TAG} draft leak: the following draft slug(s) appear in the index ` +
      `(${source}): ${leaked.join(", ")}`,
  );
} else {
  console.log(`${TAG} OK — no draft slugs in index (${drafts.length} drafts checked)`);
}

// Assertion 2: non-empty index — at least visible.length + 1 entries.
// The +1 accounts for fixture-search (hiddenFromLists: true, but published &
// indexed by Pagefind). If `hidden` is non-empty we use its actual count.
const expectedMin = visible.length + hidden.length;
if (indexedSlugs.size < expectedMin) {
  const expectedSlugs = [...visible, ...hidden].sort();
  failures.push(
    `${TAG} non-empty assertion failed: index has ${indexedSlugs.size} entries ` +
      `from ${source}, expected at least ${expectedMin} ` +
      `(visible=${visible.length}, hidden-but-published=${hidden.length}). ` +
      `Expected slugs: ${expectedSlugs.join(", ")}`,
  );
} else {
  console.log(
    `${TAG} OK — index has ${indexedSlugs.size} entries (>= ${expectedMin} expected) from ${source}`,
  );
}

if (failures.length > 0) {
  for (const msg of failures) console.error(msg);
  process.exit(1);
}
