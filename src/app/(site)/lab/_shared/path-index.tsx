/**
 * The path-index listing: each site section as a route, with a real count.
 *
 * Shared by mockups D and E so the two stay identical. The `/` glyph is the
 * brand-coloured path-mark the design system names as the signature
 * (design.md §3); descriptions stay in the sans body face so the listing reads
 * editorial rather than terminal cosplay.
 *
 * Temporary — deleted with the rest of `/lab` once a direction is chosen.
 */
import Link from "next/link";

import { sectionCounts } from "./data";
import { MonoLabel } from "./parts";

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function PathIndex() {
  const counts = sectionCounts();
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
  );
}
