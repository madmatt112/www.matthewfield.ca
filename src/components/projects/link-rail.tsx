import {
  BookOpenIcon,
  CodeIcon,
  ExternalLinkIcon,
  FileTextIcon,
  PackageIcon,
  PlayIcon,
  type LucideIcon,
} from "lucide-react";

import type { ProjectLink } from "@/lib/projects";

export type LinkRailProps = {
  links: ProjectLink[];
};

const KIND_ICONS: Record<NonNullable<ProjectLink["kind"]>, LucideIcon> = {
  demo: PlayIcon,
  repo: CodeIcon,
  docs: BookOpenIcon,
  package: PackageIcon,
  writeup: FileTextIcon,
};

export function LinkRail({ links }: LinkRailProps) {
  if (!links || links.length === 0) return null;
  return (
    <nav aria-label="Project links">
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => {
          const Icon = link.kind != null && link.kind in KIND_ICONS ? KIND_ICONS[link.kind] : null;
          return (
            <li key={link.url}>
              <a
                href={link.url}
                rel="noopener"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {Icon != null ? (
                  <Icon aria-hidden="true" className="size-4" />
                ) : (
                  <ExternalLinkIcon aria-hidden="true" className="size-4" />
                )}
                <span>{link.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
