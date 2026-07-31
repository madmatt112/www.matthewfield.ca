import { describe, expect, it } from "vitest";

import { isExternalHref } from "./external-link";

describe("isExternalHref", () => {
  it("treats other hosts as external", () => {
    expect(isExternalHref("https://github.com/madmatt112")).toBe(true);
    expect(isExternalHref("http://example.com/page")).toBe(true);
    expect(isExternalHref("https://www.mossfootdigital.com")).toBe(true);
  });

  it("treats relative paths and in-page anchors as internal", () => {
    expect(isExternalHref("/blog")).toBe(false);
    expect(isExternalHref("/projects/rudder")).toBe(false);
    expect(isExternalHref("#get-in-touch")).toBe(false);
  });

  it("treats the site's own host as internal, with or without www", () => {
    expect(isExternalHref("https://www.matthewfield.ca/blog")).toBe(false);
    expect(isExternalHref("https://matthewfield.ca/blog")).toBe(false);
  });

  it("leaves non-web schemes alone so they do not open a blank tab", () => {
    expect(isExternalHref("mailto:hello@matthewfield.ca")).toBe(false);
    expect(isExternalHref("tel:+15555555555")).toBe(false);
  });

  it("returns false for missing or unparseable hrefs", () => {
    expect(isExternalHref(undefined)).toBe(false);
    expect(isExternalHref("")).toBe(false);
  });
});
