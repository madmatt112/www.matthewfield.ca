// Tests for the cross-entry invariants of content/github-activity.yaml
// (Reqs 1.10, 11.2, 11.3) — the two pure checkers and the composed entry point
// `prepare()` calls.
//
// The module under test imports nothing, so no `// @vitest-environment node`
// directive is needed here (unlike check-experience-project-links.test.ts,
// which reaches velite through skills-schema.ts).
//
// Messages are asserted by EXACT equality, not by substring: design §Components
// pins these three strings — including the U+2014 em dash in the gap message —
// as the entire diagnostic surface of the coverage contract, so a reworded
// message is a spec change and should redden this file.
//
// Why the `runGithubActivityInvariants` block is not redundant with the
// per-checker blocks: it is the only evidence that `prepare()` reaches BOTH
// checks. Design §Testing → Integration withdrew the two build-driven
// assertions (a fixture-driven velite run has no precedent in this repo) and
// named these cases as their replacement. Delete either call from
// `runGithubActivityInvariants` and one of them goes red.

import { describe, expect, test } from "vitest";

import {
  type GithubActivityRecordLike,
  checkCoverageContiguity,
  checkNoDuplicateDates,
  runGithubActivityInvariants,
} from "./check-github-activity-invariants";

/** Only `date` participates in either invariant, so that is all a fixture needs. */
function days(...dates: string[]): GithubActivityRecordLike[] {
  return dates.map((date) => ({ date }));
}

/**
 * Runs `check` and returns the thrown message, failing if nothing was thrown.
 * Exists so every failure case can assert message CONTENT — the offending date
 * — rather than merely that something threw.
 */
function messageFrom(check: () => void): string {
  try {
    check();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected the check to throw, but it returned normally");
}

const DUPLICATE_MESSAGE =
  "github-activity.yaml: duplicate date 2026-08-02 (appears 2 times). Each day must appear exactly once.";

const GAP_MESSAGE =
  "github-activity.yaml: coverage gap — no record for 2026-08-03. The file must contain every day from 2026-08-01 to 2026-08-04; see docs/contributions-and-resources-authoring.md.";

/** A contiguous, duplicate-free four-day file: the shape every check must pass. */
const CLEAN = days("2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04");

/** The same file with 2026-08-03 removed — the only reachable gap shape. */
const GAPPED = days("2026-08-01", "2026-08-02", "2026-08-04");

/** The same file with 2026-08-02 written twice. */
const DUPLICATED = days("2026-08-01", "2026-08-02", "2026-08-02", "2026-08-03", "2026-08-04");

describe("checkNoDuplicateDates", () => {
  test("passes a clean list", () => {
    expect(() => checkNoDuplicateDates(CLEAN)).not.toThrow();
  });

  test("passes an empty list and a single record", () => {
    expect(() => checkNoDuplicateDates([])).not.toThrow();
    expect(() => checkNoDuplicateDates(days("2026-08-01"))).not.toThrow();
  });

  test("throws naming the repeated date and how many times it appears", () => {
    expect(messageFrom(() => checkNoDuplicateDates(DUPLICATED))).toBe(DUPLICATE_MESSAGE);
  });

  test("counts every occurrence, not just the pair", () => {
    expect(
      messageFrom(() => checkNoDuplicateDates(days("2026-08-01", "2026-08-01", "2026-08-01"))),
    ).toBe(
      "github-activity.yaml: duplicate date 2026-08-01 (appears 3 times). Each day must appear exactly once.",
    );
  });

  test("reports the FIRST duplicated date in file order, not an arbitrary one", () => {
    expect(
      messageFrom(() =>
        checkNoDuplicateDates(
          days("2026-08-01", "2026-08-02", "2026-08-03", "2026-08-02", "2026-08-01"),
        ),
      ),
    ).toBe(
      "github-activity.yaml: duplicate date 2026-08-01 (appears 2 times). Each day must appear exactly once.",
    );
  });

  test("tolerates a non-contiguous list — gaps are the other check's business", () => {
    expect(() => checkNoDuplicateDates(GAPPED)).not.toThrow();
  });
});

describe("checkCoverageContiguity", () => {
  test("passes a contiguous list", () => {
    expect(() => checkCoverageContiguity(CLEAN)).not.toThrow();
  });

  test("passes an empty list and a single record", () => {
    // `records.length < 2` short-circuits. An unseeded file is `[]` and is
    // handled by suppression plus a CI warning (Req 11.7), not a build failure.
    expect(() => checkCoverageContiguity([])).not.toThrow();
    expect(() => checkCoverageContiguity(days("2026-08-01"))).not.toThrow();
  });

  test("throws on an interior gap, naming the first missing day and the covered range", () => {
    expect(messageFrom(() => checkCoverageContiguity(GAPPED))).toBe(GAP_MESSAGE);
  });

  test("names the FIRST missing day when several are absent", () => {
    expect(
      messageFrom(() =>
        checkCoverageContiguity(days("2026-08-01", "2026-08-03", "2026-08-05", "2026-08-06")),
      ),
    ).toBe(
      "github-activity.yaml: coverage gap — no record for 2026-08-02. The file must contain every day from 2026-08-01 to 2026-08-06; see docs/contributions-and-resources-authoring.md.",
    );
  });

  // A "leading gap" is IMPOSSIBLE BY CONSTRUCTION and this test records that
  // rather than contriving a failure: `dataStart` is the minimum date in the
  // data itself, so trimming days off the front of the file just moves
  // `dataStart` forward. The check only ever asks the file to be internally
  // complete; a file that reaches back less far than intended is short
  // coverage, which the freshness script warns about (Req 9.3) and this check
  // deliberately says nothing about. The nearest reachable thing — a day
  // missing immediately after `dataStart` — is asserted below it.
  test("a shortened front is not a gap: dataStart is the file's own minimum, so it passes", () => {
    expect(() =>
      checkCoverageContiguity(days("2026-08-03", "2026-08-04", "2026-08-05")),
    ).not.toThrow();
  });

  test("a day missing immediately after dataStart IS a gap", () => {
    expect(
      messageFrom(() => checkCoverageContiguity(days("2026-08-01", "2026-08-03", "2026-08-04"))),
    ).toBe(
      "github-activity.yaml: coverage gap — no record for 2026-08-02. The file must contain every day from 2026-08-01 to 2026-08-04; see docs/contributions-and-resources-authoring.md.",
    );
  });

  // A "trailing gap" is impossible for the mirror-image reason: `anchorDate` is
  // the maximum date in the data, so a file that stops early simply has an
  // earlier anchor. That is the staleness the freshness script warns about
  // (Reqs 9.3–9.4), not a build error. The nearest reachable thing — a day
  // missing immediately before `anchorDate` — is the GAPPED fixture asserted
  // above, where 2026-08-03 is absent and 2026-08-04 is the anchor.
  test("a truncated tail is not a gap: anchorDate is the file's own maximum, so it passes", () => {
    expect(() =>
      checkCoverageContiguity(days("2026-08-01", "2026-08-02", "2026-08-03")),
    ).not.toThrow();
  });

  test("derives the range from min/max, so file order does not matter", () => {
    expect(() =>
      checkCoverageContiguity(days("2026-08-03", "2026-08-01", "2026-08-04", "2026-08-02")),
    ).not.toThrow();
    expect(
      messageFrom(() => checkCoverageContiguity(days("2026-08-04", "2026-08-02", "2026-08-01"))),
    ).toBe(GAP_MESSAGE);
  });

  test("tolerates duplicates — they are the other check's business", () => {
    expect(() =>
      checkCoverageContiguity(days("2026-08-01", "2026-08-01", "2026-08-02")),
    ).not.toThrow();
  });

  test("steps across a month boundary without inventing a gap", () => {
    // 2026 is not a leap year, so February ends on the 28th; a naive
    // fixed-length month walk would report 2026-02-29 missing.
    expect(() =>
      checkCoverageContiguity(days("2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02")),
    ).not.toThrow();
  });

  test("throws a distinct error when the low boundary is unparseable", () => {
    // `cursor <= NaN` is false, so an unreadable boundary would otherwise skip
    // the walk and pass the whole file silently.
    expect(messageFrom(() => checkCoverageContiguity(days("0000-99-99", "2026-08-01")))).toBe(
      "github-activity.yaml: unparseable date 0000-99-99. Every date must be a YYYY-MM-DD calendar day.",
    );
  });

  test("throws a distinct error when the high boundary is unparseable", () => {
    expect(messageFrom(() => checkCoverageContiguity(days("2026-08-01", "2026-13-45")))).toBe(
      "github-activity.yaml: unparseable date 2026-13-45. Every date must be a YYYY-MM-DD calendar day.",
    );
  });
});

// The wiring block. Each case fails if its checker is dropped from the composed
// function, which is the whole point: the function under test IS the call site.
describe("runGithubActivityInvariants", () => {
  test("passes a clean list", () => {
    expect(() => runGithubActivityInvariants(CLEAN)).not.toThrow();
  });

  test("reaches checkNoDuplicateDates — a duplicate-date array throws through it", () => {
    expect(messageFrom(() => runGithubActivityInvariants(DUPLICATED))).toBe(DUPLICATE_MESSAGE);
  });

  test("reaches checkCoverageContiguity — a gapped array throws through it", () => {
    expect(messageFrom(() => runGithubActivityInvariants(GAPPED))).toBe(GAP_MESSAGE);
  });

  test("reports the duplicate first when a file has both faults", () => {
    // Checks run in order, and the duplicate is the more specific diagnosis.
    expect(
      messageFrom(() =>
        runGithubActivityInvariants(days("2026-08-01", "2026-08-02", "2026-08-02", "2026-08-04")),
      ),
    ).toBe(DUPLICATE_MESSAGE);
  });
});
