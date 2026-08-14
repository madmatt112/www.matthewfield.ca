import { s } from "velite";

import { BUILD_START_UTC, httpUrl, isoDate, trimmed } from "./content-schema-primitives";

/**
 * Per-entry schema for one book on the /now Reading section, following the
 * contributions and resources pattern.
 *
 * `content/reading.yaml` is written by hand today and is shaped so a future sync
 * job can rewrite the whole file without touching prose or components.
 * StoryGraph sits behind a Cloudflare bot challenge AND an auth wall, so the
 * list cannot be fetched at build or request time — see docs/slash-pages-authoring.md.
 *
 * `finished` is what splits the two columns: an entry without it is currently
 * being read, an entry with it is done and sorts into Recently Read. One list,
 * one optional field, rather than two files that can disagree.
 *
 * Both dates are upper-bounded by `BUILD_START_UTC`: you cannot have started or
 * finished a book in the future. The `.refine()` only runs on calendar-valid
 * dates because `isoDate()` aborts fatally first, so `Date.parse` never sees a
 * bad string.
 *
 * `url` is the book's StoryGraph page — the card links to it. Required, and
 * validated by the same `httpUrl()` two-stage check the project links use, so a
 * typo fails the build rather than shipping a dead card.
 */
const readingFields = {
  title: trimmed(1, 200),
  author: trimmed(1, 120),
  url: httpUrl(),
  started: isoDate().refine((d) => Date.parse(d) <= BUILD_START_UTC),
  finished: isoDate()
    .refine((d) => Date.parse(d) <= BUILD_START_UTC)
    .optional(),
};

/**
 * Loader-side schema. `makeContentYamlLoader` validates SYNCHRONOUSLY, and
 * `s.image()` is an async transform — passing it here throws "Asynchronous
 * transform encountered during synchronous parse operation". So the loader
 * checks `cover` as a plain relative path and leaves the image work to Velite's
 * async re-parse (see the collection schema below). Everything else — including
 * `.strict()` unknown-key rejection — is still hard-failed on the sync path.
 */
export const readingLoaderSchema = s.object({ ...readingFields, cover: trimmed(1, 200) }).strict();

/**
 * Collection schema. Velite re-parses the loader's raw array with `parseAsync`,
 * which is where `s.image()` resolves the path, emits the hashed asset into
 * `public/static/`, and returns `{ src, width, height, blurDataURL }`.
 */
export const readingEntrySchema = s.object({ ...readingFields, cover: s.image() }).strict();
