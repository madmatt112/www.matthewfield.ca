type SeriesNavigatorPost = {
  slug: string;
  title: string;
  seriesOrder?: number;
};

type SeriesNavigatorProps = {
  posts: ReadonlyArray<SeriesNavigatorPost>;
  currentSlug: string;
  seriesName: string;
};

export function SeriesNavigator({ posts, currentSlug, seriesName }: SeriesNavigatorProps) {
  // Req 2.6: render nothing for single-post series.
  if (posts.length < 2) return null;

  // Sort defensively by seriesOrder asc; missing orders sink to the end.
  const sorted = [...posts].sort((a, b) => {
    const ao = a.seriesOrder;
    const bo = b.seriesOrder;
    if (ao === bo) return 0;
    if (ao === undefined) return 1;
    if (bo === undefined) return -1;
    return ao - bo;
  });

  return (
    <nav aria-label="Series navigation" className="series-navigator">
      <h2 className="series-navigator-title">{seriesName}</h2>
      <ol>
        {sorted.map((post) => (
          <li key={post.slug}>
            {post.slug === currentSlug ? (
              <span aria-current="page">{post.title}</span>
            ) : (
              <a href={`/blog/${post.slug}`}>{post.title}</a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
