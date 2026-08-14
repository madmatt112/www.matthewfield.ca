import Image from "next/image";
import Link from "next/link";

import { StatusBadge } from "@/components/projects/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatContentDate } from "@/lib/format-date";
import type { Project } from "@/lib/projects";

export type ProjectCardProps = {
  project: Project;
  eager?: boolean;
};

export function ProjectCard({ project, eager = false }: ProjectCardProps) {
  const titleId = `card-title-${project.slug}`;
  const { datetime, display } = formatContentDate(project.date);
  return (
    <Card className="relative overflow-hidden py-0 pb-6">
      {/* DOM order per Req 2.3: cover, title, summary, date, status, featured. */}
      <CardHeader className="relative aspect-[3/2] w-full overflow-hidden bg-muted p-0">
        <Image
          src={project.cover.src}
          alt=""
          width={project.cover.width}
          height={project.cover.height}
          placeholder={project.cover.blurDataURL ? "blur" : "empty"}
          blurDataURL={project.cover.blurDataURL}
          priority={eager}
          loading={eager ? undefined : "lazy"}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="h-full w-full object-cover"
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <h3 id={titleId} className="text-lg leading-tight font-semibold">
          {project.title}
        </h3>
        <p className="text-sm text-muted-foreground">{project.summary}</p>
        <div className="text-sm text-muted-foreground">
          <time dateTime={datetime}>{display}</time>
        </div>
        {project.status !== "active" || project.featured ? (
          <div className="flex flex-wrap gap-2">
            {project.status !== "active" ? <StatusBadge status={project.status} /> : null}
            {project.featured ? (
              <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Featured
              </span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
      {/* Single anchor overlays the entire card surface (Req 2.6). */}
      {/* aria-labelledby scopes the accessible name to the title only (Req 2.6). */}
      <Link
        href={`/projects/${project.slug}`}
        aria-labelledby={titleId}
        className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
    </Card>
  );
}
