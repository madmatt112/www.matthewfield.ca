const contentDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export function formatContentDate(iso: string): { datetime: string; display: string } {
  return { datetime: iso, display: contentDateFormatter.format(new Date(iso)) };
}
