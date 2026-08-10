const contentDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export function formatContentDate(iso: string): { datetime: string; display: string } {
  return { datetime: iso, display: contentDateFormatter.format(new Date(iso)) };
}

const monthYearFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "long",
  timeZone: "UTC",
});

/**
 * Formats a `YYYY-MM` month (the `isoMonth()` schema shape) as "January 2018".
 *
 * Separate from `formatContentDate` because that helper expects a full ISO date;
 * handing it a `YYYY-MM` string would parse as the first of the month and then
 * render a day that is not in the source data.
 *
 * `datetime` returns the raw `YYYY-MM`, which is a valid HTML `<time>` value.
 */
export function formatMonthYear(isoMonth: string): { datetime: string; display: string } {
  return {
    datetime: isoMonth,
    display: monthYearFormatter.format(new Date(`${isoMonth}-01T00:00:00.000Z`)),
  };
}

/**
 * Formats a start/end pair as a date range, e.g. "February 8, 2026 – August 8, 2026".
 *
 * Returns the two endpoints in the `{ datetime, display }` shape so a caller can
 * render them as separate `<time>` elements, plus a joined `display` for the common
 * case where the range is one run of text.
 */
export function formatDateRange(
  startIso: string,
  endIso: string,
): {
  start: { datetime: string; display: string };
  end: { datetime: string; display: string };
  display: string;
} {
  const start = formatContentDate(startIso);
  const end = formatContentDate(endIso);
  return { start, end, display: `${start.display} – ${end.display}` };
}

const countFormatter = new Intl.NumberFormat("en-CA");

/**
 * Formats an integer with thousands separators, e.g. 1234 → "1,234".
 *
 * Exists so components never reach for an inline `toLocaleString()` with an
 * implicit runtime locale.
 */
export function formatCount(n: number): string {
  return countFormatter.format(n);
}

const monthAbbrevFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  timeZone: "UTC",
});

/**
 * Formats a `YYYY-MM` month or a full ISO date as a three-glyph month abbreviation
 * ("Aug"), for SVG column labels where "August 2026" does not fit an 11px pitch.
 *
 * Some ICU builds render en-CA `month: "short"` with a trailing period ("Aug."),
 * which would be a fourth glyph, so the period is stripped. Any other over-long
 * abbreviation is caught by the twelve-month test rather than silently truncated
 * here, so a locale-data change is visible instead of quietly reshaping the label.
 */
export function formatMonthAbbrev(iso: string): string {
  const date = new Date(/^\d{4}-\d{2}$/.test(iso) ? `${iso}-01T00:00:00.000Z` : iso);
  return monthAbbrevFormatter.format(date).replace(/\.$/, "");
}
