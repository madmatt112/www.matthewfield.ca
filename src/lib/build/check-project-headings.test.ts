// Unit-test coverage for the `PROJECTS_ALLOW_H4=1` override branch of the
// `checkProjectHeadings` helper (Task 14.4 — closes r3 Target 4 H4-coverage
// finding). All inputs are in-memory MDX strings — no on-disk fixtures.
//
// The helper is consumed as a sibling module export per Task 14.4
// prerequisite; importing from "./check-project-headings" exercises the same
// code path velite.config.ts uses at build time.

import { afterEach, describe, expect, test, vi } from "vitest";
import { checkProjectHeadings } from "./check-project-headings";

describe("checkProjectHeadings — PROJECTS_ALLOW_H4 override branch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("default rejects h4 (h2 followed by h4)", () => {
    const content = "## Foo\n\n#### Bar\n";
    expect(() =>
      checkProjectHeadings({ content, path: "content/projects/case-1.mdx" }),
    ).toThrow(/no-h4-plus/);
  });

  test("default rejects h1", () => {
    const content = "# Top\n\n## Sub\n";
    expect(() =>
      checkProjectHeadings({ content, path: "content/projects/case-2.mdx" }),
    ).toThrow(/no-h1-mdast/);
  });

  test("PROJECTS_ALLOW_H4=1 allows valid depth-4 sequence", () => {
    vi.stubEnv("PROJECTS_ALLOW_H4", "1");
    const content = "## Foo\n\n### Bar\n\n#### Baz\n";
    expect(() =>
      checkProjectHeadings({ content, path: "content/projects/case-3.mdx" }),
    ).not.toThrow();
  });

  test("PROJECTS_ALLOW_H4=1 does NOT permit level skip (h2 -> h4)", () => {
    vi.stubEnv("PROJECTS_ALLOW_H4", "1");
    const content = "## Foo\n\n#### Bar\n";
    expect(() =>
      checkProjectHeadings({ content, path: "content/projects/case-4.mdx" }),
    ).toThrow(/no-level-skip/);
  });

  test("AST-only inspection — <h1> inside fenced code block is ignored", () => {
    const content = [
      "## Foo",
      "",
      "```html",
      "<h1>Tutorial example</h1>",
      "```",
      "",
    ].join("\n");
    expect(() =>
      checkProjectHeadings({ content, path: "content/projects/case-5.mdx" }),
    ).not.toThrow();
  });
});
