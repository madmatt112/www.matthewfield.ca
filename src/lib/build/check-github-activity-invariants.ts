// Cross-entry invariants for content/github-activity.yaml (design §Components;
// Reqs 1.10, 11.2, 11.3).
//
// Neither check is expressible in `githubActivityEntrySchema`: velite validates
// one entry at a time, and both rules are about the SET of entries. They live
// here rather than inline in velite.config.ts's `prepare()` hook so they can be
// unit-tested without booting velite — the precedent is
// check-experience-project-links.ts, imported at velite.config.ts:20 and called
// from that same hook.
//
// Both THROW. `strict: true` is not set on the velite config, so a check that
// merely logged would exit 0 and ship the bad data.
//
// Contiguity is what makes coverage decidable from the file alone: because a
// gap inside the covered range is a build error, "a quiet February" and
// "February was never seeded" are distinguishable — the latter simply is not in
// the file.

/** Named in the messages below, which are the file's whole diagnostic surface. */
const DATA_FILE = "github-activity.yaml";

const DAY_MS = 86_400_000;

/**
 * The shape these checks read. Structural rather than imported from
 * `github-activity-schema.ts` so the module stays pure and independently
 * testable; only `date` participates in either invariant.
 */
export interface GithubActivityRecordLike {
  date: string;
}

/**
 * Fails the build when a calendar day appears more than once (Reqs 1.10, 11.2).
 *
 * Reports the first duplicated date in file order, so the message points at the
 * top of the offending region rather than at an arbitrary member of it.
 *
 * NOTE on the message: unlike the `[velite/<collection>]`-prefixed throws
 * elsewhere in this directory, these two strings are pinned verbatim by design
 * §Components — file, date and rule, and nothing else. They deliberately do NOT
 * route through `content-error-format.ts`: that module formats per-entry Zod
 * issues reached via `IDENTIFIER_FIELD_BY_BASENAME`, and a cross-entry
 * invariant has no offending field, no entry index and no Zod issue to format.
 */
export function checkNoDuplicateDates(records: readonly GithubActivityRecordLike[]): void {
  const occurrences = new Map<string, number>();
  for (const record of records) {
    occurrences.set(record.date, (occurrences.get(record.date) ?? 0) + 1);
  }

  for (const record of records) {
    const count = occurrences.get(record.date) ?? 0;
    if (count > 1) {
      throw new Error(
        `${DATA_FILE}: duplicate date ${record.date} (appears ${count} times). Each day must appear exactly once.`,
      );
    }
  }
}

/**
 * Fails the build when the file skips a calendar day inside the range it covers
 * (Reqs 1.10, 11.3), naming the FIRST missing date.
 *
 * The range is derived from the data itself — `dataStart` is the minimum date,
 * `anchorDate` the maximum — so this rule only ever asks the file to be
 * internally complete. It says nothing about how far back the file reaches;
 * short coverage is a warning owned by the freshness script, not a build error.
 *
 * An empty array and a single record pass: an unseeded file is `[]` and is
 * handled by suppression + a CI warning (Req 11.7), not by a build failure. Duplicates are tolerated here (they are the other check's business),
 * hence the Set.
 *
 * A boundary date `Date.parse` cannot read is its own (third) error rather than
 * a skipped walk — see the comment at the guard below.
 */
export function checkCoverageContiguity(records: readonly GithubActivityRecordLike[]): void {
  if (records.length < 2) return;

  const present = new Set<string>();
  let dataStart = records[0].date;
  let anchorDate = records[0].date;
  for (const record of records) {
    present.add(record.date);
    if (record.date < dataStart) dataStart = record.date;
    if (record.date > anchorDate) anchorDate = record.date;
  }

  // Both boundaries must be readable before the walk: `cursor <= NaN` is false,
  // so an unparseable one would skip the loop entirely and pass the whole file
  // silently — the exact failure mode this module exists to prevent.
  for (const boundary of [dataStart, anchorDate]) {
    if (Number.isNaN(Date.parse(boundary))) {
      throw new Error(
        `${DATA_FILE}: unparseable date ${boundary}. Every date must be a YYYY-MM-DD calendar day.`,
      );
    }
  }

  // `YYYY-MM-DD` parses as UTC midnight per the ECMAScript date-time-string
  // format, so stepping by whole days never drifts across a DST boundary.
  const end = Date.parse(anchorDate);
  for (let cursor = Date.parse(dataStart); cursor <= end; cursor += DAY_MS) {
    const day = new Date(cursor).toISOString().slice(0, 10);
    if (!present.has(day)) {
      throw new Error(
        `${DATA_FILE}: coverage gap — no record for ${day}. The file must contain every day from ${dataStart} to ${anchorDate}; see docs/contributions-and-resources-authoring.md.`,
      );
    }
  }
}

/**
 * The single entry point `prepare()` invokes: runs both checks in order.
 *
 * A real function rather than a re-export, because it makes the call site
 * itself unit-testable. Driving this with a duplicate-date array and with a
 * gapped array is the only cheap evidence that both checkers are actually
 * reached — a fixture-driven velite run is not available in this repo (design
 * §Testing → Integration).
 *
 * Duplicates are checked first: it is the more specific diagnosis, and a file
 * with a duplicate is usually also the file someone is mid-edit on.
 */
export function runGithubActivityInvariants(records: readonly GithubActivityRecordLike[]): void {
  checkNoDuplicateDates(records);
  checkCoverageContiguity(records);
}
