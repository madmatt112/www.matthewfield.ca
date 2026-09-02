import Link from "next/link";

import type { Project } from "@/lib/projects";

export type ProjectTitleProps = {
  project: Project;
  id?: string;
};

/**
 * Item title, not a section heading: the same 18px/600 brand link the blog
 * rows and the home page's Recent work use. Every project on /projects takes
 * this treatment, the featured one included, so emphasis there comes from
 * position and the image rather than from a different face.
 */
export function ProjectTitle({ project, id }: ProjectTitleProps) {
  return (
    <h2 id={id} className="mt-2 text-lg leading-snug font-semibold">
      <Link
        href={`/projects/${project.slug}`}
        className="text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {project.title}
      </Link>
    </h2>
  );
}
