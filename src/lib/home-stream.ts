import { getVisiblePublishedPosts } from "@/lib/blog";
import { getAllContributions } from "@/lib/contributions";
import { getPublishedProjects } from "@/lib/projects";

export type HomeStreamKind = "post" | "project" | "oss";

export type HomeStreamItem = {
  kind: HomeStreamKind;
  title: string;
  description: string;
  href: string;
  date: string;
};

/**
 * Mono label shown beside each stream row.
 *
 * These are the canonical section names, matching the nav and the landing index
 * — a row labelled "blog" is telling you which page it lives on. Descriptive
 * labels ("writing", "open source") read nicer but leave the reader guessing
 * where the item actually is.
 */
export const HOME_STREAM_KIND_LABEL: Record<HomeStreamKind, string> = {
  post: "blog",
  project: "projects",
  oss: "contributions",
};

/*
 * Fixture screening.
 *
 * `getVisiblePublishedPosts()` already drops fixture posts everywhere. Projects
 * are different: `getPublishedProjects()` only screens `fixture-` slugs on a real
 * production deploy, so they stay visible in dev, CI, and preview — which the
 * projects gallery wants and the homepage does not. The landing page is the shop
 * window, so it screens them unconditionally; a fixture dated newer than the real
 * work would otherwise lead the stream on every preview deploy.
 */
const isFixture = (slug: string) => slug.startsWith("fixture-");

function realProjects() {
  return getPublishedProjects().filter((project) => !isFixture(project.slug));
}

/** Counts shown against each route in the homepage index. */
export function getHomeCounts() {
  return {
    projects: realProjects().length,
    contributions: getAllContributions().length,
    posts: getVisiblePublishedPosts().length,
  };
}

/**
 * Newest-first stream mixing writing, projects, and open-source contributions,
 * so the landing page shows recent activity of any kind rather than only posts.
 */
export function getHomeStream(limit: number): HomeStreamItem[] {
  const items: HomeStreamItem[] = [
    ...getVisiblePublishedPosts().map((post) => ({
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
    ...getAllContributions().map((contribution) => ({
      kind: "oss" as const,
      title: contribution.title,
      description: contribution.description,
      href: "/contributions",
      date: contribution.date,
    })),
  ];
  // Date desc, then title asc so equal dates order deterministically.
  items.sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.title < b.title ? -1 : 1,
  );
  return items.slice(0, limit);
}
