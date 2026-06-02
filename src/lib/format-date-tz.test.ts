// TZ-pinned regression guard: must set TZ before the dynamic import so the
// Intl.DateTimeFormat in format-date.ts constructs under America/Toronto.
// Per-file vitest isolation gives a clean module registry.
process.env.TZ = "America/Toronto";

import { describe, expect, it } from "vitest";

describe("formatContentDate — UTC pin regression guard", () => {
  it("ISO datetime midnight UTC renders as May 29, not May 28 under America/Toronto", async () => {
    const { formatContentDate } = await import("@/lib/format-date");
    const result = formatContentDate("2026-05-29T00:00:00.000Z");
    expect(result.display).toBe("May 29, 2026");
  });

  it("date-only string 2026-05-29 renders as May 29, 2026", async () => {
    const { formatContentDate } = await import("@/lib/format-date");
    const result = formatContentDate("2026-05-29");
    expect(result.display).toBe("May 29, 2026");
  });
});
