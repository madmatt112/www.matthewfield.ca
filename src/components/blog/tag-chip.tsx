import Link from "next/link";

type TagChipProps = {
  kind: "tag" | "category";
  value: string;
};

export function TagChip({ kind, value }: TagChipProps) {
  const href = kind === "tag" ? `/blog/tags/${value}` : `/blog/categories/${value}`;
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {value}
    </Link>
  );
}
