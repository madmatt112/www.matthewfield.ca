import { reading } from "#site/content";

export type ReadingEntry = (typeof reading)[number];

/** A reading entry that has been finished — the shape the Recently Read column renders. */
export type FinishedReadingEntry = ReadingEntry & { finished: string };

/** How many finished books the Recently Read column shows. */
export const RECENTLY_READ_LIMIT = 3;

/**
 * In-progress books in the order written in `content/reading.yaml`.
 * Mirrored from StoryGraph by hand — see docs/slash-pages-authoring.md for why it
 * cannot be fetched.
 */
export function getCurrentlyReading(): ReadingEntry[] {
  return reading.filter((entry) => !entry.finished);
}

/**
 * The most recently finished books, newest first, capped at RECENTLY_READ_LIMIT.
 * Sorted here rather than trusting file order so an entry appended to the bottom
 * of `reading.yaml` still lands in the right place. ISO dates compare correctly
 * as strings, so no Date parsing is needed.
 */
export function getRecentlyRead(): FinishedReadingEntry[] {
  return reading
    .filter((entry): entry is FinishedReadingEntry => Boolean(entry.finished))
    .sort((a, b) => b.finished.localeCompare(a.finished))
    .slice(0, RECENTLY_READ_LIMIT);
}
