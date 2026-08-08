// Collection-level invariants for the profile/resume content (design §Error
// Handling Scenario 1; R4.1, R4.2, R5.2).
//
// Both checks here are things a per-entry schema structurally cannot do: one
// reads a SECOND collection, the other counts SIBLING entries. Velite's
// `prepare()` hook is where the design puts such invariants — but the logic
// lives in this module rather than inline in the hook so it can be unit-tested
// without booting velite.

import { SKILLS_MAX_GROUPS } from "./skills-schema";

const EXPERIENCE_FILE = "content/experience.yaml";
const SKILLS_FILE = "content/skills.yaml";

/** Slug prefix reserved for test fixtures; filtered out on production builds. */
const FIXTURE_SLUG_PREFIX = "fixture-";

export interface ExperienceDeliveryLike {
  title: string;
  project?: string;
}

export interface ExperienceRoleLike {
  organisation: string;
  title: string;
  deliveries?: ExperienceDeliveryLike[];
}

/**
 * The RAW `projects` collection entry — every project velite loaded, drafts and
 * fixtures included. Deliberately NOT `getPublishedProjects()`: see below.
 */
export interface RawProjectLike {
  slug: string;
  draft?: boolean;
}

function roleLabel(role: ExperienceRoleLike): string {
  return `${role.organisation} — ${role.title}`;
}

/**
 * Fails the build when a delivery's `project` slug would render a dead link.
 *
 * Existence is checked against the RAW collection, then draft/fixture status is
 * checked SEPARATELY, and the two failures carry different messages. That split
 * is the point: `getPublishedProjects()` filters drafts and `fixture-` slugs on
 * production only, so a raw-existence-only check would happily pass a link that
 * resolves everywhere the author looks and 404s solely in production (R4.2).
 */
export function checkExperienceProjectLinks(input: {
  experience: readonly ExperienceRoleLike[];
  projects: readonly RawProjectLike[];
}): void {
  const bySlug = new Map(input.projects.map((project) => [project.slug, project]));

  for (const role of input.experience) {
    for (const delivery of role.deliveries ?? []) {
      const slug = delivery.project;
      if (slug === undefined) continue;

      const where = `${EXPERIENCE_FILE}: ${roleLabel(role)}: delivery '${delivery.title}' references project slug '${slug}'`;
      const project = bySlug.get(slug);

      if (project === undefined) {
        throw new Error(
          `[velite/experience] ${where}, which is not in the projects collection. Add content/projects/${slug}.mdx or drop the 'project' field.`,
        );
      }
      if (project.draft === true) {
        throw new Error(
          `[velite/experience] ${where}, which is 'draft: true'. Drafts are filtered out on production, so this link would 404 in production only. Publish the project or drop the 'project' field.`,
        );
      }
      if (slug.startsWith(FIXTURE_SLUG_PREFIX)) {
        throw new Error(
          `[velite/experience] ${where}, which is a '${FIXTURE_SLUG_PREFIX}' test fixture. Fixtures are filtered out on production, so this link would 404 in production only. Link a real project or drop the 'project' field.`,
        );
      }
    }
  }
}

/**
 * Fails the build when `content/skills.yaml` carries more than
 * `SKILLS_MAX_GROUPS` groups — the collection-level half of R5.2's "curated,
 * not exhaustive" rule, which `skillEntrySchema` cannot express because velite
 * validates one entry at a time. The bound is imported, never restated, so it
 * keeps its single definition in `skills-schema.ts`.
 */
export function checkSkillsGroupCap(skills: readonly unknown[]): void {
  if (skills.length > SKILLS_MAX_GROUPS) {
    throw new Error(
      `[velite/skills] ${SKILLS_FILE}: ${skills.length} skill groups exceeds the maximum of ${SKILLS_MAX_GROUPS}. R5.2 asks for a curated set, not an inventory — merge or drop groups rather than raising the cap.`,
    );
  }
}
