// The guard throws at MODULE LOAD, so the failure cases are exercised by
// re-importing the module against a mocked `#site/content` rather than by
// calling the function. The static import below is deliberate: it is the real
// content passing through the real guard, so deleting `summary` from
// content/profile.mdx (or shortening it) fails this suite at import time.
import { afterEach, describe, expect, it, vi } from "vitest";

import { getProfileSummary, profileSummary } from "@/lib/profile-summary";

afterEach(() => {
  vi.doUnmock("#site/content");
  vi.resetModules();
});

async function loadWith(summary: unknown): Promise<typeof import("@/lib/profile-summary")> {
  vi.resetModules();
  vi.doMock("#site/content", () => ({ profile: { summary } }));
  return import("@/lib/profile-summary");
}

describe("getProfileSummary", () => {
  it("returns the shipped content/profile.mdx summary", () => {
    expect(profileSummary).toBe(getProfileSummary());
    expect(profileSummary.length).toBeGreaterThanOrEqual(100);
    expect(profileSummary.length).toBeLessThanOrEqual(600);
  });

  it("throws naming the file and the field when summary is absent", async () => {
    await expect(loadWith(undefined)).rejects.toThrow(
      "content/profile.mdx is missing required frontmatter field: summary",
    );
  });

  it("throws naming the file and the field when summary is blank", async () => {
    await expect(loadWith("   \n  ")).rejects.toThrow(
      "content/profile.mdx is missing required frontmatter field: summary",
    );
  });

  it("throws naming the file, the field, and the bound when summary is under length", async () => {
    await expect(loadWith("Too short.")).rejects.toThrow(
      "content/profile.mdx frontmatter field 'summary' is too short: 10 characters, minimum 100",
    );
  });

  it("throws naming the file, the field, and the bound when summary is over length", async () => {
    await expect(loadWith("x".repeat(601))).rejects.toThrow(
      "content/profile.mdx frontmatter field 'summary' is too long: 601 characters, maximum 600",
    );
  });

  it("returns the trimmed summary when it is within bounds", async () => {
    const valid = `  ${"a".repeat(120)}  `;
    const mod = await loadWith(valid);
    expect(mod.getProfileSummary()).toBe("a".repeat(120));
    expect(mod.profileSummary).toBe("a".repeat(120));
  });
});
