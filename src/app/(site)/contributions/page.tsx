import "@/styles/contributions.css";

import type { Metadata } from "next";

import { ContributionCard } from "@/components/contributions/contribution-card";
import { SectionKicker } from "@/components/shared/section-kicker";
import { CONTRIBUTIONS_DESCRIPTION, getAllContributions } from "@/lib/contributions";

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
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <SectionKicker label="contributions" />
      <h1 id="page-heading" className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
        Contributions
      </h1>
      {contributions.length === 0 ? (
        <section aria-labelledby="empty-state-heading" className="mt-8">
          <h2 id="empty-state-heading">No contributions yet</h2>
          <p>{CONTRIBUTIONS_DESCRIPTION}</p>
        </section>
      ) : (
        <ul role="list" aria-labelledby="page-heading" className="contributions-grid mt-8">
          {contributions.map((contribution, i) => (
            <li key={`${contribution.repo}-${contribution.title}`}>
              <ContributionCard contribution={contribution} index={i} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
