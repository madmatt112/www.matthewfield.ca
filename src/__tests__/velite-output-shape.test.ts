import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { projects } from "#site/content";

/**
 * Velite output-shape regression test (Task 9 / Component 17 v4 — upgrade gate).
 *
 * Pins the shape that velite's `s.image()` and `s.mdx()` emit for the
 * `projects` collection so an unintentional velite upgrade that mutates either
 * shape surfaces at CI time. Paired with Task 1's exact-patch pin
 * (`"velite": "0.3.1"`); together they constitute the upgrade gate documented
 * in §9 of the author doc.
 *
 * Skip-if-absent escape (v3 — closes r2 Target 3):
 *   - Locally (`process.env.CI !== "true"`), if `.velite/projects.json` is
 *     missing, skip the suite cleanly so contributors who haven't run
 *     `pnpm velite build` aren't blocked.
 *   - Under CI (`process.env.CI === "true"`), the in-test absence-check is a
 *     second tripwire: Task 19.5's pretest gate runs first and would have
 *     already failed, but if it somehow didn't, this test errors loud so the
 *     suite fails instead of silently skipping.
 *
 * Fixture-shape assertions iterate `projects` and exercise the per-entry
 * pins when at least one project entry is present. When the collection is
 * empty (Task 19 fixtures not yet landed), the collection-shape assertion
 * still runs; the per-entry assertions naturally become no-ops and start
 * exercising fixtures as soon as Task 19 lands them.
 */

const veliteManifestPath = path.join(process.cwd(), ".velite", "projects.json");
const manifestExists = fs.existsSync(veliteManifestPath);
const isCI = process.env.CI === "true";

if (!manifestExists && !isCI) {
  test.skip("velite output-shape regression (local: .velite/projects.json absent — run `pnpm velite build`)", () => {});
} else {
  describe("velite output-shape regression (projects collection)", () => {
    test("CI tripwire: .velite/projects.json must exist under CI", () => {
      // Under CI, Task 19.5's pretest gate runs first and would have already
      // failed if the manifest were missing. This in-test check is a second
      // tripwire that fails the suite loudly instead of silently skipping.
      expect(manifestExists).toBe(true);
    });

    test("projects collection is an array", () => {
      expect(Array.isArray(projects)).toBe(true);
    });

    test("each project entry pins the velite s.image() + s.mdx() output shape", () => {
      // When the fixture from Task 19 is not yet present, `projects` is empty
      // and this loop is a no-op; once Task 19 lands fixtures, every entry
      // is automatically exercised against the same pins.
      for (const project of projects) {
        // Top-level fields produced by the transform pipeline.
        expect(typeof project.slug).toBe("string");
        expect(typeof project.body).toBe("string");
        expect(typeof project.draft).toBe("boolean");

        // s.image() output shape — cover is required by the schema.
        expect(project.cover).toBeDefined();
        expect(typeof project.cover.src).toBe("string");
        expect(typeof project.cover.width).toBe("number");
        expect(typeof project.cover.height).toBe("number");
        expect(Number.isFinite(project.cover.width)).toBe(true);
        expect(Number.isFinite(project.cover.height)).toBe(true);

        // blurDataURL is optional on velite's Image type; when present it
        // must be a data: URL.
        if (project.cover.blurDataURL !== undefined) {
          expect(typeof project.cover.blurDataURL).toBe("string");
          expect(project.cover.blurDataURL.startsWith("data:")).toBe(true);
        }
      }
    });
  });
}
