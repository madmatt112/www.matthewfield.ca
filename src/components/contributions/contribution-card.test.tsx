import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { ContributionCard } from "./contribution-card";
import type { Contribution } from "@/lib/contributions";

describe("ContributionCard", () => {
  const base: Contribution = {
    repo: "octo/example",
    repoUrl: "https://example.com/repo",
    title: "Fix a flaky integration test",
    description:
      "Reworked the test harness so the suite no longer depends on wall-clock timing.",
    date: "2026-01-15",
    links: [{ kind: "pr", url: "https://example.com/pr" }],
  };
  const index = 3;

  afterEach(cleanup);

  it("links the rail's aria-labelledby to the rendered heading id", () => {
    const { getByRole, container } = render(
      <ContributionCard contribution={base} index={index} />,
    );
    expect(getByRole("group").getAttribute("aria-labelledby")).toBe(
      `contrib-${index}`,
    );
    expect(container.querySelector(`#contrib-${index}`)?.textContent).toBe(
      base.title,
    );
  });

  it("renders the repo as <code class=contrib-repo>", () => {
    const { container } = render(
      <ContributionCard contribution={base} index={index} />,
    );
    expect(container.querySelector("code.contrib-repo")).not.toBeNull();
  });

  it("renders the language badge when language is set", () => {
    const { container } = render(
      <ContributionCard
        contribution={{ ...base, language: "TypeScript" }}
        index={index}
      />,
    );
    expect(container.querySelector(".contrib-language")?.textContent).toBe(
      "TypeScript",
    );
  });

  it("omits the language badge when language is absent", () => {
    const { container } = render(
      <ContributionCard contribution={base} index={index} />,
    );
    expect(container.querySelector(".contrib-language")).toBeNull();
  });
});
