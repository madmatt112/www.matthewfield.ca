// experience.test.ts — getExperience() ordering (Req 1.6).
//
// Every case here runs against SYNTHETIC fixtures, never `content/experience.yaml`.
// That is deliberate: the real collection is already authored in sort order, so a
// test written against it would pass even with the sort deleted. The fixtures
// below are built so that the naive "start descending only" key — the mistake
// this comparator exists to avoid — produces a DIFFERENT answer.
//
// Mocking follows src/lib/profile-summary.test.ts: `vi.doMock` + `vi.resetModules()`
// + a dynamic import, so each case can feed its own collection to the real read
// path rather than sharing one file-scoped `vi.mock`.
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ExperienceRole } from "@/lib/experience";

/**
 * A minimal, obviously-synthetic role. Only `organisation`, `start` and `end`
 * vary — they are the whole sort key. Everything else is filler.
 */
function role(organisation: string, start: string, end?: string): ExperienceRole {
  const base = {
    organisation,
    title: "Synthetic Fixture Role",
    start,
    location: "Fixtureville, Testland",
    summary: "Synthetic fixture row that exists only to exercise getExperience()'s sort order.",
    highlights: ["Synthetic fixture highlight that exists only to exercise the sort order."],
  };
  return end === undefined ? base : { ...base, end };
}

/**
 * The WRONG comparator: sort on `start` descending and nothing else. Used to
 * prove a fixture actually discriminates, so nobody can later soften the data
 * into a shape both keys agree on.
 */
function naiveStartDescOnly(a: ExperienceRole, b: ExperienceRole): number {
  if (a.start === b.start) return 0;
  return a.start < b.start ? 1 : -1;
}

function orgs(roles: readonly ExperienceRole[]): string[] {
  return roles.map((r) => r.organisation);
}

async function getExperienceWith(roles: readonly ExperienceRole[]): Promise<ExperienceRole[]> {
  vi.resetModules();
  vi.doMock("#site/content", () => ({ experience: roles, skills: [], education: [] }));
  const { getExperience } = await import("@/lib/experience");
  return getExperience();
}

afterEach(() => {
  vi.doUnmock("#site/content");
  vi.resetModules();
});

// Two roles that overlap: the long one is still running while the short one
// starts AND finishes inside it. Start-desc alone puts the short role first;
// end-desc correctly keeps the role that ran longest on top.
const OVERLAPPING = [
  role("Fixture Long Overlap", "2020-01", "2024-01"),
  role("Fixture Short Overlap", "2021-01", "2022-01"),
];

describe("getExperience — sort order (Req 1.6)", () => {
  it("puts the later-ending role first when two tenures overlap", async () => {
    // Input order is already the answer, so this fails loudly on a REVERSED key
    // too, not only on a start-only one.
    const sorted = await getExperienceWith([...OVERLAPPING].reverse());
    expect(orgs(sorted)).toEqual(["Fixture Long Overlap", "Fixture Short Overlap"]);
  });

  it("disagrees with a start-descending-only sort on that overlap", async () => {
    // Guards the fixture itself: if this ever passes trivially, the case above
    // has stopped testing anything.
    expect(orgs([...OVERLAPPING].sort(naiveStartDescOnly))).toEqual([
      "Fixture Short Overlap",
      "Fixture Long Overlap",
    ]);
  });

  it("breaks a tie between two current roles on start descending", async () => {
    // Both have no `end`. Organisation-ascending would put Alpha first, so this
    // only passes if the start-descending step actually runs.
    const sorted = await getExperienceWith([
      role("Fixture Alpha Now", "2016-06"),
      role("Fixture Zulu Now", "2025-02"),
    ]);
    expect(orgs(sorted)).toEqual(["Fixture Zulu Now", "Fixture Alpha Now"]);
  });

  it("floats a current role above a finished one that started later", async () => {
    const sorted = await getExperienceWith([
      role("Fixture Recent Finished", "2020-01", "2024-01"),
      role("Fixture Old Current", "2016-06"),
    ]);
    expect(orgs(sorted)).toEqual(["Fixture Old Current", "Fixture Recent Finished"]);
  });

  it("breaks an equal-end tie on start descending", async () => {
    const sorted = await getExperienceWith([
      role("Fixture Alpha Ended", "2018-01", "2019-12"),
      role("Fixture Zulu Ended", "2019-06", "2019-12"),
    ]);
    expect(orgs(sorted)).toEqual(["Fixture Zulu Ended", "Fixture Alpha Ended"]);
  });

  it("breaks an equal-end, equal-start tie on organisation ascending", async () => {
    const sorted = await getExperienceWith([
      role("Fixture Zulu Twin", "2016-03", "2017-03"),
      role("Fixture Alpha Twin", "2016-03", "2017-03"),
    ]);
    expect(orgs(sorted)).toEqual(["Fixture Alpha Twin", "Fixture Zulu Twin"]);
  });

  it("orders every case together from a shuffled collection", async () => {
    const shuffled = [
      role("Fixture Zulu Twin", "2016-03", "2017-03"),
      role("Fixture Alpha Ended", "2018-01", "2019-12"),
      role("Fixture Alpha Now", "2016-06"),
      role("Fixture Short Overlap", "2021-01", "2022-01"),
      role("Fixture Zulu Ended", "2019-06", "2019-12"),
      role("Fixture Alpha Twin", "2016-03", "2017-03"),
      role("Fixture Long Overlap", "2020-01", "2024-01"),
      role("Fixture Zulu Now", "2025-02"),
    ];
    const expected = [
      "Fixture Zulu Now", // current, latest start
      "Fixture Alpha Now", // current, earliest start of all — still above every ended role
      "Fixture Long Overlap", // end 2024-01
      "Fixture Short Overlap", // end 2022-01, started later but finished first
      "Fixture Zulu Ended", // end 2019-12, start 2019-06
      "Fixture Alpha Ended", // end 2019-12, start 2018-01
      "Fixture Alpha Twin", // end 2017-03, start 2016-03, organisation asc
      "Fixture Zulu Twin",
    ];

    expect(orgs(await getExperienceWith(shuffled))).toEqual(expected);
    // And the naive key gets this collection wrong.
    expect(orgs([...shuffled].sort(naiveStartDescOnly))).not.toEqual(expected);
  });

  it("returns an empty array for an empty collection", async () => {
    expect(await getExperienceWith([])).toEqual([]);
  });

  it("does not mutate the source collection", async () => {
    const source = [...OVERLAPPING].reverse();
    const before = orgs(source);
    await getExperienceWith(source);
    expect(orgs(source)).toEqual(before);
  });
});
