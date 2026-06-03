import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

// Build-flavor coupling (per design Component 9 v4 / Testing Strategy E2E):
// derive the expected card count from `.velite/projects.json` (NOT hard-coded).
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
};

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

test.describe("projects gallery", () => {
  test.beforeAll(() => {
    if (process.env.CI !== "true" && !fs.existsSync(VELITE_PROJECTS_PATH)) {
      test.skip(true, "`.velite/projects.json` missing locally; run `pnpm build` first.");
    }
  });

  test("renders the expected published cards", async ({ page }) => {
    const expected = expectedPublishedProjects();
    test.skip(
      expected.length === 0,
      "No published projects under this build flavor; see empty-state test.",
    );

    await page.goto("/projects");

    const cards = page.locator('ul[aria-label="Project gallery"] > li');
    await expect(cards).toHaveCount(expected.length);

    // Reverse-chronological order: assert titles appear in the same order as
    // the filtered+sorted velite list.
    const renderedTitles = await cards.locator("h3").allInnerTexts();
    expect(renderedTitles).toEqual(expected.map((p) => p.title));
  });

  test("eager-loads the top-2 covers and lazy-loads the rest", async ({ page }) => {
    const expected = expectedPublishedProjects();
    test.skip(expected.length === 0, "No published projects under this build flavor.");

    await page.goto("/projects");

    const cards = page.locator('ul[aria-label="Project gallery"] > li');
    await expect(cards).toHaveCount(expected.length);

    const expectedEager = Math.min(2, expected.length);

    // Assert the first N covers eager-load (`loading="eager"` OR no `loading`
    // attribute — Next/Image emits `priority` cards without a `loading` attr;
    // both states satisfy the "not lazy" eager contract). To make the
    // assertion robust against either rendering, we check that the first N
    // covers do NOT have loading="lazy", and the rest DO have loading="lazy".
    for (let i = 0; i < expected.length; i++) {
      const img = cards.nth(i).locator("img").first();
      const loading = await img.getAttribute("loading");
      if (i < expectedEager) {
        expect(loading, `card ${i} (eager slot) must not be lazy`).not.toBe("lazy");
      } else {
        expect(loading, `card ${i} (lazy slot) must be loading="lazy"`).toBe("lazy");
      }
    }
  });

  test("each card link's accessible name is its project title via aria-labelledby → <h3 id>", async ({
    page,
  }) => {
    const expected = expectedPublishedProjects();
    test.skip(expected.length === 0, "No published projects under this build flavor.");

    await page.goto("/projects");

    const cards = page.locator('ul[aria-label="Project gallery"] > li');
    await expect(cards).toHaveCount(expected.length);

    for (let i = 0; i < expected.length; i++) {
      const card = cards.nth(i);
      const link = card.locator("a[aria-labelledby]").first();
      const labelledBy = await link.getAttribute("aria-labelledby");
      expect(labelledBy, `card ${i} link must have aria-labelledby`).not.toBeNull();
      const heading = card.locator(`h3#${labelledBy}`);
      await expect(heading).toHaveCount(1);
      const headingText = (await heading.innerText()).trim();
      expect(headingText).toBe(expected[i].title);
    }
  });
});

test.describe("projects gallery — empty state", () => {
  test.beforeAll(() => {
    if (process.env.CI !== "true" && !fs.existsSync(VELITE_PROJECTS_PATH)) {
      test.skip(true, "`.velite/projects.json` missing locally; run `pnpm build` first.");
    }
  });

  test("renders the empty-state copy when no projects are published", async ({ page }) => {
    const expected = expectedPublishedProjects();
    test.skip(
      expected.length !== 0,
      "Build flavor publishes projects; empty-state branch only exercises against an empty published set.",
    );

    await page.goto("/projects");

    // Empty-state asserted by selector + visible text (per task restriction).
    await expect(page.getByText("No projects published yet.")).toBeVisible();
    await expect(page.locator('ul[aria-label="Project gallery"] > li')).toHaveCount(0);
  });
});
