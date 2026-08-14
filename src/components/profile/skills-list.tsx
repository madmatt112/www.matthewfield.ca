import { SectionKicker } from "@/components/shared/section-kicker";
import type { SkillGroup } from "@/lib/experience";

export type SkillsListProps = {
  groups: SkillGroup[];
};

/**
 * Local chip treatment, matching the technology chips in `ExperienceRoleItem`
 * so the two sections read as one system. Kept as a per-component constant
 * because that is this repo's existing convention for the pill treatment
 * (blog tag chips, project status/updated badges, role technology chips each
 * declare their own), not because the duplication is desirable.
 */
const CHIP =
  "inline-flex items-center rounded-full border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground";

/**
 * Curated skill groups.
 *
 * GROUPING IS SEMANTIC (R5.1). The section is a description list: the category
 * is the `<dt>` term and its items are the `<dd>` description, so a screen
 * reader announces which category an item belongs to. The two-column layout is
 * presentation on top of that structure, never the structure itself. Each
 * `<dt>`/`<dd>` pair is wrapped in a `<div>` — the grouping element HTML
 * defines for exactly this purpose — so the pair can be a grid row.
 *
 * Layout mirrors §The measure exception: below `lg` the category stacks above
 * its items; at `lg` the category takes the rail column and the items sit in
 * the three-column content track, held to `max-w-measure`. Named steps only.
 *
 * `role="list"` is required on the chip list because the preflight strips
 * `list-style`, which drops list semantics in Safari/VoiceOver.
 *
 * Returns `null` when there is nothing to render — no heading, kicker, or rule
 * (R5.4 / design Error Handling scenario 6).
 */
export function SkillsList({ groups }: SkillsListProps) {
  if (groups.length === 0) return null;
  return (
    <section id="skills" aria-labelledby="skills-heading" className="mt-16">
      <SectionKicker label="skills" />
      <h2 id="skills-heading" className="mt-3 font-display text-3xl tracking-tight">
        Skills
      </h2>
      <dl className="mt-8 divide-y divide-border">
        {groups.map((group) => (
          <div key={group.category} className="py-6 first:pt-0 lg:grid lg:grid-cols-4 lg:gap-x-8">
            <dt className="text-sm font-semibold lg:col-span-1">{group.category}</dt>
            <dd className="mt-3 max-w-measure lg:col-span-3 lg:mt-0">
              <ul role="list" className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <li key={item} className={CHIP}>
                    {item}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
