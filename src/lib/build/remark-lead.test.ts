import { describe, expect, test } from "vitest";
import type { Root } from "mdast";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import { unified } from "unified";
import { remarkLead } from "./remark-lead";

type Transformed = {
  type: string;
  name?: string;
  value?: string;
  data?: { hName?: string; hProperties?: Record<string, unknown> };
  children?: Transformed[];
};

function run(markdown: string): Transformed[] {
  const processor = unified().use(remarkParse).use(remarkDirective).use(remarkLead);
  const tree = processor.runSync(processor.parse(markdown), markdown) as Root;
  return tree.children as Transformed[];
}

/** Concatenate the text of a paragraph's inline children. */
function inlineText(node: Transformed): string {
  return (node.children ?? []).map((c) => c.value ?? "").join("");
}

describe("remarkLead", () => {
  test('::lead[...] becomes <p class="lead"> with inline children intact', () => {
    const [, lead] = run("Before.\n\n::lead[It launches **Thursday**.]\n\nAfter.");

    expect(lead.type).toBe("leafDirective");
    expect(lead.data?.hName).toBe("p");
    expect(lead.data?.hProperties).toEqual({ className: ["lead"] });
    expect(lead.children?.map((c) => c.type)).toEqual(["text", "strong", "text"]);
  });

  test("an unknown leaf directive is a build error", () => {
    expect(() => run("::callout[nope]")).toThrow(/unknown directive `::callout`/);
  });

  test("an unknown container directive is a build error", () => {
    expect(() => run(":::note\nbody\n:::")).toThrow(/unknown directive `:::note`/);
  });

  test("inline :word runs are restored as literal source text", () => {
    const [paragraph] = run("cite as doi:ACM0002-0782 at 10:30, ratio 3:1.");

    expect(paragraph.type).toBe("paragraph");
    expect(paragraph.children?.every((c) => c.type === "text")).toBe(true);
    expect(inlineText(paragraph)).toBe("cite as doi:ACM0002-0782 at 10:30, ratio 3:1.");
  });

  test("an inline directive with a label is restored verbatim", () => {
    const [paragraph] = run("see :ref[fig 2]{#a} here");
    expect(inlineText(paragraph)).toBe("see :ref[fig 2]{#a} here");
  });

  test("plain markdown passes through untouched", () => {
    const nodes = run("# Title\n\nJust a paragraph.");
    expect(nodes.map((c) => c.type)).toEqual(["heading", "paragraph"]);
  });
});
