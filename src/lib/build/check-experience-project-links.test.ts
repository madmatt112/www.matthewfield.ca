// @vitest-environment node
//
// The module imports SKILLS_MAX_GROUPS from skills-schema.ts, which pulls in
// velite (and through it esbuild, whose TextEncoder invariant fails under the
// project's default jsdom environment) — hence the node directive.

import { describe, expect, test } from "vitest";

import {
  type ExperienceRoleLike,
  type RawProjectLike,
  checkExperienceProjectLinks,
  checkSkillsGroupCap,
} from "./check-experience-project-links";
import { SKILLS_MAX_GROUPS } from "./skills-schema";

const projects: RawProjectLike[] = [
  { slug: "rudder", draft: false },
  { slug: "launchpad", draft: false },
  { slug: "half-written", draft: true },
  { slug: "fixture-published-second", draft: false },
];

function roleWithDelivery(project?: string): ExperienceRoleLike {
  return {
    organisation: "Placeholder Organisation",
    title: "Placeholder Role",
    deliveries: [{ title: "Placeholder Delivery", project }],
  };
}

describe("checkExperienceProjectLinks", () => {
  test("passes for a slug that resolves to a published project", () => {
    expect(() =>
      checkExperienceProjectLinks({ experience: [roleWithDelivery("rudder")], projects }),
    ).not.toThrow();
  });

  test("passes when a delivery omits `project`, and when a role has no deliveries", () => {
    expect(() =>
      checkExperienceProjectLinks({
        experience: [
          roleWithDelivery(undefined),
          { organisation: "Other Org", title: "Other Role" },
        ],
        projects,
      }),
    ).not.toThrow();
  });

  test("throws when the slug is absent from the collection", () => {
    expect(() =>
      checkExperienceProjectLinks({ experience: [roleWithDelivery("no-such-thing")], projects }),
    ).toThrow(/not in the projects collection/);
  });

  test("throws when the slug resolves to a draft project, with a different message", () => {
    expect(() =>
      checkExperienceProjectLinks({ experience: [roleWithDelivery("half-written")], projects }),
    ).toThrow(/is 'draft: true'/);
    expect(() =>
      checkExperienceProjectLinks({ experience: [roleWithDelivery("half-written")], projects }),
    ).not.toThrow(/not in the projects collection/);
  });

  test("throws when the slug resolves to a `fixture-` project", () => {
    expect(() =>
      checkExperienceProjectLinks({
        experience: [roleWithDelivery("fixture-published-second")],
        projects,
      }),
    ).toThrow(/test fixture/);
  });

  test("the failure message names the file, the role, and the slug", () => {
    expect(() =>
      checkExperienceProjectLinks({ experience: [roleWithDelivery("no-such-thing")], projects }),
    ).toThrow(/content\/experience\.yaml.*Placeholder Organisation.*'no-such-thing'/);
  });
});

describe("checkSkillsGroupCap", () => {
  test("passes at exactly the cap", () => {
    expect(() => checkSkillsGroupCap(new Array(SKILLS_MAX_GROUPS).fill({}))).not.toThrow();
  });

  test("throws one over the cap, naming the file and the cap", () => {
    expect(() => checkSkillsGroupCap(new Array(SKILLS_MAX_GROUPS + 1).fill({}))).toThrow(
      new RegExp(`content/skills\\.yaml.*maximum of ${SKILLS_MAX_GROUPS}`),
    );
  });
});
