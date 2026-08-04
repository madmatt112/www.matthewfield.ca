/**
 * Real-content selectors for the homepage mockups.
 *
 * The site's own selectors deliberately keep `fixture-*` entries visible
 * everywhere except a real production deploy, which would make the mockups look
 * fake. These wrappers screen fixtures out so each variant is judged on the
 * actual content it would carry.
 *
 * Temporary — deleted with the rest of `/lab` once a direction is chosen.
 */
import { getVisiblePublishedPosts } from "@/lib/blog";
import { getAllContributions, type Contribution } from "@/lib/contributions";
import { getPublishedProjects, type Project } from "@/lib/projects";
import { getAllResources } from "@/lib/resources";

const isFixture = (slug: string) => slug.startsWith("fixture-");

export function realPosts() {
  return getVisiblePublishedPosts().filter((post) => !isFixture(post.slug));
}

export function realProjects(): Project[] {
  return getPublishedProjects().filter((project) => !isFixture(project.slug));
}

export function realContributions(): readonly Contribution[] {
  return getAllContributions();
}

/** Counts used by the path-index variant, so the listing carries real weight. */
export function sectionCounts() {
  return {
    projects: realProjects().length,
    contributions: realContributions().length,
    posts: realPosts().length,
    resources: getAllResources().length,
  };
}

/** Newest-first mixed stream of posts, projects, and contributions. */
export type StreamItem = {
  kind: "post" | "project" | "oss";
  title: string;
  description: string;
  href: string;
  date: string;
};

export function latestStream(limit: number): StreamItem[] {
  const items: StreamItem[] = [
    ...realPosts().map((post) => ({
      kind: "post" as const,
      title: post.title,
      description: post.description,
      href: `/blog/${post.slug}`,
      date: post.date,
    })),
    ...realProjects().map((project) => ({
      kind: "project" as const,
      title: project.title,
      description: project.summary,
      href: `/projects/${project.slug}`,
      date: project.updated ?? project.date,
    })),
    ...realContributions().map((contribution) => ({
      kind: "oss" as const,
      title: contribution.title,
      description: contribution.description,
      href: "/contributions",
      date: contribution.date,
    })),
  ];
  return items.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
}

export const KIND_LABEL: Record<StreamItem["kind"], string> = {
  post: "writing",
  project: "project",
  oss: "open source",
};
