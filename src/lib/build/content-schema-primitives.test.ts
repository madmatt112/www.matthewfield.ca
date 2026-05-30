// @vitest-environment node
// Pure schema-validation tests have no DOM needs, and running under jsdom
// breaks esbuild's `new TextEncoder().encode("") instanceof Uint8Array`
// invariant (velite's runtime pulls in esbuild). Node env keeps it green.
import { describe, expect, it } from "vitest";
import { s } from "velite";
import {
  BUILD_START_UTC,
  httpUrl,
  isoDate,
  trimmed,
  uniqueByKind,
} from "./content-schema-primitives";

describe("BUILD_START_UTC", () => {
  it("is a number captured at module load", () => {
    expect(typeof BUILD_START_UTC).toBe("number");
    expect(BUILD_START_UTC).toBeLessThanOrEqual(Date.now());
  });
});

describe("isoDate()", () => {
  const schema = isoDate();

  // Each bad date MUST produce a normal aborted ZodIssue, never a thrown
  // RangeError. safeParse() returns a result; if any of these threw, the
  // expect(() => ...).not.toThrow() guard would fail.
  const invalidDates = [
    "2026-02-30", // Feb never has 30 days
    "2026-04-31", // April has 30 days
    "2026-02-29", // 2026 is not a leap year
    "2026-13-45", // month 13 / day 45
    "2026-00-10", // month 00
  ];

  for (const value of invalidDates) {
    it(`rejects ${value} without throwing a RangeError`, () => {
      let result: ReturnType<typeof schema.safeParse> | undefined;
      expect(() => {
        result = schema.safeParse(value);
      }).not.toThrow();
      expect(result?.success).toBe(false);
    });
  }

  it("rejects a shape-valid-but-unparseable date without throwing", () => {
    // Shape matches the regex but is not a real date.
    let result: ReturnType<typeof schema.safeParse> | undefined;
    expect(() => {
      result = schema.safeParse("9999-99-99");
    }).not.toThrow();
    expect(result?.success).toBe(false);
  });

  it("accepts 2026-05-28 and stores it verbatim", () => {
    const result = schema.safeParse("2026-05-28");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("2026-05-28");
    }
  });
});

describe("httpUrl()", () => {
  const schema = httpUrl();

  it.each(["mailto:foo@example.com", "javascript:alert(1)", "file:///etc/passwd"])(
    "rejects %s",
    (value) => {
      expect(schema.safeParse(value).success).toBe(false);
    },
  );

  it("accepts an https: URL", () => {
    const result = schema.safeParse("https://example.com/path");
    expect(result.success).toBe(true);
  });

  it("accepts an http: URL", () => {
    expect(schema.safeParse("http://example.com").success).toBe(true);
  });
});

describe("trimmed()", () => {
  it("applies bounds post-trim", () => {
    const schema = trimmed(3, 5);
    // "  abc  " trims to "abc" (len 3) → passes
    const ok = schema.safeParse("  abc  ");
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data).toBe("abc");
    }
    // "  ab  " trims to "ab" (len 2) → fails min
    expect(schema.safeParse("  ab  ").success).toBe(false);
  });

  it("rejects a whitespace-only string", () => {
    const schema = trimmed(1, 10);
    expect(schema.safeParse("    ").success).toBe(false);
  });
});

describe("uniqueByKind", () => {
  const linkSchema = s.object({ kind: s.string() });
  const schema = s.array(linkSchema).superRefine(uniqueByKind);

  it("accepts links with distinct kinds", () => {
    const result = schema.safeParse([{ kind: "pr" }, { kind: "commit" }]);
    expect(result.success).toBe(true);
  });

  it("rejects links sharing a kind", () => {
    const result = schema.safeParse([{ kind: "pr" }, { kind: "pr" }]);
    expect(result.success).toBe(false);
  });
});
