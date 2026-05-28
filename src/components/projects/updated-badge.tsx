import { formatContentDate } from "@/lib/format-date";

export type UpdatedBadgeProps = {
  updated: string;
};

export function UpdatedBadge({ updated }: UpdatedBadgeProps) {
  const { display } = formatContentDate(updated);
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <time dateTime={updated}>Updated on {display}</time>
    </span>
  );
}
