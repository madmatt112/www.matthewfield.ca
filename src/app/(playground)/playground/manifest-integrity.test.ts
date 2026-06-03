import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { playgroundItems, landingParams, embedParams } from "#playground/manifest";

/**
 * Manifest↔route integrity test (Task 11, Req 10.1).
 *
 * Imports the manifest ONLY (never a route page.tsx) so it never pulls in
 * next/dynamic or next/navigation. Fails CI on slug drift or a missing item
 * module before a route collision or unbuildable import ships. The
 * missing-`embed/`-dir case stays with `next build` + E2E.
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe("playground manifest integrity", () => {
  const slugs = playgroundItems.map((it) => it.slug);

  test("every slug is unique", () => {
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  for (const item of playgroundItems) {
    test(`slug "${item.slug}" is kebab-case`, () => {
      expect(item.slug).toMatch(SLUG_PATTERN);
    });
  }

  test("landingParams covers all slugs", () => {
    expect(landingParams(playgroundItems)).toEqual(slugs.map((slug) => ({ slug })));
  });

  test("embedParams is exactly the iframeIsolated slugs", () => {
    const expected = playgroundItems
      .filter((it) => it.iframeIsolated)
      .map((it) => ({ slug: it.slug }));
    expect(embedParams(playgroundItems)).toEqual(expected);
  });

  for (const item of playgroundItems) {
    test(`item module exists for "${item.slug}"`, () => {
      const modulePath = path.join(process.cwd(), "playground", item.slug, "index.tsx");
      expect(fs.existsSync(modulePath)).toBe(true);
    });
  }
});
