import { s } from "velite";

import { httpUrl, isoMonth, trimmed } from "./content-schema-primitives";

/**
 * Per-entry schema for a single education credential. This is the SINGLE SOURCE
 * OF TRUTH imported by both the collection registration (for types/output) and
 * the authoritative YAML loader (for validation). No per-field `errorMap` is
 * attached anywhere — all error formatting is centralized in the loader's
 * `formatZodIssues`.
 *
 * `completed` uses `isoMonth()`, not `isoDate()`: education dates are
 * month-precision like employment dates, and a full ISO date would force a
 * fabricated day into the content file. `isoMonth()` also carries the
 * not-in-the-future check anchored on `BUILD_START_UTC`.
 *
 * As with the experience schema, `.strict()` plus the absence of any phone or
 * free-form contact field is what makes R3.1's forbidden data unexpressible.
 */
export const educationEntrySchema = s
  .object({
    credential: trimmed(2, 120),
    institution: trimmed(2, 80),
    institutionUrl: httpUrl().optional(),
    completed: isoMonth(),
    honours: trimmed(2, 40).optional(),
    note: trimmed(2, 80).optional(),
  })
  .strict();
