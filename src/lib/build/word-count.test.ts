import { describe, test, expect } from "vitest";
import { u } from "unist-builder";
import type { Root } from "mdast";
import { countWordsFromMdast } from "./word-count";

describe("countWordsFromMdast", () => {
  test("drops code blocks AND inline code (75 words)", () => {
    // 50 single-word text nodes inside a paragraph
    const paragraphWords = Array.from({ length: 50 }, (_, i) =>
      u("text", `word${i}`),
    );

    // 100-word fenced code block (must be dropped)
    const codeBlockValue = Array.from({ length: 100 }, (_, i) => `code${i}`).join(
      " ",
    );

    // 20-word inlineCode span (must be dropped)
    const inlineCodeValue = Array.from({ length: 20 }, (_, i) => `inline${i}`).join(
      " ",
    );

    // 25-word heading
    const headingWords = Array.from({ length: 25 }, (_, i) =>
      u("text", `head${i}`),
    );

    const tree = u("root", [
      u("paragraph", paragraphWords),
      u("code", { lang: "js" }, codeBlockValue),
      u("paragraph", [u("inlineCode", inlineCodeValue)]),
      u("heading", { depth: 2 }, headingWords),
    ]) as Root;

    expect(countWordsFromMdast(tree)).toBe(75);
  });

  test("whitespace edge", () => {
    const tree = u("root", [
      u("paragraph", [u("text", "  foo   bar  ")]),
    ]) as Root;

    expect(countWordsFromMdast(tree)).toBe(2);
  });

  test("image alt contributes", () => {
    const tree = u("root", [
      u("paragraph", [
        u("image", { url: "/x.png", alt: "alpha beta gamma" }),
      ]),
    ]) as Root;

    expect(countWordsFromMdast(tree)).toBe(3);
  });
});
