import Link from "next/link";

import { TagChip } from "@/components/blog/tag-chip";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatPostDate, formatReadingTime, type Post } from "@/lib/blog";

type PostCardProps = {
  post: Post;
};

export function PostCard({ post }: PostCardProps) {
  const titleId = `post-card-${post.slug}`;
  const { datetime, display } = formatPostDate(post.date);
  return (
    <article aria-labelledby={titleId}>
      <Card>
        <CardHeader>
          <h2 id={titleId} className="text-xl leading-tight font-semibold">
            <Link
              href={`/blog/${post.slug}`}
              className="inline-flex min-h-11 items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:underline"
            >
              {post.title}
            </Link>
          </h2>
          <div className="text-sm text-muted-foreground">
            <time dateTime={datetime}>{display}</time>
            <span aria-hidden="true"> · </span>
            <span>{formatReadingTime(post.readingTime)}</span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-base text-muted-foreground">{post.description}</p>
          {post.tags.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Tags">
              {post.tags.map((tag) => (
                <li key={tag}>
                  <TagChip kind="tag" value={tag} />
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </article>
  );
}
