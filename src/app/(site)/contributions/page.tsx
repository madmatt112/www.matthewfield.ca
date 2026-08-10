import "@/styles/contributions.css";

import type { Metadata } from "next";

import { ContributionCard } from "@/components/contributions/contribution-card";
import { ContributionHeatmap } from "@/components/contributions/contribution-heatmap";
import { SectionKicker } from "@/components/shared/section-kicker";
import { CONTRIBUTIONS_DESCRIPTION, getAllContributions } from "@/lib/contributions";
import { getActivityWindow } from "@/lib/github-activity";

// Prerendered at build time, and it stays that way (Req 6.1). `revalidate`/ISR
// is deliberately absent (Req 6.2): it does not skip build-time prerender, and
// dropping this line lets a future headers()/cookies()/searchParams access
// silently convert the route to per-request SSR. Neither this page nor the
// heatmap makes a network request in any environment (Req 1.7) — the grid is
// derived from content/github-activity.yaml through Velite.
export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  return {
    title: "Contributions",
    description: CONTRIBUTIONS_DESCRIPTION,
    alternates: {
      canonical: "/contributions",
    },
  };
}

export default function ContributionsPage() {
  const contributions = getAllContributions();

  // Both lookups and BOTH suppression gates live here, not in the component
  // (Reqs 3.1, 3.8, 3.9): `null` means the activity collection is unseeded, and
  // an empty contributions collection means the empty-state copy below is
  // showing — a heatmap announcing four figures of activity directly beneath
  // "No contributions yet" would contradict it (Req 11.10).
  const activityWindow = getActivityWindow();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <SectionKicker label="contributions" />
      <h1 id="page-heading" className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
        Contributions
      </h1>
      {contributions.length === 0 ? (
        <section aria-labelledby="empty-state-heading" className="mt-12">
          <h2 id="empty-state-heading">No contributions yet</h2>
          <p>{CONTRIBUTIONS_DESCRIPTION}</p>
        </section>
      ) : (
        <ul role="list" aria-labelledby="page-heading" className="contributions-grid mt-12">
          {contributions.map((contribution, i) => (
            <li key={`${contribution.repo}-${contribution.title}`}>
              <ContributionCard contribution={contribution} index={i} />
            </li>
          ))}
        </ul>
      )}
      {/* AFTER the card grid, never above it (Req 3.7). That ordering is
       * load-bearing for Req 5, not a layout preference: the cards are the
       * page's subject and the heatmap is context for them. Staleness and
       * partial coverage never reach this gate — they are soft failures that
       * must not hide the graphic (Req 7.5); the published range shrinking to
       * the covered span is how the page stays honest instead. */}
      {activityWindow && contributions.length > 0 ? (
        <ContributionHeatmap window={activityWindow} />
      ) : null}
    </main>
  );
}
