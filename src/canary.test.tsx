import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

describe("canary", () => {
  it("renders a button with visible text", () => {
    render(<button type="button">Hello vitest</button>);
    expect(screen.getByRole("button", { name: "Hello vitest" })).toBeDefined();
    expect(screen.getByText("Hello vitest")).toBeDefined();
  });
});
