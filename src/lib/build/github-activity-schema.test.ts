// @vitest-environment node
// Pure schema-validation tests have no DOM needs, and running under jsdom
// breaks esbuild's `new TextEncoder().encode("") instanceof Uint8Array`
// invariant (velite's runtime pulls in esbuild). Node env keeps it green.
import { describe, expect, it } from "vitest";

import { BUILD_START_UTC } from "./content-schema-primitives";
import { githubActivityEntrySchema } from "./github-activity-schema";

/**
 * Rejection tests for `githubActivityEntrySchema` — Req 1.3 (exactly two
 * fields, `count` an integer >= 0, `date` an ISO calendar date bounded above by
 * `BUILD_START_UTC`) and Req 11.4 (a future-dated record fails the build).
 *
 * Three structural facts shape the assertions below:
 *
 * 1. **This file is the only place Req 11 states 4 and 11 are exercised at
 *    build time.** Velite runs at `postinstall`, which is the first substantive
 *    step of `ci.yml` — so the freshness script never sees a file whose dates
 *    are impossible or future-dated, because the build already failed. If these
 *    cases are deleted here, nothing else covers them.
 * 2. **Bad format and impossible date are BOTH `code: "custom"` on path
 *    `date`**, because `isoDate()` raises both through the same `superRefine`.
 *    They are distinguishable only by MESSAGE, so that is what the
 *    distinguishability assertions key on — an author who mistypes a separator
 *    must not be sent hunting for a leap-year bug.
 * 3. **The future-date bound is a `.refine()` composed at the call site**, so it
 *    also surfaces as `code: "custom"` on `date`, but with zod's generic
 *    "Invalid input" message rather than either `isoDate()` string. Asserting
 *    the absence of both `isoDate()` messages is what proves the value reached
 *    the bound instead of failing earlier.
 */

/** A well-formed day. Past-dated, so it stays valid against any later build. */
const VALID = { date: "2026-08-08", count: 3 };

function entry(overrides: Record<string, unknown> = {}) {
  return { ...VALID, ...overrides };
}

/** Asserts the entry is rejected and hands back the issues for shape checks. */
function issuesFor(value: unknown) {
  const result = githubActivityEntrySchema.safeParse(value);
  expect(result.success).toBe(false);
  if (result.success) {
    throw new Error("expected the activity entry to be rejected");
  }
  return result.error.issues;
}

describe("githubActivityEntrySchema valid baseline", () => {
  // Without this, every rejection below could pass vacuously on a broken fixture.
  it("accepts a well-formed entry", () => {
    const result = githubActivityEntrySchema.safeParse(VALID);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(VALID);
  });
});

describe("githubActivityEntrySchema count rejections (Req 1.3)", () => {
  it("rejects a negative count", () => {
    const issues = issuesFor(entry({ count: -1 }));
    expect(issues[0].code).toBe("too_small");
    expect(issues[0].path).toEqual(["count"]);
  });

  it("rejects a non-integer count", () => {
    const issues = issuesFor(entry({ count: 1.5 }));
    expect(issues[0].code).toBe("invalid_type");
    expect(issues[0].path).toEqual(["count"]);
    expect(issues[0].message).toContain("integer");
  });
});

describe("githubActivityEntrySchema date rejections (Reqs 1.3, 11.4)", () => {
  it("rejects a badly formatted date as a format error, not a calendar error", () => {
    const issues = issuesFor(entry({ date: "08/08/2026" }));
    expect(issues[0].code).toBe("custom");
    expect(issues[0].path).toEqual(["date"]);
    expect(issues[0].message).toContain("use the YYYY-MM-DD format.");
    expect(issues[0].message).not.toContain("real calendar date");
  });

  it("rejects an impossible date as a calendar error, not a format error", () => {
    // `2026-02-30` matches the regex, so only the UTC round-trip catches it.
    // Both failures are `code: "custom"` on `date`; the message is the only
    // thing that tells an author which mistake they made.
    const issues = issuesFor(entry({ date: "2026-02-30" }));
    expect(issues[0].code).toBe("custom");
    expect(issues[0].path).toEqual(["date"]);
    expect(issues[0].message).toContain("is not a real calendar date.");
    expect(issues[0].message).not.toContain("YYYY-MM-DD format");
  });

  it("rejects a date past BUILD_START_UTC (Req 11.4)", () => {
    // Built from BUILD_START_UTC rather than a hardcoded year: a literal like
    // `2099-01-01` decays into a test that passes for the wrong reason once the
    // clock catches up, and this bound is what stops a transposed digit
    // (`2126-08-08`) from shifting the whole window a century on a green build.
    const future = new Date(BUILD_START_UTC + 1000 * 60 * 60 * 24 * 400);
    const value = [
      String(future.getUTCFullYear()).padStart(4, "0"),
      String(future.getUTCMonth() + 1).padStart(2, "0"),
      String(future.getUTCDate()).padStart(2, "0"),
    ].join("-");
    const issues = issuesFor(entry({ date: value }));
    expect(issues[0].code).toBe("custom");
    expect(issues[0].path).toEqual(["date"]);
    // Neither `isoDate()` message: the value is well-formed and real, and was
    // rejected by the BUILD_START_UTC bound alone.
    expect(issues[0].message).not.toContain("YYYY-MM-DD format");
    expect(issues[0].message).not.toContain("real calendar date");
  });
});

describe("githubActivityEntrySchema .strict() (Req 1.8)", () => {
  it("rejects an unknown key — `contributionLevel` is not expressible", () => {
    // Unknown keys surface at the ROOT, not on the offending field.
    const issues = issuesFor(entry({ contributionLevel: 2 }));
    expect(issues[0].code).toBe("unrecognized_keys");
    expect(issues[0].path).toEqual([]);
    expect(issues[0].message).toContain("contributionLevel");
  });
});
