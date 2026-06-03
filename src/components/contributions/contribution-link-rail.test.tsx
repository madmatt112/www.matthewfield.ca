import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { ContributionLinkRail } from "./contribution-link-rail";
import type { ContributionLink } from "@/lib/contributions";

describe("ContributionLinkRail", () => {
  const links: ContributionLink[] = [
    { kind: "pr", url: "https://example.com/pr" },
    { kind: "commit", label: "My commit", url: "https://example.com/commit" },
    { kind: "discussion", url: "https://example.com/discussion" },
  ];
  const labelledBy = "contrib-0";

  afterEach(cleanup);

  it("labels the group via aria-labelledby", () => {
    const { getByRole } = render(<ContributionLinkRail links={links} labelledBy={labelledBy} />);
    expect(getByRole("group").getAttribute("aria-labelledby")).toBe(labelledBy);
  });

  it("renders links in array order with label-or-default text", () => {
    const { getByRole } = render(<ContributionLinkRail links={links} labelledBy={labelledBy} />);
    const anchors = Array.from(getByRole("group").querySelectorAll("a"));
    expect(anchors.map((a) => a.getAttribute("href"))).toEqual([
      "https://example.com/pr",
      "https://example.com/commit",
      "https://example.com/discussion",
    ]);
    expect(anchors.map((a) => a.textContent)).toEqual(["Pull request", "My commit", "Discussion"]);
  });

  it("uses same-tab links: rel=noopener and no target", () => {
    const { getByRole } = render(<ContributionLinkRail links={links} labelledBy={labelledBy} />);
    for (const anchor of getByRole("group").querySelectorAll("a")) {
      expect(anchor.getAttribute("rel")).toBe("noopener");
      expect(anchor.getAttribute("target")).toBeNull();
    }
  });
});
