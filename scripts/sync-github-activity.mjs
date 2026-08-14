#!/usr/bin/env node
/**
 * sync-github-activity.mjs
 *
 * Refreshes `content/github-activity.yaml` from the GitHub contributions
 * calendar (Reqs 2, 3).
 *
 * The module has two halves. The **pure core** — the request bounds, the
 * response transform and the YAML serialiser, plus the constants the rest of
 * the spec imports — is clock-free and network-free: `requestBounds` takes the
 * clock as an argument and `flattenCalendar` takes an already-fetched body, so
 * `node --test` can drive them against pinned inputs. The **impure half** is
 * `fetchCalendar` (one bounded request, with `fetchImpl` injected so the
 * `FETCH_MOCK` harness can replace it) and `main` (the CLI: argv, env, the
 * abort table and the atomic write). Nothing performs I/O at module scope; the
 * only invocation is behind the `import.meta.url` CLI guard, mirroring
 * `scripts/check-github-activity-freshness.mjs:279-281`.
 *
 * Dependencies: the `yaml` package (already a devDependency, used by
 * `scripts/check-github-activity-freshness.mjs` and `scripts/check-velite-output.mjs`)
 * and `node:` builtins. No runtime dependency is added.
 */
import {
  appendFileSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { stringify as yamlStringify } from "yaml";
import { CONTENT_REL } from "./check-github-activity-freshness.mjs";

/**
 * Prefix on every line this script emits.
 *
 * **Reason (design §Cause vocabulary, [v7]):** five things in this spec can
 * write a cause and all five emit `::error::[sync] <cause> <detail>`. The tag
 * is the spec's own prefix rather than this file's name — that is what makes a
 * cause greppable in a run log beside `ci.yml`'s output — and this component is
 * the first emitter a run reaches, so drift here is the most visible.
 */
const TAG = "[sync]";

/**
 * Transient sibling the payload is staged in before `renameSync` (Req 5.4).
 *
 * Derived from `CONTENT_REL` rather than restated. It is a *sibling* because
 * `renameSync` is only atomic within one filesystem; dot-prefixed so it is
 * inconspicuous; and it does not match Velite's `github-activity.yaml` pattern
 * (`velite.config.ts:443`), so a run interrupted between write and rename
 * cannot feed the build. Req 3.8's "written to `content/github-activity.yaml`
 * and to no other path" names the payload's destination, not a transient that
 * never survives the call.
 */
const TMP_REL = path.join(path.dirname(CONTENT_REL), `.${path.basename(CONTENT_REL)}.tmp`);

const MS_PER_DAY = 86_400_000;

/**
 * Days pulled per refresh, inclusive of both bounds.
 *
 * **Reason (design §Pinned Constants):** 52 weeks; spec #11's parameter, not
 * re-opened (Req 2.5). Shortening it is not caught as an error — a short pull
 * is contiguous, passes every inherited build check, and silently shortens the
 * published period — so this value is a contract, not a tunable. Declared here
 * exactly once; `scripts/check-github-activity-payload.mjs` imports it rather
 * than restating it.
 */
export const PULL_RANGE_DAYS = 364;

/**
 * The account whose contribution calendar is queried.
 *
 * **Reason (design §Pinned Constants):** the heatmap's subject is a person, not
 * the repository's owner. Both sources have silent failure modes; the pinned
 * literal's need an act by Matthew (a rename, then a reclaim of the released
 * login) or affect only a fork he does not own, whereas
 * `github.repository_owner` silently publishes a stranger's heatmap if the
 * repository is ever transferred to a different personal account. See design
 * §The subject is a person, not a repository for the full comparison. A rename
 * is a checklist, not a search: the literal also lives at
 * `docs/contributions-and-resources-authoring.md:370` and `src/config/site.ts:98`.
 */
export const CONTRIBUTIONS_LOGIN = "madmatt112";

/**
 * Bound on the single calendar request, in milliseconds.
 *
 * **Reason (design §Pinned Constants):** bounds the single calendar query.
 * Longer than the deploy poll's per-request bound (`DEPLOY_REQUEST_TIMEOUT_MS`,
 * 10 000) because it is one request, not up to 36, and a slow GraphQL response
 * is worth waiting for where a slow poll is not.
 */
export const FETCH_TIMEOUT_MS = 30_000;

/**
 * The GraphQL document issued against the GitHub API v4 (Req 3.1).
 *
 * **Reason (design §Pinned Constants):** this is the canonical copy; the
 * reproduction in `docs/contributions-and-resources-authoring.md` under
 * `### The refresh query` is held to it by the fence-extraction test in
 * `scripts/sync-github-activity.test.mjs`. That matters because Req 13.3 keeps
 * the raw `gh api graphql` fallback alive and a human on that path copies the
 * query **out of the document** — a drifted document means the fallback issues
 * a different query, which Req 13.2 defines as a defect. Transcribed verbatim
 * from the ` ```graphql ` fence at
 * `docs/contributions-and-resources-authoring.md:348-364`.
 */
export const CONTRIBUTION_CALENDAR_QUERY = `query ContributionCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
`;

/**
 * ISO `YYYY-MM-DD` for the UTC day containing `ms`.
 *
 * @param {number} ms epoch ms
 * @returns {string}
 */
function utcDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Request bounds for a run at `nowMs` (Reqs 2.1, 2.2).
 *
 * `to` is the run's own UTC date at `T23:59:59Z`; `from` is that date minus
 * `PULL_RANGE_DAYS - 1` days at `T00:00:00Z`, giving a 364-day inclusive
 * request. Both are RFC 3339 `DateTime` values rather than bare dates, because
 * `contributionsCollection` rejects `YYYY-MM-DD`
 * (`docs/contributions-and-resources-authoring.md:376-377`).
 *
 * The arithmetic is on whole UTC days, so leap days and year boundaries need no
 * special case. Note that neither bound is the anchor: `anchorDate` is whatever
 * the response reports and nothing here ever writes it (Req 2.3).
 *
 * @param {number} nowMs run clock, epoch ms
 * @returns {{ from: string, to: string }}
 */
export function requestBounds(nowMs) {
  const toDayMs = Math.floor(nowMs / MS_PER_DAY) * MS_PER_DAY;
  const fromDayMs = toDayMs - (PULL_RANGE_DAYS - 1) * MS_PER_DAY;
  return {
    from: `${utcDate(fromDayMs)}T00:00:00Z`,
    to: `${utcDate(toDayMs)}T23:59:59Z`,
  };
}

/**
 * Flattens a contributions-calendar response into the file's record list
 * (Reqs 3.2, 3.4, 3.5, 3.6).
 *
 * The API returns Sunday-aligned weeks and the bounds make the first and last
 * week partial, so `weeks[].contributionDays[]` is flattened into a single list
 * sorted ascending by `date`. `contributionCount` becomes `count` and no other
 * key is carried — the schema is `.strict()`, and `contributionLevel` in
 * particular is never written because it is bucketed against the account's
 * personal maximum over whatever period was queried and so cannot be reproduced
 * offline. Counts pass through untouched, including a trailing `count: 0` on
 * the anchor day: that day is usually still in progress, so zero is the honest
 * value, not something to adjust, drop or back-fill.
 *
 * Pure and total — a response missing the expected shape yields `[]`, which
 * `main()` treats as the zero-records abort rather than writing a degraded
 * payload (Req 5.3).
 *
 * @param {unknown} responseBody parsed GraphQL response body
 * @returns {{ date: string, count: number }[]}
 */
export function flattenCalendar(responseBody) {
  const weeks =
    responseBody?.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];

  const records = [];
  for (const week of weeks) {
    for (const day of week?.contributionDays ?? []) {
      records.push({ date: day.date, count: day.contributionCount });
    }
  }

  records.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return records;
}

/**
 * Serialises records to the file's exact formatting convention (Req 3.7).
 *
 * **Measured:** the library default emits `- date: 2025-08-12` with the *value*
 * unquoted, which is not the committed shape. `defaultStringType:
 * "QUOTE_DOUBLE"` quotes the value and `defaultKeyType: "PLAIN"` leaves the key
 * bare, giving `- date: "2025-08-12"` / `  count: 0` — a top-level sequence of
 * two-line mappings with a quoted `date` and a bare integer `count`, so a
 * refresh diff shows data changes and not a 728-line reformatting.
 *
 * @param {{ date: string, count: number }[]} records
 * @returns {string}
 */
export function formatActivityYaml(records) {
  return yamlStringify(records, {
    defaultStringType: "QUOTE_DOUBLE",
    defaultKeyType: "PLAIN",
  });
}

/**
 * The GitHub GraphQL v4 endpoint the calendar query is issued against.
 *
 * Exported so `scripts/sync-github-activity.test.mjs` can key its `FETCH_MOCK`
 * map on the same string this module requests: the harness matches on the URL
 * exactly (`scripts/__fetch-mock-loader.mjs:15-17`), so a restated literal
 * there would stop matching silently rather than loudly.
 */
export const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

/**
 * Issues the contributions-calendar query — the module's only request.
 *
 * *Impure.* `fetchImpl` defaults to the global `fetch` and is the seam
 * `scripts/__fetch-mock-loader.mjs` replaces. `AbortSignal.timeout` bounds the
 * request so a hung connection cannot occupy the job (design §Error Handling 1).
 *
 * **Branches on `res.status`, never on `res.ok`.** The test stub returns
 * `{ status, json(), text() }` and nothing else (tasks.md fact 6) — there is no
 * `ok` property to read, so an `ok`-based branch would be undrivable. A non-2xx
 * response is returned with its raw text for the diagnostic and is *not*
 * JSON-parsed, because an expired credential answers 401 with no `data`/`errors`
 * envelope at all (design §Error Handling 2); only a 2xx body is parsed. This
 * is `scripts/check-vercel-auto-deploy.mjs:77-105`'s shape, with the exit
 * decisions left to `main` where the cause table lives.
 *
 * Classification is deliberately *not* done here: this returns what the wire
 * said and throws only what the wire threw, so `main` owns every cause.
 *
 * @param {{ login: string, from: string, to: string, token: string, fetchImpl?: typeof fetch }} options
 * @returns {Promise<{ status: number, body: unknown, text: string }>} `body` is
 *   the parsed 2xx envelope; `text` is the raw non-2xx body. Exactly one is set.
 */
export async function fetchCalendar({ login, from, to, token, fetchImpl = globalThis.fetch }) {
  const res = await fetchImpl(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "sync-github-activity",
    },
    body: JSON.stringify({
      query: CONTRIBUTION_CALENDAR_QUERY,
      variables: { login, from, to },
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (res.status < 200 || res.status > 299) {
    const text = await res.text().catch(() => "");
    return { status: res.status, body: null, text };
  }

  return { status: res.status, body: await res.json(), text: "" };
}

/**
 * Refreshes `content/github-activity.yaml`, or aborts without touching it.
 *
 * **Input contract** (design §Component 1's `main()` contract):
 *
 * | Input | Source | Default |
 * |---|---|---|
 * | read token | env `GH_CONTRIBUTIONS_TOKEN` | required **only on the fetch path** |
 * | login | `--login <login>` | `CONTRIBUTIONS_LOGIN`; **inert under `--input`**, since no query is issued |
 * | `--input <file>` | argv | unset ⇒ fetch |
 * | `--seed` | argv | unset ⇒ refuse to create an absent file (Req 5.5) |
 *
 * The token is *not* required under `--input`: that is the fallback ladder's
 * third rung, reached precisely when the script's fetch is what is broken, so
 * demanding a credential it will never use would abort the recovery path.
 * `--seed` relaxes Req 5.5's file-must-exist precondition **and nothing else** —
 * no validation is skipped (Req 13.5), which is what makes Req 1.3's "no
 * dispatch input can write a payload a scheduled run would have rejected" true.
 *
 * **The condition → cause table**, each row emitted by exactly one branch and
 * every one of them aborting *before* the write (Reqs 5.2, 5.3, 5.4, 5.5):
 *
 * | Condition | Cause |
 * |---|---|
 * | request throw or timeout | `request-failure` |
 * | non-2xx other than 401/403 | `request-failure` |
 * | 401/403, or an absent `GH_CONTRIBUTIONS_TOKEN` on the fetch path | `api-auth` |
 * | body carries `errors`, or `data.user` is null | `api-error` |
 * | zero contribution day records | `degraded-payload` |
 * | the content file is absent and `--seed` was not passed | `file-absent-no-seed` |
 * | `--input <file>` cannot be read or parsed | `input-unreadable` |
 * | `--login` or `--input` given with no value | `flag-missing-value` |
 * | anything else that throws | `internal-error` |
 *
 * A null `data.user` is `api-error` and **not** `degraded-payload`: it is the
 * organisation-transfer and account-rename signal (design §The subject is a
 * person, not a repository), and conflating it with an empty calendar hides the
 * case. No diagnostic echoes the token or any request header (Req 7.6).
 *
 * **The last three rows are causes beyond Req 9.2's eleven**, which design
 * §Cause vocabulary calls "a floor, not a cap … where an undifferentiated cause
 * would misname a real state":
 *
 * - `input-unreadable` — an undifferentiated cause would misname this state, so
 *   it gets a slug of its own naming the errno. (§Error Handling 8 is the
 *   nearest precedent but licenses less: it has Component 2 report a local read
 *   error under its *existing* `gate-rejected` slug, not mint a new one.)
 *   `api-error` is scoped by §Error Handling 3 to a 200 carrying
 *   `errors` or a null `data.user`, and `request-failure` is false here because
 *   no request is issued — the same reversal §Component 1's `[v4]` note makes
 *   for the absent-token case. Read and parse share the slug, following
 *   Component 2's precedent where `gate-rejected` covers both an unreadable file
 *   and an unparseable one; the detail distinguishes them.
 * - `flag-missing-value` — `--input` or `--login` at the end of argv used to be
 *   dropped silently, which turns an operator typo into a network call against
 *   the wrong contract. Named, not inferred.
 * - `internal-error` — the catch-all, so Req 9.2's "name which condition caused
 *   an abort" survives conditions this table does not model (an `EACCES` on
 *   `content/`, a malformed day entry). It carries the thrown `name: message`,
 *   so the errno still reaches the operator; a bare stack trace is exactly what
 *   §Error Handling 8's "red run with a named cause rather than a Node stack
 *   trace" forbids. It never converts a failure into a success — every path
 *   through it returns 1 (Reqs 5.4, 9.1).
 *
 * @param {{ argv?: string[], env?: NodeJS.ProcessEnv, cwd?: string, nowMs?: number, fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<number>} process exit code — `0` on a successful write, `1` on any abort
 */
export async function main(options = {}) {
  const env = options.env ?? process.env;

  /** Set by `fail`, so the catch below cannot emit a second cause for one path. */
  let emitted = false;

  /**
   * The one emitter, and **total** — it never throws, under any condition.
   *
   * `::error::` goes to stdout **first and unconditionally**, then the
   * run-summary line is attempted **only when `GITHUB_STEP_SUMMARY` is set** —
   * `appendFileSync(undefined, …)` throws `ERR_INVALID_ARG_TYPE`, and this is
   * the writer the fallback ladder's second rung actually runs on a developer
   * machine, where the variable is unset.
   *
   * **Reason the append is caught (design §Cause vocabulary, `[v7]`):** the
   * variable can be *set* and the path still unwritable — a directory, a
   * read-only mount — and an `appendFileSync` that threw out of here propagated
   * into `main`'s catch, which called this emitter again. That put **two**
   * `::error::` cause lines on stdout, the second misnaming the abort
   * `internal-error`, and a raw Node stack trace on stderr: both the "exactly
   * one `::error::` cause per terminating path" rule and §Error Handling 8's
   * "named cause rather than a Node stack trace" (Req 9.2). A summary that
   * cannot be written now degrades quietly — the stdout cause line and the exit
   * code are unchanged, because stdout is the record Req 9.2 is about and the
   * summary is the convenience.
   *
   * @param {string} cause cause slug from design §Cause vocabulary
   * @param {string} detail one-line diagnostic, never containing a credential
   * @returns {1} the abort exit code, for `return fail(…)` at each call site
   */
  const fail = (cause, detail) => {
    emitted = true;
    console.log(`::error::${TAG} ${cause} ${detail}`);
    if (env.GITHUB_STEP_SUMMARY) {
      try {
        appendFileSync(env.GITHUB_STEP_SUMMARY, `FAILED — ${cause}\n`);
      } catch {
        /* the cause is already on stdout; the summary is not worth a second one */
      }
    }
    return 1;
  };

  try {
    return await refresh(options, fail);
  } catch (err) {
    // Req 9.2 holds for conditions the cause table does not model, not just the
    // ones it does. The thrown `name: message` carries the errno, and nothing
    // here reads a header or the token (Req 7.6). A path that already named its
    // cause is not renamed `internal-error` — one terminating path, one cause.
    if (emitted) {
      return 1;
    }
    return fail(
      "internal-error",
      `the refresh failed with an unhandled error: ${err?.name ?? typeof err}: ` +
        `${err?.message ?? String(err)}`,
    );
  }
}

/**
 * The refresh itself — everything `main` wraps in its cause-naming catch.
 *
 * Separated so the wrap costs no indentation and so `fail` is passed in rather
 * than re-declared: one emitter, one format, one place the summary guard lives.
 *
 * @param {{ argv?: string[], env?: NodeJS.ProcessEnv, cwd?: string, nowMs?: number, fetchImpl?: typeof fetch }} options
 * @param {(cause: string, detail: string) => 1} fail the emitter
 * @returns {Promise<number>} process exit code
 */
async function refresh(
  {
    argv = process.argv.slice(2),
    env = process.env,
    cwd = process.cwd(),
    nowMs = Date.now(),
    fetchImpl = globalThis.fetch,
  },
  fail,
) {
  let login = CONTRIBUTIONS_LOGIN;
  let inputFile = null;
  let seed = false;
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--login" || flag === "--input") {
      // A value-taking flag at the end of argv is an operator typo. Ignoring it
      // silently sent `--input` down the fetch path — a surprise network call
      // against the wrong contract — so it aborts by name instead.
      if (i + 1 >= argv.length) {
        return fail("flag-missing-value", `${flag} requires a value and none followed it.`);
      }
      if (flag === "--login") {
        login = argv[i + 1];
      } else {
        inputFile = argv[i + 1];
      }
      i += 1;
    } else if (flag === "--seed") {
      seed = true;
    }
  }

  const contentAbs = path.join(cwd, CONTENT_REL);

  // Req 5.5, checked as a precondition: an absent file is refused before a
  // request is issued, not after. `--seed` is the only relaxation (Req 13.4).
  if (!existsSync(contentAbs) && !seed) {
    return fail(
      "file-absent-no-seed",
      `${CONTENT_REL} does not exist and --seed was not passed, so this run will not create it. ` +
        `Recover with a workflow_dispatch carrying seed: true.`,
    );
  }

  /** @type {unknown} */
  let body;
  /** Names the response's origin in a diagnostic, without naming the token. */
  let source;

  if (inputFile !== null) {
    // Fallback rung 3: transform a response saved by `gh api graphql`. No token
    // is read here — this path exists for when the fetch itself is broken.
    source = `--input ${inputFile}`;
    try {
      body = JSON.parse(readFileSync(path.resolve(cwd, inputFile), "utf8"));
    } catch (err) {
      // A local `ENOENT`/`EACCES` on an operator-named file is neither the
      // `api-error` of design §Error Handling 3 — which is a 200 carrying
      // `errors` or a null `data.user` — nor a `request-failure`, since no
      // request was issued. §Cause vocabulary's "a floor, not a cap … where an
      // undifferentiated cause would misname a real state" licenses its own
      // slug, naming the errno.
      return fail(
        "input-unreadable",
        `${source} could not be read as a saved GraphQL response: ${err.message}`,
      );
    }
  } else {
    const token = env.GH_CONTRIBUTIONS_TOKEN;
    if (!token) {
      // No request was attempted, so this is not `request-failure`; Req 9.3
      // asks for an authentication-specific message and the variable name is
      // what distinguishes this trigger from the 401/403 one.
      return fail(
        "api-auth",
        `GH_CONTRIBUTIONS_TOKEN is not set, so the calendar query cannot be authenticated. ` +
          `It is required only on the fetch path — use --input <file> to transform a saved response.`,
      );
    }

    const { from, to } = requestBounds(nowMs);
    source = `login "${login}" over ${from} … ${to}`;

    /** @type {{ status: number, body: unknown, text: string }} */
    let result;
    try {
      result = await fetchCalendar({ login, from, to, token, fetchImpl });
    } catch (err) {
      return fail(
        "request-failure",
        `the calendar request threw or exceeded its ${FETCH_TIMEOUT_MS} ms bound ` +
          `(${err.name}: ${err.message}).`,
      );
    }

    if (result.status === 401 || result.status === 403) {
      return fail(
        "api-auth",
        `GitHub answered HTTP ${result.status} — the GH_CONTRIBUTIONS_TOKEN read token is ` +
          `rejected or expired. ${result.text.slice(0, 500)}`,
      );
    }

    if (result.status < 200 || result.status > 299) {
      // Everything non-2xx that is not 401/403 lands here, including a 5xx with
      // no `errors` envelope — which is `request-failure`, not unmapped.
      return fail(
        "request-failure",
        `GitHub answered HTTP ${result.status} for the calendar query. ` +
          `${result.text.slice(0, 500)}`,
      );
    }

    body = result.body;
  }

  const errors = body?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const messages = errors.map((e) => e?.message ?? String(e)).join("; ");
    return fail(
      "api-error",
      `the response from ${source} carries errors: ${messages.slice(0, 500)}`,
    );
  }

  if (!body?.data?.user) {
    return fail(
      "api-error",
      `data.user is null in the response from ${source}. The account was renamed, or the ` +
        `login now resolves to an organisation — see CONTRIBUTIONS_LOGIN.`,
    );
  }

  const records = flattenCalendar(body);
  if (records.length === 0) {
    return fail(
      "degraded-payload",
      `the response from ${source} carries zero contribution day records.`,
    );
  }

  // Req 3.3/5.4: the whole file is built in memory and swapped in by rename, so
  // no row is patched and a killed run cannot leave a truncated file behind.
  const bytes = formatActivityYaml(records);
  const tmpAbs = path.join(cwd, TMP_REL);
  try {
    writeFileSync(tmpAbs, bytes);
    renameSync(tmpAbs, contentAbs);
  } finally {
    // Unlink the transient. After a successful rename it is already gone, which
    // is the normal case, so absence is not an error — hence `force`. A cleanup
    // that itself fails (an unwritable `content/` answers the unlink with the
    // same `EACCES` that broke the write) must not replace the error `main`'s
    // catch is about to name, or the operator gets the second errno and not the
    // first.
    try {
      rmSync(tmpAbs, { force: true });
    } catch {
      /* the transient is discarded with the job; the write's own error stands */
    }
  }

  console.log(
    `${TAG} refreshed ${CONTENT_REL}: ${records.length} records, ` +
      `anchor ${records[records.length - 1].date}.`,
  );
  return 0;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
