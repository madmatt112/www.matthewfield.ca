import Image from "next/image";

import { formatContentDate } from "@/lib/format-date";
import type { ReadingEntry } from "@/lib/reading";

export type ReadingListProps = {
  entries: ReadingEntry[];
};

/**
 * Currently-reading cards laid out like StoryGraph's: cover on the left, then
 * title, author, and start date stacked beside it.
 */
export function ReadingList({ entries }: ReadingListProps) {
  if (entries.length === 0) return null;
  return (
    <ul className="mt-6 flex flex-col gap-4">
      {entries.map((entry) => {
        const { datetime, display } = formatContentDate(entry.started);
        return (
          <li
            key={`${entry.title}-${entry.started}`}
            className="flex items-center gap-4 rounded-lg border border-border p-4 sm:gap-6"
          >
            <Image
              src={entry.cover.src}
              alt={`Cover of ${entry.title}`}
              width={entry.cover.width}
              height={entry.cover.height}
              placeholder="blur"
              blurDataURL={entry.cover.blurDataURL}
              sizes="(min-width: 640px) 96px, 80px"
              className="w-20 shrink-0 rounded-sm shadow-md sm:w-24"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-medium text-balance text-foreground">{entry.title}</p>
              <p className="text-sm text-muted-foreground">{entry.author}</p>
              <p className="text-sm text-muted-foreground">
                Started <time dateTime={datetime}>{display}</time>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
