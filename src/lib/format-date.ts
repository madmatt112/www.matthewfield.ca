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
