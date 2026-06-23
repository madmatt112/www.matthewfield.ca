import { afterEach, describe, expect, it, vi } from "vitest";

import { getBuildInfo } from "./build-info";

describe("getBuildInfo", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when no commit SHA is in the environment", () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    vi.stubEnv("GITHUB_SHA", "");
    expect(getBuildInfo()).toBeNull();
  });

  it("prefers VERCEL_GIT_COMMIT_SHA and builds a short SHA + commit URL", () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "0123456789abcdef0123456789abcdef01234567");
    vi.stubEnv("GITHUB_SHA", "ffffffffffffffffffffffffffffffffffffffff");
    expect(getBuildInfo()).toEqual({
      shortSha: "0123456",
      commitUrl:
        "https://github.com/madmatt112/www.matthewfield.ca/commit/0123456789abcdef0123456789abcdef01234567",
    });
  });

  it("falls back to GITHUB_SHA when VERCEL_GIT_COMMIT_SHA is absent", () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    vi.stubEnv("GITHUB_SHA", "abcdef1234567890abcdef1234567890abcdef12");
    expect(getBuildInfo()?.shortSha).toBe("abcdef1");
  });
});
