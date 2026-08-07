import { ExperienceRoleItem } from "@/components/profile/experience-role-item";
import { SectionKicker } from "@/components/shared/section-kicker";
import type { ExperienceRole } from "@/lib/experience";

export type ExperienceTimelineProps = {
  roles: ExperienceRole[];
};

/**
 * The full employment history as a flat, hairline-divided list — no Card, no
 * shadow (design §Design System, flat + hairline surfaces).
 *
 * CHRONOLOGY IS STRUCTURAL (R8.4). The roles sit in an ordered list whose order
 * IS the chronology, each role carries real `<time datetime="YYYY-MM">`
 * elements, and the ordering is stated in text for assistive technology. The
 * visual date rail is therefore never the only expression of chronology.
 *
 * `role="list"` is required because the preflight strips `list-style`, which
 * drops list semantics in Safari/VoiceOver.
 *
 * Returns `null` when there is nothing to render — no heading, kicker, or rule
 * (R5.4 / design Error Handling scenario 6).
 *
 * Each role `<li>` carries `profile-role`, the print hook task 20 needs to
 * exempt roles from print.css's blanket `li { break-inside: avoid }`, which
 * would otherwise override the header-scoped break rule and strand whitespace.
 */
export function ExperienceTimeline({ roles }: ExperienceTimelineProps) {
  if (roles.length === 0) return null;
  return (
    <section id="experience" aria-labelledby="experience-heading" className="mt-16">
      <SectionKicker label="experience" />
      <h2 id="experience-heading" className="mt-3 font-display text-2xl tracking-tight sm:text-3xl">
        Experience
      </h2>
      <p id="experience-order" className="sr-only">
        Roles are listed most recent first.
      </p>
      <ol role="list" aria-describedby="experience-order" className="mt-8 divide-y divide-border">
        {roles.map((role) => (
          <li
            key={`${role.organisation}-${role.title}-${role.start}`}
            className="profile-role py-8 first:pt-0"
          >
            <ExperienceRoleItem role={role} />
          </li>
        ))}
      </ol>
    </section>
  );
}
