import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

// Functional draft-handling contract end-to-end (Req 7.1, 7.2, 8.3).
// Parameterized on `process.env.PROJECTS_INCLUDE_DRAFTS`:
//   - Build 1 (PROJECTS_INCLUDE_DRAFTS=1): drafts resolve as 200 and appear in
//     gallery + sitemap.
//   - Build 2 (unset): drafts 404, are absent from gallery and sitemap, while
//     published projects remain present.
//
// Skip-if-absent escape (v2 — closes r1 Target 4): in CI the absent file
// surfaces as a loud failure (Task 19.5's pretest gate is the primary
// fail-loud; this is a second tripwire). Locally, skip so developers without
// a build artifact aren't blocked.

const VELITE_PROJECTS_PATH = path.join(process.cwd(), ".velite/projects.json");

const DRAFT_SLUG = "fixture-placeholder";
const PUBLISHED_SLUG = "fixture-published-second";

test.describe("projects draft handling", () => {
  test.beforeAll(() => {
    if (process.env.CI !== "true" && !fs.existsSync(VELITE_PROJECTS_PATH)) {
      test.skip(true, "`.velite/projects.json` missing locally; run `pnpm build` first.");
    }
  });

  test("draft-handling contract matches build flavor", async ({ page, request }) => {
    const includeDrafts = process.env.PROJECTS_INCLUDE_DRAFTS === "1";

    if (includeDrafts) {
      // Build 1: drafts included.

      // Draft detail page resolves 200.
      const draftResponse = await page.goto(`/projects/${DRAFT_SLUG}`);
      expect(
        draftResponse?.status(),
        `/projects/${DRAFT_SLUG} must return 200 under PROJECTS_INCLUDE_DRAFTS=1`,
      ).toBe(200);

      // Draft card visible on gallery.
      await page.goto("/projects");
      const draftCard = page.locator(`ul > li a[href="/projects/${DRAFT_SLUG}"]`);
      await expect(draftCard).toHaveCount(1);

      // Sitemap contains BOTH fixture entries.
      const sitemap = await request.get("/sitemap.xml");
      expect(sitemap.status(), "/sitemap.xml must return 200").toBe(200);
      const body = await sitemap.text();
      expect(
        body.includes(`/projects/${DRAFT_SLUG}`),
        `sitemap must contain /projects/${DRAFT_SLUG} under PROJECTS_INCLUDE_DRAFTS=1`,
      ).toBe(true);
      expect(
        body.includes(`/projects/${PUBLISHED_SLUG}`),
        `sitemap must contain /projects/${PUBLISHED_SLUG} under PROJECTS_INCLUDE_DRAFTS=1`,
      ).toBe(true);
    } else {
      // Build 2: drafts excluded.

      // Draft detail page 404s (assert via response status, not text).
      const draftResponse = await page.goto(`/projects/${DRAFT_SLUG}`);
      expect(
        draftResponse?.status(),
        `/projects/${DRAFT_SLUG} must return 404 when PROJECTS_INCLUDE_DRAFTS is unset`,
      ).toBe(404);

      // Published fixture resolves 200.
      const publishedResponse = await page.goto(`/projects/${PUBLISHED_SLUG}`);
      expect(
        publishedResponse?.status(),
        `/projects/${PUBLISHED_SLUG} must return 200 when PROJECTS_INCLUDE_DRAFTS is unset`,
      ).toBe(200);

      // Gallery: draft card absent, published card present.
      await page.goto("/projects");
      const draftCard = page.locator(`ul > li a[href="/projects/${DRAFT_SLUG}"]`);
      await expect(draftCard).toHaveCount(0);
      const publishedCard = page.locator(`ul > li a[href="/projects/${PUBLISHED_SLUG}"]`);
      await expect(publishedCard).toHaveCount(1);

      // Sitemap positive + negative assertions in the same block.
      const sitemap = await request.get("/sitemap.xml");
      expect(sitemap.status(), "/sitemap.xml must return 200").toBe(200);
      const body = await sitemap.text();
      // POSITIVE: published fixture present (catches sitemap-generator regressions
      // that drop the entire /projects/* subtree).
      expect(
        body.includes(`/projects/${PUBLISHED_SLUG}`),
        `sitemap must contain /projects/${PUBLISHED_SLUG} when PROJECTS_INCLUDE_DRAFTS is unset`,
      ).toBe(true);
      // NEGATIVE: draft fixture absent.
      expect(
        body.includes(`/projects/${DRAFT_SLUG}`),
        `sitemap must NOT contain /projects/${DRAFT_SLUG} when PROJECTS_INCLUDE_DRAFTS is unset`,
      ).toBe(false);
    }
  });
});
