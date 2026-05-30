import "@/styles/contributions.css";

import type { Metadata } from "next";

import { ContributionCard } from "@/components/contributions/contribution-card";
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
    <main>
      <h1 id="page-heading">Contributions</h1>
      {contributions.length === 0 ? (
        <section aria-labelledby="empty-state-heading">
          <h2 id="empty-state-heading">No contributions yet</h2>
          <p>{CONTRIBUTIONS_DESCRIPTION}</p>
        </section>
      ) : (
        <ul role="list" aria-labelledby="page-heading" className="contributions-grid">
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
