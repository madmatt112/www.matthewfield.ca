import { NewTabHint } from "@/components/shared/new-tab-hint";
import { SectionKicker } from "@/components/shared/section-kicker";
import type { EducationEntry } from "@/lib/experience";
import { formatMonthYear } from "@/lib/format-date";

export type EducationListProps = {
  entries: EducationEntry[];
};

/**
 * Education credentials, most recent first (R5.3: credential, institution,
 * completion date, honours).
 *
 * ORDERING IS STRUCTURAL, as in `ExperienceTimeline` (R8.4): an ordered list
 * whose order is the chronology, a real `<time datetime="YYYY-MM">` per entry,
 * and the ordering stated in text for assistive technology — so the visual date
 * rail is never the only expression of it. `completed` is month-precision, so
 * it goes through `formatMonthYear` and is never padded to a fabricated day.
 *
 * `honours`, `note`, and `institutionUrl` are optional in the schema. Each is
 * rendered only when present; nothing emits an empty element.
 *
 * PRINT HOOK: institution links carry `profile-print-no-url` for the same
 * reason organisation links do — print.css expands `a[href^="http"]` into
 * "NAIT (https://www.nait.ca)", which is noise on a CV where the institution
 * name is the identifier and the URL earns no ink.
 *
 * Layout mirrors §The measure exception: stacked below `lg`, date rail plus
 * three-column `max-w-measure` content track at `lg`. Named steps only.
 *
 * Returns `null` when there is nothing to render — no heading, kicker, or rule
 * (R5.4 / design Error Handling scenario 6).
 */
export function EducationList({ entries }: EducationListProps) {
  if (entries.length === 0) return null;
  return (
    <section id="education" aria-labelledby="education-heading" className="mt-16">
      <SectionKicker label="education" />
      <h2 id="education-heading" className="mt-3 font-display text-3xl tracking-tight">
        Education
      </h2>
      <p id="education-order" className="sr-only">
        Credentials are listed most recent first.
      </p>
      <ol role="list" aria-describedby="education-order" className="mt-8 divide-y divide-border">
        {entries.map((entry) => {
          const completed = formatMonthYear(entry.completed);
          return (
            <li
              key={`${entry.institution}-${entry.credential}`}
              className="py-6 first:pt-0 lg:grid lg:grid-cols-4 lg:gap-x-8"
            >
              <p className="font-mono text-xs tracking-wide text-muted-foreground lg:col-span-1">
                <time dateTime={completed.datetime}>{completed.display}</time>
              </p>
              <div className="mt-2 max-w-measure lg:col-span-3 lg:mt-0">
                <h3 className="text-lg font-semibold tracking-tight">{entry.credential}</h3>
                <p className="mt-1 text-base">
                  {entry.institutionUrl ? (
                    <a
                      href={entry.institutionUrl}
                      target="_blank"
                      rel="noopener"
                      className="profile-print-no-url text-brand underline underline-offset-4"
                    >
                      {entry.institution}
                      <NewTabHint />
                    </a>
                  ) : (
                    entry.institution
                  )}
                </p>
                {entry.honours ? (
                  <p className="mt-1 text-sm text-muted-foreground">{entry.honours}</p>
                ) : null}
                {entry.note ? (
                  <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
