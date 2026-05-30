import "@/styles/contributions.css";

import type { Metadata } from "next";

import { ResourceCategorySection } from "@/components/resources/resource-category-section";
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
    <main>
      <h1 id="page-heading">Resources</h1>
      {groups.length === 0 ? (
        <section aria-labelledby="empty-state-heading">
          <h2 id="empty-state-heading">No resources yet</h2>
          <p>{RESOURCES_DESCRIPTION}</p>
        </section>
      ) : (
        <div className="resource-categories">
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
