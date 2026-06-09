import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DraftBanner } from "@/components/blog/draft-banner";
import { PrevNextNav } from "@/components/blog/prev-next-nav";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { RelatedPosts } from "@/components/blog/related-posts";
import { SeriesNavigator } from "@/components/blog/series-navigator";
import { ShareBar } from "@/components/blog/share-bar";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { TagChip } from "@/components/blog/tag-chip";
import { MDXContent } from "@/components/shared/mdx-content";
import { siteConfig } from "@/config/site";
import {
  extractToc,
  formatPostDate,
  formatReadingTime,
  getPostBySlug,
  getPostNeighbors,
  getPublishedPosts,
  getRelatedPosts,
  getSeriesGroups,
  shouldShowUpdatedBadge,
} from "@/lib/blog";
import { KNOWN_FIXTURE_SLUGS } from "@/lib/build/derive-post-slug.mjs";

export const dynamic = "force-static";
export const dynamicParams = false;

type RouteParams = { slug: string };

export function generateStaticParams(): RouteParams[] {
  return getPublishedPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const title = post.draft ? `[DRAFT] ${post.title}` : post.title;
  const description = post.draft ? `[DRAFT] ${post.description}` : post.description;
  const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: post.date,
      ...(post.updated ? { modifiedTime: post.updated } : {}),
      tags: post.tags,
    },
  };
  if (post.draft || post.hiddenFromLists === true) {
    metadata.robots = { index: false, follow: false };
  }
  return metadata;
}

export default async function BlogPostPage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();
  const { datetime, display } = formatPostDate(post.date);
  const showUpdated = shouldShowUpdatedBadge(post);
  const updated = post.updated ? formatPostDate(post.updated) : null;
  const { previous, next } = getPostNeighbors(post.slug);

  const tocEntries = extractToc(post);
  const relatedPosts = getRelatedPosts(post.slug);

  let seriesMembers: { slug: string; title: string; seriesOrder?: number }[] = [];
  if (typeof post.series === "string" && post.series.length > 0) {
    // When rendering a hidden post (e.g. a fixture-* post under
    // BLOG_INCLUDE_DRAFTS=1), include hidden series members so the
    // navigator can find its siblings. Production never serves hidden
    // posts, so this can't expose hidden series on a real post page.
    const groups = getSeriesGroups({
      includeHidden:
        post.draft === true || post.hiddenFromLists === true || KNOWN_FIXTURE_SLUGS.has(post.slug),
    });
    const members = groups.get(post.series);
    if (members && members.length >= 2) {
      seriesMembers = members.map((m) => ({
        slug: m.slug,
        title: m.title,
        seriesOrder: m.seriesOrder,
      }));
    }
  }

  const postUrl = `${siteConfig.url}/blog/${post.slug}`;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
      <ReadingProgress />
      <article
        {...(post.excludeFromSearch ? {} : { "data-pagefind-body": "" })}
        data-pagefind-meta={`tags:${post.tags.join(",")},categories:${post.categories.join(",")}`}
      >
        <span className="sr-only" data-pagefind-meta="description">
          {post.description}
        </span>
        {post.draft ? (
          <div className="mb-6">
            <DraftBanner />
          </div>
        ) : null}
        <header className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <time dateTime={datetime}>{display}</time>
            {showUpdated && updated ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs">
                  Updated <time dateTime={updated.datetime}>{updated.display}</time>
                </span>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <span>{formatReadingTime(post.readingTime)}</span>
          </div>
          {post.tags.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Tags" data-pagefind-ignore="all">
              {post.tags.map((tag) => (
                <li key={tag}>
                  <TagChip kind="tag" value={tag} />
                </li>
              ))}
            </ul>
          ) : null}
        </header>
        {seriesMembers.length >= 2 && typeof post.series === "string" ? (
          <SeriesNavigator posts={seriesMembers} currentSlug={post.slug} seriesName={post.series} />
        ) : null}
        <TableOfContents entries={tocEntries} />
        <div className="prose dark:prose-invert max-w-measure mt-8">
          <MDXContent code={post.body} />
        </div>
        <ShareBar title={post.title} description={post.description} url={postUrl} />
        <footer className="mt-12">
          <PrevNextNav previous={previous} next={next} />
        </footer>
      </article>
      <div
        id="copy-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <RelatedPosts posts={relatedPosts} />
    </div>
  );
}
