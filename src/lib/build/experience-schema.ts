import { s } from "velite";

import { httpUrl, isoMonth, trimmed } from "./content-schema-primitives";

/**
 * Per-entry schema for a single employment role. This is the SINGLE SOURCE OF
 * TRUTH imported by both the collection registration (for types/output) and the
 * authoritative YAML loader (for validation). No per-field `errorMap` is
 * attached anywhere — all error formatting is centralized in the loader's
 * `formatZodIssues`.
 *
 * **There is deliberately no `phone` field and no free-form contact field.**
 * With `.strict()` on every object, R3.1's forbidden data is not expressible:
 * the absence is the enforcement, so do not add one.
 *
 * `start`/`end` use `isoMonth()` rather than `isoDate()` — employment dates are
 * month-precision, and a full ISO date would force a fabricated day into the
 * content file.
 */

export const experienceDeliverySchema = s
  .object({
    title: trimmed(2, 60),
    role: trimmed(2, 60),
    // Optional project slug. Kebab-case matches the `projects` collection's
    // on-disk slugs; that the slug actually RESOLVES (and is neither draft nor
    // a fixture) is a cross-collection check, not something a per-entry schema
    // can see.
    project: s
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    body: trimmed(30, 500),
    highlights: s.array(trimmed(20, 200)).max(6).optional(),
  })
  .strict();

export const experienceEntrySchema = s
  .object({
    organisation: trimmed(2, 80),
    organisationUrl: httpUrl().optional(),
    title: trimmed(2, 80),
    start: isoMonth(),
    // `end` ABSENT means the role is current. An explicit `null` is rejected:
    // `.optional()` (not `.nullable()`/`.nullish()`) is what does that, so
    // there is exactly one spelling for "current". This resolves R1.2's
    // "absent/null" phrasing in favour of absent-only.
    end: isoMonth().optional(),
    location: trimmed(2, 60),
    summary: trimmed(30, 400),
    tech: s.array(trimmed(1, 24)).max(12).optional(),
    deliveries: s.array(experienceDeliverySchema).max(4).optional(),
    // The 20–240 bounds are load-bearing for R3.4: a 240-character ceiling
    // makes an ATS-style keyword-inventory line impossible to author.
    highlights: s.array(trimmed(20, 240)).min(1).max(10),
  })
  .strict()
  .superRefine((role, ctx) => {
    // `isoMonth()` aborts fatally on a bad month, so by the time this runs both
    // values are known-good `YYYY-MM` strings — which sort correctly as plain
    // strings, hence the lexicographic comparison.
    if (role.end === undefined) return;
    if (role.end < role.start) {
      ctx.addIssue({
        code: "custom",
        message: `end '${role.end}' is before start '${role.start}'; a role cannot end before it begins.`,
        path: ["end"],
      });
    }
  });
