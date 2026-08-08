import { s } from "velite";

/**
 * Shared zod builders used by both the contributions and resources per-entry
 * schemas. The schema builder `s` is imported from "velite" (its bundled
 * v3-shaped zod), NOT the top-level `zod` dependency — their issue field names
 * differ and the loader's issue-shape introspection (Task 3) is written against
 * this build.
 */

/**
 * `Date.now()` captured EXACTLY ONCE at module load. This is the upper-bound
 * anchor for future-dated checks (Req 4.2). Capturing it once at module scope
 * means the loader's `safeParse` and Velite's re-parse share the same instant,
 * so a value that is valid at load time cannot become invalid mid-build.
 */
export const BUILD_START_UTC = Date.now();

/**
 * Two-stage URL check extracted from `velite.config.ts`'s `linkSchema`:
 *  (a) Zod's `.url()` parser, then
 *  (b) a `.refine()` that re-parses with `new URL()` and restricts the
 *      protocol to `http:` / `https:` (rejects `mailto:`, `javascript:`,
 *      `file:`, etc.).
 */
export function httpUrl() {
  return s
    .string()
    .url()
    .refine(
      (value) => {
        try {
          const parsed = new URL(value);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "url must use http: or https: protocol" },
    );
}

/**
 * Trim-then-bound: trims the input, then enforces min/max length on the
 * trimmed value. A whitespace-only string trims to "" and fails `min`.
 */
export function trimmed(min: number, max: number) {
  return s
    .string()
    .transform((v) => v.trim())
    .pipe(s.string().min(min).max(max));
}

/**
 * Validates a `YYYY-MM-DD` calendar date and stores the RAW string verbatim.
 *
 * Validate-only, no transform: chaining `.transform()` here would reintroduce
 * the RangeError escape (a transform body that constructs a `Date` can throw
 * on an unparseable value, surfacing a bare RangeError instead of a clean
 * ZodIssue). Instead we use `superRefine` with `fatal: true` so every bad date
 * is a normal aborted ZodIssue.
 *
 * The check is a UTC round-trip: parse the string as midnight UTC and confirm
 * the parsed `getUTCFullYear/Month/Date` match the captured regex groups. This
 * rejects calendar-invalid dates (e.g. 2026-02-30, non-leap 2026-02-29) that
 * `Date` would otherwise silently roll over.
 */
export function isoDate() {
  const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
  return s.string().superRefine((value, ctx) => {
    const match = ISO_DATE.exec(value);
    if (!match) {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        message: `'${value}' is not a valid date; use the YYYY-MM-DD format.`,
      });
      return;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() + 1 !== month ||
      parsed.getUTCDate() !== day
    ) {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        message: `'${value}' is not a real calendar date.`,
      });
    }
  });
}

/**
 * Validates a `YYYY-MM` month and stores the RAW string verbatim.
 *
 * Month-precision on purpose: employment and education dates are known to the
 * month at best, and `isoDate()` would force a fabricated day into the content
 * files.
 *
 * The `(0[1-9]|1[0-2])` alternation is load-bearing. A `\d{2}` month would
 * accept `2026-13`, which `new Date("2026-13-01T…")` then rolls into January
 * 2027 — so the value would be reported as *future-dated* rather than as a bad
 * month, sending an author looking in the wrong place. Keeping the two failures
 * distinct is the point of the three separate issue messages below.
 *
 * Validate-only via `superRefine` with `fatal: true`, mirroring `isoDate()`:
 * a transform body that constructs a `Date` can throw a bare RangeError instead
 * of a clean ZodIssue.
 */
export function isoMonth() {
  const ISO_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
  return s.string().superRefine((value, ctx) => {
    const match = ISO_MONTH.exec(value);
    if (!match) {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        message: `'${value}' is not a valid month; use the YYYY-MM format with a month of 01-12.`,
      });
      return;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const parsed = new Date(`${value}-01T00:00:00.000Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() + 1 !== month
    ) {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        message: `'${value}' is not a real calendar month.`,
      });
      return;
    }
    // Anchored on the build-start instant so a value cannot be valid at load
    // time and invalid mid-build (same reasoning as BUILD_START_UTC's docblock).
    if (parsed.getTime() > BUILD_START_UTC) {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        message: `'${value}' is in the future; employment and education dates must not be future-dated.`,
      });
    }
  });
}

/**
 * `superRefine` for a `links` array: adds an issue when two links share a
 * `kind` (Req 3.2). Designed to be attached via
 * `s.array(linkSchema).superRefine(uniqueByKind)`.
 */
export function uniqueByKind(
  links: ReadonlyArray<{ kind: string }>,
  ctx: {
    addIssue: (issue: { code: "custom"; message: string; path: (string | number)[] }) => void;
  },
): void {
  const seen = new Map<string, number>();
  links.forEach((link, index) => {
    const firstIndex = seen.get(link.kind);
    if (firstIndex === undefined) {
      seen.set(link.kind, index);
      return;
    }
    ctx.addIssue({
      code: "custom",
      message: `duplicate link kind '${link.kind}'; each kind may appear at most once.`,
      path: [index, "kind"],
    });
  });
}
