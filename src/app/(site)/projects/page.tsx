import "@/styles/projects.css";

import type { Metadata } from "next";

import { ProjectCard } from "@/components/projects/project-card";
import { getPublishedProjects } from "@/lib/projects";

export const dynamic = "force-static";

const PROJECTS_DESCRIPTION = "Selected work across infrastructure and platform engineering.";

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
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
      <p className="mt-2 text-muted-foreground">{PROJECTS_DESCRIPTION}</p>
      {projects.length === 0 ? (
        <div className="mt-8 text-muted-foreground">
          <p>No projects published yet.</p>
          <p>Check back later.</p>
        </div>
      ) : (
        <ul
          aria-label="Project gallery"
          className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
        >
          {projects.map((project, i) => (
            <li key={project.slug}>
              <ProjectCard project={project} eager={i < 2} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
