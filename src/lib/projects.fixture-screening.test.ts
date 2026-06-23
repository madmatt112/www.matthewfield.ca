// projects.fixture-screening.test.ts — verifies that fixture-* projects are
// hidden from the live site (real Vercel production) only, while remaining
// available in dev, CI, and e2e builds where they drive the project suites.
//
// The mock lives at file scope (vi.mock is module-hoisted), so this suite owns
// a content shape independent of projects.test.ts — and stays out of the
// projects.test.ts <-> chokepoint-canary.ts paired-merge guard.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#site/content", () => ({
  projects: [
    { slug: "real-entry", date: "2025-01-03", draft: false },
    { slug: "fixture-placeholder", date: "2025-01-02", draft: false },
    { slug: "fixture-published-second", date: "2025-01-01", draft: false },
  ] as Array<Record<string, unknown>>,
}));

// Import AFTER the mock is registered.
import { getPublishedProjects } from "@/lib/projects";

const ENV_KEYS = ["VERCEL", "VERCEL_ENV", "PROJECTS_INCLUDE_DRAFTS"] as const;

function clearEnv(): void {
  for (const k of ENV_KEYS) delete process.env[k];
}

beforeEach(clearEnv);
afterEach(clearEnv);

describe("getPublishedProjects — fixture screening on Vercel production", () => {
  it("excludes fixture-* slugs on VERCEL=1 + VERCEL_ENV=production", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    // drafts unset → leak guard does not fire; fixtures are screened out.
    const result = getPublishedProjects().map((p) => p.slug);
    expect(result).toEqual(["real-entry"]);
  });

  it("keeps fixture-* slugs when not on Vercel production (dev/CI/e2e flavor)", () => {
    // No VERCEL/VERCEL_ENV → e2e/CI/dev build; fixtures remain available.
    const result = getPublishedProjects()
      .map((p) => p.slug)
      .sort();
    expect(result).toEqual(["fixture-placeholder", "fixture-published-second", "real-entry"]);
  });
});
