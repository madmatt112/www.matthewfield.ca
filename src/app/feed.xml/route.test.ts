import { describe, it, expect } from "vitest";
import { Feed } from "feed";
import { XMLParser } from "fast-xml-parser";

// Launch gate (per r1 review Attack Surface 2): the route handler depends on
// the `feed` package wrapping <content:encoded> in CDATA so that pre-rendered
// HTML survives unmolested. A future `feed` bump (≥4.3) that switches to
// character-escaping would silently break every subscriber. This test pins
// the contract with TWO assertions:
//   (a) raw-string regex — proves CDATA framing (fast-xml-parser unwraps
//       CDATA by default, so a parsed tree alone cannot distinguish CDATA
//       from XML-escaped text).
//   (b) parsed tree with cdataPropName — proves the HTML survived inside
//       CDATA without being XML-escaped.
// Each assertion's failure message names which side of the gate caught it.

describe("feed CDATA launch gate", () => {
  const html = "<pre><code>x &amp; y</code></pre>";
  const feed = new Feed({
    id: "https://example.test/",
    title: "T",
    copyright: "©",
    link: "https://example.test/",
  });
  feed.addItem({
    title: "I",
    link: "https://example.test/p",
    date: new Date("2025-01-01T00:00:00Z"),
    content: html,
  });
  const raw = feed.rss2();

  it("(a) raw-string CDATA framing — <content:encoded> opens with <![CDATA[<pre><code>", () => {
    const match = raw.match(/<content:encoded>\s*<!\[CDATA\[<pre><code>/);
    expect(
      match,
      "DUAL-GATE side (a) FAILED: raw output does not contain `<content:encoded><![CDATA[<pre><code>`. " +
        "The `feed` package likely switched from CDATA-wrapping to XML character-escaping. " +
        "Pin or downgrade `feed` and rerun.",
    ).not.toBeNull();
  });

  it("(b) parsed-tree content equality — content:encoded CDATA payload preserves <pre><code>", () => {
    const parser = new XMLParser({ cdataPropName: "__cdata", ignoreAttributes: false });
    const parsed = parser.parse(raw);
    const item = parsed?.rss?.channel?.item;
    const first = Array.isArray(item) ? item[0] : item;
    const node = first?.["content:encoded"];
    const cdata = node?.__cdata;
    expect(
      cdata,
      "DUAL-GATE side (b) FAILED: parsed <content:encoded> has no __cdata field. " +
        "The `feed` package emitted character-escaped text instead of a CDATA section.",
    ).toBeDefined();
    expect(
      typeof cdata === "string" && cdata.includes("<pre><code>"),
      "DUAL-GATE side (b) FAILED: __cdata payload does not contain literal `<pre><code>`. " +
        "The HTML was XML-escaped inside the CDATA wrapper.",
    ).toBe(true);
  });
});
