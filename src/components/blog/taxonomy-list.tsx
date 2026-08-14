import Link from "next/link";

import { PostRow } from "@/components/blog/post-row";
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
      <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{heading}</h1>
      <ul className="mt-10 divide-y divide-border">
        {posts.map((post) => (
          <PostRow key={post.slug} post={post} />
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
