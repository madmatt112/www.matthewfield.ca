import type { Metadata } from "next";

import { PostCard } from "@/components/blog/post-card";
import { SeriesBadge } from "@/components/blog/series-badge";
import { getVisiblePublishedPosts } from "@/lib/blog";

export const dynamic = "force-static";

const BLOG_DESCRIPTION = "Notes on tooling, systems, and the craft.";

export function generateMetadata(): Metadata {
  const metadata: Metadata = {
    title: "Blog",
    description: BLOG_DESCRIPTION,
    alternates: {
      canonical: "/blog",
      types: { "application/rss+xml": "/feed.xml" },
    },
  };
  if (process.env.VERCEL_ENV === "preview") {
    metadata.robots = { index: false, follow: false };
  }
  return metadata;
}

export default function BlogPage() {
  const posts = getVisiblePublishedPosts();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
      <p className="mt-2 text-muted-foreground">{BLOG_DESCRIPTION}</p>
      {posts.length === 0 ? (
        <p className="mt-8 text-muted-foreground">No posts yet — check back soon.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-6">
          {posts.map((post) => (
            <li key={post.slug}>
              {post.series ? (
                <div className="mb-2">
                  <SeriesBadge series={post.series} order={post.seriesOrder} />
                </div>
              ) : null}
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
