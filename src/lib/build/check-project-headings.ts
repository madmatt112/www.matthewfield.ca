// MDX heading-hygiene check for the `projects` collection (Component 2 v4 —
// Reqs 6.9.a / 6.9.b / 6.9.c).
//
// AST-only enforcement: the helper re-parses `meta.content` (raw MDX source)
// via remark-parse + remark-gfm + remark-mdx and walks the resulting tree
// with `unist-util-visit`. There is NO regex pass over the raw source text
// after parsing — the parse step IS the AST-extraction path.
//
// Exported as a sibling module (per Task 14.4 prerequisite) so the helper
// can be unit-tested in isolation without importing velite.config.ts.

import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export class ProjectHeadingHygieneError extends Error {
  readonly file: string;
  readonly depth?: number;
  readonly rule:
    | "no-h1-mdast"
    | "no-h1-jsx"
    | "no-h4-plus"
    | "first-heading-must-be-h2"
    | "no-level-skip"
    | "mdx-parse-failure";
  constructor(args: {
    file: string;
    rule: ProjectHeadingHygieneError["rule"];
    depth?: number;
    message: string;
  }) {
    super(args.message);
    this.name = "ProjectHeadingHygieneError";
    this.file = args.file;
    this.depth = args.depth;
    this.rule = args.rule;
  }
}

interface HeadingLikeNode {
  type: string;
  depth?: number;
  name?: string | null;
  value?: unknown;
}

export function checkProjectHeadings(meta: { content: string; path: string }): void {
  const { content, path: filePath } = meta;

  let tree;
  try {
    tree = unified().use(remarkParse).use(remarkGfm).use(remarkMdx).parse(content);
  } catch (parseErr) {
    throw new ProjectHeadingHygieneError({
      file: filePath,
      rule: "mdx-parse-failure",
      message: `[velite/projects] ${filePath}: heading-hygiene mdx-parse-failure — ${(parseErr as Error).message}`,
    });
  }

  const allowH4 = process.env.PROJECTS_ALLOW_H4 === "1";
  const headingDepths: number[] = [];

  visit(tree, (node: HeadingLikeNode) => {
    const t = node.type;

    // 6.9.a — reject mdxJsx h1/H1 tags (both block and inline forms).
    if (t === "mdxJsxFlowElement" || t === "mdxJsxTextElement") {
      const tag = node.name;
      if (tag === "h1" || tag === "H1") {
        throw new ProjectHeadingHygieneError({
          file: filePath,
          rule: "no-h1-jsx",
          depth: 1,
          message: `[velite/projects] ${filePath}: heading-hygiene no-h1-jsx — <${tag}> tag is not permitted (page title is rendered from frontmatter)`,
        });
      }
      return;
    }

    if (t !== "heading") return;
    const depth = node.depth;
    if (typeof depth !== "number") return;

    // 6.9.a — reject mdast depth-1 headings.
    if (depth === 1) {
      throw new ProjectHeadingHygieneError({
        file: filePath,
        rule: "no-h1-mdast",
        depth,
        message: `[velite/projects] ${filePath}: heading-hygiene no-h1-mdast — depth-1 heading is not permitted (page title is rendered from frontmatter)`,
      });
    }

    // 6.9.b — reject depth >= 4 unless PROJECTS_ALLOW_H4=1.
    if (depth >= 4 && !allowH4) {
      throw new ProjectHeadingHygieneError({
        file: filePath,
        rule: "no-h4-plus",
        depth,
        message: `[velite/projects] ${filePath}: heading-hygiene no-h4-plus — depth-${depth} heading is not permitted by default (set PROJECTS_ALLOW_H4=1 to allow h4+)`,
      });
    }

    headingDepths.push(depth);
  });

  // 6.9.c — sequence rules. First mdast heading must be h2; no deepening
  // level skips (e.g. ## -> ####). Shallowing is permitted. The sequence
  // rule fires regardless of PROJECTS_ALLOW_H4.
  if (headingDepths.length > 0) {
    const first = headingDepths[0];
    if (first !== 2) {
      throw new ProjectHeadingHygieneError({
        file: filePath,
        rule: "first-heading-must-be-h2",
        depth: first,
        message: `[velite/projects] ${filePath}: heading-hygiene first-heading-must-be-h2 — first heading is h${first} (must be h2)`,
      });
    }
    for (let i = 1; i < headingDepths.length; i++) {
      const prev = headingDepths[i - 1];
      const curr = headingDepths[i];
      if (curr > prev + 1) {
        throw new ProjectHeadingHygieneError({
          file: filePath,
          rule: "no-level-skip",
          depth: curr,
          message: `[velite/projects] ${filePath}: heading-hygiene no-level-skip — h${prev} followed by h${curr} (skipped h${prev + 1})`,
        });
      }
    }
  }
}
