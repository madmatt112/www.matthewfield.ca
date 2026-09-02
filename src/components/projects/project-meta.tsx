import { Fragment } from "react";

import { formatContentDate } from "@/lib/format-date";
import type { Project } from "@/lib/projects";

export type ProjectMetaProps = {
  project: Project;
  /** Lead the line with the full publication date. The ledger rows carry the
   * year in their own rail, so only the featured spread sets this. */
  withDate?: boolean;
};

const MONO = "font-mono text-xs tracking-widest text-muted-foreground uppercase";

/**
 * The mono meta line shared by the featured spread and the ledger rows: the
 * project's status, then what a visitor will find behind the link. "open
 * source" when a `repo` link exists; "write-up only" when the project has no
 * links at all (the closed-source retrospectives). Same type treatment as the
 * blog rows' date / reading-time line.
 */
export function ProjectMeta({ project, withDate = false }: ProjectMetaProps) {
  const links = project.links ?? [];
  const terms: string[] = [project.status];
  if (links.some((link) => link.kind === "repo")) terms.push("open source");
  else if (links.length === 0) terms.push("write-up only");
  const { datetime, display } = formatContentDate(project.date);
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {withDate ? (
        <>
          <time dateTime={datetime} className={MONO}>
            {display}
          </time>
          <Separator />
        </>
      ) : null}
      {terms.map((term, i) => (
        <Fragment key={term}>
          {i > 0 ? <Separator /> : null}
          <span className={MONO}>{term}</span>
        </Fragment>
      ))}
    </p>
  );
}

function Separator() {
  return (
    <span aria-hidden="true" className="text-xs text-muted-foreground">
      /
    </span>
  );
}
