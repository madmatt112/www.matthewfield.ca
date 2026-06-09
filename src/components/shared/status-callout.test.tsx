import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { StatusCallout } from "./status-callout";

describe("StatusCallout", () => {
  afterEach(cleanup);

  it("pairs tone tokens with an accessible-named icon and text", () => {
    const { container, getByText, getByLabelText } = render(
      <StatusCallout tone="success">All good</StatusCallout>,
    );
    const root = container.firstElementChild!;
    expect(root.className).toContain("bg-success/10");
    expect(root.className).toContain("text-success");
    expect(getByLabelText("Success")).toBeTruthy();
    expect(getByText("All good")).toBeTruthy();
  });

  it("maps the error tone to the destructive role tokens", () => {
    const { container } = render(<StatusCallout tone="error">Boom</StatusCallout>);
    const root = container.firstElementChild!;
    expect(root.className).toContain("bg-destructive/10");
    expect(root.className).toContain("text-destructive");
  });

  it("uses warning and info tone tokens", () => {
    const warn = render(<StatusCallout tone="warning">w</StatusCallout>);
    expect(warn.container.firstElementChild!.className).toContain("bg-warning/10");
    cleanup();
    const info = render(<StatusCallout tone="info">i</StatusCallout>);
    expect(info.container.firstElementChild!.className).toContain("bg-info/10");
  });
});
