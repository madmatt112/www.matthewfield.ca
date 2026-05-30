import { s } from "velite";

import { httpUrl, isoDate, trimmed, uniqueByKind } from "./content-schema-primitives";

/**
 * Per-entry schema for a single contribution. This is the SINGLE SOURCE OF
 * TRUTH imported by both the collection registration (for types/output) and
 * the authoritative YAML loader (for validation). No per-field `errorMap` is
 * attached anywhere — all error formatting is centralized in the loader's
 * `formatZodIssues`.
 *
 * `date` has NO upper bound: a contribution may be future-dated.
 */

export const contributionLinkSchema = s
  .object({
    kind: s.enum(["pr", "commit", "issue", "release", "writeup", "discussion"]),
    label: trimmed(1, 60).optional(),
    url: httpUrl(),
  })
  .strict();

export const contributionEntrySchema = s
  .object({
    repo: s
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9._-]+$/),
    repoUrl: httpUrl(),
    title: trimmed(5, 100),
    description: trimmed(30, 280),
    date: isoDate(),
    language: s.string().min(1).max(24).optional(),
    links: s.array(contributionLinkSchema).min(1).max(5).superRefine(uniqueByKind),
  })
  .strict();
