import { education, experience, skills } from "#site/content";

export type ExperienceRole = (typeof experience)[number];
export type ExperienceDelivery = NonNullable<ExperienceRole["deliveries"]>[number];
export type SkillGroup = (typeof skills)[number];
export type EducationEntry = (typeof education)[number];

/**
 * Single sort key for the employment history (Req 1.6).
 *
 * `end` descending — with a CURRENT role (no `end`) treated as infinity — then
 * `start` descending, then organisation ascending. Sorting on `start` alone is
 * wrong: tenures in this data overlap by design (each role's end month equals
 * the next role's start month, a continuous career), so a start-only key can
 * put a finished role ahead of the one that succeeded it.
 *
 * `start`/`end` are `YYYY-MM` strings from `isoMonth()`, so lexicographic
 * comparison is chronological — no Date parsing needed.
 */
export function byEndDescStartDescOrganisationAsc(a: ExperienceRole, b: ExperienceRole): number {
  const aCurrent = a.end === undefined;
  const bCurrent = b.end === undefined;
  // Exactly one is current: it ends at infinity, so it sorts first.
  if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
  // Both ended (or both current, where `end` is undefined on each side).
  if (a.end !== undefined && b.end !== undefined && a.end !== b.end) {
    return a.end < b.end ? 1 : -1;
  }
  if (a.start !== b.start) return a.start < b.start ? 1 : -1;
  return a.organisation < b.organisation ? -1 : a.organisation > b.organisation ? 1 : 0;
}

/**
 * The single read path for employment data (design §Components getExperience).
 * Ordering is derived from the data, never from file order (Req 1.6).
 */
export function getExperience(): ExperienceRole[] {
  return [...experience].sort(byEndDescStartDescOrganisationAsc);
}

/**
 * Skill groups in authored order. There is no date or rank to sort on, and the
 * authored sequence IS the editorial judgement R5.2 asks for — so this selector
 * exists to be the single read path, not to reorder. Returns a copy so a
 * consumer cannot mutate the collection.
 */
export function getSkills(): SkillGroup[] {
  return [...skills];
}

/**
 * Education, most recent first. `completed` is an `isoMonth()` `YYYY-MM`
 * string, so it sorts lexicographically; credential ascending is the
 * deterministic tiebreak for two credentials finished in the same month.
 */
export function getEducation(): EducationEntry[] {
  return [...education].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed < b.completed ? 1 : -1;
    return a.credential < b.credential ? -1 : a.credential > b.credential ? 1 : 0;
  });
}
