import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { EducationList } from "./education-list";
import { ExperienceTimeline } from "./experience-timeline";
import { SkillsList } from "./skills-list";

/**
 * R5.4: an empty collection renders no section at all — no heading, no kicker,
 * no rule, no wrapper. Asserting on the whole `container.innerHTML` rather than
 * the absence of a heading is deliberate: it is the only assertion that also
 * catches a stray wrapper element added above the early return.
 */
describe("profile sections with an empty collection", () => {
  afterEach(cleanup);

  it("renders nothing for SkillsList", () => {
    const { container } = render(<SkillsList groups={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for EducationList", () => {
    const { container } = render(<EducationList entries={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for ExperienceTimeline", () => {
    const { container } = render(<ExperienceTimeline roles={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
