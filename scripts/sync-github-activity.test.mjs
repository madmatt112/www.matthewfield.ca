/**
 * sync-github-activity.test.mjs
 *
 * Self-tests for scripts/sync-github-activity.mjs (Reqs 3.1, 3.2, 3.4, 3.5,
 * 3.6, 3.7, 13.2). Runs via `node --test` and is wired as its own CI step, so
 * the criterion does not mandate shelfware.
 *
 * Vitest's include pattern targets `src/**`, so this file lives outside
 * Vitest's scope on purpose — invoke with
 * `node --test scripts/sync-github-activity.test.mjs`.
 *
 * Four things are held here:
 *
 * 1. **The pure core** — `requestBounds` at pinned clocks, `flattenCalendar`
 *    over the committed seed fixture, `formatActivityYaml` against a golden
 *    string. No clock and no network is read, so nothing rots as the real file
 *    ages.
 * 2. **The condition → cause table**, driven as a real subprocess through
 *    `scripts/__fetch-mock-loader.mjs`. Every child runs against a **temp
 *    `cwd`** so a bug that reaches the write path cannot clobber the committed
 *    payload, and the final test re-checks that payload's bytes and mtime
 *    anyway.
 * 3. **The query fence** — the ```graphql block under `### The refresh query`
 *    in `docs/contributions-and-resources-authoring.md` must equal
 *    `CONTRIBUTION_CALENDAR_QUERY`. Req 13.3 keeps the raw `gh api graphql`
 *    fallback alive and a human on that path copies the query *out of the
 *    document*, so a drifted document means the fallback issues a different
 *    query — which Req 13.2 defines as a defect. This is the artifact that
 *    makes Req 3.1 hold mechanically rather than by proofreading.
 * 4. **That the fence check cannot pass vacuously** — a missing anchor heading,
 *    a missing fence, and a token-level edit each have their own case.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { CONTENT_REL } from "./check-github-activity-freshness.mjs";
import {
  CONTRIBUTION_CALENDAR_QUERY,
  CONTRIBUTIONS_LOGIN,
  GITHUB_GRAPHQL_URL,
  PULL_RANGE_DAYS,
  flattenCalendar,
  formatActivityYaml,
  requestBounds,
} from "./sync-github-activity.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(__dirname, "sync-github-activity.mjs");
const LOADER = path.join(__dirname, "__fetch-mock-loader.mjs");
const SEED_REL = "scripts/__fixtures__/github-activity/seed-52w.json";
const SEED_ABS = path.join(REPO_ROOT, SEED_REL);
const DOC_REL = "docs/contributions-and-resources-authoring.md";
const DOC_ABS = path.join(REPO_ROOT, DOC_REL);
const PAYLOAD_ABS = path.join(REPO_ROOT, CONTENT_REL);

const MS_PER_DAY = 86_400_000;

/**
 * Not a credential — the child only needs `GH_CONTRIBUTIONS_TOKEN` to be
 * *truthy*, because without it every fetch branch aborts as `api-auth` before
 * `fetchImpl` is ever reached. Deliberately unlike a real PAT so no scanner
 * mistakes it for one; asserted absent from every diagnostic (Req 7.6).
 */
const DUMMY_TOKEN = "dummy-token-for-tests";

/**
 * The committed payload as it stood before a single child was spawned — read
 * only so the last test can compare the file **to its own prior state**. It is
 * never compared to fixture-derived bytes: whatever the file holds, the suite
 * must leave it holding, and that stays true after the first automated sync
 * rewrites it (Req 12.7).
 */
const PAYLOAD_BEFORE = readFileSync(PAYLOAD_ABS);
const PAYLOAD_MTIME_BEFORE = statSync(PAYLOAD_ABS).mtimeMs;

/** @type {unknown} */
const SEED = JSON.parse(readFileSync(SEED_ABS, "utf8"));

// --- requestBounds: pinned clocks, no `Date.now()` anywhere ---

/**
 * Whole UTC days between two `YYYY-MM-DD` prefixes, inclusive of both ends.
 *
 * @param {string} from RFC 3339 lower bound
 * @param {string} to RFC 3339 upper bound
 * @returns {number}
 */
function inclusiveSpanDays(from, to) {
  const fromMs = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const toMs = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  return (toMs - fromMs) / MS_PER_DAY + 1;
}

/** @param {{ from: string, to: string }} bounds */
function assertBoundsShape(bounds) {
  assert.match(bounds.from, /^\d{4}-\d{2}-\d{2}T00:00:00Z$/, "`from` is not RFC 3339 UTC midnight");
  assert.match(bounds.to, /^\d{4}-\d{2}-\d{2}T23:59:59Z$/, "`to` is not RFC 3339 end-of-day");
  assert.equal(inclusiveSpanDays(bounds.from, bounds.to), PULL_RANGE_DAYS);
}

test("requestBounds — a UTC-midnight clock anchors on its own day", () => {
  // Exactly 2026-08-10T00:00:00Z, and the last millisecond before it. The
  // floor-to-day must put those on different days, or a run just after midnight
  // would silently pull yesterday's window.
  const atMidnight = requestBounds(Date.UTC(2026, 7, 10));
  assert.deepEqual(atMidnight, { from: "2025-08-12T00:00:00Z", to: "2026-08-10T23:59:59Z" });
  assertBoundsShape(atMidnight);

  const oneMsEarlier = requestBounds(Date.UTC(2026, 7, 10) - 1);
  assert.deepEqual(oneMsEarlier, { from: "2025-08-11T00:00:00Z", to: "2026-08-09T23:59:59Z" });
  assertBoundsShape(oneMsEarlier);

  // The same day at any hour gives the same window — the time of day is floored
  // away, so a schedule slip within the day cannot move the bounds.
  assert.deepEqual(requestBounds(Date.UTC(2026, 7, 10, 23, 59, 59, 999)), atMidnight);
});

test("requestBounds — a leap day is not a special case", () => {
  const onLeapDay = requestBounds(Date.UTC(2024, 1, 29, 12, 34, 56));
  assert.deepEqual(onLeapDay, { from: "2023-03-03T00:00:00Z", to: "2024-02-29T23:59:59Z" });
  assertBoundsShape(onLeapDay);

  // A window that *contains* 2024-02-29 is still 364 days: the arithmetic is on
  // whole UTC days, so the extra day is spanned rather than skipped.
  const spanningLeapDay = requestBounds(Date.UTC(2024, 5, 1));
  assert.equal(Date.parse(spanningLeapDay.from) < Date.UTC(2024, 1, 29), true);
  assertBoundsShape(spanningLeapDay);
});

test("requestBounds — a year boundary is not a special case", () => {
  const newYearsDay = requestBounds(Date.UTC(2026, 0, 1));
  assert.deepEqual(newYearsDay, { from: "2025-01-03T00:00:00Z", to: "2026-01-01T23:59:59Z" });
  assertBoundsShape(newYearsDay);

  const lastMsOf2025 = requestBounds(Date.UTC(2025, 11, 31, 23, 59, 59, 999));
  assert.deepEqual(lastMsOf2025, { from: "2025-01-02T00:00:00Z", to: "2025-12-31T23:59:59Z" });
  assertBoundsShape(lastMsOf2025);
});

test("requestBounds — the inclusive span is PULL_RANGE_DAYS at every pinned clock", () => {
  for (const nowMs of [
    Date.UTC(2026, 7, 10),
    Date.UTC(2024, 1, 29),
    Date.UTC(2026, 0, 1),
    Date.UTC(2025, 11, 31, 23, 59, 59, 999),
    Date.UTC(2023, 2, 1),
    Date.UTC(2100, 6, 4, 6, 30),
  ]) {
    assertBoundsShape(requestBounds(nowMs));
  }
  assert.equal(PULL_RANGE_DAYS, 364);
});

// --- flattenCalendar: the committed 53-week seed fixture ---

test("flattenCalendar — the seed fixture flattens to 364 ascending, unique days", () => {
  const records = flattenCalendar(SEED);
  assert.equal(records.length, 364);
  assert.deepEqual(records[0], { date: "2025-08-12", count: 0 });
  assert.deepEqual(records[records.length - 1], { date: "2026-08-10", count: 0 });

  const dates = records.map((r) => r.date);
  assert.equal(new Set(dates).size, records.length, "duplicate dates in the flattened list");
  assert.deepEqual(dates, [...dates].sort(), "flattened list is not ascending by date");

  // 53 Sunday-aligned weeks with a partial first (5 days) and last (2 days)
  // week collapse to one contiguous run — no gap, no overlap.
  assert.equal(inclusiveSpanDays(dates[0], dates[dates.length - 1]), records.length);
});

test("flattenCalendar — exactly two keys per record, and nothing is dropped", () => {
  const records = flattenCalendar(SEED);
  for (const record of records) {
    assert.deepEqual(Object.keys(record), ["date", "count"], `unexpected keys on ${record.date}`);
    assert.equal(typeof record.count, "number");
  }
  // `contributionLevel` is bucketed against the account's personal maximum over
  // whatever period was queried, so it cannot be reproduced offline and is
  // never carried (Req 3.6).
  assert.equal(JSON.stringify(records).includes("contributionLevel"), false);

  // Totals match the envelope's own count, which no other assertion here would
  // catch a silently dropped or duplicated day against.
  const total = SEED.data.user.contributionsCollection.contributionCalendar.totalContributions;
  assert.equal(
    records.reduce((sum, r) => sum + r.count, 0),
    total,
  );
});

test("flattenCalendar — a trailing zero on the anchor day survives", () => {
  const records = flattenCalendar(SEED);
  const last = records[records.length - 1];
  assert.equal(last.date, "2026-08-10");
  assert.equal(last.count, 0, "the anchor day's zero was adjusted, dropped or back-filled");
  // The two days before it are non-zero, so the trailing zero is real data and
  // not the tail of an all-zero fixture.
  assert.equal(records[records.length - 2].count, 1);
  assert.equal(records[records.length - 3].count, 1);
});

test("flattenCalendar — out-of-order weeks are sorted, and a missing shape yields []", () => {
  const scrambled = {
    data: {
      user: {
        contributionsCollection: {
          contributionCalendar: {
            weeks: [
              { contributionDays: [{ date: "2026-01-02", contributionCount: 2 }] },
              { contributionDays: [{ date: "2025-12-31", contributionCount: 0 }] },
              { contributionDays: [{ date: "2026-01-01", contributionCount: 9 }] },
            ],
          },
        },
      },
    },
  };
  assert.deepEqual(flattenCalendar(scrambled), [
    { date: "2025-12-31", count: 0 },
    { date: "2026-01-01", count: 9 },
    { date: "2026-01-02", count: 2 },
  ]);

  // Pure and total: `main()` turns the empty list into the zero-records abort
  // rather than writing a degraded payload (Req 5.3).
  assert.deepEqual(flattenCalendar({}), []);
  assert.deepEqual(flattenCalendar(null), []);
  assert.deepEqual(flattenCalendar({ data: { user: null } }), []);
});

// --- formatActivityYaml: the file's exact formatting convention (Req 3.7) ---

test("formatActivityYaml — golden string: quoted date value, plain keys, bare count", () => {
  const golden = '- date: "2025-08-12"\n  count: 0\n- date: "2025-08-13"\n  count: 7\n';
  assert.equal(
    formatActivityYaml([
      { date: "2025-08-12", count: 0 },
      { date: "2025-08-13", count: 7 },
    ]),
    golden,
  );
});

// --- The CLI: the condition → cause table, driven as a real subprocess ---

/**
 * A scratch repo root for one child. The temp `cwd` is what makes a write-path
 * bug harmless: the child resolves `content/github-activity.yaml` under it, so
 * the committed payload is never a candidate target.
 *
 * @param {{ withPayload?: boolean }} [options]
 * @returns {string}
 */
function makeTmp({ withPayload = true } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "sync-github-activity-"));
  mkdirSync(path.join(dir, path.dirname(CONTENT_REL)), { recursive: true });
  if (withPayload) {
    writeFileSync(path.join(dir, CONTENT_REL), '- date: "2026-08-10"\n  count: 0\n');
  }
  return dir;
}

/**
 * Runs the CLI under the fetch-mock preload.
 *
 * `FETCH_MOCK` defaults to `{}` rather than being left unset: an empty map
 * makes the stub throw on *any* request, so a case that is supposed to abort
 * before the network shows up as the wrong cause instead of quietly reaching
 * `api.github.com`. `GITHUB_STEP_SUMMARY` is forced empty so a run under CI
 * cannot append to the real job summary — the empty string is also the falsy
 * case that proves the emitter skips the append rather than throwing
 * `ERR_INVALID_ARG_TYPE`. One case overrides it with a temp file to cover the
 * other half of Req 9.2's two-line contract.
 *
 * @param {{ cwd: string, argv?: string[], mock?: Record<string, unknown>, env?: Record<string, string> }} options
 */
function runCli({ cwd, argv = [], mock = {}, env = {} }) {
  return spawnSync(process.execPath, ["--import", pathToFileURL(LOADER).href, SCRIPT, ...argv], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GH_CONTRIBUTIONS_TOKEN: DUMMY_TOKEN,
      GITHUB_STEP_SUMMARY: "",
      FETCH_MOCK: JSON.stringify(mock),
      ...env,
    },
  });
}

/** A `FETCH_MOCK` map keyed on the module's own endpoint constant. */
const onGraphql = (entry) => ({ [GITHUB_GRAPHQL_URL]: entry });

/**
 * Asserts one terminating path, one named cause, exit 1, nothing on stderr.
 *
 * @param {{ status: number | null, stdout: string, stderr: string }} r
 * @param {string} cause expected cause slug
 * @returns {string} the single `::error::` line, for further assertions
 */
function assertAbort(r, cause) {
  assert.equal(r.status, 1, `expected exit 1\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
  assert.equal(r.stderr, "", `expected a named cause, not a stack trace: ${r.stderr}`);
  const errors = r.stdout.split("\n").filter((line) => line.startsWith("::error::"));
  assert.equal(errors.length, 1, `expected exactly one ::error:: line, got: ${errors.join(" | ")}`);
  assert.match(errors[0], new RegExp(`^::error::\\[sync\\] ${cause} \\S`));
  assert.equal(r.stdout.includes(DUMMY_TOKEN), false, "the diagnostic echoed the token (Req 7.6)");
  return errors[0];
}

/**
 * @param {(dir: string) => void} body
 * @param {{ withPayload?: boolean }} [options]
 */
function withTmp(body, options) {
  const dir = makeTmp(options);
  try {
    body(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("cause — a request that throws is `request-failure`", () => {
  withTmp((dir) => {
    const r = runCli({ cwd: dir, mock: onGraphql({ throw: "socket hang up" }) });
    assert.match(assertAbort(r, "request-failure"), /threw or exceeded its 30000 ms bound/);
  });
});

test("cause — a non-2xx other than 401/403 is `request-failure`", () => {
  withTmp((dir) => {
    const r = runCli({ cwd: dir, mock: onGraphql({ status: 502, body: "bad gateway" }) });
    assert.match(assertAbort(r, "request-failure"), /HTTP 502/);
  });
});

test("cause — 401 and 403 are `api-auth`", () => {
  for (const status of [401, 403]) {
    withTmp((dir) => {
      const r = runCli({ cwd: dir, mock: onGraphql({ status, body: "Bad credentials" }) });
      assert.match(assertAbort(r, "api-auth"), new RegExp(`HTTP ${status}`));
    });
  }
});

test("cause — an absent GH_CONTRIBUTIONS_TOKEN on the fetch path is `api-auth`", () => {
  withTmp((dir) => {
    // No request is attempted, so this is not `request-failure`; the variable
    // name is what distinguishes this trigger from the 401/403 one (Req 9.3).
    const r = runCli({ cwd: dir, env: { GH_CONTRIBUTIONS_TOKEN: "" } });
    assert.match(assertAbort(r, "api-auth"), /GH_CONTRIBUTIONS_TOKEN is not set/);
  });
});

test("cause — a 200 carrying `errors` is `api-error`", () => {
  withTmp((dir) => {
    const r = runCli({
      cwd: dir,
      mock: onGraphql({
        status: 200,
        body: JSON.stringify({ errors: [{ message: "API rate limit exceeded" }], data: null }),
      }),
    });
    assert.match(assertAbort(r, "api-error"), /carries errors: API rate limit exceeded/);
  });
});

test("cause — a null `data.user` is `api-error`, not `degraded-payload`", () => {
  withTmp((dir) => {
    // The organisation-transfer and account-rename signal: conflating it with
    // an empty calendar would hide the case entirely.
    const r = runCli({
      cwd: dir,
      mock: onGraphql({ status: 200, body: JSON.stringify({ data: { user: null } }) }),
    });
    const line = assertAbort(r, "api-error");
    assert.match(line, /data\.user is null/);
    assert.match(line, new RegExp(CONTRIBUTIONS_LOGIN));
  });
});

test("cause — zero contribution day records is `degraded-payload`", () => {
  withTmp((dir) => {
    const r = runCli({
      cwd: dir,
      mock: onGraphql({
        status: 200,
        body: JSON.stringify({
          data: { user: { contributionsCollection: { contributionCalendar: { weeks: [] } } } },
        }),
      }),
    });
    assert.match(assertAbort(r, "degraded-payload"), /zero contribution day records/);
  });
});

test("cause — an absent content file without --seed is `file-absent-no-seed`", () => {
  withTmp(
    (dir) => {
      // Checked as a precondition, before a request is issued: the empty
      // FETCH_MOCK map would have thrown had a request been attempted.
      const r = runCli({ cwd: dir });
      assert.match(assertAbort(r, "file-absent-no-seed"), /--seed was not passed/);
    },
    { withPayload: false },
  );
});

test("cause — an unreadable --input file is `input-unreadable`, not `api-error`", () => {
  withTmp((dir) => {
    const missing = runCli({ cwd: dir, argv: ["--input", "no-such-response.json"] });
    assert.match(assertAbort(missing, "input-unreadable"), /ENOENT/);

    // Unparseable shares the slug — the detail distinguishes it from unreadable.
    const bad = path.join(dir, "not-json.json");
    writeFileSync(bad, "{ this is not json");
    const unparseable = runCli({ cwd: dir, argv: ["--input", bad] });
    assert.match(
      assertAbort(unparseable, "input-unreadable"),
      /could not be read as a saved GraphQL response/,
    );
  });
});

test("cause — a value-taking flag at the end of argv is `flag-missing-value`", () => {
  withTmp((dir) => {
    for (const flag of ["--login", "--input"]) {
      const line = assertAbort(runCli({ cwd: dir, argv: [flag] }), "flag-missing-value");
      assert.equal(line.includes(`${flag} requires a value`), true, line);
    }
    // Ignoring a dangling `--input` silently sent the run down the fetch path —
    // a surprise network call against the wrong contract.
    const trailing = runCli({ cwd: dir, argv: ["--seed", "--input"] });
    assertAbort(trailing, "flag-missing-value");
  });
});

test("cause — an otherwise-unhandled throw is `internal-error`, with no stack trace", () => {
  withTmp((dir) => {
    // A `null` entry inside `contributionDays` is a shape the cause table does
    // not model: it throws inside `flattenCalendar`. Req 9.2 must still hold.
    const r = runCli({
      cwd: dir,
      mock: onGraphql({
        status: 200,
        body: JSON.stringify({
          data: {
            user: {
              contributionsCollection: {
                contributionCalendar: { weeks: [{ contributionDays: [null] }] },
              },
            },
          },
        }),
      }),
    });
    assert.match(assertAbort(r, "internal-error"), /unhandled error: TypeError: /);
  });
});

test("summary — a set GITHUB_STEP_SUMMARY receives exactly `FAILED — <cause>`", () => {
  withTmp((dir) => {
    // The second half of Req 9.2's two-line contract. Every other child forces
    // the variable empty, so without this case the append path never runs.
    const summary = path.join(dir, "step-summary.md");
    const r = runCli({
      cwd: dir,
      mock: onGraphql({ status: 401, body: "Bad credentials" }),
      env: { GITHUB_STEP_SUMMARY: summary },
    });
    // The stdout cause and the summary line name the *same* cause — the summary
    // is a second rendering of one abort, not a second abort.
    assertAbort(r, "api-auth");

    const bytes = readFileSync(summary);
    // The dash is built from its codepoint rather than pasted, so this
    // expectation cannot itself be a hyphen-minus (U+002D) or an en dash
    // (U+2013) that happens to look right in a diff.
    const EM_DASH = String.fromCodePoint(0x2014);
    assert.equal(bytes.toString("utf8"), `FAILED ${EM_DASH} api-auth\n`);
    // Belt and braces: the same character asserted as its UTF-8 bytes.
    assert.deepEqual([...bytes.subarray(7, 10)], [0xe2, 0x80, 0x94]);
  });
});

test("every emitted cause slug is also a row in the documented cause table", () => {
  // The nine condition rows above resolve to eight distinct slugs
  // (`request-failure` and `api-auth` each cover two conditions). This holds
  // `main`'s documented table to the slugs the code actually emits, so a
  // renamed or added slug cannot leave the table stale.
  const source = readFileSync(SCRIPT, "utf8");
  const emitted = new Set([...source.matchAll(/fail\(\s*"([a-z-]+)"/g)].map((m) => m[1]));
  assert.deepEqual(
    [...emitted].sort(),
    [
      "api-auth",
      "api-error",
      "degraded-payload",
      "file-absent-no-seed",
      "flag-missing-value",
      "input-unreadable",
      "internal-error",
      "request-failure",
    ],
    "the emitted cause slugs changed; update the table in `main`'s doc comment and this suite",
  );
  const table = source.slice(source.indexOf("| Condition | Cause |"));
  for (const cause of emitted) {
    assert.equal(table.includes(`| \`${cause}\``), true, `\`${cause}\` is missing from the table`);
  }
});

test("CLI — a --input run writes the payload into its own cwd and exits 0", () => {
  withTmp((dir) => {
    // The fallback ladder's third rung, and the proof that the temp `cwd` is
    // where a write actually lands.
    const r = runCli({ cwd: dir, argv: ["--input", SEED_ABS] });
    assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
    assert.equal(r.stdout.includes("::error::"), false, r.stdout);
    assert.match(r.stdout, /\[sync\] refreshed .*: 364 records, anchor 2026-08-10\./);
    // Compared against the *fixture's own* transform, never against the
    // committed payload: Req 12.7 records that the fixture stops corresponding
    // to `content/github-activity.yaml` at the first automated sync, so a
    // committed assertion against that file's bytes is guaranteed to break. The
    // one-time byte-identity proof between the two is task 5's, recorded in the
    // implementation log rather than pinned here.
    assert.equal(
      readFileSync(path.join(dir, CONTENT_REL), "utf8"),
      formatActivityYaml(flattenCalendar(SEED)),
    );
  });
});

// --- The query fence: Req 3.1 held mechanically, not by proofreading ---

/** The anchor the fence is located by — never "the first graphql fence". */
const REFRESH_QUERY_HEADING = "### The refresh query";

/**
 * Collapse-runs-and-trim, the *only* normalisation applied before comparison.
 *
 * Deliberately weak: it absorbs indentation and line-ending differences and
 * nothing else, so a field swap, a field deletion, a renamed variable or any
 * other token-level change still fails the comparison.
 *
 * @param {string} text
 * @returns {string}
 */
function collapse(text) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Extracts the ```graphql fence anchored to `### The refresh query`.
 *
 * Anchored to the heading rather than to "the first graphql fence" because
 * `### Refreshing by hand` is the obvious place a second fence appears. The
 * search is bounded to the section — it stops at the next heading of the same
 * or a higher level — so a later fence can neither be picked up nor mask a
 * deleted one. A missing heading and a missing fence both **throw**: this check
 * must fail loudly, never pass vacuously.
 *
 * @param {string} markdown document text
 * @param {string} sourceLabel path named in the failure message
 * @returns {string} the fence body
 */
function extractRefreshQueryFence(markdown, sourceLabel) {
  const heading = /^### The refresh query[ \t]*$/m.exec(markdown);
  if (!heading) {
    throw new Error(
      `${sourceLabel}: the anchor heading "${REFRESH_QUERY_HEADING}" is missing, so the ` +
        `refresh query fence cannot be located. Restore the heading or update this test.`,
    );
  }

  const rest = markdown.slice(heading.index + heading[0].length);
  const nextHeading = /^#{1,3} /m.exec(rest);
  const section = nextHeading ? rest.slice(0, nextHeading.index) : rest;

  const fence = /^```graphql[ \t]*\n([\s\S]*?)^```[ \t]*$/m.exec(section);
  if (!fence) {
    throw new Error(
      `${sourceLabel}: no \`\`\`graphql fence was found under "${REFRESH_QUERY_HEADING}". ` +
        `Req 13.3's gh api graphql fallback copies the query out of that fence.`,
    );
  }
  return fence[1];
}

test("query fence — the documented copy equals CONTRIBUTION_CALENDAR_QUERY", () => {
  const documented = extractRefreshQueryFence(readFileSync(DOC_ABS, "utf8"), DOC_REL);
  assert.equal(
    collapse(documented),
    collapse(CONTRIBUTION_CALENDAR_QUERY),
    `the ${REFRESH_QUERY_HEADING} fence in ${DOC_REL} has drifted from ` +
      `CONTRIBUTION_CALENDAR_QUERY in scripts/sync-github-activity.mjs. Req 13.3 keeps the ` +
      `raw gh api graphql fallback alive and a human on that path copies the query out of the ` +
      `document, so a drifted document issues a different query (Req 13.2).`,
  );
  // Not vacuous: the extraction returned a real GraphQL document.
  assert.match(documented, /^query ContributionCalendar\(/);
});

test("query fence — a missing anchor heading fails, naming the anchor", () => {
  const renamed = "## Elsewhere\n\n### Refreshing the query\n\n```graphql\nquery X { a }\n```\n";
  assert.throws(
    () => extractRefreshQueryFence(renamed, DOC_REL),
    (err) =>
      err instanceof Error &&
      err.message.includes(REFRESH_QUERY_HEADING) &&
      /missing/.test(err.message),
    "a renamed heading must fail with a message naming the missing anchor",
  );
});

test("query fence — a heading with no fence under it fails rather than passing", () => {
  const noFence = `${REFRESH_QUERY_HEADING}\n\nProse, but no fence at all.\n\n## Next\n`;
  assert.throws(() => extractRefreshQueryFence(noFence, DOC_REL), /no ```graphql fence was found/);

  // A fence in a *later* section cannot stand in for the missing one — the
  // search is bounded to the anchored section.
  const laterFence =
    `${REFRESH_QUERY_HEADING}\n\nProse.\n\n` +
    "### Refreshing by hand\n\n```graphql\nquery Wrong { b }\n```\n";
  assert.throws(() => extractRefreshQueryFence(laterFence, DOC_REL), /no ```graphql fence/);
});

test("query fence — the anchored fence wins over a later one", () => {
  const twoFences =
    `${REFRESH_QUERY_HEADING}\n\n` +
    "```graphql\nquery Right { a }\n```\n\n" +
    "### Refreshing by hand\n\n```graphql\nquery Wrong { b }\n```\n";
  assert.equal(collapse(extractRefreshQueryFence(twoFences, DOC_REL)), "query Right { a }");
});

test("query fence — normalisation absorbs whitespace only, never a token change", () => {
  const canonical = collapse(CONTRIBUTION_CALENDAR_QUERY);

  // Re-indented and CRLF-terminated: still equal.
  const reflowed = CONTRIBUTION_CALENDAR_QUERY.replace(/\n/g, "\r\n").replace(/^ +/gm, "\t\t");
  assert.equal(collapse(reflowed), canonical);

  // A field swap, a field deletion and a renamed variable: each still fails.
  // `mutate` asserts the edit actually applied, so a case cannot pass by
  // silently being a no-op against a constant that already changed.
  const mutate = (from, to) => {
    const mutated = CONTRIBUTION_CALENDAR_QUERY.replace(from, to);
    assert.notEqual(mutated, CONTRIBUTION_CALENDAR_QUERY, `mutation ${from} → ${to} did not apply`);
    return collapse(mutated);
  };
  assert.notEqual(mutate("contributionCount", "contributionLevel"), canonical);
  assert.notEqual(mutate("        totalContributions\n", ""), canonical);
  assert.notEqual(mutate(/\$login/g, "$user"), canonical);
});

// --- The committed payload is never a candidate target ---

test("content/github-activity.yaml is byte-unchanged and untouched by the suite", () => {
  assert.equal(readFileSync(PAYLOAD_ABS).equals(PAYLOAD_BEFORE), true, "payload bytes changed");
  assert.equal(statSync(PAYLOAD_ABS).mtimeMs, PAYLOAD_MTIME_BEFORE, "payload mtime changed");
});
