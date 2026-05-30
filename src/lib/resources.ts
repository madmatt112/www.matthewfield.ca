import { resources } from "#site/content";
import { formatContentDate } from "@/lib/format-date";

export type Resource = (typeof resources)[number];
export type ResourceCategory = Resource["category"];

// Single sort key for the resources list. The `added` ISO string sorts
// lexicographically thanks to `s.isodate()`; title then url are the
// deterministic tiebreaks (Req 5.3). When `added` is equal, ordering falls
// back to title-asc (the seed-date degenerate case).
export function byAddedDescTitleAscUrlAsc(a: Resource, b: Resource): number {
  if (a.added !== b.added) return a.added < b.added ? 1 : -1;
  if (a.title !== b.title) return a.title < b.title ? -1 : 1;
  return a.url < b.url ? -1 : a.url > b.url ? 1 : 0;
}

// Human-readable labels for each category (Req 5.x). Frozen so the mapping is
// a stable single source of truth for the page heading layer.
export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = Object.freeze({
  "devops-tools": "DevOps Tools",
  "blogs-and-feeds": "Blogs & Feeds",
  reading: "Reading",
  "fun-stuff": "Fun Stuff",
});

// Render order for grouped categories — mirrors the schema enum order
// (Req 5.6). getResourcesGroupedByCategory() walks this list.
export const CATEGORY_ORDER: readonly ResourceCategory[] = Object.freeze([
  "devops-tools",
  "blogs-and-feeds",
  "reading",
  "fun-stuff",
] as const);

export function getAllResources(): readonly Resource[] {
  return [...resources].sort(byAddedDescTitleAscUrlAsc);
}

// Groups resources by category in CATEGORY_ORDER, each group sorted by the
// comparator. Empty groups are omitted (Req 5.6) so the page never renders a
// heading with no entries.
export function getResourcesGroupedByCategory(): {
  category: ResourceCategory;
  resources: Resource[];
}[] {
  const groups: { category: ResourceCategory; resources: Resource[] }[] = [];
  for (const category of CATEGORY_ORDER) {
    const inCategory = resources
      .filter((r) => r.category === category)
      .sort(byAddedDescTitleAscUrlAsc);
    if (inCategory.length > 0) groups.push({ category, resources: inCategory });
  }
  return groups;
}

export const formatResourceDate = formatContentDate;

// Single source of truth for the /resources page meta description (Req 5.8).
// The page (Task 19) imports this; do NOT re-declare it elsewhere.
export const RESOURCES_DESCRIPTION =
  "A curated list of DevOps tools, blogs and feeds, reading, and fun stuff that Matthew Field finds useful or interesting.";
