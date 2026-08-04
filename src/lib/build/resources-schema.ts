import { s } from "velite";

import { BUILD_START_UTC, httpUrl, isoDate, trimmed } from "./content-schema-primitives";

/**
 * Per-entry schema for a single resource. This is the SINGLE SOURCE OF TRUTH
 * imported by both the collection registration (for types/output) and the
 * authoritative YAML loader (for validation). No per-field `errorMap` is
 * attached anywhere — all error formatting is centralized in the loader's
 * `formatZodIssues`.
 *
 * `added` IS upper-bounded by `BUILD_START_UTC` (future dates are blocked). The
 * `.refine()` only runs on calendar-valid dates because `isoDate()` aborts
 * fatally on an invalid date, so `Date.parse` here never sees a bad string.
 */

export const resourceEntrySchema = s
  .object({
    title: trimmed(2, 80),
    url: httpUrl(),
    description: trimmed(20, 200),
    category: s.enum(["appdev-tools", "devops-tools", "blogs-and-feeds", "reading", "fun-stuff"]),
    added: isoDate().refine((d) => Date.parse(d) <= BUILD_START_UTC),
  })
  .strict();
