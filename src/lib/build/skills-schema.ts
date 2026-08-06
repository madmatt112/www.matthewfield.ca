import { s } from "velite";

import { trimmed } from "./content-schema-primitives";

/**
 * Per-entry schema for a single skills group. This is the SINGLE SOURCE OF
 * TRUTH imported by both the collection registration (for types/output) and the
 * authoritative YAML loader (for validation). No per-field `errorMap` is
 * attached anywhere — all error formatting is centralized in the loader's
 * `formatZodIssues`.
 *
 * One entry in `content/skills.yaml` IS one group, so "entry" and "group" are
 * the same thing here; the name follows the `contributionEntrySchema` /
 * `experienceEntrySchema` convention.
 *
 * `items` is `.min(1)`: a group with no items is exactly the empty section
 * R5.4 forbids, and it is cheaper to reject it at authoring time than to make
 * every consumer filter it out.
 *
 * The 12-item ceiling partly mechanizes R5.2's "curated, not exhaustive" rule.
 * Do not raise it without a spec change.
 */
export const skillEntrySchema = s
  .object({
    category: trimmed(2, 60),
    items: s.array(trimmed(1, 32)).min(1).max(12),
  })
  .strict();

/**
 * The companion collection-level bound from design §Data Models: at most 8
 * groups, the other half of R5.2's mechanized curation rule.
 *
 * It lives here as a constant rather than as a `.max(8)` because a per-entry
 * schema cannot see its siblings — both Velite's `defineCollection` and
 * `makeContentYamlLoader` validate one entry at a time. Enforcement therefore
 * belongs to whichever collection-level hook lands next; this export exists so
 * the number has one definition rather than being retyped there.
 */
export const SKILLS_MAX_GROUPS = 8;
