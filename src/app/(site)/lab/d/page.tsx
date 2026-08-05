import type { Metadata } from "next";
import Link from "next/link";

import { formatContentDate } from "@/lib/format-date";

import { KIND_LABEL, latestStream } from "../_shared/data";
import { PathIndex } from "../_shared/path-index";
import { ContactStrip, LabHero, LabPage, LabSection, MonoLabel } from "../_shared/parts";

export const metadata: Metadata = {
  title: "Mockup D — Path index",
  robots: { index: false, follow: false },
};

/**
 * Variant D — "Path index".
 *
 * Commits to the `/` path-mark the design system already calls the signature
 * (design.md §3): the site presents itself as a listing of routes, each with a
 * real count. Descriptions stay in the sans body face so it reads editorial
 * rather than terminal cosplay.
 */
export default function MockupD() {
  const stream = latestStream(3);

  return (
    <LabPage>
      <LabHero>
        <p className="max-w-measure text-lg text-foreground">
          Platform and infrastructure engineer. A decade of distributed systems, developer
          platforms, and the documentation that makes them usable.
        </p>
      </LabHero>

      <LabSection kicker="index" heading="Index" headingHidden>
        <PathIndex />
      </LabSection>

      <LabSection kicker="latest" heading="Recent work" headingHidden>
        <ul className="flex flex-col gap-4">
          {stream.map((item) => (
            <li
              key={item.href + item.title}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
            >
              <time
                dateTime={formatContentDate(item.date).datetime}
                className="font-mono text-xs text-muted-foreground"
              >
                {formatContentDate(item.date).display}
              </time>
              <MonoLabel>{KIND_LABEL[item.kind]}</MonoLabel>
              <Link
                href={item.href}
                className="text-base text-brand underline-offset-4 hover:underline"
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </LabSection>

      <ContactStrip />
    </LabPage>
  );
}
