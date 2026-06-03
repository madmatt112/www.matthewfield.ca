import { describe, expect, it } from "vitest";

/**
 * Contract test for the next.config.ts ↔ *-errors.ts named-import surface.
 *
 * Paired-merge with Task 7 (next.config.ts wiring). Locks the imported
 * names so a rename in either error module surfaces at test time with a
 * clean diagnostic (Component 15 v4 / r1 Target 1 closure).
 *
 * Uses dynamic `await import()` so the next.config module is executed
 * inside the test runner — proving the `VITEST` gate prevents
 * `process.exit(1)` from killing the suite if a guard ever fires.
 */
describe("next.config.ts contract: named-import surface", () => {
  it('test runner sets process.env.VITEST="true" (gate precondition)', () => {
    expect(process.env.VITEST).toBe("true");
  });

  it("next.config loads under Vitest without killing the runner", async () => {
    const mod = await import("../../next.config");
    expect(mod.default).toBeDefined();
  });

  it("blog-errors exports the three names next.config.ts imports", async () => {
    const mod = await import("../lib/blog-errors");
    expect(typeof mod.checkVercelDraftGuard).toBe("function");
    expect(typeof mod.BLOG_DRAFT_LEAK_GUARD_MSG_PRODUCTION).toBe("string");
    expect(typeof mod.BLOG_DRAFT_LEAK_GUARD_MSG_PREVIEW).toBe("string");
  });

  it("project-errors exports the three names next.config.ts imports", async () => {
    const mod = await import("../lib/project-errors");
    expect(typeof mod.checkVercelDraftGuard).toBe("function");
    expect(typeof mod.PROJECTS_DRAFT_LEAK_GUARD_MSG_PRODUCTION).toBe("string");
    expect(typeof mod.PROJECTS_DRAFT_LEAK_GUARD_MSG_PREVIEW).toBe("string");
  });
});
