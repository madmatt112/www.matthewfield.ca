import type { Resource, ResourceCategory } from "@/lib/resources";

export type ResourceCategorySectionProps = {
  category: ResourceCategory;
  label: string;
  resources: Resource[];
};

export function ResourceCategorySection({
  category,
  label,
  resources,
}: ResourceCategorySectionProps) {
  const headingId = `cat-${category}`;
  return (
    <section className="resource-category" aria-labelledby={headingId}>
      <h2 id={headingId}>{label}</h2>
      <ul>
        {resources.map((resource) => (
          <li key={resource.url}>
            <a href={resource.url} rel="noopener">
              {resource.title}
            </a>
            <p className="resource-note">{resource.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
