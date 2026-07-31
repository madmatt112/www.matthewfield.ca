// @vitest-environment node
// Pure schema-validation tests have no DOM needs, and running under jsdom
// breaks esbuild's `new TextEncoder().encode("") instanceof Uint8Array`
// invariant when velite is imported (see content-schema-primitives.test.ts).
//
// reading-schema.test.ts — the loader-side schema is the sync validation gate
// for content/reading.yaml. The collection-side schema is NOT unit-tested here
// because s.image() is an async transform that needs Velite's file context; its
// behavior is covered by the real `velite build`.
import { describe, expect, it } from "vitest";

import { readingLoaderSchema } from "./reading-schema";

const VALID = {
  title: "Do I Stay Christian?",
  author: "Brian D. McLaren",
  started: "2026-07-31",
  cover: "./reading/do-i-stay-christian.jpg",
};

describe("readingLoaderSchema", () => {
  it("accepts a well-formed entry", () => {
    expect(readingLoaderSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a calendar-invalid started date", () => {
    expect(readingLoaderSchema.safeParse({ ...VALID, started: "2026-02-30" }).success).toBe(false);
  });

  it("rejects a non-ISO started date", () => {
    expect(readingLoaderSchema.safeParse({ ...VALID, started: "Jul 31, 2026" }).success).toBe(
      false,
    );
  });

  it("rejects a future started date", () => {
    expect(readingLoaderSchema.safeParse({ ...VALID, started: "2099-01-01" }).success).toBe(false);
  });

  it("rejects unknown keys so typos fail the build instead of being dropped", () => {
    expect(readingLoaderSchema.safeParse({ ...VALID, rating: 5 }).success).toBe(false);
  });

  it("rejects a whitespace-only title", () => {
    expect(readingLoaderSchema.safeParse({ ...VALID, title: "   " }).success).toBe(false);
  });

  it("requires a cover path", () => {
    const withoutCover = { title: VALID.title, author: VALID.author, started: VALID.started };
    expect(readingLoaderSchema.safeParse(withoutCover).success).toBe(false);
  });

  it("parses cover as a plain string — s.image() would throw on the sync path", () => {
    const result = readingLoaderSchema.safeParse(VALID);
    expect(result.success).toBe(true);
    expect(result.data?.cover).toBe("./reading/do-i-stay-christian.jpg");
  });
});
