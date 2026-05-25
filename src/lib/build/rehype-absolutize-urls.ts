import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";

interface Options {
  baseUrl: string;
}

function rewrite(value: unknown, baseUrl: string): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  if (value.startsWith("#")) return undefined;
  if (URL.canParse(value)) return undefined;
  return new URL(value, baseUrl).toString();
}

export function rehypeAbsolutizeUrls({ baseUrl }: Options) {
  return () => (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "a") {
        const next = rewrite(node.properties?.href, baseUrl);
        if (next !== undefined) node.properties.href = next;
      } else if (node.tagName === "img") {
        const next = rewrite(node.properties?.src, baseUrl);
        if (next !== undefined) node.properties.src = next;
      }
    });
  };
}
