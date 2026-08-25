#!/usr/bin/env node
/**
 * validate-feed.mjs
 *
 * Validates the generated RSS feed XML emitted by the `/feed.xml` route after
 * CI Build 1. Globs the route's emit directory (no extension filter — the
 * Next.js route-handler shape varies across versions: `.body`, `.route.body`,
 * unsuffixed chunks, etc.), identifies the rendered XML by content sniff
 * (file body starts with `<?xml` or `<rss`), parses with `fast-xml-parser`,
 * and asserts the RSS 2.0 structural pins per design "scripts/validate-feed.mjs".
 *
 * Exits 0 on pass, non-zero with a diagnostic naming the missing field on any
 * violation. Invoked from CI as `node scripts/validate-feed.mjs`.
 */
import { globSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Pinned per design: RSS 2.0 mandates title/link/description; this design
// (Req 11.4) additionally requires <language>. Adding to this list is a
// deliberate design change.
const CHANNEL_REQUIRED = ["title", "link", "description", "language"];
const ITEM_REQUIRED = ["title", "link", "guid", "description", "pubDate", "content:encoded"];

// Next.js 16 emits the rendered XML body as `.next/server/app/feed.xml.body`
// (a sibling file to the `feed.xml/` route-bundle directory) rather than
// inside the directory. Older shape (route inside feed.xml/) retained for
// back-compat. Node's globSync does not traverse hidden dot-directories
// (e.g. `.next/`) under the default `**` glob — explicit prefixes required.
// The second entry pair covers /feed/field-notes.xml — the tag-filtered feed
// consumed by Buttondown's RSS-to-email automation. It is validated by the same
// structural pins as /feed.xml: an issue built from a malformed feed reaches
// subscribers, and unlike a bad page it cannot be recalled.
const FEED_GLOBS = [
  ".next/server/app/feed.xml/**/*",
  ".next/server/app/feed.xml.body",
  "**/server/app/feed.xml/**/*",
  "**/server/app/feed.xml.body",
  ".next/server/app/feed/field-notes.xml/**/*",
  ".next/server/app/feed/field-notes.xml.body",
  "**/server/app/feed/field-notes.xml/**/*",
  "**/server/app/feed/field-notes.xml.body",
];

const errors = [];

function fail(msg) {
  errors.push(msg);
}

function findXmlFiles() {
  const matches = FEED_GLOBS.flatMap((g) => globSync(g, { cwd: repoRoot }));
  const xmlFiles = [];
  for (const m of matches) {
    const abs = path.join(repoRoot, m);
    try {
      if (!statSync(abs).isFile()) continue;
    } catch {
      continue;
    }
    let buf;
    try {
      buf = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const head = buf.trimStart().slice(0, 64);
    if (head.startsWith("<?xml") || head.startsWith("<rss")) {
      xmlFiles.push({ path: abs, content: buf });
    }
  }
  return xmlFiles;
}

function asArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function validateFeed(file) {
  const rel = path.relative(repoRoot, file.path);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    // Preserve namespaced tag names like `content:encoded` verbatim.
    removeNSPrefix: false,
    parseTagValue: false,
    trimValues: true,
  });

  let doc;
  try {
    doc = parser.parse(file.content);
  } catch (err) {
    fail(`${rel}: XML parse failed: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  const rss = doc?.rss;
  if (!rss) {
    fail(`${rel}: missing <rss> root element`);
    return;
  }
  const version = rss["@_version"];
  if (version !== "2.0") {
    fail(`${rel}: <rss version="${version ?? "<unset>"}"> — expected "2.0"`);
  }

  const channel = rss.channel;
  if (!channel) {
    fail(`${rel}: missing <channel> element`);
    return;
  }

  for (const child of CHANNEL_REQUIRED) {
    if (channel[child] === undefined || channel[child] === null || channel[child] === "") {
      fail(`${rel}: <channel> missing required child <${child}>`);
    }
  }

  // An empty feed is valid RSS: a site with no published posts yet emits a
  // well-formed <channel> with zero <item> elements. Validate item structure
  // only when items are present.
  const items = asArray(channel.item);
  if (items.length === 0) return;

  const first = items[0];
  for (const child of ITEM_REQUIRED) {
    if (first[child] === undefined || first[child] === null || first[child] === "") {
      fail(`${rel}: first <item> missing required child <${child}>`);
    }
  }
}

function main() {
  const xmlFiles = findXmlFiles();
  if (xmlFiles.length === 0) {
    fail(
      `no feed XML found — globs ${JSON.stringify(FEED_GLOBS)} matched zero files whose content begins ` +
        `with <?xml or <rss. Ensure CI Build 1 completed before running validate-feed.`,
    );
    return finish();
  }

  let rssFound = false;
  for (const f of xmlFiles) {
    if (f.content.includes("<rss")) rssFound = true;
    validateFeed(f);
  }
  if (!rssFound) {
    fail(`no file under globs ${JSON.stringify(FEED_GLOBS)} contained an <rss> root tag`);
  }
  finish();
}

function finish() {
  if (errors.length === 0) {
    process.stdout.write("validate-feed: PASS\n");
    process.exit(0);
  }
  for (const e of errors) process.stderr.write(`validate-feed: ${e}\n`);
  process.exit(1);
}

main();
