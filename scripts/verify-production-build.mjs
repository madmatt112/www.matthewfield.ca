#!/usr/bin/env node
/**
 * verify-production-build.mjs
 *
 * Asserts that CI Build 2 (production-mode, drafts unset) contains no trace
 * of the fixture-draft slug across emitted output surfaces. Run from CI as
 * `node scripts/verify-production-build.mjs`. Exits 0 on pass, non-zero with
 * a diagnostic on any violation.
 *
 * Sentinel check scope (per design "Job-topology sentinel check" pin and
 * the r1 review's Attack Surface 6): the `.velite/.build1-sentinel` absence
 * check is defense-in-depth — it catches the specific regression class of
 * "someone removes the `rm -rf` step" from the CI workflow. It is NOT a
 * topology proof; under the current workflow shape the cleanup is
 * unconditional so absence is naturally true. The value of the check is
 * to fire LOUDLY if a future workflow refactor drops the cleanup step.
 *
 * Path discovery is glob-based (no hard-coded `.next/` paths beyond glob
 * roots) so Next.js minor-version emit-shape shifts surface as explicit
 * "shape produced no matches" failures rather than silent zero-file passes.
 */
import { existsSync, globSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { KNOWN_FIXTURE_SLUGS } from "../src/lib/build/derive-post-slug.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const POSTS_JSON = path.join(repoRoot, ".velite", "posts.json");
const SENTINEL = path.join(repoRoot, ".velite", ".build1-sentinel");

// Scan only rendered output surfaces — NOT .next/server/chunks/** or
// .next/static/**. Next.js bundles the full posts.json (including drafts
// excluded by getPublishedPosts at runtime) into SSG data chunks for code
// reuse across generated pages; the bundles contain draft slugs as a
// natural consequence of the static-generation pipeline, not as a
// production leak. Crawlers and users only ever observe the rendered
// HTML/RSC/XML output under .next/server/app/. Out/ is included for
// `next export` topologies (not currently used) for future-proofing.
// Node's globSync does not traverse hidden dot-directories under `**` by
// default — explicit `.next/...` prefixes required. `out/**` retained for
// future `next export` topologies.
const SCAN_ROOTS = [".next/server/app/**", "out/**"];

// Emit shapes per Next.js 16 App Router static output:
//   - Top-level routes emit flat files: .next/server/app/blog.html (NOT
//     .next/server/app/blog/page.html — that was Next.js ≤15's shape).
//   - Dynamic [slug] routes emit per-slug under a slug-name directory:
//     .next/server/app/blog/<slug>/page.html OR (Next.js 16 flat-mode)
//     .next/server/app/blog/<slug>.html depending on whether the route
//     uses a generateStaticParams entry. Both patterns are listed.
//   - sitemap and feed.xml emit as sibling `.body` files in Next.js 16
//     (e.g. sitemap.xml.body, feed.xml.body) rather than inside a
//     route-named directory. Both shapes are listed for forward/back
//     compatibility.
const EMIT_SHAPES = {
  postPage: [".next/server/app/blog/**/*.html", ".next/server/app/blog/**/*.rsc"],
  indexPage: [
    // Next.js 16 flat: server/app/blog.html
    ".next/server/app/blog.html",
    ".next/server/app/blog.rsc",
    // Next.js ≤15 directory: server/app/blog/page.html
    ".next/server/app/blog/page.html",
    ".next/server/app/blog/page.rsc",
    ".next/server/app/blog/index.html",
    ".next/server/app/blog/index.rsc",
  ],
  tags: [".next/server/app/blog/tags/**/*.html", ".next/server/app/blog/tags/**/*.rsc"],
  categories: [
    ".next/server/app/blog/categories/**/*.html",
    ".next/server/app/blog/categories/**/*.rsc",
  ],
  sitemap: [".next/server/app/sitemap.xml", ".next/server/app/sitemap.xml.body"],
  feed: [".next/server/app/feed.xml/**", ".next/server/app/feed.xml.body"],
};

const errors = [];
const skipped = [];

function fail(msg) {
  errors.push(msg);
}

function info(msg) {
  skipped.push(msg);
}

function readPosts() {
  if (!existsSync(POSTS_JSON)) {
    fail(`posts.json not found at ${POSTS_JSON} — Velite must run before verification.`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(POSTS_JSON, "utf8"));
  } catch (err) {
    fail(`failed to parse ${POSTS_JSON}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

function globRoot(pattern) {
  // globSync with cwd so we get repo-relative results; filter to files only.
  const matches = globSync(pattern, { cwd: repoRoot });
  const files = [];
  for (const m of matches) {
    const abs = path.join(repoRoot, m);
    try {
      if (statSync(abs).isFile()) files.push(abs);
    } catch {
      // ignore — entry may have vanished between glob and stat
    }
  }
  return files;
}

function globAny(patterns) {
  const seen = new Set();
  for (const p of patterns) {
    for (const f of globRoot(p)) seen.add(f);
  }
  return [...seen];
}

function checkSlugAbsence(slug) {
  const hits = [];
  for (const root of SCAN_ROOTS) {
    const files = globRoot(root);
    for (const f of files) {
      let buf;
      try {
        buf = readFileSync(f);
      } catch {
        continue;
      }
      if (buf.includes(slug)) hits.push(path.relative(repoRoot, f));
    }
  }
  if (hits.length > 0) {
    fail(
      `draft slug "${slug}" found in ${hits.length} output file(s) — Build 2 leaked drafts:\n  ` +
        hits.slice(0, 20).join("\n  ") +
        (hits.length > 20 ? `\n  …and ${hits.length - 20} more` : ""),
    );
  }
}

function checkShape(name, patterns, { required, reason }) {
  const hits = globAny(patterns);
  if (hits.length === 0) {
    if (required) {
      fail(
        `emit-shape gate "${name}" FAILED: content exists (${reason}) but no files match patterns:\n  ` +
          patterns.join("\n  "),
      );
    } else {
      info(`emit-shape gate "${name}" SKIPPED: ${reason}`);
    }
  }
}

function checkSentinel() {
  if (existsSync(SENTINEL)) {
    fail(
      `sentinel file present at ${path.relative(repoRoot, SENTINEL)} — ` +
        `Build 1's .velite directory leaked into Build 2. Verify the CI workflow's ` +
        `"Clean for Build 2" step (rm -rf .velite .next) runs between Build 1 and Build 2.`,
    );
  }
}

function main() {
  const posts = readPosts();
  if (!posts) return finish();

  const draft = posts.find((p) => p.draft === true);
  if (!draft || !draft.slug) {
    fail("no draft post (draft: true) found in posts.json — fixture-draft slug unavailable.");
    return finish();
  }

  checkSlugAbsence(draft.slug);
  checkSentinel();

  const nonDrafts = posts.filter((p) => p.draft !== true);
  // Mirror src/lib/blog.ts `getVisiblePublishedPosts()`: posts in
  // KNOWN_FIXTURE_SLUGS (or with hiddenFromLists: true) are filtered from
  // list/taxonomy contexts. Their slug pages still emit, but taxonomy and
  // index pages exclude them — so the taxonomy emit-shape gate must use the
  // VISIBLE subset to match what `generateStaticParams` actually produces.
  const visibleNonDrafts = nonDrafts.filter(
    (p) => !KNOWN_FIXTURE_SLUGS.has(p.slug) && p.hiddenFromLists !== true,
  );
  const hasPosts = nonDrafts.length >= 1;
  const hasTagged = visibleNonDrafts.some((p) => Array.isArray(p.tags) && p.tags.length > 0);
  const hasCategorized = visibleNonDrafts.some(
    (p) => Array.isArray(p.categories) && p.categories.length > 0,
  );

  checkShape("post-page", EMIT_SHAPES.postPage, {
    required: hasPosts,
    reason: hasPosts
      ? `${nonDrafts.length} non-draft post(s) in posts.json`
      : "no non-draft posts in posts.json",
  });
  checkShape("index-page", EMIT_SHAPES.indexPage, {
    required: true,
    reason: "blog index emits unconditionally",
  });
  checkShape("tags-taxonomy", EMIT_SHAPES.tags, {
    required: hasTagged,
    reason: hasTagged
      ? "non-draft post(s) with ≥1 tag in posts.json"
      : "no non-draft posts with tags in posts.json",
  });
  checkShape("categories-taxonomy", EMIT_SHAPES.categories, {
    required: hasCategorized,
    reason: hasCategorized
      ? "non-draft post(s) with ≥1 category in posts.json"
      : "no non-draft posts with categories in posts.json",
  });
  checkShape("sitemap", EMIT_SHAPES.sitemap, {
    required: true,
    reason: "sitemap emits unconditionally",
  });
  checkShape("feed", EMIT_SHAPES.feed, {
    required: true,
    reason: "feed.xml emits unconditionally",
  });

  finish();
}

function finish() {
  for (const s of skipped) process.stdout.write(`verify-production-build: ${s}\n`);
  if (errors.length === 0) {
    process.stdout.write("verify-production-build: PASS\n");
    process.exit(0);
  }
  for (const e of errors) process.stderr.write(`verify-production-build: ${e}\n`);
  process.exit(1);
}

main();
