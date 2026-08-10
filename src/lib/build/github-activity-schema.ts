import { s } from "velite";

import { BUILD_START_UTC, isoDate } from "./content-schema-primitives";

/**
 * Per-entry schema for one day of GitHub activity. This is the SINGLE SOURCE OF
 * TRUTH imported by both the collection registration (for types/output) and the
 * authoritative YAML loader (for validation). No per-field `errorMap` is
 * attached anywhere — all error formatting is centralized in the loader's
 * `formatZodIssues`.
 *
 * Exactly two fields, and `.strict()`: an unknown key is a hard failure, not a
 * silently dropped one. In particular there is NO `contributionLevel` field
 * (Req 1.8). GitHub's own level is bucketed against the user's personal maximum
 * over whatever period was queried; it cannot be reproduced offline and cannot
 * be asserted in a unit test. Levels are derived locally in
 * `src/lib/github-activity.ts` as a pure function of this file, so the
 * guarantee is *same file → same grid*.
 *
 * `date` IS upper-bounded by `BUILD_START_UTC` (future dates are blocked),
 * following `resources-schema.ts:23` and `reading-schema.ts:21`: `isoDate()`
 * validates format and calendar validity and nothing else, so the future-date
 * guard is a separate composition applied deliberately at the call site.
 * (`education-schema.ts` is not the model here — its guard lives inside
 * `isoMonth()`.) The bound is not optional. `anchorDate = max(date)` originates
 * the entire derivation, so one transposed digit — `2126-08-08` — would pass a
 * bare `isoDate()`, shift the window a century, render an empty grid on a green
 * build, print a 2126 freshness line, and permanently silence Req 9's detector.
 *
 * The `.refine()` only runs on calendar-valid dates because `isoDate()` aborts
 * fatally on an invalid date, so `Date.parse` here never sees a bad string.
 */
export const githubActivityEntrySchema = s
  .object({
    date: isoDate().refine((d) => Date.parse(d) <= BUILD_START_UTC),
    count: s.number().int().min(0),
  })
  .strict();
