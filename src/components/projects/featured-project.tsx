import Image from "next/image";

import { ProjectMeta } from "@/components/projects/project-meta";
import { ProjectTitle } from "@/components/projects/project-title";
import { NewTabHint } from "@/components/shared/new-tab-hint";
import type { Project } from "@/lib/projects";

export type FeaturedProjectProps = {
  project: Project;
  headingId: string;
};

/**
 * The lead entry on /projects: the one large image on the page, beside the
 * same meta line, title and summary the rows use. The image is `cardImage`
 * when the project sets one, otherwise `cover`. It is decorative here (alt="")
 * because the title link next to it already names the project, and a
 * `cardImage` has no alt text of its own.
 */
export function FeaturedProject({ project, headingId }: FeaturedProjectProps) {
  const image = project.cardImage ?? project.cover;
  const links = project.links ?? [];
  return (
    <div className="mt-3 grid items-center gap-6 border-b border-border pb-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-10">
      <Image
        src={image.src}
        width={image.width}
        height={image.height}
        alt=""
        priority
        sizes="(min-width: 768px) 560px, 100vw"
        placeholder={image.blurDataURL ? "blur" : "empty"}
        blurDataURL={image.blurDataURL}
        className="h-auto w-full rounded-lg border border-border bg-muted"
      />
      <div>
        <ProjectMeta project={project} withDate />
        <ProjectTitle project={project} id={headingId} />
        <p className="mt-1 max-w-measure text-sm text-muted-foreground">{project.summary}</p>
        {links.length > 0 ? (
          <ul aria-label="Project links" className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener"
                  className="text-foreground underline underline-offset-4 hover:no-underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {link.label}
                  <NewTabHint />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
