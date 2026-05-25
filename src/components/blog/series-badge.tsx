type SeriesBadgeProps = {
  series: string;
  order?: number;
  total?: number;
};

export function SeriesBadge({ series, order, total }: SeriesBadgeProps) {
  const showProgress = typeof order === "number" && typeof total === "number";
  return (
    <span className="series-badge">
      {showProgress ? `${series} · Part ${order} of ${total}` : series}
    </span>
  );
}
