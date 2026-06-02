import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const mdxPath = path.resolve(__dirname, "../../content/pages/now.mdx");

function parseFrontmatter(raw: string): Record<string, string> {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = value;
  }
  return result;
}

describe("now.mdx updated field", () => {
  it("has an updated key", () => {
    const raw = fs.readFileSync(mdxPath, "utf8");
    const fm = parseFrontmatter(raw);
    expect(fm).toHaveProperty("updated");
  });

  it("updated is date-only (no time component)", () => {
    const raw = fs.readFileSync(mdxPath, "utf8");
    const fm = parseFrontmatter(raw);
    expect(/T/.test(fm.updated)).toBe(false);
  });
});
