import type { Project } from "@/lib/projects";

type ProjectStatus = Project["status"];

export type StatusBadgeProps = {
  status: Exclude<ProjectStatus, "active">;
};

const LABELS: Record<StatusBadgeProps["status"], string> = {
  archived: "Archived",
  concept: "Concept",
};

const CLASSES: Record<StatusBadgeProps["status"], string> = {
  archived:
    "inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
  concept:
    "inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={CLASSES[status]}>{LABELS[status]}</span>;
}
