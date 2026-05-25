import { describe, expect, test } from "vitest";
import type { Element, ElementContent, Properties, Root } from "hast";
import { rehypeCopyButton } from "./rehype-copy-button";

/**
 * Build a HAST tree representing `<pre><code>{source}</code></pre>` wrapped in
 * a body element (so the <pre> has a parent, matching the real pipeline).
 */
function buildPreCodeTree(source: string, codeClassName?: string): Root {
  const codeProps: Properties = {};
  if (codeClassName) codeProps.className = [codeClassName];

  const code: Element = {
    type: "element",
    tagName: "code",
    properties: codeProps,
    children: [{ type: "text", value: source }],
  };
  const pre: Element = {
    type: "element",
    tagName: "pre",
    properties: {},
    children: [code],
  };
  const body: Element = {
    type: "element",
    tagName: "body",
    properties: {},
    children: [pre],
  };
  return { type: "root", children: [body] };
}

/** Recursively find the first element matching a predicate. */
function findElement(
  node: Root | ElementContent,
  predicate: (el: Element) => boolean,
): Element | undefined {
  if (node.type === "element" && predicate(node)) return node;
  const children =
    node.type === "root" || node.type === "element"
      ? (node.children as ElementContent[])
      : [];
  for (const child of children) {
    const found = findElement(child, predicate);
    if (found) return found;
  }
  return undefined;
}

/** Decode a base64 string into UTF-8 text using the same path the client uses. */
function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

function runPlugin(tree: Root): Root {
  rehypeCopyButton()(tree);
  return tree;
}

function getCopySource(tree: Root): string {
  const button = findElement(
    tree,
    (el) => el.tagName === "button" && Boolean(el.properties?.["dataCopyButton"] !== undefined || el.properties?.["data-copy-button"] !== undefined),
  );
  expect(button, "expected to find a copy <button>").toBeDefined();
  const props = button!.properties ?? {};
  // hast normalizes `data-*` attributes to camelCase keys (e.g. dataCopySource).
  const b64 =
    (props["dataCopySource"] as string | undefined) ??
    (props["data-copy-source"] as string | undefined);
  expect(typeof b64).toBe("string");
  return b64 as string;
}

function cloneTree(tree: Root): Root {
  return JSON.parse(JSON.stringify(tree)) as Root;
}

/** Minimal HTML serializer for HAST — enough for byte-equality comparison. */
function stringify(node: Root | ElementContent): string {
  if (node.type === "root") {
    return (node.children as ElementContent[]).map(stringify).join("");
  }
  if (node.type === "text") return node.value;
  if (node.type === "comment") return `<!--${node.value}-->`;
  if (node.type === "element") {
    const props = node.properties ?? {};
    const attrs = Object.keys(props)
      .sort()
      .map((k) => {
        const v = props[k];
        if (Array.isArray(v)) return `${k}="${v.join(" ")}"`;
        if (v === true) return k;
        if (v === false || v == null) return "";
        return `${k}="${String(v)}"`;
      })
      .filter(Boolean)
      .join(" ");
    const open = attrs ? `<${node.tagName} ${attrs}>` : `<${node.tagName}>`;
    const inner = (node.children as ElementContent[]).map(stringify).join("");
    return `${open}${inner}</${node.tagName}>`;
  }
  return "";
}

describe("rehypeCopyButton", () => {
  test("(a) non-ASCII source round-trips via Buffer → base64 → TextDecoder", () => {
    const source = 'console.log("✨ año 中文")';
    const tree = buildPreCodeTree(source);
    runPlugin(tree);

    const b64 = getCopySource(tree);
    const decoded = decodeBase64Utf8(b64);
    expect(decoded).toBe(source);
  });

  test("(b) tab-indented source preserved", () => {
    const source = "\tfoo()\n\t\tbar()";
    const tree = buildPreCodeTree(source);
    runPlugin(tree);

    const decoded = decodeBase64Utf8(getCopySource(tree));
    expect(decoded).toBe(source);
    expect(decoded).toContain("\t");
    expect(decoded).toContain("\n");
  });

  test("(c) trailing newlines preserved", () => {
    const source = "line1\nline2\n\n";
    const tree = buildPreCodeTree(source);
    runPlugin(tree);

    const decoded = decodeBase64Utf8(getCopySource(tree));
    expect(decoded).toBe(source);
    expect(decoded.endsWith("\n\n")).toBe(true);
  });

  test("(d) wrapper <div> does NOT carry a data-code-language attribute", () => {
    const tree = buildPreCodeTree("foo", "language-ts");
    runPlugin(tree);

    const wrapper = findElement(
      tree,
      (el) =>
        el.tagName === "div" &&
        Array.isArray(el.properties?.className) &&
        (el.properties!.className as unknown[]).includes("code-block-wrapper"),
    );
    expect(wrapper, "expected wrapper <div>").toBeDefined();

    const props = wrapper!.properties ?? {};
    for (const key of Object.keys(props)) {
      // hast camelCases data-* attributes; check both the camelCase and raw
      // forms, and any key starting with "dataLanguage"/"data-language" too.
      expect(key).not.toBe("dataCodeLanguage");
      expect(key).not.toBe("data-code-language");
      expect(key.startsWith("dataLanguage")).toBe(false);
      expect(key.startsWith("data-language")).toBe(false);
    }
  });

  test("(e) inline <code> (no <pre> parent) is left untouched", () => {
    const inlineCode: Element = {
      type: "element",
      tagName: "code",
      properties: {},
      children: [{ type: "text", value: "inline()" }],
    };
    const paragraph: Element = {
      type: "element",
      tagName: "p",
      properties: {},
      children: [
        { type: "text", value: "Some text with " },
        inlineCode,
        { type: "text", value: " here." },
      ],
    };
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "body",
          properties: {},
          children: [paragraph],
        },
      ],
    };

    runPlugin(tree);

    // No wrapper div was added.
    const wrapper = findElement(
      tree,
      (el) =>
        el.tagName === "div" &&
        Array.isArray(el.properties?.className) &&
        (el.properties!.className as unknown[]).includes("code-block-wrapper"),
    );
    expect(wrapper).toBeUndefined();

    // No copy button was added.
    const button = findElement(tree, (el) => el.tagName === "button");
    expect(button).toBeUndefined();

    // The <p> still contains the inline <code> as a direct child.
    const p = findElement(tree, (el) => el.tagName === "p");
    expect(p).toBeDefined();
    const stillHasInlineCode = (p!.children as ElementContent[]).some(
      (c) => c.type === "element" && c.tagName === "code",
    );
    expect(stillHasInlineCode).toBe(true);
  });

  test("(f) plugin is stateless: two invocations produce identical output", () => {
    const source = 'const año = 1\n\tconst x = "✨"\n';
    const treeA = buildPreCodeTree(source, "language-ts");
    const treeB = cloneTree(treeA);

    const transformer1 = rehypeCopyButton();
    const transformer2 = rehypeCopyButton();
    transformer1(treeA);
    transformer2(treeB);

    expect(stringify(treeA)).toBe(stringify(treeB));
  });
});
