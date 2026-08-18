import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Sentinel test (Task 14).
 *
 * Reads each slash-page MDX file from disk, strips the leading YAML
 * frontmatter, and asserts the body does not contain either placeholder
 * sentinel string that would indicate the content was never authored.
 */

const PAGES = ["now", "colophon"] as const;

const SENTINELS = ["Placeholder content.", "Replaced in a downstream spec."] as const;

function stripFrontmatter(source: string): string {
  // YAML frontmatter is delimited by `---` on its own line at the start.
  const match = source.match(/^---[\s\S]*?---\r?\n([\s\S]*)$/);
  return match ? match[1] : source;
}

describe("seed-content sentinels absent from page bodies", () => {
  for (const page of PAGES) {
    const filePath = path.join(process.cwd(), "content", "pages", `${page}.mdx`);
    const source = fs.readFileSync(filePath, "utf8");
    const body = stripFrontmatter(source);

    for (const sentinel of SENTINELS) {
      test(`${page}.mdx does not contain "${sentinel}"`, () => {
        expect(body).not.toContain(sentinel);
      });
    }
  }
});
