import Link from "next/link";

import { NewTabHint } from "@/components/shared/new-tab-hint";
import type { ExperienceDelivery, ExperienceRole } from "@/lib/experience";
import { formatMonthYear } from "@/lib/format-date";

export type ExperienceRoleItemProps = {
  role: ExperienceRole;
};

/**
 * Stable DOM id for a role, used to name its <article> from its heading.
 * `organisation` + `start` is unique in the data (nobody holds two roles at the
 * same employer starting in the same month) and is derived, never authored.
 */
export function experienceRoleId(role: ExperienceRole): string {
  const slug = role.organisation
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `role-${slug}-${role.start}`;
}

const CHIP =
  "inline-flex items-center rounded-full border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground";

function DeliveryItem({ delivery }: { delivery: ExperienceDelivery }) {
  return (
    <li>
      <h4 className="text-sm font-semibold">
        {delivery.project ? (
          // Req 4.1/4.3: a delivery that has a project page LINKS to it instead
          // of restating the write-up. `profile-internal-link` is the print hook
          // — task 20 expands these against siteConfig.url so they stay
          // followable on paper.
          <Link
            href={`/projects/${delivery.project}`}
            className="profile-internal-link text-brand underline underline-offset-4"
          >
            {delivery.title}
          </Link>
        ) : (
          delivery.title
        )}{" "}
        <span className="font-normal text-muted-foreground">— {delivery.role}</span>
      </h4>
      <p className="mt-1 text-sm text-muted-foreground">{delivery.body}</p>
      {delivery.highlights && delivery.highlights.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {delivery.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * One role in the employment timeline.
 *
 * LAYOUT (design §The measure exception): below `lg` everything stacks, so the
 * date becomes a line above the role title and a narrow viewport never trades
 * measure for a rail. At `lg` and up the same markup becomes a four-column grid
 * — date rail at `col-span-1`, content at `col-span-3` — with the prose held to
 * `max-w-measure`. Only the rail sits outside the measure: that widens the
 * gutter, not the measure. Named steps throughout, no arbitrary track sizes.
 *
 * PRINT HOOKS (required here — task 20's rules are inert without them):
 * - `profile-role-header` on the header block, so `break-inside: avoid` can be
 *   scoped to dates + title + organisation rather than to a whole long role.
 * - `profile-print-no-url` on the organisation link, so print's
 *   `a[href^="http"]::after` URL expansion can opt out and not print
 *   "CrowdStrike (https://www.crowdstrike.com)" on every role.
 * - `profile-internal-link` on each `/projects/<slug>` cross-link.
 */
export function ExperienceRoleItem({ role }: ExperienceRoleItemProps) {
  const headingId = experienceRoleId(role);
  const start = formatMonthYear(role.start);
  // Req 1.2: `end` absent means the role is CURRENT. It renders as "Present" —
  // never as an empty or invented date.
  const end = role.end === undefined ? null : formatMonthYear(role.end);

  return (
    <article aria-labelledby={headingId}>
      <header className="profile-role-header lg:grid lg:grid-cols-4 lg:gap-x-8">
        {/* The date rail. Real <time> elements carry the machine-readable
            YYYY-MM (R8.4) so chronology is not left to the visual column. */}
        <div className="lg:col-span-1">
          <p className="font-mono text-xs tracking-wide text-muted-foreground">
            <time dateTime={start.datetime}>{start.display}</time>
            <span aria-hidden="true"> – </span>
            <span className="sr-only"> to </span>
            {end ? <time dateTime={end.datetime}>{end.display}</time> : <span>Present</span>}
          </p>
          <p className="mt-1 font-mono text-xs tracking-wide text-muted-foreground">
            {role.location}
          </p>
        </div>
        <div className="mt-2 max-w-measure lg:col-span-3 lg:mt-0">
          <h3 id={headingId} className="text-lg font-semibold tracking-tight">
            {role.title}
          </h3>
          <p className="mt-1 text-base">
            {role.organisationUrl ? (
              <a
                href={role.organisationUrl}
                target="_blank"
                rel="noopener"
                className="profile-print-no-url text-brand underline underline-offset-4"
              >
                {role.organisation}
                <NewTabHint />
              </a>
            ) : (
              role.organisation
            )}
          </p>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-4 lg:gap-x-8">
        <div className="max-w-measure lg:col-span-3 lg:col-start-2">
          <p className="mt-4 text-base text-muted-foreground">{role.summary}</p>

          {role.deliveries && role.deliveries.length > 0 ? (
            <ul role="list" className="mt-6 space-y-6 border-l border-border pl-4">
              {role.deliveries.map((delivery) => (
                <DeliveryItem key={delivery.title} delivery={delivery} />
              ))}
            </ul>
          ) : null}

          <ul className="mt-6 list-disc space-y-2 pl-5 text-sm">
            {role.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>

          {role.tech && role.tech.length > 0 ? (
            <ul
              role="list"
              aria-label={`Technologies used at ${role.organisation}`}
              className="mt-6 flex flex-wrap gap-2"
            >
              {role.tech.map((tech) => (
                <li key={tech} className={CHIP}>
                  {tech}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </article>
  );
}
