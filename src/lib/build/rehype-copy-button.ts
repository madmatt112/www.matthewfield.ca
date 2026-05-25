import type { Root, Element, ElementContent } from "hast";
import { visit } from "unist-util-visit";
import { toText } from "hast-util-to-text";

export function rehypeCopyButton() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "pre") return;
      if (!parent || index == null) return;

      const codeChildren = node.children.filter(
        (c): c is Element => c.type === "element" && c.tagName === "code",
      );
      if (codeChildren.length !== 1) return;
      const codeChild = codeChildren[0];

      const source = toText(codeChild, { whitespace: "pre" });
      const sourceB64 = Buffer.from(source, "utf-8").toString("base64");

      const wrapper: Element = {
        type: "element",
        tagName: "div",
        properties: {
          className: ["code-block-wrapper"],
          "data-code-block": "",
        },
        children: [
          node,
          {
            type: "element",
            tagName: "button",
            properties: {
              type: "button",
              "data-copy-button": "",
              "data-copy-source": sourceB64,
              "data-pagefind-ignore": "all",
              "aria-label": "Copy code to clipboard",
            },
            children: [],
          },
        ],
      };

      (parent.children as ElementContent[])[index] = wrapper;
    });
  };
}
