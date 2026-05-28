import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

// Empirical verification of the anchored-escape CSS math (Component 10 v4):
// load the fixture-placeholder detail page at a viewport above the `lg`
// breakpoint and measure the rendered bounding boxes of the narrow `<p>`,
// the wide `<img>` inside `.prose`, and the outer `<h1>`.
//
// Skip-if-absent escape (v2 — closes r1 Target 4): locally, skip the suite
// when `.velite/projects.json` is missing so developers without a build
// artefact aren't blocked. In CI the file must exist (Task 19.5 pretest gate
// fail-louds first; this is a second tripwire).
//
// Build-flavor coupling: the fixture used here (`fixture-placeholder`) is a
// draft, so it only resolves under Build 1 (`PROJECTS_INCLUDE_DRAFTS=1`).
// Under Build 2 the page would 404; skip in that flavor.

const VELITE_PROJECTS_PATH = path.join(process.cwd(), ".velite/projects.json");

type VeliteProject = {
  title: string;
  slug: string;
  date: string;
  draft?: boolean;
  coverAlt: string;
  links?: unknown[];
};

function readVeliteProjects(): VeliteProject[] {
  const raw = fs.readFileSync(VELITE_PROJECTS_PATH, "utf8");
  return JSON.parse(raw) as VeliteProject[];
}

function findFixturePlaceholder(): VeliteProject | undefined {
  return readVeliteProjects().find((p) => p.slug === "fixture-placeholder");
}

const VIEWPORT = { width: 1280, height: 720 } as const;
// At 1280 viewport, the page wrapper is `max-w-5xl px-4` (see
// src/app/(site)/projects/[slug]/page.tsx). The h1 sits inside that wrapper,
// so its content box = 1024 − 2*16 (px-4) = 992px.
// The wide <img> uses anchored-escape CSS (`position: relative;
// transform: translateX(-50%); width: min(64rem, 100vw - 2rem)`) that escapes
// the px-4 wrapper, so its measured width is the full 1024px at this viewport.
const EXPECTED_IMG_WIDTH = 1024;
const EXPECTED_H1_WIDTH = 992;
const PROSE_MAX_WIDTH = 700; // Tailwind `max-w-prose` ~ 65ch ≈ 700px (tolerance below)
const PROSE_TOLERANCE = 20;
const OTHER_TOLERANCE = 10;

test.describe("projects detail page — layout measurement", () => {
  test.use({ viewport: VIEWPORT });

  test.beforeAll(() => {
    if (process.env.CI !== "true" && !fs.existsSync(VELITE_PROJECTS_PATH)) {
      test.skip(true, "`.velite/projects.json` missing locally; run `pnpm build` first.");
    }
  });

  test("wide-media escape math and a11y contracts hold at 1280×720", async ({ page }) => {
    const fixture = findFixturePlaceholder();
    test.skip(
      fixture === undefined,
      "fixture-placeholder absent from .velite/projects.json under this build flavor.",
    );
    test.skip(
      fixture?.draft === true && process.env.PROJECTS_INCLUDE_DRAFTS !== "1",
      "fixture-placeholder is draft; only resolves under Build 1 (PROJECTS_INCLUDE_DRAFTS=1).",
    );

    const project = fixture as VeliteProject;
    const response = await page.goto(`/projects/${project.slug}`);
    expect(response?.status(), "fixture detail page must load 200").toBe(200);

    // Title-<h1> accessibility: text equals project.title.
    const h1 = page.locator("article > header h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(project.title);

    // Cover <img> alt equals project.coverAlt. Locate by alt attribute rather
    // than DOM position to stay resilient to Next/Image wrapper changes.
    const cover = page.locator(`img[alt="${project.coverAlt}"]`).first();
    await expect(cover).toHaveCount(1);

    // Link rail renders only when present (Req 6.1). The fixture has no
    // `links` frontmatter, so the rail must NOT render.
    const hasLinks = Array.isArray(project.links) && project.links.length > 0;
    const linkRail = page.locator('nav[aria-label="Project links"]');
    if (hasLinks) {
      await expect(linkRail).toHaveCount(1);
    } else {
      await expect(linkRail).toHaveCount(0);
    }

    // Measure rendered <h1> width: ±10px of inner content width (992px after px-4).
    const h1Box = await h1.boundingBox();
    expect(h1Box, "h1 must have a bounding box").not.toBeNull();
    expect(
      Math.abs((h1Box?.width ?? 0) - EXPECTED_H1_WIDTH),
      `h1 width ${h1Box?.width} should be within ±${OTHER_TOLERANCE}px of ${EXPECTED_H1_WIDTH}`,
    ).toBeLessThanOrEqual(OTHER_TOLERANCE);

    // Measure rendered narrow <p> width inside `.prose`: ≤ ~700px ±20px.
    // Per Task 19's fixture spec, fixture-placeholder's first prose <p> sits
    // in section one (the narrow section before the wide-media block), so
    // `.first()` is the narrow paragraph we want to measure here.
    const proseParagraph = page.locator("article .prose p").first();
    await expect(proseParagraph).toHaveCount(1);
    const pBox = await proseParagraph.boundingBox();
    expect(pBox, "prose <p> must have a bounding box").not.toBeNull();
    expect(
      pBox?.width ?? Number.POSITIVE_INFINITY,
      `prose <p> width ${pBox?.width} should be ≤ ${PROSE_MAX_WIDTH + PROSE_TOLERANCE}px`,
    ).toBeLessThanOrEqual(PROSE_MAX_WIDTH + PROSE_TOLERANCE);

    // Measure rendered wide <img> width inside `.prose`: ±10px of 1024px.
    const wideImg = page.locator("article .prose img").first();
    await expect(wideImg).toHaveCount(1);
    const imgBox = await wideImg.boundingBox();
    expect(imgBox, "wide <img> must have a bounding box").not.toBeNull();
    expect(
      Math.abs((imgBox?.width ?? 0) - EXPECTED_IMG_WIDTH),
      `wide <img> width ${imgBox?.width} should be within ±${OTHER_TOLERANCE}px of ${EXPECTED_IMG_WIDTH}`,
    ).toBeLessThanOrEqual(OTHER_TOLERANCE);
  });
});
