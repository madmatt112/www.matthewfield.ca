import Image from "next/image";

import { ProjectMeta } from "@/components/projects/project-meta";
import { ProjectTitle } from "@/components/projects/project-title";
import { formatContentDate } from "@/lib/format-date";
import type { Project } from "@/lib/projects";

export type ProjectRowProps = {
  project: Project;
};

/**
 * One row of the /projects ledger: the year in a rail on the left, then the
 * meta line, title, summary and tags. A thumbnail appears only when the
 * project has links, i.e. when there is something live to look at. The
 * closed-source write-ups get no image, so their title-card covers stay on
 * the detail page and out of the index.
 */
export function ProjectRow({ project }: ProjectRowProps) {
  const { datetime } = formatContentDate(project.date);
  const year = project.date.slice(0, 4);
  const image = project.cardImage ?? project.cover;
  const hasLinks = (project.links?.length ?? 0) > 0;
  return (
    <li className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-6 gap-y-3 py-6 sm:grid-cols-[4rem_minmax(0,1fr)_auto]">
      <time
        dateTime={datetime}
        className="font-mono text-xs tracking-widest text-muted-foreground tabular-nums uppercase"
      >
        {year}
      </time>
      <div>
        <ProjectMeta project={project} />
        <ProjectTitle project={project} />
        <p className="mt-1 max-w-measure text-sm text-muted-foreground">{project.summary}</p>
        {project.tags.length > 0 ? (
          <ul
            aria-label="Tags"
            className="mt-2 flex flex-wrap gap-x-3 font-mono text-xs text-muted-foreground"
          >
            {project.tags.map((tag) => (
              <li key={tag}>
                <span aria-hidden="true" className="text-muted-foreground/60">
                  #
                </span>
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {hasLinks ? (
        <Image
          src={image.src}
          width={image.width}
          height={image.height}
          alt=""
          loading="lazy"
          sizes="160px"
          placeholder={image.blurDataURL ? "blur" : "empty"}
          blurDataURL={image.blurDataURL}
          className="col-start-2 aspect-[3/2] w-40 rounded-md border border-border bg-muted object-cover object-left-top sm:col-start-auto"
        />
      ) : null}
    </li>
  );
}
