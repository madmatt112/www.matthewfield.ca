// @vitest-environment node
// Pure schema-validation tests have no DOM needs, and running under jsdom
// breaks esbuild's `new TextEncoder().encode("") instanceof Uint8Array`
// invariant (velite's runtime pulls in esbuild). Node env keeps it green.
import { describe, expect, it } from "vitest";

import { BUILD_START_UTC } from "./content-schema-primitives";
import { educationEntrySchema } from "./education-schema";
import { SKILLS_MAX_GROUPS, skillEntrySchema } from "./skills-schema";

/**
 * Rejection tests for `skillEntrySchema` and `educationEntrySchema` — R5.1
 * (skills are structured, not prose), R5.2 (the item cap mechanizes "curated,
 * not exhaustive"), and R1.4 (a malformed date fails the build).
 *
 * `isoMonth()` itself is covered in `content-schema-primitives.test.ts`; what
 * is asserted here is that `educationEntrySchema` WIRES it to `completed`, and
 * that its month-format and future-date messages stay distinguishable through
 * the entry schema — hence the `path` and negative-message assertions.
 */

/** The per-group item ceiling from design §Data Models. */
const SKILL_ITEMS_MAX = 12;
/** The per-item length ceiling from design §Data Models. */
const SKILL_ITEM_MAX_LENGTH = 32;

const baseGroup = {
  category: "Cloud & Hybrid Infrastructure",
  items: ["AWS", "GCP", "OCI", "Azure"],
};

const baseCredential = {
  credential: "Bachelor of Applied Information Systems Technology",
  institution: "NAIT",
  institutionUrl: "https://www.nait.ca",
  completed: "2018-01",
  honours: "With Honours",
  note: "Network Management Major",
};

function group(overrides: Record<string, unknown> = {}) {
  return { ...baseGroup, ...overrides };
}

function credential(overrides: Record<string, unknown> = {}) {
  return { ...baseCredential, ...overrides };
}

function skillIssuesFor(entry: unknown) {
  const result = skillEntrySchema.safeParse(entry);
  expect(result.success).toBe(false);
  if (result.success) {
    throw new Error("expected the skills group to be rejected");
  }
  return result.error.issues;
}

function educationIssuesFor(entry: unknown) {
  const result = educationEntrySchema.safeParse(entry);
  expect(result.success).toBe(false);
  if (result.success) {
    throw new Error("expected the education credential to be rejected");
  }
  return result.error.issues;
}

describe("skillEntrySchema", () => {
  // Without this, every rejection below could pass vacuously on a broken fixture.
  it("accepts the fixture group", () => {
    expect(skillEntrySchema.safeParse(baseGroup).success).toBe(true);
  });

  it("rejects an empty `items` array — the empty section R5.4 forbids", () => {
    const issues = skillIssuesFor(group({ items: [] }));
    expect(issues[0].code).toBe("too_small");
    expect(issues[0].path).toEqual(["items"]);
  });

  it(`rejects more than ${SKILL_ITEMS_MAX} items`, () => {
    const items = Array.from({ length: SKILL_ITEMS_MAX + 1 }, (_, i) => `tool-${i}`);
    const issues = skillIssuesFor(group({ items }));
    expect(issues[0].code).toBe("too_big");
    expect(issues[0].path).toEqual(["items"]);
    expect(issues[0].message).toContain(`at most ${SKILL_ITEMS_MAX} element(s)`);
  });

  it(`rejects an item longer than ${SKILL_ITEM_MAX_LENGTH} characters`, () => {
    const issues = skillIssuesFor(group({ items: ["x".repeat(SKILL_ITEM_MAX_LENGTH + 1)] }));
    expect(issues[0].code).toBe("too_big");
    expect(issues[0].path).toEqual(["items", 0]);
    expect(issues[0].message).toContain(`at most ${SKILL_ITEM_MAX_LENGTH} character(s)`);
  });

  it("rejects an unknown key under .strict()", () => {
    const issues = skillIssuesFor(group({ level: "expert" }));
    expect(issues[0].code).toBe("unrecognized_keys");
    expect(issues[0].message).toContain("level");
  });

  it("pins the 8-group cap constant", () => {
    // The cap itself is a COLLECTION-level bound — a per-entry schema cannot
    // count its siblings — so it is enforced in `prepare()`, not here. This
    // only pins the number so the two definitions cannot drift.
    expect(SKILLS_MAX_GROUPS).toBe(8);
  });
});

describe("educationEntrySchema", () => {
  it("accepts the fixture credential", () => {
    expect(educationEntrySchema.safeParse(baseCredential).success).toBe(true);
  });

  it("rejects a malformed `completed` month as a format error, not a future date", () => {
    const issues = educationIssuesFor(credential({ completed: "2018-1" }));
    expect(issues[0].path).toEqual(["completed"]);
    expect(issues[0].message).toContain("YYYY-MM format");
    expect(issues[0].message).not.toContain("future");
  });

  it("rejects `2018-13` as a bad month, not a future date", () => {
    const issues = educationIssuesFor(credential({ completed: "2018-13" }));
    expect(issues[0].path).toEqual(["completed"]);
    expect(issues[0].message).toContain("month of 01-12");
    expect(issues[0].message).not.toContain("future");
  });

  it("rejects a future `completed` month as a future date, not a format error", () => {
    const future = new Date(BUILD_START_UTC + 1000 * 60 * 60 * 24 * 400);
    const value = `${future.getUTCFullYear()}-${String(future.getUTCMonth() + 1).padStart(2, "0")}`;
    const issues = educationIssuesFor(credential({ completed: value }));
    expect(issues[0].path).toEqual(["completed"]);
    expect(issues[0].message).toContain("future");
    expect(issues[0].message).not.toContain("YYYY-MM format");
  });

  it("rejects an unknown key under .strict() — R3.1's `phone` is not expressible", () => {
    const issues = educationIssuesFor(credential({ phone: "555-0100" }));
    expect(issues[0].code).toBe("unrecognized_keys");
    expect(issues[0].message).toContain("phone");
  });
});
