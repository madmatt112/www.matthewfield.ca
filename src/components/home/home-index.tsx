import Link from "next/link";

import { SectionKicker } from "@/components/shared/section-kicker";
import { siteConfig } from "@/config/site";
import { getAllResources } from "@/lib/resources";
import { getHomeCounts } from "@/lib/home-stream";

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The path-index listing: each section as a route with a real count, so the
 * index doubles as evidence that there is something behind each door.
 *
 * The brand `/` is the path-mark the design system names as the signature
 * (design.md §3). Descriptions stay in the sans body face so the listing reads
 * editorial rather than as a terminal pastiche.
 */
export function HomeIndex() {
  const counts = getHomeCounts();
  const meta: Record<string, string> = {
    "/profile": "CV",
    "/projects": plural(counts.projects, "entry", "entries"),
    "/contributions": plural(counts.contributions, "entry", "entries"),
    "/blog": plural(counts.posts, "post", "posts"),
    "/resources": plural(getAllResources().length, "link", "links"),
  };

  return (
    <section aria-labelledby="home-index-heading" className="mt-16 md:mt-24">
      <div className="flex flex-col gap-3">
        <SectionKicker label="index" />
        <h2 id="home-index-heading" className="sr-only">
          Index
        </h2>
      </div>
      <ul className="mt-8 divide-y divide-border border-y border-border">
        {siteConfig.homeIndex.map((entry) => (
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
              {meta[entry.href] ? (
                <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase sm:ml-auto">
                  {meta[entry.href]}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
