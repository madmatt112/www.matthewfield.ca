import { notFound } from "next/navigation";

import { ogContentType, ogSize, renderArticleCard } from "@/lib/og-card";
import { getProjectBySlug, getPublishedProjects } from "@/lib/projects";

// Per-project Open Graph image. A project that sets `ogImage` in its
// frontmatter keeps it: the page's `openGraph.images` takes precedence over
// this file-convention image, which only fills in when that is unset.
export const dynamic = "force-static";
export const dynamicParams = false;

export const alt = "Project title card from matthewfield.ca";
export const size = ogSize;
export const contentType = ogContentType;

type RouteParams = { slug: string };

export function generateStaticParams(): RouteParams[] {
  return getPublishedProjects().map((p) => ({ slug: p.slug }));
}

export default async function ProjectOpenGraphImage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  return renderArticleCard({ section: "projects", title: project.title, date: project.date });
}
