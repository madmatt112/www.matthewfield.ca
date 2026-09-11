import type { Root } from "mdast";
import { visit } from "unist-util-visit";

/**
 * `::lead[...]` — a stand-out paragraph that is NOT a heading.
 * `:::aside` … `:::` — a boxed side thought inside the post body.
 * `:::sketch` … `:::` — a hand-drawn image on paper that inverts in dark mode.
 *
 * Runs after `remark-directive`, which parses the generic directive syntax
 * (`:text[...]`, `::leaf[...]`, `:::container`). This plugin gives meaning to
 * exactly three directives:
 * - the `lead` leaf directive becomes `<p class="lead">`.
 *   `@tailwindcss/typography` already styles `.lead`;
 *   `src/styles/blog/lead.css` raises it to display type.
 * - the `aside` container directive becomes `<aside class="aside">` with its
 *   markdown children (paragraphs, lists, links, code) intact.
 *   `src/styles/blog/aside.css` draws the box. No label is generated: the
 *   author writes the "Side note:" opener when they want one, which is also
 *   what marks the block in unstyled RSS readers.
 * - the `sketch` container directive becomes `<div class="sketch">` around
 *   its markdown image. `src/styles/blog/sketch.css` inverts the image in
 *   dark mode so white paper reads as dark paper. Feed readers see the
 *   image as-is.
 *
 * It lives in `sharedRemarkPlugins` so the on-page body (`s.mdx()`) and the RSS
 * body (`s.markdown()`) render the same HTML — no JSX, so the post-rejection
 * layer in velite.config.ts stays satisfied and the feed keeps the text plain.
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

      if (directive.type === "containerDirective" && directive.name === "aside") {
        directive.data = {
          ...directive.data,
          hName: "aside",
          hProperties: { className: ["aside"] },
        };
        return;
      }

      if (directive.type === "containerDirective" && directive.name === "sketch") {
        directive.data = {
          ...directive.data,
          hName: "div",
          hProperties: { className: ["sketch"] },
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
        `[remark-lead] unknown directive \`${marker}${directive.name}\`. Only \`::lead[...]\`, \`:::aside\` and \`:::sketch\` are supported.`,
      );
    });
  };
}
