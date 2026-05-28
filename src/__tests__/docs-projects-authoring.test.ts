import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import type { Root, Heading } from "mdast";

/**
 * Doc structural test (Task 18, Req 11.3).
 *
 * Parses `docs/projects-authoring.md` via remark-parse and asserts that each
 * of the ten §-headings from Req 11.1 appears as a `## ` (heading depth=2)
 * in document order. AST-based extraction is required because the doc
 * contains fenced ```mdx code blocks whose contents include `## ` lines;
 * a raw regex would produce spurious matches. We use the mdast AST so only
 * true heading nodes are considered.
 *
 * This test does NOT invoke `runChokepointScan` on the doc contents.
 */

const REQUIRED_HEADINGS: readonly string[] = [
  "§1 Quick start — copy this MDX file",
  "§2 Frontmatter fields",
  "§3 Cover image constraints",
  "§4 Sharing previews (`ogImage`)",
  "§5 MDX body constraints",
  "§6 Container width and wide media",
  "§7 `updated` editorial guidance",
  "§8 Lifecycle",
  "§9 Local development environment variables",
  "§10 `featured` editorial guidance",
] as const;

const docPath = path.join(process.cwd(), "docs", "projects-authoring.md");
const source = fs.readFileSync(docPath, "utf8");

const tree = unified().use(remarkParse).parse(source) as Root;

// Extract depth-2 heading text by slicing the raw source between the heading's
// start offset (after the `## ` prefix) and end offset. This preserves inline
// markdown formatting (backticks around code spans) so we can exact-match
// against the literal heading strings from Req 11.1. The AST guarantees we
// only consider real heading nodes — fenced ```mdx blocks containing `## `
// lines are parsed as code nodes and skipped.
const depth2Headings: string[] = [];
for (const node of tree.children) {
  if (node.type !== "heading" || (node as Heading).depth !== 2) continue;
  const pos = node.position;
  if (!pos?.start?.offset || pos.end?.offset === undefined) continue;
  const raw = source.slice(pos.start.offset, pos.end.offset);
  // Strip the leading `## ` (depth 2) — guaranteed by ATX-heading depth=2.
  const text = raw.replace(/^#{2}\s+/, "").trimEnd();
  depth2Headings.push(text);
}

describe("docs/projects-authoring.md structural completeness (Req 11.3)", () => {
  test.each(REQUIRED_HEADINGS.map((h, i) => [i + 1, h] as const))(
    "section %i heading present as `##`: %s",
    (_i, heading) => {
      expect(depth2Headings).toContain(heading);
    },
  );

  test("the ten required headings appear in document order", () => {
    const indices = REQUIRED_HEADINGS.map((h) => depth2Headings.indexOf(h));
    // Every heading must be found.
    for (let i = 0; i < indices.length; i++) {
      expect(indices[i], `heading not found: ${REQUIRED_HEADINGS[i]}`).toBeGreaterThanOrEqual(0);
    }
    // Each subsequent heading must appear strictly after the previous.
    for (let i = 1; i < indices.length; i++) {
      expect(
        indices[i],
        `out of order: "${REQUIRED_HEADINGS[i]}" must come after "${REQUIRED_HEADINGS[i - 1]}"`,
      ).toBeGreaterThan(indices[i - 1]);
    }
  });
});
