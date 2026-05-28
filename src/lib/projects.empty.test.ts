// projects.empty.test.ts — Case 10 (Req 1.8) per Task 14.3.
//
// This case is extracted into its OWN test file so that
// `vi.mock("#site/content", () => ({ projects: [] }))` is hoisted at file
// scope (vi.mock is module-hoisted; calling it inside a describe block does
// NOT actually re-mock — it would conflict with any file-scoped mock in
// projects.test.ts). Isolating the mock here guarantees that this test
// FAILS if `getPublishedProjects()` ever stops filtering correctly on an
// empty input, which is the contract the spec requires.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#site/content", () => ({
  projects: [] as Array<Record<string, unknown>>,
}));

// Import AFTER the mock is registered.
import { getPublishedProjects } from "@/lib/projects";

const ENV_KEYS = ["VERCEL", "VERCEL_ENV", "PROJECTS_INCLUDE_DRAFTS"] as const;

function clearEnv(): void {
  for (const k of ENV_KEYS) delete process.env[k];
}

beforeEach(() => {
  clearEnv();
});

afterEach(() => {
  clearEnv();
});

describe("getPublishedProjects — empty collection (Case 10, Req 1.8)", () => {
  it("returns [] when #site/content exposes no projects", () => {
    // Distinct env so this run does not collide with a memoized snapshot
    // from a hypothetical concurrent worker.
    process.env.PROJECTS_INCLUDE_DRAFTS = "case-10-empty";
    expect(getPublishedProjects()).toEqual([]);
  });
});
