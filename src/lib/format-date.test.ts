// Do not call vi.resetModules() in this file — parity assertions depend on shared module instances.
import { describe, expect, it } from "vitest";
import { formatContentDate, formatMonthYear } from "@/lib/format-date";
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
