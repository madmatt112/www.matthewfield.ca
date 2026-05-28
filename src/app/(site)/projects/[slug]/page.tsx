import "@/styles/projects.css";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LinkRail } from "@/components/projects/link-rail";
import { StatusBadge } from "@/components/projects/status-badge";
import { UpdatedBadge } from "@/components/projects/updated-badge";
import { MDXContent } from "@/components/shared/mdx-content";
import { siteConfig } from "@/config/site";
import { formatContentDate } from "@/lib/format-date";
import {
  getProjectBySlug,
  getPublishedProjects,
  shouldShowUpdatedBadge,
} from "@/lib/projects";

export const dynamic = "force-static";

type RouteParams = { slug: string };

export function generateStaticParams(): RouteParams[] {
  return getPublishedProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  const metadata: Metadata = {
    title: project.title,
    description: project.description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      type: "article",
      title: project.title,
      description: project.description,
      url: `${siteConfig.url}/projects/${project.slug}`,
      publishedTime: project.date,
      ...(project.updated ? { modifiedTime: project.updated } : {}),
      ...(project.ogImage
        ? {
            images: [
              {
                url: project.ogImage.src,
                width: project.ogImage.width,
                height: project.ogImage.height,
              },
            ],
          }
        : {}),
    },
  };
  return metadata;
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  const { datetime, display } = formatContentDate(project.date);
  const showUpdated = shouldShowUpdatedBadge(project);
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-16 projects-article">
      <article>
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {project.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <time dateTime={datetime}>{display}</time>
            {showUpdated && project.updated ? (
              <UpdatedBadge updated={project.updated} />
            ) : null}
            {project.status !== "active" ? (
              <StatusBadge status={project.status} />
            ) : null}
          </div>
        </header>
        <Image
          src={project.cover.src}
          width={project.cover.width}
          height={project.cover.height}
          alt={project.coverAlt}
          sizes="(max-width: 1023px) 100vw, 1024px"
          priority
          className="w-full h-auto"
        />
        {project.links && project.links.length > 0 ? (
          <LinkRail links={project.links} />
        ) : null}
        <div className="mx-auto max-w-prose mt-8">
          <div className="prose dark:prose-invert">
            <MDXContent code={project.body} />
          </div>
        </div>
        <Link href="/projects" className="mt-12 inline-block">
          Back to all projects
        </Link>
      </article>
    </div>
  );
}
