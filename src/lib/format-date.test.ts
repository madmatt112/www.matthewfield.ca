// Do not call vi.resetModules() in this file — parity assertions depend on shared module instances.
import { describe, expect, it } from "vitest";
import { formatContentDate } from "@/lib/format-date";
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
