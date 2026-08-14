import Link from "next/link";

type TagChipProps = {
  kind: "tag" | "category";
  value: string;
};

/**
 * A tag as a quiet `#label` link rather than a bordered pill.
 *
 * In the card layout the pill was one element among several inside a box; in
 * the post-row stream a row of bordered pills outweighed the description and
 * competed with the post title, which is the one thing a reader scans for.
 * The visible ink shrinks to small muted text — but the 44x44 hit area that
 * blog-core Req 13.4 mandates is unchanged, carried by `min-h-11 min-w-11`
 * padding around the label instead of by the pill's own size.
 */
export function TagChip({ kind, value }: TagChipProps) {
  const href = kind === "tag" ? `/blog/tags/${value}` : `/blog/categories/${value}`;
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded px-1 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span aria-hidden="true" className="text-muted-foreground/60">
        #
      </span>
      {value}
    </Link>
  );
}
