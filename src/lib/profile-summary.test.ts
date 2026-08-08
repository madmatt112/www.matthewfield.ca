// The guard throws at MODULE LOAD, so the failure cases are exercised by
// re-importing the module against a mocked `#site/content` rather than by
// calling the function. The static import below is deliberate: it is the real
// content passing through the real guard, so deleting `summary` from
// content/profile.mdx (or shortening it) fails this suite at import time.
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { siteConfig } from "@/config/site";
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

// R9.1: three surfaces state Matthew's years of experience, and they must
// agree. The agreed figure is "a decade". The narrative is read from disk
// rather than from the compiled `profile.body` so that the frontmatter can be
// stripped: each surface is then asserted on its own text, and a failure names
// exactly the one that drifted.
const YEARS_PHRASE = "a decade";

const PROFILE_MDX = path.resolve(__dirname, "../../content/profile.mdx");

/** The narrative body of content/profile.mdx, with frontmatter stripped. */
function readProfileNarrative(): string {
  const raw = fs.readFileSync(PROFILE_MDX, "utf8");
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  if (body === raw) {
    throw new Error(`${PROFILE_MDX} has no frontmatter block; cannot isolate the narrative body`);
  }
  return body;
}

describe("years-of-experience consistency (R9.1)", () => {
  const surfaces = [
    { surface: "siteConfig.intro (src/config/site.ts)", read: () => siteConfig.intro },
    { surface: "the content/profile.mdx narrative body", read: readProfileNarrative },
    { surface: "the content/profile.mdx frontmatter summary", read: () => profileSummary },
  ];

  it.each(surfaces)(`$surface states the experience as "${YEARS_PHRASE}"`, ({ surface, read }) => {
    expect(
      read().toLowerCase(),
      `R9.1 drift: ${surface} no longer says "${YEARS_PHRASE}". All three surfaces — ` +
        `siteConfig.intro, the content/profile.mdx narrative body, and the ` +
        `content/profile.mdx frontmatter summary — must state the same figure.`,
    ).toContain(YEARS_PHRASE);
  });
});
