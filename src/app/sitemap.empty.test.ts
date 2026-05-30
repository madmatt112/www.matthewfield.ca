// sitemap.empty.test.ts — Req 6.1, 6.2 per Task 20.
//
// Mirrors src/lib/projects.empty.test.ts: a FILE-SCOPE vi.mock of
// "#site/content" with empty collections is hoisted before the import of the
// default-exported sitemap(). This exercises the REAL sitemap() path (not a
// unit-isolated maxOr) so the empty-array guard and the static-routes removal
// are both verified against the launch state where every collection is [].
import { describe, expect, it, vi } from "vitest";

vi.mock("#site/content", () => ({
  contributions: [],
  resources: [],
  posts: [],
  projects: [],
  pages: [],
  profile: [],
}));

// Import AFTER the mock is registered.
import sitemap from "@/app/sitemap";

describe("sitemap — empty collections (Req 6.1, 6.2)", () => {
  it("does not throw when every collection is empty", () => {
    expect(() => sitemap()).not.toThrow();
  });

  it("includes /contributions and /resources each exactly once with the build-timestamp fallback", () => {
    const before = new Date();
    const entries = sitemap();
    const after = new Date();

    const contributions = entries.filter((e) => e.url.endsWith("/contributions"));
    const resources = entries.filter((e) => e.url.endsWith("/resources"));

    expect(contributions).toHaveLength(1);
    expect(resources).toHaveLength(1);

    // Empty collection → lastModified is the build `now` fallback.
    for (const entry of [contributions[0], resources[0]]) {
      const ts = new Date(entry.lastModified as Date).getTime();
      expect(ts).toBeGreaterThanOrEqual(before.getTime());
      expect(ts).toBeLessThanOrEqual(after.getTime());
    }
  });
});
