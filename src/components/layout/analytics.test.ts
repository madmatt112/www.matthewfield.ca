import { describe, expect, it } from "vitest";

import { ANALYTICS_HOST, isReportableHost } from "./analytics";
import { siteConfig } from "@/config/site";

describe("isReportableHost", () => {
  it("derives the allowed host from the canonical site URL", () => {
    expect(ANALYTICS_HOST).toBe(new URL(siteConfig.url).hostname);
    expect(ANALYTICS_HOST).toBe("www.matthewfield.ca");
  });

  it("reports traffic served from the canonical host", () => {
    expect(isReportableHost("www.matthewfield.ca")).toBe(true);
  });

  it.each([
    ["matthewfield-ca-git-feat-x.vercel.app", "preview deployment"],
    ["matthewfield-ca.vercel.app", "production alias"],
    ["localhost", "local dev"],
    ["127.0.0.1", "Playwright e2e"],
    ["matthewfield.ca", "apex before the redirect to www"],
  ])("drops events from %s (%s)", (hostname) => {
    expect(isReportableHost(hostname)).toBe(false);
  });
});
