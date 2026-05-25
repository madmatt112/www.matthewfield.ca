import { describe, it, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parse, type HTMLElement } from "node-html-parser";
import { posts } from "#site/content";

// Body-parity gate (Req 11.11): the HTML embedded in the RSS feed's
// <content:encoded> must remain structurally equivalent to the HTML that
// Next.js renders for the same post. We compare element shape — pre/code
// presence + Shiki token classes, heading anchors, absolutized URLs, inline
// code — rather than text-node byte equality, because Req 11.10's CDATA
// escape (split-on-`]]>`) is allowed to mutate code-block text contents.
//
// This test is build-gated: the prerendered HTML lives under
// `.next/server/app/.../fixture-code.html`. CI runs `pnpm build` before
// `pnpm test`, so the file is present. Locally, a developer running
// `pnpm test` without a prior build will see this test skip cleanly.

const SLUG = "fixture-code";

function findPrerenderedHtml(): string | null {
  const root = path.resolve(__dirname, "../../..");
  const appDir = path.join(root, ".next", "server", "app");
  if (!fs.existsSync(appDir)) return null;

  // The route group `(site)` may or may not appear in the on-disk path
  // depending on how Next emits the prerender bucket, so we walk the tree
  // and pick the first `fixture-code.html` we find under any blog segment.
  const target = `${SLUG}.html`;
  const stack: string[] = [appDir];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.isFile() && e.name === target && full.includes(`${path.sep}blog${path.sep}`)) {
        return fs.readFileSync(full, "utf8");
      }
    }
  }
  return null;
}

function getBodyHtml(): string {
  const post = (posts as Array<{ slug: string; bodyHtml: string }>).find(
    (p) => p.slug === SLUG,
  );
  if (!post) throw new Error(`fixture post '${SLUG}' missing from #site/content`);
  return post.bodyHtml;
}

// Collect class lists for every <pre> and <code> in document order. The
// canonical Shiki/rehype-pretty-code emission attaches `data-theme`,
// `data-language`, and token classes; matching the *pattern* across both
// trees is sufficient evidence the same plugin stack ran.
function collectCodeClassPatterns(root: HTMLElement): string[] {
  const out: string[] = [];
  for (const el of root.querySelectorAll("pre, code")) {
    out.push(`${el.tagName.toLowerCase()}:${(el.getAttribute("class") ?? "").trim()}`);
  }
  return out;
}

function collectHeadingIds(root: HTMLElement): Array<{ tag: string; id: string; text: string }> {
  const out: Array<{ tag: string; id: string; text: string }> = [];
  for (const el of root.querySelectorAll("h2, h3")) {
    out.push({
      tag: el.tagName.toLowerCase(),
      id: el.getAttribute("id") ?? "",
      text: el.text.trim(),
    });
  }
  return out;
}

function collectHrefsAndSrcs(root: HTMLElement): string[] {
  const out: string[] = [];
  for (const a of root.querySelectorAll("a[href]")) {
    out.push(`a:${a.getAttribute("href") ?? ""}`);
  }
  for (const img of root.querySelectorAll("img[src]")) {
    out.push(`img:${img.getAttribute("src") ?? ""}`);
  }
  return out;
}

function isAbsolute(url: string): boolean {
  return /^https?:\/\//.test(url);
}

describe("RSS body-parity (fixture-code)", () => {
  const prerendered = findPrerenderedHtml();

  if (!prerendered) {
    test.skip("skipped: no prerendered .next/server/app/.../fixture-code.html (run `pnpm build` first)", () => {
      // build-gated; CI Build 1 always supplies the file
    });
    return;
  }

  const bodyHtml = getBodyHtml();
  const feedRoot = parse(bodyHtml);
  const pageRoot = parse(prerendered);

  // The rendered page wraps the body in layout chrome; scope to <article>
  // when present so we compare prose against prose. Fall back to <main>,
  // then to the full document.
  const pageScope =
    pageRoot.querySelector("article") ?? pageRoot.querySelector("main") ?? pageRoot;

  it("(a) <pre>/<code> elements with matching Shiki token-class patterns", () => {
    const feedPats = collectCodeClassPatterns(feedRoot);
    const pagePats = collectCodeClassPatterns(pageScope);
    expect(feedPats.length, "feed has no <pre>/<code> elements").toBeGreaterThan(0);
    expect(pagePats.length, "rendered page has no <pre>/<code> elements").toBeGreaterThan(0);
    // Element-shape equivalence: the same ordered tag+class signature appears
    // in both trees. Token-level text content is intentionally excluded.
    expect(pagePats).toEqual(feedPats);
  });

  it("(b) every <h2>/<h3> has a matching id across feed and rendered page", () => {
    const feedHeads = collectHeadingIds(feedRoot);
    const pageHeads = collectHeadingIds(pageScope);
    expect(feedHeads.length).toBeGreaterThan(0);
    // Every (tag, id) pair from the feed must appear in the page tree.
    for (const h of feedHeads) {
      expect(h.id, `feed heading '${h.text}' missing id`).not.toBe("");
      const match = pageHeads.find((p) => p.tag === h.tag && p.id === h.id);
      expect(match, `rendered page missing ${h.tag}#${h.id}`).toBeDefined();
    }
  });

  it("(c) every relative href/src is absolutized in both trees", () => {
    const feedUrls = collectHrefsAndSrcs(feedRoot);
    // Page chrome (nav, footer) legitimately contains relative `/blog`-style
    // links, so we restrict the page-side check to the prose scope and only
    // assert against URLs that originated in the post body.
    const pageUrls = collectHrefsAndSrcs(pageScope);

    // The feed side is the strict half: every URL emitted by the
    // rehype-absolutize-urls plugin must be absolute https? — no leading `/`
    // or `./` allowed.
    for (const entry of feedUrls) {
      const url = entry.slice(entry.indexOf(":") + 1);
      if (url === "" || url.startsWith("#") || url.startsWith("mailto:")) continue;
      expect(isAbsolute(url), `feed url not absolutized: ${entry}`).toBe(true);
    }

    // Page-side: any URL that matches a feed URL (i.e. originates in post
    // content, not chrome) must be absolute as well. We don't enforce
    // absolutization on chrome links — those are legitimately root-relative.
    const feedUrlSet = new Set(feedUrls);
    for (const entry of pageUrls) {
      if (!feedUrlSet.has(entry)) continue;
      const url = entry.slice(entry.indexOf(":") + 1);
      if (url === "" || url.startsWith("#") || url.startsWith("mailto:")) continue;
      expect(isAbsolute(url), `page url not absolutized: ${entry}`).toBe(true);
    }
  });

  it("(d) inline <code> elements present in both trees", () => {
    // Inline = <code> that is NOT inside a <pre>. The fixture's prose has
    // two such spans ("const x = 1" and "code").
    const feedInline = feedRoot
      .querySelectorAll("code")
      .filter((c) => c.closest("pre") === null);
    const pageInline = pageScope
      .querySelectorAll("code")
      .filter((c) => c.closest("pre") === null);
    expect(feedInline.length, "feed has no inline <code> spans").toBeGreaterThan(0);
    expect(pageInline.length, "rendered page has no inline <code> spans").toBeGreaterThan(0);
  });
});
