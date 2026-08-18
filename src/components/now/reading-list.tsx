import Image from "next/image";

import { NewTabHint } from "@/components/shared/new-tab-hint";
import { formatContentDate } from "@/lib/format-date";
import type { ReadingEntry } from "@/lib/reading";

export type ReadingListProps = {
  entries: ReadingEntry[];
};

/**
 * Book cards laid out like StoryGraph's: cover on the left, then title, author,
 * and a date stacked beside it. The date follows the entry — a finished book
 * reports when it was finished, an in-progress one when it was started — so the
 * same list renders both the Currently Reading and Recently Read columns.
 *
 * The whole card is one link to the book's StoryGraph page. The cover carries an
 * empty alt because the title sits inside the same anchor: a described cover
 * would make screen readers announce the title twice per card.
 *
 * `url` is optional — a self-published book has no StoryGraph page. Those cards
 * render the same content in a plain <div> with no hover affordance and no
 * new-tab hint, so nothing looks clickable that isn't.
 */
export function ReadingList({ entries }: ReadingListProps) {
  if (entries.length === 0) return null;
  return (
    <ul className="mt-4 flex flex-col gap-4">
      {entries.map((entry) => {
        const { datetime, display } = formatContentDate(entry.finished ?? entry.started);
        const body = (
          <>
            <Image
              src={entry.cover.src}
              alt=""
              width={entry.cover.width}
              height={entry.cover.height}
              placeholder="blur"
              blurDataURL={entry.cover.blurDataURL}
              sizes="(min-width: 640px) 96px, 80px"
              className="w-20 shrink-0 rounded-sm shadow-md sm:w-24"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-medium text-balance text-foreground">
                {entry.title}
                {entry.url ? <NewTabHint /> : null}
              </p>
              <p className="text-sm text-muted-foreground">{entry.author}</p>
              <p className="text-sm text-muted-foreground">
                {entry.finished ? "Finished" : "Started"} <time dateTime={datetime}>{display}</time>
              </p>
            </div>
          </>
        );
        const layout = "flex items-center gap-4 rounded-lg border border-border p-4 sm:gap-6";
        return (
          <li key={`${entry.title}-${entry.started}-${entry.finished ?? ""}`}>
            {entry.url ? (
              <a
                href={entry.url}
                target="_blank"
                rel="noopener"
                className={`${layout} transition-colors hover:border-foreground/25 hover:bg-muted/40`}
              >
                {body}
              </a>
            ) : (
              <div className={layout}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
