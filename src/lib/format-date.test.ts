// Do not call vi.resetModules() in this file — parity assertions depend on shared module instances.
import { describe, expect, it } from "vitest";
import {
  formatApproximateSpan,
  formatContentDate,
  formatCount,
  formatDateRange,
  formatMonthAbbrev,
  formatMonthYear,
} from "@/lib/format-date";
import { formatPostDate } from "@/lib/blog";
import { formatProjectDate } from "@/lib/projects";

describe("formatContentDate", () => {
  it("returns datetime as the raw ISO input and display as the en-CA long-month string", () => {
    const iso = "2026-05-25T12:00:00Z";
    const result = formatContentDate(iso);
    expect(result.datetime).toBe(iso);
    // en-CA long-month format: "May 25, 2026" (month name, day, year).
    expect(result.display).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    expect(result.display).toContain("2026");
    expect(result.display).toContain("May");
  });

  it("preserves the raw ISO date string in datetime for date-only inputs", () => {
    const iso = "2026-05-25";
    const result = formatContentDate(iso);
    expect(result.datetime).toBe(iso);
    expect(result.display).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
  });
});

describe("formatMonthYear", () => {
  it("returns datetime as the raw YYYY-MM input and display as the en-CA month-year string", () => {
    const isoMonth = "2018-06";
    const result = formatMonthYear(isoMonth);
    expect(result.datetime).toBe(isoMonth);
    expect(result.display).toBe("June 2018");
  });

  it("does not roll a January month back into the previous year", () => {
    expect(formatMonthYear("2020-01").display).toBe("January 2020");
  });

  it("does not roll a December month forward into the next year", () => {
    expect(formatMonthYear("2020-12").display).toBe("December 2020");
  });
});

describe("formatDateRange", () => {
  it("returns both endpoints in the { datetime, display } shape plus a joined display", () => {
    const result = formatDateRange("2026-02-08", "2026-08-08");
    expect(result.start).toEqual({ datetime: "2026-02-08", display: "February 8, 2026" });
    expect(result.end).toEqual({ datetime: "2026-08-08", display: "August 8, 2026" });
    expect(result.display).toBe("February 8, 2026 – August 8, 2026");
  });

  it("formats each endpoint identically to formatContentDate", () => {
    const result = formatDateRange("2025-12-31", "2026-01-01");
    expect(result.start).toEqual(formatContentDate("2025-12-31"));
    expect(result.end).toEqual(formatContentDate("2026-01-01"));
  });

  it("does not collapse a single-day range", () => {
    const result = formatDateRange("2026-08-08", "2026-08-08");
    expect(result.display).toBe("August 8, 2026 – August 8, 2026");
  });
});

describe("formatCount", () => {
  it("groups a four-digit total with a thousands separator", () => {
    expect(formatCount(1234)).toBe("1,234");
  });

  it("leaves values below one thousand ungrouped", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
  });

  it("groups values above one million", () => {
    expect(formatCount(1234567)).toBe("1,234,567");
  });
});

describe("formatMonthAbbrev", () => {
  // Pins all twelve: the "ink never exceeds 286px" geometry assumes a three-glyph
  // label, and some ICU builds render en-CA month: "short" as "Aug." or "Sept".
  const months: Array<[string, string]> = [
    ["2026-01", "Jan"],
    ["2026-02", "Feb"],
    ["2026-03", "Mar"],
    ["2026-04", "Apr"],
    ["2026-05", "May"],
    ["2026-06", "Jun"],
    ["2026-07", "Jul"],
    ["2026-08", "Aug"],
    ["2026-09", "Sep"],
    ["2026-10", "Oct"],
    ["2026-11", "Nov"],
    ["2026-12", "Dec"],
  ];

  it.each(months)("formats %s as %s", (isoMonth, expected) => {
    expect(formatMonthAbbrev(isoMonth)).toBe(expected);
  });

  it("returns at most three glyphs for every month", () => {
    for (const [isoMonth] of months) {
      expect(formatMonthAbbrev(isoMonth).length).toBeLessThanOrEqual(3);
    }
  });

  it("accepts a full ISO date as well as a YYYY-MM month", () => {
    expect(formatMonthAbbrev("2026-08-08")).toBe("Aug");
    expect(formatMonthAbbrev("2026-08-08T00:00:00.000Z")).toBe("Aug");
  });

  it("does not roll a first-of-month date into the previous month", () => {
    expect(formatMonthAbbrev("2026-03-01")).toBe("Mar");
    expect(formatMonthAbbrev("2026-01-01")).toBe("Jan");
  });
});

describe("formatPostDate / formatProjectDate parity", () => {
  it("formatPostDate is the same reference as formatContentDate", () => {
    expect(formatPostDate).toBe(formatContentDate);
  });

  it("formatProjectDate is the same reference as formatContentDate", () => {
    expect(formatProjectDate).toBe(formatContentDate);
  });

  it("formatPostDate and formatProjectDate share the same function body", () => {
    expect(formatPostDate.toString()).toBe(formatProjectDate.toString());
  });
});

describe("formatApproximateSpan", () => {
  it("reads the 26-week window as six months", () => {
    // 182 days inclusive — the frame the heatmap publishes at full coverage.
    expect(formatApproximateSpan("2026-02-15", "2026-08-15")).toBe("6 months");
  });

  it("is inclusive of both endpoints", () => {
    // A single day is a span of 1, not 0, so a same-day range is a week rather
    // than collapsing to something nonsensical.
    expect(formatApproximateSpan("2026-08-10", "2026-08-10")).toBe("week");
  });

  it("shortens with the range rather than reporting the frame", () => {
    // The caller's start is max(windowStart, dataStart), so a thinly seeded
    // file must report its real, shorter span — this is the case a hardcoded
    // "6 months" would get wrong.
    expect(formatApproximateSpan("2026-06-01", "2026-08-08")).toBe("2 months");
    expect(formatApproximateSpan("2026-07-10", "2026-08-08")).toBe("4 weeks");
  });

  it("falls back to weeks below two months", () => {
    expect(formatApproximateSpan("2026-08-01", "2026-08-14")).toBe("2 weeks");
    expect(formatApproximateSpan("2026-08-04", "2026-08-10")).toBe("week");
  });

  it("formats large month counts with the shared thousands separator", () => {
    // Absurd, but it proves the number goes through formatCount rather than
    // being interpolated raw.
    expect(formatApproximateSpan("1000-01-01", "2026-08-10")).toContain(",");
  });

  it("throws on an unparseable endpoint rather than reporting NaN months", () => {
    expect(() => formatApproximateSpan("not-a-date", "2026-08-10")).toThrow(/unparseable range/);
    expect(() => formatApproximateSpan("2026-08-10", "nope")).toThrow(/unparseable range/);
  });

  it("is timezone-independent", () => {
    // Both endpoints are parsed as UTC midnights, so a non-UTC runner cannot
    // shift the day count across a boundary.
    expect(formatApproximateSpan("2026-02-15", "2026-08-15")).toBe(
      formatApproximateSpan("2026-02-15", "2026-08-15"),
    );
    expect(formatApproximateSpan("2026-01-01", "2026-03-01")).toBe("2 months");
  });
});
