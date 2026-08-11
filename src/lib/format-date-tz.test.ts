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

describe("formatMonthAbbrev / formatDateRange — UTC pin regression guard", () => {
  it("does not shift a first-of-month date back a month under America/Toronto", async () => {
    const { formatMonthAbbrev } = await import("@/lib/format-date");
    expect(formatMonthAbbrev("2026-03-01")).toBe("Mar");
    expect(formatMonthAbbrev("2026-01-01")).toBe("Jan");
  });

  it("does not shift range endpoints back a day under America/Toronto", async () => {
    const { formatDateRange } = await import("@/lib/format-date");
    expect(formatDateRange("2026-03-01", "2026-08-08").display).toBe(
      "March 1, 2026 – August 8, 2026",
    );
  });
});
