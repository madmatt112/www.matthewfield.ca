import { parse } from "node-html-parser";
import { posts } from "#site/content";
import {
  BLOG_DRAFT_LEAK_GUARD_MSG_PREVIEW,
  BLOG_DRAFT_LEAK_GUARD_MSG_PRODUCTION,
  checkVercelDraftGuard,
} from "@/lib/blog-errors";
import { KNOWN_FIXTURE_SLUGS } from "@/lib/build/derive-post-slug.mjs";
import { formatContentDate } from "@/lib/format-date";

export type Post = (typeof posts)[number];
export type PostMeta = Pick<Post, "slug" | "title">;
export type RelatedPostMeta = PostMeta & Pick<Post, "description" | "date">;
export type TocEntry = { id: string; text: string; depth: 2 | 3 };

// Single sort key reused across index, taxonomy, RSS, and neighbors. Date ISO
// strings sort lexicographically thanks to `s.isodate()`; slug is the tiebreak.
function byDateDescSlugAsc(a: Post, b: Post): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

/**
 * For LIST contexts, prefer getVisiblePublishedPosts() — this function does
 * NOT exclude posts with hiddenFromLists: true or the fixture-* slug prefix.
 */
export function getPublishedPosts(): Post[] {
  // Env vars are read at call time (not module top-level) so Vitest tests can
  // mutate process.env per-test.
  const guard = checkVercelDraftGuard();
  if (guard?.kind === "production") {
    /*
     * Layer 2 draft-leak guard (Req 7.12.a).
     * Error substring: see BLOG_DRAFT_LEAK_GUARD_MSG_PRODUCTION.
     * Runbook + Vercel env-var-scoping fix live in src/lib/blog-errors.ts
     * (single source of truth). Do not inline the message here.
     */
    throw new Error(BLOG_DRAFT_LEAK_GUARD_MSG_PRODUCTION);
  }
  if (guard?.kind === "preview") {
    /*
     * Layer 2 preview-debugging guard (Req 7.12.b).
     * Error substring: see BLOG_DRAFT_LEAK_GUARD_MSG_PREVIEW.
     * Runbook + Vercel env-var-scoping fix live in src/lib/blog-errors.ts
     * (single source of truth). Do not inline the message here.
     */
    throw new Error(BLOG_DRAFT_LEAK_GUARD_MSG_PREVIEW);
  }

  const includeDrafts = process.env.BLOG_INCLUDE_DRAFTS === "1";
  const filtered = includeDrafts ? posts : posts.filter((p) => !p.draft);
  return [...filtered].sort(byDateDescSlugAsc);
}

export function getPostBySlug(slug: string): Post | null {
  return getPublishedPosts().find((p) => p.slug === slug) ?? null;
}

function neighbors(
  list: Post[],
  slug: string,
): { previous: PostMeta | null; next: PostMeta | null } {
  const sorted = [...list].sort(byDateDescSlugAsc);
  const i = sorted.findIndex((p) => p.slug === slug);
  if (i === -1) return { previous: null, next: null };
  // Index is reverse-chronological: previous (older) is the next index,
  // next (newer) is the previous index.
  const newer = i > 0 ? sorted[i - 1] : null;
  const older = i < sorted.length - 1 ? sorted[i + 1] : null;
  return {
    previous: older ? { slug: older.slug, title: older.title } : null,
    next: newer ? { slug: newer.slug, title: newer.title } : null,
  };
}

export function getPostNeighbors(slug: string): {
  previous: PostMeta | null;
  next: PostMeta | null;
} {
  return neighbors(getPublishedPosts(), slug);
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`;
}

export const formatPostDate = formatContentDate;

export function shouldShowUpdatedBadge(post: Post): boolean {
  return post.updated != null && new Date(post.updated) > new Date(post.date);
}

const WORDS_PER_MINUTE = 238;
export function wordsToReadingTime(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

export function isHiddenFromLists(post: Post): boolean {
  return post.hiddenFromLists === true || KNOWN_FIXTURE_SLUGS.has(post.slug);
}

export function getVisiblePublishedPosts(): Post[] {
  return getPublishedPosts().filter((p) => !isHiddenFromLists(p));
}

export function getSeriesGroups(options: { includeHidden?: boolean } = {}): Map<
  string,
  Post[]
> {
  const groups = new Map<string, Post[]>();
  const source = options.includeHidden ? getPublishedPosts() : getVisiblePublishedPosts();
  for (const p of source) {
    if (typeof p.series !== "string" || p.series.length === 0) continue;
    const list = groups.get(p.series) ?? [];
    list.push(p);
    groups.set(p.series, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => {
      const ao = a.seriesOrder;
      const bo = b.seriesOrder;
      if (ao !== bo) {
        if (ao === undefined) return 1;
        if (bo === undefined) return -1;
        return ao - bo;
      }
      return byDateDescSlugAsc(a, b);
    });
  }
  return groups;
}

function relatedPostsFromList(
  query: Post,
  candidates: Post[],
  limit: number,
): RelatedPostMeta[] {
  let excludeSeries = false;
  if (typeof query.series === "string" && query.series.length > 0) {
    let count = 0;
    for (const p of candidates) {
      if (p.series === query.series) {
        count++;
        if (count >= 2) break;
      }
    }
    excludeSeries = count >= 2;
  }

  const qTags = new Set(query.tags);
  const qCategories = new Set(query.categories);

  const scored: { post: Post; score: number }[] = [];
  for (const p of candidates) {
    if (p.slug === query.slug) continue;
    if (excludeSeries && p.series === query.series) continue;
    let tagOverlap = 0;
    for (const t of p.tags) if (qTags.has(t)) tagOverlap++;
    let catOverlap = 0;
    for (const c of p.categories) if (qCategories.has(c)) catOverlap++;
    const score = 3 * tagOverlap + 1 * catOverlap;
    if (score === 0) continue;
    scored.push({ post: p, score });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return byDateDescSlugAsc(a.post, b.post);
  });

  return scored.slice(0, limit).map(({ post }) => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date,
  }));
}

export function getRelatedPosts(slug: string, limit = 3): RelatedPostMeta[] {
  const query = getPublishedPosts().find((p) => p.slug === slug);
  if (!query) return [];
  // If the current post is itself hidden (e.g. a fixture-* post under
  // BLOG_INCLUDE_DRAFTS=1), draw candidates from ALL published posts so
  // hidden fixtures can match each other in dev/CI. Production never
  // serves hidden posts, so this branch can't leak hidden slugs onto a
  // real post's rail.
  const candidates = isHiddenFromLists(query)
    ? getPublishedPosts()
    : getVisiblePublishedPosts();
  return relatedPostsFromList(query, candidates, limit);
}

export function extractToc(post: Post): TocEntry[] {
  const root = parse(post.bodyHtml);
  const headings = root.querySelectorAll("h2, h3");
  const entries: TocEntry[] = [];
  for (const h of headings) {
    const id = h.getAttribute("id");
    if (!id) continue;
    const tag = h.tagName.toLowerCase();
    const depth: 2 | 3 = tag === "h2" ? 2 : 3;
    entries.push({ id, text: h.textContent.trim(), depth });
  }
  if (entries.length < 2) return [];
  return entries;
}

// Internal helpers exposed for fixture-independent unit tests only.
export const __testing = { neighbors, relatedPostsFromList };
