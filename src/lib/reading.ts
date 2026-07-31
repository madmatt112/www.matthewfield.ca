import { reading } from "#site/content";

export type ReadingEntry = (typeof reading)[number];

/**
 * Currently-reading books in the order written in `content/reading.yaml`.
 * Mirrored from StoryGraph by hand — see docs/slash-pages-authoring.md for why it
 * cannot be fetched.
 */
export function getCurrentlyReading(): ReadingEntry[] {
  return reading;
}
