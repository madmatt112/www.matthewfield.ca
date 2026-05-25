import { describe, expect, test } from "vitest";
import { derivePostSlug } from "./derive-post-slug.mjs";

describe("derivePostSlug", () => {
  test("(a) no override → basename without .mdx", () => {
    expect(derivePostSlug("posts/foo.mdx", {})).toBe("foo");
  });

  test("(b) explicit override → override", () => {
    expect(derivePostSlug("posts/foo.mdx", { slug: "custom-slug" })).toBe("custom-slug");
  });

  test("(c) override containing kebab → preserved", () => {
    expect(derivePostSlug("posts/anything.mdx", { slug: "my-kebab-case-slug" })).toBe(
      "my-kebab-case-slug",
    );
  });

  test("(d) subdirectory path → basename ignores subdir", () => {
    expect(derivePostSlug("posts/sub/foo.mdx", {})).toBe("foo");
  });

  test("(e) .md extension → returns full basename including .md (helper strips .mdx only)", () => {
    expect(derivePostSlug("posts/foo.md", {})).toBe("foo.md");
  });
});
