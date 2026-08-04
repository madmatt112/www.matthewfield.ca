import type { Metadata } from "next";
import Link from "next/link";

import { formatContentDate } from "@/lib/format-date";

import { KIND_LABEL, latestStream, sectionCounts } from "../_shared/data";
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
  const counts = sectionCounts();
  const stream = latestStream(3);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  const entries = [
    {
      href: "/profile",
      label: "profile",
      description: "Background, experience, areas of focus.",
      meta: "CV",
    },
    {
      href: "/projects",
      label: "projects",
      description: "Things I built, and why.",
      meta: plural(counts.projects, "entry", "entries"),
    },
    {
      href: "/contributions",
      label: "contributions",
      description: "Open-source work worth pointing at.",
      meta: plural(counts.contributions, "entry", "entries"),
    },
    {
      href: "/blog",
      label: "blog",
      description: "Writing about tech, life, and sundry.",
      meta: plural(counts.posts, "post", "posts"),
    },
    {
      href: "/resources",
      label: "resources",
      description: "References and links worth sharing.",
      meta: plural(counts.resources, "link", "links"),
    },
  ];

  return (
    <LabPage>
      <LabHero>
        <p className="max-w-measure text-lg text-foreground">
          Platform and infrastructure engineer. A decade of distributed systems, developer
          platforms, and the documentation that makes them usable.
        </p>
      </LabHero>

      <LabSection kicker="index" heading="Index" headingHidden>
        <ul className="divide-y divide-border border-y border-border">
          {entries.map((entry) => (
            <li key={entry.href}>
              <Link
                href={entry.href}
                className="group flex flex-col gap-1 py-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:flex-row sm:items-baseline sm:gap-4"
              >
                <span className="font-mono text-base text-foreground group-hover:underline">
                  <span className="text-brand">/</span>
                  {entry.label}
                </span>
                <span className="text-sm text-muted-foreground">{entry.description}</span>
                <span className="sm:ml-auto">
                  <MonoLabel>{entry.meta}</MonoLabel>
                </span>
              </Link>
            </li>
          ))}
        </ul>
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
