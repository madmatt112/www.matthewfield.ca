// @vitest-environment node
// Pure schema-validation tests have no DOM needs, and running under jsdom
// breaks esbuild's `new TextEncoder().encode("") instanceof Uint8Array`
// invariant (velite's runtime pulls in esbuild). Node env keeps it green.
import { describe, expect, it } from "vitest";

import { BUILD_START_UTC } from "./content-schema-primitives";
import { experienceEntrySchema } from "./experience-schema";

/**
 * Rejection tests for `experienceEntrySchema`. These are the enforcement for
 * R1.2/R1.4 (dates and required fields), R3.1 (forbidden contact data is not
 * expressible under `.strict()`), and R3.4 (highlight bounds make an ATS-style
 * keyword-inventory line unauthorable).
 *
 * Two structural facts shape the fixtures below:
 *
 * 1. `isoMonth()` aborts fatally (`superRefine` with `fatal: true`), and zod
 *    returns INVALID for the whole object when any field aborts — so the
 *    object-level `superRefine` that checks `end >= start` is SKIPPED whenever
 *    a date is malformed. The bad-month case and the `end < start` case
 *    therefore get SEPARATE fixtures; a fixture that is both would only ever
 *    produce the month issue.
 * 2. `isoMonth()` itself is covered in `content-schema-primitives.test.ts`.
 *    What is asserted here is that the entry schema WIRES it to `start` and
 *    `end` — hence the `path` assertions.
 */

/** The role-highlight ceiling from design §Data Models; load-bearing for R3.4. */
const HIGHLIGHT_MAX_LENGTH = 240;

/** A valid role with `end` ABSENT — the one spelling for "current" (R1.2). */
const baseRole = {
  organisation: "CrowdStrike",
  organisationUrl: "https://www.crowdstrike.com",
  title: "Infrastructure Engineer III",
  start: "2021-01",
  location: "Remote",
  summary: "Member of the Infrastructure Engineering Kubernetes team, owning fleet lifecycle.",
  tech: ["kubernetes", "temporal", "golang"],
  deliveries: [
    {
      title: "Rudder",
      role: "Architect & Lead Engineer",
      project: "rudder",
      body: "A single pane of glass for the Kubernetes fleet, replacing a spread of one-off scripts.",
      highlights: ["Cut cluster provisioning from days down to under an hour."],
    },
  ],
  highlights: [
    "Owned build, management, and lifecycle of 40+ Kubernetes clusters across three clouds.",
  ],
};

function role(overrides: Record<string, unknown> = {}) {
  return { ...baseRole, ...overrides };
}

/** Asserts the entry is rejected and hands back the issues for shape checks. */
function issuesFor(entry: unknown) {
  const result = experienceEntrySchema.safeParse(entry);
  expect(result.success).toBe(false);
  if (result.success) {
    throw new Error("expected the entry to be rejected");
  }
  return result.error.issues;
}

describe("experienceEntrySchema valid baseline", () => {
  // Without this, every rejection below could pass vacuously on a broken fixture.
  it("accepts the fixture role with `end` absent (a current role)", () => {
    const result = experienceEntrySchema.safeParse(baseRole);
    expect(result.success).toBe(true);
  });

  it("accepts the fixture role with an explicit `end` after `start`", () => {
    const result = experienceEntrySchema.safeParse(role({ end: "2026-01" }));
    expect(result.success).toBe(true);
  });
});

describe("experienceEntrySchema date rejections", () => {
  it("rejects a malformed month on `start` as a format error, not a future date", () => {
    const issues = issuesFor(role({ start: "2021-1" }));
    expect(issues[0].path).toEqual(["start"]);
    expect(issues[0].message).toContain("YYYY-MM format");
    expect(issues[0].message).not.toContain("future");
  });

  it("rejects `2026-13` on `start` as a bad month, not a future date", () => {
    // The `(0[1-9]|1[0-2])` alternation is what keeps these distinct: a `\d{2}`
    // month would roll `2026-13` into January 2027 and misreport it as future.
    const issues = issuesFor(role({ start: "2026-13" }));
    expect(issues[0].path).toEqual(["start"]);
    expect(issues[0].message).toContain("month of 01-12");
    expect(issues[0].message).not.toContain("future");
  });

  it("rejects a future `start` as a future date, not a format error", () => {
    const future = new Date(BUILD_START_UTC + 1000 * 60 * 60 * 24 * 400);
    const value = `${future.getUTCFullYear()}-${String(future.getUTCMonth() + 1).padStart(2, "0")}`;
    const issues = issuesFor(role({ start: value }));
    expect(issues[0].path).toEqual(["start"]);
    expect(issues[0].message).toContain("future");
    expect(issues[0].message).not.toContain("YYYY-MM format");
  });

  it("rejects a malformed month on `end`", () => {
    const issues = issuesFor(role({ end: "2026-1" }));
    expect(issues[0].path).toEqual(["end"]);
    expect(issues[0].message).toContain("YYYY-MM format");
  });

  it("rejects an explicit `end: null` — absent is the only spelling for current", () => {
    // `.optional()` alone does this. Do not add `.nullable()`/`.nullish()`:
    // that absence IS the R1.2 enforcement.
    const issues = issuesFor(role({ end: null }));
    expect(issues[0].code).toBe("invalid_type");
    expect(issues[0].path).toEqual(["end"]);
  });

  it("rejects `end` earlier than `start`", () => {
    const issues = issuesFor(role({ end: "2020-06" }));
    expect(issues[0].code).toBe("custom");
    expect(issues[0].path).toEqual(["end"]);
    expect(issues[0].message).toContain("is before start");
    expect(issues[0].message).not.toContain("YYYY-MM format");
  });

  it("reports only the month error when `end` is both malformed and out of order", () => {
    // Documents the fatal-abort behaviour the two fixtures above rely on.
    const issues = issuesFor(role({ start: "2021-01", end: "2020-6" }));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("YYYY-MM format");
    expect(issues[0].message).not.toContain("is before start");
  });
});

describe("experienceEntrySchema required fields", () => {
  it("rejects a role with `organisation` missing", () => {
    const withoutOrganisation: Record<string, unknown> = { ...baseRole };
    delete withoutOrganisation.organisation;
    const issues = issuesFor(withoutOrganisation);
    expect(issues[0].code).toBe("invalid_type");
    expect(issues[0].path).toEqual(["organisation"]);
  });
});

describe("experienceEntrySchema .strict()", () => {
  it("rejects an unknown key on the role — R3.1's `phone` is not expressible", () => {
    const issues = issuesFor(role({ phone: "555-0100" }));
    expect(issues[0].code).toBe("unrecognized_keys");
    expect(issues[0].message).toContain("phone");
  });

  it("rejects an unknown key on a nested delivery", () => {
    const issues = issuesFor(
      role({
        deliveries: [{ ...baseRole.deliveries[0], impact: "large" }],
      }),
    );
    expect(issues[0].code).toBe("unrecognized_keys");
    expect(issues[0].path).toEqual(["deliveries", 0]);
    expect(issues[0].message).toContain("impact");
  });
});

describe("experienceEntrySchema highlight bounds (R3.4)", () => {
  it("rejects an empty `highlights` array", () => {
    const issues = issuesFor(role({ highlights: [] }));
    expect(issues[0].code).toBe("too_small");
    expect(issues[0].path).toEqual(["highlights"]);
  });

  it(`rejects a highlight longer than ${HIGHLIGHT_MAX_LENGTH} characters`, () => {
    const issues = issuesFor(role({ highlights: ["x".repeat(HIGHLIGHT_MAX_LENGTH + 1)] }));
    expect(issues[0].code).toBe("too_big");
    expect(issues[0].path).toEqual(["highlights", 0]);
    expect(issues[0].message).toContain(`at most ${HIGHLIGHT_MAX_LENGTH} character(s)`);
  });
});

describe("experienceEntrySchema over-cap arrays", () => {
  it("rejects more than 10 highlights", () => {
    const issues = issuesFor(
      role({ highlights: Array.from({ length: 11 }, () => baseRole.highlights[0]) }),
    );
    expect(issues[0].code).toBe("too_big");
    expect(issues[0].path).toEqual(["highlights"]);
    expect(issues[0].message).toContain("at most 10 element(s)");
  });

  it("rejects more than 12 `tech` tags", () => {
    const issues = issuesFor(role({ tech: Array.from({ length: 13 }, (_, i) => `tool-${i}`) }));
    expect(issues[0].code).toBe("too_big");
    expect(issues[0].path).toEqual(["tech"]);
    expect(issues[0].message).toContain("at most 12 element(s)");
  });

  it("rejects more than 4 `deliveries`", () => {
    const issues = issuesFor(
      role({ deliveries: Array.from({ length: 5 }, () => baseRole.deliveries[0]) }),
    );
    expect(issues[0].code).toBe("too_big");
    expect(issues[0].path).toEqual(["deliveries"]);
    expect(issues[0].message).toContain("at most 4 element(s)");
  });

  it("rejects more than 6 highlights on a delivery", () => {
    const issues = issuesFor(
      role({
        deliveries: [
          {
            ...baseRole.deliveries[0],
            highlights: Array.from({ length: 7 }, () => baseRole.deliveries[0].highlights[0]),
          },
        ],
      }),
    );
    expect(issues[0].code).toBe("too_big");
    expect(issues[0].path).toEqual(["deliveries", 0, "highlights"]);
    expect(issues[0].message).toContain("at most 6 element(s)");
  });
});
