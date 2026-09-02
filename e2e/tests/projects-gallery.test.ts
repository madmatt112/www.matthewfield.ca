import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

// Build-flavor coupling (per design Component 9 v4 / Testing Strategy E2E):
// derive the expected projects from `.velite/projects.json` (NOT hard-coded).
// Filter by `!p.draft` unless PROJECTS_INCLUDE_DRAFTS=1. The dual-build CI runs
// both flavors; this test process inherits the env-var the build was made with.
//
// Skip-if-absent escape (v3 — gated on local-only): in CI, the absent file
// must surface as a loud failure (Task 19.5's pretest gate is the primary
// fail-loud; this is a second tripwire). Locally, skip so developers without
// a build artifact aren't blocked.

const VELITE_PROJECTS_PATH = path.join(process.cwd(), ".velite/projects.json");

type VeliteProject = {
  title: string;
  slug: string;
  date: string;
  draft?: boolean;
  featured?: boolean;
  links?: unknown[];
};

const LEAD = 'section[aria-labelledby="featured-heading"]';
const ROWS = 'section[aria-label="More projects"] > ul > li';

function readVeliteProjects(): VeliteProject[] {
  const raw = fs.readFileSync(VELITE_PROJECTS_PATH, "utf8");
  return JSON.parse(raw) as VeliteProject[];
}

function expectedPublishedProjects(): VeliteProject[] {
  const all = readVeliteProjects();
  const includeDrafts = process.env.PROJECTS_INCLUDE_DRAFTS === "1";
  const filtered = includeDrafts ? all : all.filter((p) => !p.draft);
  // Reverse-chronological: date desc, slug asc tiebreak (mirrors src/lib/projects.ts).
  return [...filtered].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
}

// Mirrors the page: the lead is the newest featured project, else the newest
// project; everything else is a ledger row in the same order.
function expectedLayout(): { lead: VeliteProject; rest: VeliteProject[] } | null {
  const published = expectedPublishedProjects();
  if (published.length === 0) return null;
  const lead = published.find((p) => p.featured) ?? published[0];
  return { lead, rest: published.filter((p) => p !== lead) };
}

test.describe("projects index", () => {
  test.beforeAll(() => {
    if (process.env.CI !== "true" && !fs.existsSync(VELITE_PROJECTS_PATH)) {
      test.skip(true, "`.velite/projects.json` missing locally; run `pnpm build` first.");
    }
  });

  test("leads with the featured project, then the rest in reverse-chronological order", async ({
    page,
  }) => {
    const layout = expectedLayout();
    test.skip(
      layout === null,
      "No published projects under this build flavor; see empty-state test.",
    );
    if (layout === null) return;

    await page.goto("/projects");

    await expect(page.locator(LEAD)).toHaveCount(1);
    await expect(page.locator(ROWS)).toHaveCount(layout.rest.length);

    const renderedTitles = await page.locator(`${LEAD} h2, ${ROWS} h2`).allInnerTexts();
    expect(renderedTitles.map((t) => t.trim())).toEqual(
      [layout.lead, ...layout.rest].map((p) => p.title),
    );
  });

  test("every title links to its detail page", async ({ page }) => {
    const layout = expectedLayout();
    test.skip(layout === null, "No published projects under this build flavor.");
    if (layout === null) return;

    await page.goto("/projects");

    const ordered = [layout.lead, ...layout.rest];
    const headings = page.locator(`${LEAD} h2, ${ROWS} h2`);
    await expect(headings).toHaveCount(ordered.length);
    for (let i = 0; i < ordered.length; i++) {
      const link = headings.nth(i).locator("a");
      await expect(link, `title ${i} must link to its detail page`).toHaveAttribute(
        "href",
        `/projects/${ordered[i].slug}`,
      );
    }
  });

  test("eager-loads the lead image; rows show a lazy thumbnail only when the project has links", async ({
    page,
  }) => {
    const layout = expectedLayout();
    test.skip(layout === null, "No published projects under this build flavor.");
    if (layout === null) return;

    await page.goto("/projects");

    // Next/Image emits `priority` images without a `loading` attribute, so the
    // eager contract is "not lazy" rather than a literal loading="eager".
    const leadImg = page.locator(`${LEAD} img`).first();
    await expect(leadImg).toHaveCount(1);
    expect(await leadImg.getAttribute("loading"), "lead image must not be lazy").not.toBe("lazy");

    const rows = page.locator(ROWS);
    await expect(rows).toHaveCount(layout.rest.length);
    for (let i = 0; i < layout.rest.length; i++) {
      const img = rows.nth(i).locator("img");
      if ((layout.rest[i].links?.length ?? 0) > 0) {
        await expect(img, `row ${i} has links, so it shows a thumbnail`).toHaveCount(1);
        await expect(img).toHaveAttribute("loading", "lazy");
      } else {
        await expect(img, `row ${i} has no links, so it shows no image`).toHaveCount(0);
      }
    }
  });
});

test.describe("projects index — empty state", () => {
  test.beforeAll(() => {
    if (process.env.CI !== "true" && !fs.existsSync(VELITE_PROJECTS_PATH)) {
      test.skip(true, "`.velite/projects.json` missing locally; run `pnpm build` first.");
    }
  });

  test("renders the empty-state copy when no projects are published", async ({ page }) => {
    const layout = expectedLayout();
    test.skip(
      layout !== null,
      "Build flavor publishes projects; empty-state branch only exercises against an empty published set.",
    );

    await page.goto("/projects");

    // Empty-state asserted by selector + visible text (per task restriction).
    await expect(page.getByText("No projects published yet.")).toBeVisible();
    await expect(page.locator(LEAD)).toHaveCount(0);
    await expect(page.locator(ROWS)).toHaveCount(0);
  });
});
