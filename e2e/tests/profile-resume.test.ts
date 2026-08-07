import { expect, test } from "@playwright/test";

import { siteConfig } from "../../src/config/site";

/**
 * `/profile` — the single professional surface (spec: profile-resume).
 *
 * Covers R2.1 (composition order), R4.1 (a delivery links to its project page),
 * R6.3 (the personal narrative is suppressed in print), and the NFR Security
 * clause "no telephone number, no personal email ... in rendered output, page
 * source, or JSON-LD".
 *
 * THREE SCOPE NOTES, so nobody reads more into this file than it asserts:
 *
 * 1. PRINT EMULATION VALIDATES **VISIBILITY** ONLY. `page.emulateMedia({ media:
 *    "print" })` switches which media queries match, so `display: none` rules in
 *    src/styles/print.css do take effect and are genuinely observable here. It
 *    does NOT resize the viewport to a paper box, so nothing about printed
 *    *layout* — page breaks, A4/Letter fit, `break-inside: avoid` behaviour,
 *    margins — is validated by these assertions. Those were verified by hand
 *    against a real rendered PDF when the print rules landed (task 20) and
 *    remain a manual check.
 *
 * 2. AXE IS NOT DUPLICATED HERE. R8.2 (`/profile` axe-clean in both themes) is
 *    covered by e2e/tests/contact-axe.test.ts, which parameterises over
 *    {/profile, /contact} x {light, dark}. R8.5's "the landing page's /profile
 *    index row continues to resolve" is covered by e2e/tests/landing.test.ts,
 *    which iterates `siteConfig.homeIndex`. Re-asserting either here would just
 *    give the same guarantee two places to rot.
 *
 * 3. THESE ARE DEVELOPER-RUN, NOT A GATE. .github/workflows/ci.yml runs lint,
 *    format, typecheck, Vitest, and build — no Playwright. Do not describe
 *    anything in this file as blocking a merge.
 */

const PROFILE_PATH = "/profile";

/**
 * DOM order per design §Section order: hero -> narrative -> summary ->
 * experience -> skills -> education -> contact (R2.1). The hero is the only
 * direct `<section>` child without an `id`; everything after it is addressed by
 * the stable id or print hook its component emits.
 */
const ORDERED_SECTIONS: Array<{ name: string; selector: string }> = [
  { name: "hero", selector: ".profile-print-root > section:not([id])" },
  { name: "narrative", selector: ".profile-narrative" },
  { name: "summary", selector: "#summary" },
  { name: "experience", selector: "#experience" },
  { name: "skills", selector: "#skills" },
  { name: "education", selector: "#education" },
  { name: "contact", selector: "#get-in-touch" },
];

// ---------------------------------------------------------------------------
// NFR Security scan
// ---------------------------------------------------------------------------
//
// WHY A SCAN AND NOT A SPOT-CHECK: the three YAML/frontmatter collections have
// no field that could carry a phone number or a personal address, and
// src/lib/profile-json-ld.test.ts already asserts the JSON-LD object omits
// `telephone`/`email`. But content/profile.mdx is free-form MDX prose — nothing
// in any schema stops an author typing a mobile number into the narrative. This
// scan is the only assertion in the repo that would catch that, so it is
// pattern-based over the whole document rather than a check for known strings.
//
// The site's own obfuscated address is the ONE permitted exposure (R3.1: "a
// personal email address other than the site's own obfuscated address").
// `<ObfuscatedEmail>` renders it reversed under `direction: rtl`, so the
// document contains "ac.dleifwehttam@olleh" and no forward-readable address.
// The scan therefore reads the document in both directions and allowlists
// exactly `siteConfig.links.email`; any other address, either way round, fails.
//
// FOOT-GUN, if you ever hand-inject a probe string to satisfy yourself this
// scan still bites: `pnpm test:e2e` re-runs `next build`, but NOT `velite
// build`. content/ is compiled by velite into .velite/, so an edit to
// content/profile.mdx does not reach the rendered page until you run
// `pnpm exec velite build` yourself. Skip that and you will watch a scan you
// have just deliberately broken report a perfectly clean page.

const SITE_EMAIL = siteConfig.links.email.toLowerCase();

const EMAIL_PATTERN = () =>
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,24}/g;

/**
 * Characters that may separate the digit groups of a telephone number: `.`,
 * ASCII `-`, `\s` (which in JS already covers U+00A0 non-breaking space and
 * the other unicode spaces), and U+2010-U+2015 — hyphen, non-breaking hyphen,
 * figure dash, en dash, em dash, horizontal bar. A word processor autocorrects
 * `-` into one of those, so a number pasted out of the source `.docx` arrives
 * as "780–555–0108" rather than "780-555-0108" and an ASCII-only class misses
 * it entirely. Deliberately NOT widened past dashes, spaces and dots: adding
 * `/` or `:` would start matching dates and times.
 */
const SEPARATOR_CHARS = String.raw`\s.\u2010-\u2015-`;
const SEPARATOR = `[${SEPARATOR_CHARS}]`;

/**
 * Telephone shapes, deliberately over-broad and then narrowed by
 * `MIN_TELEPHONE_DIGITS` below. Calibrated against every prerendered page in
 * `.next/server/app/` (68 documents), in both scan views: zero matches, so the
 * site's real content — ISO dates, `40+`, version numbers, oklch triples, byte
 * counts, DOIs — does not trip any of them.
 */
const TELEPHONE_PATTERNS: Array<{ label: string; pattern: () => RegExp }> = [
  // A `tel:` URI anywhere, including in an attribute. Always a violation.
  {
    label: "tel: URI",
    pattern: () => new RegExp(String.raw`tel:\+?\d[\d()+${SEPARATOR_CHARS}]{5,}`, "gi"),
  },
  // International, incl. spaced forms like "+44 20 7946 0958".
  {
    label: "international (+CC)",
    pattern: () => new RegExp(String.raw`\+\d[\d()${SEPARATOR_CHARS}]{6,18}\d(?![\d)])`, "g"),
  },
  // NANP with separators: "780-555-1234", "(780) 555 1234", "1-780-555-1234".
  {
    label: "NANP 3-3-4",
    pattern: () =>
      new RegExp(String.raw`(?<!\d)\(?\d{3}\)?${SEPARATOR}\d{3}${SEPARATOR}\d{4}(?!\d)`, "g"),
  },
  // Seven-digit local: "555-1234".
  {
    label: "local 3-4",
    pattern: () => new RegExp(String.raw`(?<!\d)\d{3}${SEPARATOR}\d{4}(?!\d)`, "g"),
  },
  // Unseparated run of 10-11 digits. The leading lookbehind also rejects `.`
  // and `/`, so a digit run that is a segment of a dotted or slashed
  // identifier is not read as a number: `doi:10.1073/pnas.1320040111` in the
  // 2008-crisis post's reference list is a DOI, not a phone. Only the LEADING
  // side rejects them — a trailing `.` is just the end of a sentence, and
  // "call 7805550121." must still be caught.
  { label: "bare 10-11 digits", pattern: () => /(?<![\d./])\d{10,11}(?!\d)/g },
];

/** A real number carries at least a 7-digit local part; below that it is noise. */
const MIN_TELEPHONE_DIGITS = 7;

/**
 * Blank the parts of a document that are numeric soup by construction and can
 * never carry contact data as text: SVG geometry attributes, CSS in `<style>`,
 * and base64 payloads. Everything else — prose, attributes, JSON-LD, and the
 * Next.js flight payload (which carries the page's text a second time) — is
 * scanned. SVG *text* content is deliberately left in; only the coordinate
 * attributes are removed.
 */
function maskNumericNoise(source: string): string {
  return source
    .replace(/\sd="[^"]*"/gi, " ")
    .replace(/\sviewBox="[^"]*"/gi, " ")
    .replace(/\spoints="[^"]*"/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/data:[a-z/;+-]*base64,[A-Za-z0-9+/=]+/gi, " ");
}

function countDigits(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

function reverse(value: string): string {
  return [...value].reverse().join("");
}

/**
 * Decode numeric character references, so `probe&#64;example.org` and
 * `probe&#x40;example.org` are seen as the addresses a browser renders them
 * as. Named references are deliberately left alone: nothing needs them, and
 * decoding `&amp;` would only re-create text the browser never shows.
 */
function decodeNumericEntities(value: string): string {
  return value.replace(/&#(x[0-9a-f]+|\d{1,7});/gi, (whole, code: string) => {
    const point = code[0].toLowerCase() === "x" ? Number.parseInt(code.slice(1), 16) : Number(code);
    return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
      ? String.fromCodePoint(point)
      : whole;
  });
}

/**
 * Elements that do not interrupt a word. Only these are deleted outright when
 * building the text view; every other tag becomes a space, exactly as a
 * browser's rendered text would break at a block boundary. That distinction is
 * load-bearing in BOTH directions: delete too little and the interleaving
 * evasion survives, delete too much and `</a></li><span>` boundaries glue
 * unrelated words together — which is not hypothetical, it silently welded the
 * contact block's reversed address to the nav labels either side of it and
 * produced a false positive on /profile itself.
 */
const INLINE_TAG =
  /^<\/?(?:a|abbr|b|bdi|bdo|big|cite|code|data|dfn|em|font|i|kbd|mark|nobr|q|s|samp|small|span|strong|sub|sup|time|tt|u|var|wbr)\b/i;

/**
 * The TEXT view: what the document reads as once the tags are resolved. Markup
 * interleaved through a match — `probe<span>@</span>example.org`, which a
 * `<span>` in the MDX or a stray `<wbr>` produces for free — sails straight
 * through a scan of the raw markup, because no single run of characters there
 * ever looks like an address. Collapsing the inline tags is what closes that.
 *
 * `<script>` bodies are dropped: they are not page text, and their JSON is
 * numeric soup that would only manufacture false positives. Nothing is lost —
 * the markup view still scans them verbatim, flight payload included.
 * `<style>` bodies are already gone via `maskNumericNoise`.
 */
function stripMarkup(source: string): string {
  return decodeNumericEntities(
    source
      .replace(/<script\b[\s\S]*?<\/script\s*>/gi, " ")
      .replace(/<[^>]*>/g, (tag) => (INLINE_TAG.test(tag) ? "" : " ")),
  );
}

type Finding = { view: string; kind: string; match: string };

/**
 * Scan BOTH views of the document. Neither subsumes the other: the markup view
 * is the only one that sees `href="tel:…"`, `href="mailto:…"` and every other
 * attribute; the text view is the only one that sees through tags interleaved
 * into a match. A hit from either view is a violation.
 */
function findContactData(source: string): Finding[] {
  const masked = maskNumericNoise(source);
  const findings: Finding[] = [];

  for (const [view, text] of [
    ["markup", masked],
    ["text", stripMarkup(masked)],
  ] as const) {
    for (const { label, pattern } of TELEPHONE_PATTERNS) {
      for (const hit of text.match(pattern()) ?? []) {
        if (countDigits(hit) >= MIN_TELEPHONE_DIGITS) {
          findings.push({ view, kind: `telephone (${label})`, match: hit.trim() });
        }
      }
    }

    // Forward, then reversed — the latter catches anything hidden behind the
    // same RTL trick the site's own address uses.
    for (const [direction, candidate] of [
      ["as written", text],
      ["reversed", reverse(text)],
    ] as const) {
      for (const hit of candidate.match(EMAIL_PATTERN()) ?? []) {
        if (hit.toLowerCase() !== SITE_EMAIL) {
          findings.push({ view, kind: `email (${direction})`, match: hit });
        }
      }
    }
  }

  return findings;
}

function describe(findings: Finding[]): string {
  return findings.map((f) => `[${f.view}] ${f.kind}: ${f.match}`).join("\n");
}

// ---------------------------------------------------------------------------

test.describe("/profile — composition, cross-linking, print, and contact-data hygiene", () => {
  test("composes hero, narrative, summary, experience, skills, education, contact in DOM order", async ({
    page,
  }) => {
    await page.goto(PROFILE_PATH);

    const positions = await page.evaluate(
      (selectors) => {
        const all = Array.from(document.querySelectorAll("*"));
        return selectors.map((selector) => {
          const element = document.querySelector(selector);
          return element === null ? -1 : all.indexOf(element);
        });
      },
      ORDERED_SECTIONS.map((s) => s.selector),
    );

    // Every section must exist before order means anything. R2.6/R5.4 lets a
    // collection section render nothing when empty, but the shipped content is
    // non-empty, so an absent section here is a regression, not a valid state.
    for (const [index, section] of ORDERED_SECTIONS.entries()) {
      expect(positions[index], `${section.name} (${section.selector}) must render`).toBeGreaterThan(
        -1,
      );
    }

    for (let i = 1; i < ORDERED_SECTIONS.length; i += 1) {
      expect(
        positions[i],
        `${ORDERED_SECTIONS[i].name} must follow ${ORDERED_SECTIONS[i - 1].name} in DOM order`,
      ).toBeGreaterThan(positions[i - 1]);
    }
  });

  test("a delivery cross-links to its project page instead of restating it", async ({ page }) => {
    await page.goto(PROFILE_PATH);

    // R4.1: the Rudder delivery under the CrowdStrike role carries
    // `project: rudder`, so it renders as a link to that project's page.
    const rudder = page.locator('#experience a.profile-internal-link[href="/projects/rudder"]');
    await expect(rudder).toHaveCount(1);
    await expect(rudder).toBeVisible();

    await rudder.click();

    await expect(page).toHaveURL(/\/projects\/rudder$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("print emulation suppresses the personal narrative and keeps the professional sections", async ({
    page,
  }) => {
    await page.goto(PROFILE_PATH);

    const narrative = page.locator(".profile-narrative");
    await expect(narrative).toBeVisible();

    await page.emulateMedia({ media: "print" });

    // R6.3: the PDF is strictly professional — it opens on the summary, not on
    // the personal narrative. VISIBILITY ONLY; see note 1 in the file header.
    await expect(narrative).toBeHidden();

    for (const id of ["#summary", "#experience", "#skills", "#education"]) {
      await expect(page.locator(id), `${id} must survive into print`).toBeVisible();
    }
  });

  test("the contact-data detector flags every known-bad shape and clears the known-good ones", () => {
    // POSITIVE CONTROL for the page scan below. Without it, the empty findings
    // array that test asserts proves nothing: a detector whose patterns had
    // rotted into matching *nothing at all* would pass it just as happily. The
    // page scan says "the page is clean"; this says "and the instrument that
    // measured it works". Every string below is fabricated — the numbers sit
    // in the 555-01xx range reserved for fiction, the addresses point at
    // example.org, and none of them appear anywhere in content/.
    const mustBeFlagged: Array<[label: string, sample: string]> = [
      ["international", "Reach me on +1 780 555 0134 any time."],
      ["dotted NANP", "780.555.0121"],
      ["spaced NANP", "780 555 0121"],
      ["bare 10 digits", "7805550121"],
      ["bare 11 digits", "17805550121"],
      ["seven-digit local", "555-0121"],
      ["tel: href", '<a href="tel:+17805550121">Call</a>'],
      ["mailto: href", '<a href="mailto:probe@example.org">Mail</a>'],
      ["&#64; entity", "probe&#64;example.org"],
      ["tag-split @", "probe<span>@</span>example.org"],
      ["en-dash separated (U+2013)", "780–555–0108"],
      ["reversed address", reverse("probe@example.org")],
    ];

    for (const [label, sample] of mustBeFlagged) {
      expect(findContactData(sample), `${label} must be flagged: ${sample}`).not.toEqual([]);
    }

    // ...and cuts the other way, or "flags everything" would score full marks.
    const mustNotBeFlagged: Array<[label: string, sample: string]> = [
      ["ISO date", "Shipped 2024-01-15 after review."],
      ["version number", "Bumped to 1.780.555 in the changelog."],
      ["allowlisted address", SITE_EMAIL],
      ["allowlisted address, reversed", reverse(SITE_EMAIL)],
    ];

    for (const [label, sample] of mustNotBeFlagged) {
      const findings = findContactData(sample);
      expect(findings, `${label} must not be flagged:\n${describe(findings)}`).toEqual([]);
    }
  });

  test("exposes no telephone number and no personal email in the server HTML or the hydrated DOM", async ({
    page,
    request,
  }) => {
    // (a) The server response — "page source" in the NFR's words. This is the
    // document a recruiter's "view source", a crawler, or a scraper sees, and
    // it carries the inline JSON-LD too.
    const response = await request.get(PROFILE_PATH);
    expect(response.status()).toBe(200);
    const serverHtml = await response.text();

    const serverFindings = findContactData(serverHtml);
    expect(
      serverFindings,
      `contact data in the /profile server HTML:\n${describe(serverFindings)}`,
    ).toEqual([]);

    // Non-vacuous guard: if the scan stops seeing the one address that IS
    // permitted, the patterns have drifted and the empty result above means
    // nothing. The address is rendered reversed by `<ObfuscatedEmail>`.
    expect(serverHtml, "the site's own obfuscated address must still be present").toContain(
      reverse(SITE_EMAIL),
    );

    // (b) The hydrated DOM — client components may write text the server HTML
    // does not contain.
    await page.goto(PROFILE_PATH);
    await page.waitForLoadState("networkidle");
    const hydratedHtml = await page.evaluate(() => document.documentElement.outerHTML);

    const hydratedFindings = findContactData(hydratedHtml);
    expect(
      hydratedFindings,
      `contact data in the /profile hydrated DOM:\n${describe(hydratedFindings)}`,
    ).toEqual([]);
  });
});
