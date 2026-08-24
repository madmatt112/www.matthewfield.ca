import type { Root } from "mdast";
import { visit } from "unist-util-visit";

/**
 * `::lead[...]` — a stand-out paragraph that is NOT a heading.
 *
 * Runs after `remark-directive`, which parses the generic directive syntax
 * (`:text[...]`, `::leaf[...]`, `:::container`). This plugin gives meaning to
 * exactly one directive: the `lead` leaf directive becomes `<p class="lead">`.
 * `@tailwindcss/typography` already styles `.lead`; `src/styles/blog/lead.css`
 * raises it to display type.
 *
 * It lives in `sharedRemarkPlugins` so the on-page body (`s.mdx()`) and the RSS
 * body (`s.markdown()`) render the same `<p class="lead">` — no JSX, so the
 * post-rejection layer in velite.config.ts stays satisfied and the feed keeps
 * the sentence as plain text.
 *
 * Every other directive is handled so nothing renders as a bare `<div>`:
 * - Inline `:word` runs are ordinary prose to this site (`doi:ACM…`, `10:30`,
 *   `3:1`) and are put back as the literal source text.
 * - Unknown `::leaf` / `:::container` directives are deliberate syntax at the
 *   start of a line, so they are a build error.
 */

type DirectiveNode = {
  type: "textDirective" | "leafDirective" | "containerDirective";
  name: string;
  data?: { hName?: string; hProperties?: Record<string, unknown> };
  position?: { start: { offset?: number }; end: { offset?: number } };
};

const DIRECTIVE_TYPES = ["textDirective", "leafDirective", "containerDirective"] as const;

export function remarkLead() {
  // `file` is the unified VFile; typed structurally because `vfile` is not a
  // direct dependency. Only `.value` (the source string) is read.
  return (tree: Root, file: { value?: unknown }) => {
    visit(tree, DIRECTIVE_TYPES, (node, index, parent) => {
      const directive = node as unknown as DirectiveNode;

      if (directive.type === "leafDirective" && directive.name === "lead") {
        directive.data = {
          ...directive.data,
          hName: "p",
          hProperties: { className: ["lead"] },
        };
        return;
      }

      if (directive.type === "textDirective") {
        if (!parent || index == null) return;
        const start = directive.position?.start.offset;
        const end = directive.position?.end.offset;
        const source =
          start != null && end != null
            ? String(file.value).slice(start, end)
            : `:${directive.name}`;
        parent.children[index] = { type: "text", value: source };
        return;
      }

      const marker = directive.type === "leafDirective" ? "::" : ":::";
      throw new Error(
        `[remark-lead] unknown directive \`${marker}${directive.name}\`. Only \`::lead[...]\` is supported.`,
      );
    });
  };
}
