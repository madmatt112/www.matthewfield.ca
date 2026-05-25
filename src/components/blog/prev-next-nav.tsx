import Link from "next/link";

import type { PostMeta } from "@/lib/blog";

type PrevNextNavProps = {
  previous: PostMeta | null;
  next: PostMeta | null;
};

export function PrevNextNav({ previous, next }: PrevNextNavProps) {
  if (previous === null && next === null) return null;
  return (
    <nav aria-label="Post navigation" className="flex flex-col gap-4 sm:flex-row sm:justify-between">
      {previous ? (
        <Link
          href={`/blog/${previous.slug}`}
          aria-label={`Previous post: ${previous.title}`}
          className="flex min-h-11 flex-col justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:underline"
        >
          <span className="block text-sm text-muted-foreground">Previous</span>
          <span className="block font-medium">{previous.title}</span>
        </Link>
      ) : null}
      {next ? (
        <Link
          href={`/blog/${next.slug}`}
          aria-label={`Next post: ${next.title}`}
          className="flex min-h-11 flex-col justify-center rounded sm:text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:underline"
        >
          <span className="block text-sm text-muted-foreground">Next</span>
          <span className="block font-medium">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}
