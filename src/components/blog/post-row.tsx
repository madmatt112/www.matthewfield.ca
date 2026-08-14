import Link from "next/link";

import { SeriesBadge } from "@/components/blog/series-badge";
import { TagChip } from "@/components/blog/tag-chip";
import { formatPostDate, formatReadingTime, type Post } from "@/lib/blog";

export type PostRowProps = {
  post: Post;
  /** Heading level for the post title — the surrounding page owns the outline. */
  headingLevel?: "h2" | "h3";
};

/**
 * One post in an index, as a row in a divided stream rather than a card.
 *
 * The card version boxed every post in its own bordered surface, which spent a
 * lot of ink on the frame and left the titles competing with their borders for
 * attention. This mirrors the landing page's "Recent work" stream: a hairline
 * between items instead of around them, the meta line demoted above the title,
 * and the title itself carrying the link. Same information — date, reading
 * time, series, title, description, tags — with the frame removed.
 */
export function PostRow({ post, headingLevel = "h2" }: PostRowProps) {
  const Heading = headingLevel;
  const { datetime, display } = formatPostDate(post.date);
  return (
    <li className="py-6 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <time
          dateTime={datetime}
          className="font-mono text-xs tracking-widest text-muted-foreground uppercase"
        >
          {display}
        </time>
        <span aria-hidden="true" className="text-xs text-muted-foreground">
          /
        </span>
        <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          {formatReadingTime(post.readingTime)}
        </span>
        {post.series ? <SeriesBadge series={post.series} order={post.seriesOrder} /> : null}
      </div>
      <Heading className="mt-2 text-lg leading-snug font-semibold">
        <Link
          href={`/blog/${post.slug}`}
          className="text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {post.title}
        </Link>
      </Heading>
      <p className="mt-1 max-w-measure text-sm text-muted-foreground">{post.description}</p>
      {post.tags.length > 0 ? (
        <ul className="mt-1 flex flex-wrap gap-x-3" aria-label="Tags">
          {post.tags.map((tag) => (
            <li key={tag}>
              <TagChip kind="tag" value={tag} />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
