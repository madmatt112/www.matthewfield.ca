import Link from "next/link";

import { PostCard } from "@/components/blog/post-card";
import { SeriesBadge } from "@/components/blog/series-badge";
import type { Post } from "@/lib/blog";

type TaxonomyListProps = {
  kind: "tag" | "category";
  value: string;
  posts: Post[];
};

export function TaxonomyList({ kind, value, posts }: TaxonomyListProps) {
  const heading = kind === "tag" ? `Posts tagged ${value}` : `Posts in category ${value}`;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
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
      <div className="mt-12">
        <Link
          href="/blog"
          className="inline-flex min-h-11 items-center rounded text-sm text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          ← Back to all posts
        </Link>
      </div>
    </div>
  );
}
