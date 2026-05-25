import Link from "next/link";

import { formatPostDate, type RelatedPostMeta } from "@/lib/blog";

type RelatedPostsProps = {
  posts: ReadonlyArray<RelatedPostMeta>;
};

type RelatedCardProps = {
  post: RelatedPostMeta;
};

// Internal slim card variant: title + description + date only.
// Per Req 4.7: NO tag chips, NO series badge.
function RelatedCard({ post }: RelatedCardProps) {
  const { datetime, display } = formatPostDate(post.date);
  return (
    <Link href={`/blog/${post.slug}`} className="related-card">
      <h3 className="related-card-title">{post.title}</h3>
      {post.description ? (
        <p className="related-card-description">{post.description}</p>
      ) : null}
      <time dateTime={datetime} className="related-card-date">
        {display}
      </time>
    </Link>
  );
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  // Req 4.5/4.6: empty state = no rail.
  if (posts.length === 0) return null;

  return (
    <aside
      aria-labelledby="related-heading"
      data-pagefind-ignore="all"
      className="related-posts"
    >
      <h2 id="related-heading" className="related-posts-heading">
        Related posts
      </h2>
      <ul className="related-posts-list">
        {posts.map((post) => (
          <li key={post.slug}>
            <RelatedCard post={post} />
          </li>
        ))}
      </ul>
    </aside>
  );
}
