import type { Metadata } from "next";

import { PostRow } from "@/components/blog/post-row";
import { SectionKicker } from "@/components/shared/section-kicker";
import { getVisiblePublishedPosts } from "@/lib/blog";

export const dynamic = "force-static";

const BLOG_DESCRIPTION = "Writing about tech, life, and sundry.";

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
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <SectionKicker label="blog" />
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Blog</h1>
      <p className="mt-2 text-muted-foreground">{BLOG_DESCRIPTION}</p>
      {posts.length === 0 ? (
        <p className="mt-8 text-muted-foreground">No posts yet — check back soon.</p>
      ) : (
        <ul className="mt-10 divide-y divide-border">
          {posts.map((post) => (
            <PostRow key={post.slug} post={post} />
          ))}
        </ul>
      )}
    </div>
  );
}
