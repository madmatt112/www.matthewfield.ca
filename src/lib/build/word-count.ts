import { visit, SKIP } from "unist-util-visit";
import { toString } from "mdast-util-to-string";
import type { Root, Nodes } from "mdast";

export function countWordsFromMdast(tree: Root): number {
  const parts: string[] = [];
  visit(tree, (node) => {
    if (node.type === "code" || node.type === "inlineCode" || node.type === "html") {
      return SKIP;
    }
    if (node.type === "text" || node.type === "image") {
      parts.push(toString(node as Nodes, { includeImageAlt: true }));
    }
  });
  const text = parts.join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}
