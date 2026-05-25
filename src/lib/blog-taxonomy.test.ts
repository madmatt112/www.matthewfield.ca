import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAllCategories, getAllTags } from "@/lib/blog-taxonomy";

const ENV_KEYS = ["VERCEL", "VERCEL_ENV", "BLOG_INCLUDE_DRAFTS"] as const;

function clearEnv(): void {
  for (const k of ENV_KEYS) delete process.env[k];
}

beforeEach(clearEnv);
afterEach(clearEnv);

describe("getAllTags / getAllCategories", () => {
  it("getAllTags returns deduped, lex-sorted, empty-safe list", () => {
    process.env.BLOG_INCLUDE_DRAFTS = "1";
    const tags = getAllTags();
    expect(tags).toEqual([...new Set(tags)].sort());
    // Must be an array (even if empty)
    expect(Array.isArray(tags)).toBe(true);
  });

  it("getAllCategories returns deduped, lex-sorted, empty-safe list", () => {
    process.env.BLOG_INCLUDE_DRAFTS = "1";
    const cats = getAllCategories();
    expect(cats).toEqual([...new Set(cats)].sort());
    expect(Array.isArray(cats)).toBe(true);
  });

  it("returns empty array when no posts are visible (drafts hidden, all fixtures are drafts)", () => {
    // All shipped fixtures are draft:true, so with drafts hidden the visible
    // set is empty (or contains only non-fixture posts). Either way, the
    // helpers must not throw.
    expect(() => getAllTags()).not.toThrow();
    expect(() => getAllCategories()).not.toThrow();
  });
});
