import "@/styles/contributions.css";

import type { Metadata } from "next";

import { ResourceCategorySection } from "@/components/resources/resource-category-section";
import { SectionKicker } from "@/components/shared/section-kicker";
import {
  getResourcesGroupedByCategory,
  RESOURCE_CATEGORY_LABELS,
  RESOURCES_DESCRIPTION,
} from "@/lib/resources";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  return {
    title: "Resources",
    description: RESOURCES_DESCRIPTION,
    alternates: {
      canonical: "/resources",
    },
  };
}

export default function ResourcesPage() {
  const groups = getResourcesGroupedByCategory();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <SectionKicker label="resources" />
      <h1 id="page-heading" className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
        Resources
      </h1>
      {groups.length === 0 ? (
        <section aria-labelledby="empty-state-heading" className="mt-8">
          <h2 id="empty-state-heading">No resources yet</h2>
          <p>{RESOURCES_DESCRIPTION}</p>
        </section>
      ) : (
        <div className="resource-categories mt-8">
          {groups.map(({ category, resources }) => (
            <ResourceCategorySection
              key={category}
              category={category}
              label={RESOURCE_CATEGORY_LABELS[category]}
              resources={resources}
            />
          ))}
        </div>
      )}
    </main>
  );
}
