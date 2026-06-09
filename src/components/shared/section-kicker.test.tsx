import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { SectionKicker } from "./section-kicker";

describe("SectionKicker", () => {
  afterEach(cleanup);

  it("renders the / label signature", () => {
    const { container } = render(<SectionKicker label="Selected work" />);
    expect(container.textContent).toBe("/ Selected work");
  });

  it("applies the mono, uppercase, tracked, and brand classes", () => {
    const { container } = render(<SectionKicker label="About" />);
    const el = container.querySelector("p")!;
    expect(el.className).toContain("font-mono");
    expect(el.className).toContain("text-xs");
    expect(el.className).toContain("uppercase");
    expect(el.className).toContain("tracking-widest");
    expect(el.className).toContain("text-brand");
  });

  it("merges a custom className", () => {
    const { container } = render(<SectionKicker label="X" className="mb-4" />);
    expect(container.querySelector("p")!.className).toContain("mb-4");
  });
});
