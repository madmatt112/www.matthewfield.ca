// page.test.tsx — the three render branches of /contributions (Reqs 3.7, 3.8,
// 3.9, 6.1, 11.7, 11.10).
//
// This test exists because Req 3.7's ordering — "load bearing for Req 5, not a
// layout preference" — has no other unit-level guard. It lives under src/app/
// following `src/app/feed.xml/parity.test.ts` and
// `src/app/(playground)/playground/manifest-integrity.test.ts`, and vitest picks
// it up through `include: ["src/**/*.test.{ts,tsx,mjs}"]`.
//
// The `vi.mock("#site/content", …)` holder pattern is contributions.test.ts's
// (see contributions.test.ts:10-18). `getActivityWindow` is mocked rather than
// driven through a synthetic collection so the three branches are selected
// directly: the page owns both gates, and this file is a test of the gates, not
// of the derivation (github-activity.test.ts owns that).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import type { ActivityWindow, Cell, Level, MonthTotal } from "@/lib/github-activity";

const mocks = vi.hoisted(() => ({
  contributions: [] as Array<Record<string, unknown>>,
  activityWindow: null as ActivityWindow | null,
}));

vi.mock("#site/content", () => ({
  get contributions() {
    return mocks.contributions;
  },
}));

vi.mock("@/lib/github-activity", () => ({
  getActivityWindow: () => mocks.activityWindow,
}));

// Imported AFTER the mocks so the page resolves both to the mocked modules.
import ContributionsPage, { dynamic } from "./page";

const GRID_COLUMNS = 26;
const GRID_ROWS = 7;
const DAY_MS = 86_400_000;

/** 2026-02-08 is a Sunday and 2026-08-08 the Saturday 181 days later, so the 182 days chunk into 26 whole columns. */
const WINDOW_START = "2026-02-08";
const WINDOW_END = "2026-08-08";

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * A fully covered window. The figures are arbitrary — nothing here asserts on
 * them; the component's own test owns the graphic's contents.
 */
function buildActivityWindow(): ActivityWindow {
  const cells: Cell[] = [];
  for (let offset = 0; offset < GRID_COLUMNS * GRID_ROWS; offset += 1) {
    cells.push({ date: addDays(WINDOW_START, offset), count: 1, level: 1, hasData: true });
  }

  const grid: Cell[][] = [];
  for (let column = 0; column < GRID_COLUMNS; column += 1) {
    grid.push(cells.slice(column * GRID_ROWS, column * GRID_ROWS + GRID_ROWS));
  }

  const monthlyTotals: MonthTotal[] = [...new Set(cells.map((cell) => cell.date.slice(0, 7)))].map(
    (month) => {
      const monthCells = cells.filter((cell) => cell.date.startsWith(month));
      return {
        month,
        total: monthCells.length,
        activeDays: monthCells.length,
        isClipped: false,
        rangeStart: monthCells[0].date,
        rangeEnd: monthCells[monthCells.length - 1].date,
      };
    },
  );

  return {
    anchorDate: WINDOW_END,
    dataStart: WINDOW_START,
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
    publishedRangeStart: WINDOW_START,
    publishedRangeEnd: WINDOW_END,
    grid,
    totalContributions: cells.length,
    activeDays: cells.length,
    levelsPresent: new Set<Level>([1]),
    monthlyTotals,
    thresholds: null,
  };
}

function synthContribution(title: string): Record<string, unknown> {
  return {
    repo: "octo/example",
    repoUrl: "https://example.com/repo",
    title,
    description: "A synthetic entry — only enough shape for ContributionCard to render.",
    date: "2026-01-15",
    links: [{ kind: "pr", url: "https://example.com/pr" }],
  };
}

/** The heatmap's own wrapper (Req 6.3); the empty-state branch is also a <section>. */
const HEATMAP = 'section[data-pagefind-ignore="all"]';

describe("ContributionsPage", () => {
  afterEach(() => {
    cleanup();
    mocks.contributions = [];
    mocks.activityWindow = null;
  });

  it("stays force-static (Req 6.1) with no revalidate/ISR (Req 6.2)", () => {
    expect(dynamic).toBe("force-static");
  });

  it("renders the heatmap section AFTER the contributions card grid (Req 3.7)", () => {
    mocks.contributions = [synthContribution("Fix a flaky integration test")];
    mocks.activityWindow = buildActivityWindow();

    const { container } = render(<ContributionsPage />);

    // Both nodes are direct children of <main>, so document order over
    // `main > *` IS sibling order, and this asserts presence and ordering
    // together. The child combinator is load-bearing: a section nested INSIDE
    // the <ul> also comes "after" the grid in plain document order, which is
    // not the ordering Req 3.7 asks for.
    const siblings = [
      ...container.querySelectorAll(`main > ul.contributions-grid, main > ${HEATMAP}`),
    ];
    expect(siblings.map((node) => node.tagName)).toEqual(["UL", "SECTION"]);

    // Optional chaining rather than `siblings[1].querySelector(…)` so a missing
    // section fails as an assertion instead of throwing a TypeError.
    expect(siblings[1]?.querySelector("#github-activity-heading")?.textContent).toBe(
      "GitHub activity",
    );
  });

  it("renders no section at all when getActivityWindow() returns null (Reqs 3.8, 11.7)", () => {
    mocks.contributions = [synthContribution("Fix a flaky integration test")];
    mocks.activityWindow = null;

    const { container } = render(<ContributionsPage />);

    expect(container.querySelector("ul.contributions-grid")).not.toBeNull();
    expect(container.querySelector(HEATMAP)).toBeNull();
    expect(container.querySelector("#github-activity-heading")).toBeNull();
  });

  it("suppresses the heatmap when the contributions collection is empty (Reqs 3.9, 11.10)", () => {
    mocks.contributions = [];
    mocks.activityWindow = buildActivityWindow();

    const { container } = render(<ContributionsPage />);

    expect(container.querySelector("#empty-state-heading")?.textContent).toBe(
      "No contributions yet",
    );
    expect(container.querySelector(HEATMAP)).toBeNull();
  });
});
