import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { Wordmark } from "./wordmark";

describe("Wordmark", () => {
  afterEach(cleanup);

  it("renders the mf/ wordmark with a brand-colored slash", () => {
    const { container } = render(<Wordmark asLink={false} />);
    expect(container.textContent).toBe("mf/");
    const slash = Array.from(container.querySelectorAll("span")).find(
      (el) => el.textContent === "/",
    );
    expect(slash).toBeDefined();
    expect(slash!.className).toContain("text-brand");
  });

  it("links to / with an accessible name when asLink", () => {
    const { getByRole } = render(<Wordmark />);
    const link = getByRole("link", { name: "Matthew Field — home" });
    expect(link.getAttribute("href")).toBe("/");
    expect(link.textContent).toBe("mf/");
  });

  it("renders without a link when asLink is false", () => {
    const { queryByRole } = render(<Wordmark asLink={false} />);
    expect(queryByRole("link")).toBeNull();
  });
});
