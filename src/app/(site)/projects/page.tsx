import type { Metadata } from "next";

import { FeaturedProject } from "@/components/projects/featured-project";
import { ProjectRow } from "@/components/projects/project-row";
import { SectionKicker } from "@/components/shared/section-kicker";
import { getPublishedProjects } from "@/lib/projects";

export const dynamic = "force-static";

// The same line the home index uses for this route (siteConfig.homeIndex).
const PROJECTS_DESCRIPTION = "Things I built, and why.";

export function generateMetadata(): Metadata {
  return {
    title: "Projects",
    description: PROJECTS_DESCRIPTION,
    alternates: {
      canonical: "/projects",
    },
  };
}

export default function ProjectsPage() {
  const projects = getPublishedProjects();
  // The lead is the featured project (the newest one, if several are flagged),
  // or simply the newest project when nothing is featured.
  const lead = projects.find((project) => project.featured) ?? projects.at(0);
  const rest = projects.filter((project) => project !== lead);
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 md:py-24">
      <SectionKicker label="projects" />
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Projects</h1>
      <p className="mt-2 text-muted-foreground">{PROJECTS_DESCRIPTION}</p>
      {lead === undefined ? (
        <div className="mt-8 text-muted-foreground">
          <p>No projects published yet.</p>
          <p>Check back later.</p>
        </div>
      ) : (
        <>
          <section aria-labelledby="featured-heading" className="mt-12">
            <SectionKicker label="featured" />
            <FeaturedProject project={lead} headingId="featured-heading" />
          </section>
          {rest.length > 0 ? (
            <section aria-label="More projects" className="mt-12">
              <div className="flex items-baseline justify-between gap-4">
                <SectionKicker label="more" />
                <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  {rest.length} {rest.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {rest.map((project) => (
                  <ProjectRow key={project.slug} project={project} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
