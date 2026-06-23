import { projects } from "#site/content";
import { formatContentDate } from "@/lib/format-date";
import {
  PROJECTS_DRAFT_LEAK_GUARD_MSG_PREVIEW,
  PROJECTS_DRAFT_LEAK_GUARD_MSG_PRODUCTION,
  checkVercelDraftGuard,
} from "@/lib/project-errors";

export type Project = (typeof projects)[number];
export type ProjectLink = NonNullable<Project["links"]>[number];

// Single sort key reused across the showcase. Date ISO strings sort
// lexicographically thanks to `s.isodate()`; slug is the tiebreak.
function byDateDescSlugAsc(a: Project, b: Project): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

// Cache keyed on the env-var tuple. Invalidates if any var differs from the
// snapshot — handles Vitest's per-test env mutations correctly without a
// test-only export.
type EnvSnapshot = { vercel?: string; vercelEnv?: string; drafts?: string };
let __cached: { snapshot: EnvSnapshot; result: Project[] } | null = null;

function envSnapshot(): EnvSnapshot {
  return {
    vercel: process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
    drafts: process.env.PROJECTS_INCLUDE_DRAFTS,
  };
}

function snapshotsEqual(a: EnvSnapshot, b: EnvSnapshot): boolean {
  return a.vercel === b.vercel && a.vercelEnv === b.vercelEnv && a.drafts === b.drafts;
}

export function getPublishedProjects(): Project[] {
  const snapshot = envSnapshot();
  if (__cached !== null && snapshotsEqual(__cached.snapshot, snapshot)) {
    return __cached.result;
  }
  const guard = checkVercelDraftGuard();
  if (guard?.kind === "production") {
    /*
     * Layer 2 draft-leak guard (Req 7.3).
     * Error substring: see PROJECTS_DRAFT_LEAK_GUARD_MSG_PRODUCTION.
     * Runbook + Vercel env-var-scoping fix live in src/lib/project-errors.ts
     * (single source of truth). Do not inline the message here.
     */
    throw new Error(PROJECTS_DRAFT_LEAK_GUARD_MSG_PRODUCTION);
  }
  if (guard?.kind === "preview") {
    /*
     * Layer 2 preview-debugging guard (Req 7.3).
     * Error substring: see PROJECTS_DRAFT_LEAK_GUARD_MSG_PREVIEW.
     * Runbook + Vercel env-var-scoping fix live in src/lib/project-errors.ts
     * (single source of truth). Do not inline the message here.
     */
    throw new Error(PROJECTS_DRAFT_LEAK_GUARD_MSG_PREVIEW);
  }
  const includeDrafts = snapshot.drafts === "1";
  const draftFiltered = includeDrafts ? projects : projects.filter((p) => !p.draft);
  // Test fixtures (slug prefix `fixture-`) drive the projects e2e/unit suites
  // and must keep working in dev, CI, and e2e builds — but they must never
  // appear on the live site. Screen them out on real Vercel production deploys
  // only (VERCEL=1 + VERCEL_ENV=production); every other flavor keeps them.
  const onProduction = snapshot.vercel === "1" && snapshot.vercelEnv === "production";
  const visible = onProduction
    ? draftFiltered.filter((p) => !p.slug.startsWith("fixture-"))
    : draftFiltered;
  const result = [...visible].sort(byDateDescSlugAsc);
  __cached = { snapshot, result };
  return result;
}

export function getProjectBySlug(slug: string): Project | null {
  return getPublishedProjects().find((p) => p.slug === slug) ?? null;
}

export function shouldShowUpdatedBadge(project: Project): boolean {
  return project.updated != null && new Date(project.updated) > new Date(project.date);
}

export const formatProjectDate = formatContentDate;
