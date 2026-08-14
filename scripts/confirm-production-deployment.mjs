#!/usr/bin/env node
/**
 * confirm-production-deployment.mjs
 *
 * Answers Req 10 — did the commit that was *actually pushed* produce a
 * **successful production** deployment? A commit that never deploys leaves the
 * site stale while every other signal in the run reads green, so this is the
 * only step that can tell a real refresh from a published-but-undeployed one.
 *
 * The module has two halves, the same split as
 * `scripts/sync-github-activity.mjs`. The **pure core** — `selectProductionDeployment`,
 * `latestStatus` and `classify`, plus the three pinned constants — is
 * clock-free and network-free, so `node --test` drives it against pinned
 * records. The **impure half** is `pollForDeployment`, which takes all three of
 * its impure dependencies as injected parameters (`fetchImpl`, `sleep`,
 * `nowMs`) so the ten-minute loop is drivable in milliseconds, and `main`
 * (argv, env, and the abort emitter). Nothing performs I/O at module scope; the
 * only invocation is behind the `import.meta.url` CLI guard, mirroring
 * `scripts/check-github-activity-freshness.mjs:279-281`.
 *
 * **Request construction and diagnostics follow `scripts/check-vercel-auto-deploy.mjs:77-105`;
 * its exit policy is deliberately not followed.** That script calls
 * `process.exit(1)` on any non-200, which is right for one request made
 * *before* anything has been mutated. This one makes up to ~36 requests
 * *after* the payload is already on `main`, where a single 502 from
 * `api.github.com` would be a red alarm about data that is fine and deployed.
 * The poll-error triage below is the split that replaces it.
 *
 * Dependencies: `node:` builtins only.
 */
import { appendFileSync } from "node:fs";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

/**
 * Prefix on every line this script emits.
 *
 * **Reason (design §Cause vocabulary, [v7]):** five things in this spec can
 * write a cause and all five emit `::error::[sync] <cause> <detail>`. The tag
 * is the spec's own prefix rather than this file's name, which is what makes a
 * cause greppable in a run log beside `ci.yml`'s output.
 */
const TAG = "[sync]";

/** Origin both polled endpoints share. Never carries the token — it goes in a header (Req 7.6). */
const GITHUB_API_ORIGIN = "https://api.github.com";

/**
 * Total time the loop may spend *deciding*, in milliseconds.
 *
 * **Reason (design §Pinned Constants):** ~an order of magnitude over the
 * measured 53–81 s push-to-record latency (Req 10.5).
 *
 * Enforced on **elapsed time**, not on iteration count (design §Component 3
 * [v7]): a worst-case iteration is two requests that each hang to
 * `DEPLOY_REQUEST_TIMEOUT_MS` plus the `DEPLOY_POLL_MS` sleep = 35 s, so
 * eighteen iterations would overshoot ten minutes if the loop counted
 * iterations. It does not — `nowMs()` is compared against the deadline before
 * each sleep and before each request. That bounds the *decision* to 600 000 ms
 * but not the *return*: a request begun at 599 s may run to
 * `DEPLOY_REQUEST_TIMEOUT_MS`, so the step can take up to 610 s. Req 10.5 asks
 * for an observation window, which this satisfies; the ten-second tail is
 * reporting latency, not extra waiting.
 */
export const DEPLOY_TIMEOUT_MS = 600_000;

/**
 * Interval between poll iterations, in milliseconds.
 *
 * **Reason (design §Pinned Constants):** comfortably below the measured
 * 53–81 s push-to-record latency, so the record is seen within a poll or two of
 * appearing, and it bounds a worst-case run at ≈ 36 authenticated API calls
 * against `GITHUB_TOKEN`'s 1 000/hour/repo — ≈ 28× headroom.
 *
 * The loop passes **this constant** to `sleep`, never a hardcoded interval: a
 * hardcoded 15 000 satisfies every assertion a test can make while falsifying
 * the rate-limit arithmetic above the moment anyone retunes the constant.
 */
export const DEPLOY_POLL_MS = 15_000;

/**
 * Bound on each individual poll request, in milliseconds.
 *
 * **Reason (design §Pinned Constants):** per-request `AbortSignal.timeout`, so
 * one hung connection cannot consume the 10-minute budget.
 */
export const DEPLOY_REQUEST_TIMEOUT_MS = 10_000;

/**
 * Poll responses that are **not** worth retrying (design §Component 3's
 * poll-error table).
 *
 * 403 is the reachable one — the repository is public, so a token lacking
 * `deployments: read` gets "Resource not accessible by integration", never 404
 * (Assumption A5: an organisation policy can cap what a workflow may request).
 * 404 means a malformed URL or a deleted deployment, and 401 a bad credential.
 * All three are bugs or denials that will still be bugs or denials in ten
 * minutes, so retrying them for the full bound and then reporting
 * `deploy-timeout` is the misnaming Req 10.4's own note calls a harm.
 */
const FATAL_POLL_STATUSES = new Set([401, 403, 404]);

/**
 * Epoch milliseconds for a record's `created_at`, or `-Infinity`.
 *
 * `Date.parse` is the pinned comparison (not string ordering), so an
 * offset-form timestamp (`2026-08-14T09:00:00+00:00`) and the `Z` form of the
 * same instant compare **identically** rather than sorting by their spelling.
 * An unparseable or absent value sinks to `-Infinity` so it can never outrank a
 * real timestamp, while still remaining selectable when it is the only
 * candidate.
 *
 * @param {unknown} record
 * @returns {number}
 */
function createdAtMs(record) {
  const parsed = Date.parse(record?.created_at);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

/**
 * The element with the greatest `created_at`; ties resolve to the **earlier**
 * element in response order.
 *
 * The strict `>` is what pins the tie-break: an equal timestamp does not
 * displace the incumbent. Pinned rather than left to sort stability so a
 * two-record SHA cannot select differently between runs.
 *
 * @template T
 * @param {T[]} items
 * @returns {T | null}
 */
function greatestByCreatedAt(items) {
  let best = null;
  let bestMs = Number.NEGATIVE_INFINITY;
  let seen = false;
  for (const item of items) {
    const ms = createdAtMs(item);
    if (!seen || ms > bestMs) {
      best = item;
      bestMs = ms;
      seen = true;
    }
  }
  return best;
}

/**
 * The production deployment record for a SHA, or `null`.
 *
 * A record counts as production when its `environment` string, **trimmed and
 * lower-cased, equals `production` exactly** (Req 10.2). Exact equality is what
 * makes this filter meaningful: across all 156 deployment records in this
 * repository the complete vocabulary is `Production` (58), `Preview` (97) and
 * `Preview – matthewfield-ca` (1), so equality selects every production build
 * and excludes every preview. A prefix or `includes` rule would also admit a
 * qualified `Production – <something>`, which signals that a human must decide
 * which project serves visitors — the workflow does not guess.
 *
 * **`production_environment` is never read.** It is `false` on Production and
 * Preview records alike (Assumption A1, re-confirmed `false` on all 20 sampled
 * records across both environments), so branching on it would confirm a
 * Preview build and report green while production froze.
 *
 * Among the survivors the greatest `created_at` wins (Req 10.3's [v8]
 * tie-break) — among production records for one commit, the newest is the
 * current one.
 *
 * @param {unknown[]} records deployments-list response
 * @returns {object | null}
 */
export function selectProductionDeployment(records) {
  const list = Array.isArray(records) ? records : [];
  const production = list.filter(
    (record) =>
      typeof record?.environment === "string" &&
      record.environment.trim().toLowerCase() === "production",
  );
  return greatestByCreatedAt(production);
}

/**
 * The latest deployment status — the one with the greatest `created_at`,
 * **not** the last array position (Req 10.3).
 *
 * Array position is not a proxy for recency here: this repository contains a
 * real multi-status deployment (`4811291063`, two statuses 18 minutes apart),
 * and the statuses endpoint's ordering is not part of any contract this spec
 * may rely on.
 *
 * @param {unknown[]} statuses deployment-statuses response
 * @returns {object | null}
 */
export function latestStatus(statuses) {
  const list = Array.isArray(statuses) ? statuses : [];
  return greatestByCreatedAt(list);
}

/**
 * The four verdicts, pure.
 *
 * | Input | Verdict |
 * |---|---|
 * | no records for the SHA | `pending` |
 * | records present, none exactly `Production` | `unknown-environment` |
 * | production record present, no status yet or a non-terminal status | `pending` |
 * | latest status `success` | `confirmed` |
 * | latest status `failure`, `error` or `inactive` | `not-success` |
 *
 * **An empty list is `pending`, never `unknown-environment`** (Req 10.2 [v7]).
 * `[]` means Vercel has not created the record yet — the normal state for the
 * first 53–81 seconds after a push — and the two states are cleanly
 * distinguishable, so the fail-fast is evaluated only once at least one record
 * has been seen. Collapsing them would fail every healthy run within seconds.
 *
 * Residual risk `d-3079c159`: if a Preview record for the sync SHA ever arrives
 * *before* the Production one, `unknown-environment` fires early on a healthy
 * sync. Never observed across all 156 deployment records; implemented verbatim
 * because the criterion is approved and the risk is capped and recorded.
 *
 * Residual risk `d-ae7216b4`: GitHub's `auto_inactive` marks a *superseded*
 * deployment `inactive`, so a success superseded inside the poll window reads
 * as a failure. The single `inactive` in this repository's history follows a
 * `failure`, not a `success`.
 *
 * **The verdict is the only decision returned.** The `environment` values seen
 * come back alongside it so the `deploy-environment-unrecognised` diagnostic
 * can name them without recomputing the list; the deployment id and the status
 * object are deliberately *not* returned, because the design's `classify`
 * signature is the more specific text and the caller recovers both from the
 * exported `selectProductionDeployment` / `latestStatus` when it needs them.
 *
 * @param {{ records?: unknown[], statuses?: unknown[] }} input
 * @returns {{ verdict: "pending" | "confirmed" | "not-success" | "unknown-environment",
 *            environments: string[] }}
 */
export function classify({ records, statuses } = {}) {
  const list = Array.isArray(records) ? records : [];
  const environments = list.map((record) =>
    typeof record?.environment === "string" ? record.environment : String(record?.environment),
  );

  if (list.length === 0) {
    return { verdict: "pending", environments };
  }

  if (selectProductionDeployment(list) === null) {
    return { verdict: "unknown-environment", environments };
  }

  const latest = latestStatus(statuses);
  if (latest === null) {
    return { verdict: "pending", environments };
  }

  const state = typeof latest.state === "string" ? latest.state.trim().toLowerCase() : "";
  if (state === "success") {
    return { verdict: "confirmed", environments };
  }
  if (state === "failure" || state === "error" || state === "inactive") {
    return { verdict: "not-success", environments };
  }
  return { verdict: "pending", environments };
}

/**
 * The body of a non-2xx response, truncated, or `""`.
 *
 * Total by construction — a stub without `text()`, or a `text()` that rejects,
 * degrades to the empty string rather than throwing out of the triage and
 * turning a retryable poll error into an unhandled rejection. The truncation
 * mirrors `scripts/check-vercel-auto-deploy.mjs:95`.
 *
 * @param {{ text?: () => Promise<string> }} res
 * @returns {Promise<string>}
 */
async function readBodyText(res) {
  if (typeof res?.text !== "function") {
    return "";
  }
  const text = await res.text().catch(() => "");
  return typeof text === "string" ? text.slice(0, 500) : "";
}

/**
 * One bounded request, triaged per design §Component 3's poll-error table.
 *
 * | Poll outcome | Result |
 * |---|---|
 * | thrown request (including the `AbortSignal.timeout`) | `retry` |
 * | 401, 403, 404 | `fatal` |
 * | 5xx, 429 | `retry` |
 * | any other non-2xx | `retry` |
 * | 2xx whose body is not JSON | `retry` |
 * | 2xx | `ok` |
 *
 * The "any other non-2xx" row is the one the design's table does not name
 * (a 400 or 422 from `api.github.com`). It retries rather than aborting because
 * the four-slug vocabulary this component may use is closed, and
 * `deploy-api-unavailable` is defined as *401/403/404, or an absent `GH_TOKEN`* —
 * so naming an unmodelled status with it would widen a slug the design pins to
 * two branches. `deploy-timeout` is the backstop, exactly as it is for a 5xx.
 *
 * Branches on `res.status`, never on `res.ok`: the injected stubs return
 * `{ status, json(), text() }` and nothing else, so an `ok`-based branch would
 * be undrivable in test.
 *
 * Nothing this returns echoes the token or any request header (Req 7.6) — the
 * credential is set on the `Authorization` header and never read back.
 *
 * @param {string} url
 * @param {string} token
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<{ kind: "ok", body: unknown }
 *                 | { kind: "retry", note: string }
 *                 | { kind: "fatal", status: number, note: string }>}
 */
async function pollRequest(url, token, fetchImpl) {
  let res;
  try {
    res = await fetchImpl(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "confirm-production-deployment",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      // One hung connection cannot consume the whole 10-minute budget.
      signal: AbortSignal.timeout(DEPLOY_REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    return {
      kind: "retry",
      note: `GET ${url} threw ${err?.name ?? typeof err}: ` + `${err?.message ?? String(err)}`,
    };
  }

  const status = Number(res?.status);

  if (FATAL_POLL_STATUSES.has(status)) {
    const body = await readBodyText(res);
    return {
      kind: "fatal",
      status,
      note: `GET ${url} returned HTTP ${status}${body ? ` with body: ${body}` : ""}`,
    };
  }

  if (!(status >= 200 && status <= 299)) {
    const body = await readBodyText(res);
    return {
      kind: "retry",
      note: `GET ${url} returned HTTP ${status}${body ? ` with body: ${body}` : ""}`,
    };
  }

  try {
    return { kind: "ok", body: await res.json() };
  } catch (err) {
    return {
      kind: "retry",
      note:
        `GET ${url} returned HTTP ${status} with a body that is not JSON: ` +
        `${err?.name ?? typeof err}: ${err?.message ?? String(err)}`,
    };
  }
}

/**
 * Polls until the pushed commit's production deployment is confirmed, or until
 * a terminal state or the elapsed-time bound ends the wait.
 *
 * **All three impure dependencies are injected** so the loop is drivable in
 * milliseconds: `fetchImpl` scripts the responses, `sleep` advances the fake
 * clock, and `nowMs` — a **function**, not a scalar reading — is what makes
 * `elapsed >= DEPLOY_TIMEOUT_MS` expressible without calling `Date.now()`
 * directly. A scalar would force the loop to count iterations instead, making
 * `DEPLOY_TIMEOUT_MS` decorative and unbinding the test from Req 10.5's bound.
 *
 * The deadline is checked **before each sleep and before each request**, so no
 * request is issued after it has passed.
 *
 * The list query uses the **full 40-character SHA** (Req 10.1) — an abbreviated
 * SHA returns zero results, which this loop would read as "not created yet" and
 * ride all the way to `deploy-timeout`.
 *
 * This function decides; it does not report. It returns the cause and the
 * detail and lets `main` own the single emitter, so one terminating path can
 * only ever produce one `::error::` line.
 *
 * @param {{ repo: string, sha: string, token: string,
 *           fetchImpl?: typeof fetch,
 *           sleep?: (ms: number) => Promise<unknown>,
 *           nowMs?: () => number }} options
 * @returns {Promise<{ confirmed: boolean, cause: string | null, detail: string }>}
 */
export async function pollForDeployment({
  repo,
  sha,
  token,
  fetchImpl = globalThis.fetch,
  sleep = delay,
  nowMs = Date.now,
}) {
  const listUrl = `${GITHUB_API_ORIGIN}/repos/${repo}/deployments?sha=${sha}`;
  const deadline = nowMs() + DEPLOY_TIMEOUT_MS;
  let lastObserved = "no deployment record for the SHA had appeared";

  const timedOut = () => ({
    confirmed: false,
    cause: "deploy-timeout",
    detail:
      `no successful Production deployment for ${sha} in ${repo} was observed within ` +
      `${DEPLOY_TIMEOUT_MS} ms (DEPLOY_TIMEOUT_MS); last observed: ${lastObserved}.`,
  });

  const apiUnavailable = (result) => ({
    confirmed: false,
    cause: "deploy-api-unavailable",
    detail:
      `the GitHub deployments API returned HTTP ${result.status}, which no amount of retrying ` +
      `changes: ${result.note}.`,
  });

  for (let iteration = 0; ; iteration += 1) {
    if (iteration > 0) {
      // The bound, checked before the sleep.
      if (nowMs() >= deadline) {
        return timedOut();
      }
      // DEPLOY_POLL_MS, not a hardcoded interval — the constant is what the
      // rate-limit arithmetic in its own doc comment is computed from.
      await sleep(DEPLOY_POLL_MS);
    }

    // The bound, checked before the request.
    if (nowMs() >= deadline) {
      return timedOut();
    }

    const listed = await pollRequest(listUrl, token, fetchImpl);
    if (listed.kind === "fatal") {
      return apiUnavailable(listed);
    }
    if (listed.kind === "retry") {
      lastObserved = listed.note;
      console.log(`${TAG} poll: ${listed.note} — transient, retrying.`);
      continue;
    }

    const records = Array.isArray(listed.body) ? listed.body : [];

    // Empty means Vercel has not created the record yet. Keep polling — Req
    // 10.2's fail-fast is evaluated only once at least one record has been
    // seen, and `classify` enforces the same thing independently.
    const selected = records.length > 0 ? selectProductionDeployment(records) : null;

    let statuses = [];
    if (selected !== null) {
      const statusesUrl =
        `${GITHUB_API_ORIGIN}/repos/${repo}/deployments/` +
        `${encodeURIComponent(String(selected.id))}/statuses`;
      const got = await pollRequest(statusesUrl, token, fetchImpl);
      if (got.kind === "fatal") {
        return apiUnavailable(got);
      }
      if (got.kind === "retry") {
        lastObserved = got.note;
        console.log(`${TAG} poll: ${got.note} — transient, retrying.`);
        continue;
      }
      statuses = Array.isArray(got.body) ? got.body : [];
    }

    const { verdict, environments } = classify({ records, statuses });

    if (verdict === "confirmed") {
      const latest = latestStatus(statuses);
      return {
        confirmed: true,
        cause: null,
        detail:
          `production deployment ${selected.id} for ${sha} in ${repo} reported success ` +
          `(status created_at ${latest?.created_at ?? "unknown"}).`,
      };
    }

    if (verdict === "not-success") {
      const latest = latestStatus(statuses);
      return {
        confirmed: false,
        cause: "deploy-not-success",
        detail:
          `production deployment ${selected.id} for ${sha} in ${repo} reported ` +
          `${JSON.stringify(latest?.state)} as its latest status, a terminal non-success state. ` +
          `No deployment in this repository's history has ever moved from one back to success, ` +
          `so this fails now rather than waiting out DEPLOY_TIMEOUT_MS.`,
      };
    }

    if (verdict === "unknown-environment") {
      return {
        confirmed: false,
        cause: "deploy-environment-unrecognised",
        detail:
          `${records.length} deployment record(s) exist for ${sha} in ${repo} but none has an ` +
          `environment equal to "Production"; the values seen were ` +
          `${environments.map((value) => JSON.stringify(value)).join(", ")}. A qualified ` +
          `production name means the project topology may have changed and a human must decide ` +
          `which project serves visitors.`,
      };
    }

    lastObserved =
      selected === null
        ? `${records.length} record(s) for the SHA, none production yet`
        : `production deployment ${selected.id} with ${statuses.length} status(es), latest ` +
          `${JSON.stringify(latestStatus(statuses)?.state ?? null)}`;
    console.log(`${TAG} poll: pending — ${lastObserved}.`);
  }
}

/**
 * CLI entry point.
 *
 * **Input contract** (design §Component 3's `main(sha)` contract):
 *
 * | Input | Source |
 * |---|---|
 * | the full 40-character SHA | `process.argv[2]`, passed as `"$PUSH_SHA"` |
 * | repository | env `GITHUB_REPOSITORY`, injected by Actions |
 * | token | env `GH_TOKEN`, routed as `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` |
 *
 * **An absent or malformed `argv[2]` is a hard error, never `exit 0`.** This
 * script must not decide whether a push happened — Req 10.6 is the *workflow's*
 * obligation, discharged by its four `exit 0` sites before this script is
 * invoked at all. A tempting "if argv[2] is empty, exit 0" branch here would
 * convert an empty `PUSH_SHA` from a loud failure into a silent green, which is
 * the unfiltered-deployment defect this whole component exists to close.
 *
 * That branch is also the module's **one deliberate departure** from the design
 * invariant that every terminating path carries a cause or an outcome: it exits
 * non-zero with a plain diagnostic and **no cause slug**, because the closed
 * four-slug vocabulary has none for it and reaching this script without a SHA
 * is the workflow's bug rather than a runtime condition to name. The departure
 * is recorded here rather than papered over.
 *
 * **An absent `GITHUB_REPOSITORY` deliberately has no branch of its own.**
 * Actions injects it unconditionally; when it is absent the list URL is
 * malformed and the API is **expected** to answer 404 — that status is
 * *inferred* from the malformed path, **not measured**, because no run has been
 * made without the variable. Design §Component 3 already reads a 404 as "a
 * malformed URL … a bug, not a denial" and reports it as
 * `deploy-api-unavailable` naming the status, with the malformed URL in the
 * detail; were the real status something else, the triage above would retry and
 * the run would end at `deploy-timeout` with the malformed URL still in the
 * detail. Minting a branch for it would add a third trigger to a slug the
 * design pins to two.
 *
 * @param {string} sha the full 40-character SHA of the commit actually pushed
 * @param {{ env?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch,
 *           sleep?: (ms: number) => Promise<unknown>, nowMs?: () => number }} [options]
 * @returns {Promise<number>} process exit code — `0` on a confirmed deployment, `1` otherwise
 */
export async function main(sha, options = {}) {
  const env = options.env ?? process.env;

  /**
   * The one cause emitter, and **total** — it never throws, under any condition.
   *
   * `::error::` goes to stdout **first and unconditionally**, then the
   * run-summary line is attempted **only when `GITHUB_STEP_SUMMARY` is set**:
   * `appendFileSync(undefined, …)` throws `ERR_INVALID_ARG_TYPE`, and an unset
   * variable is the normal case outside Actions.
   *
   * The append is *also* caught, because the variable can be set and the path
   * still unwritable — a directory, a read-only mount. An `appendFileSync` that
   * threw out of here would propagate to the caller and produce a second,
   * contradictory `::error::` line plus a raw Node stack trace, breaking both
   * the "exactly one `::error::` cause per terminating path" rule and Req 9.2's
   * named cause. A summary that cannot be written degrades quietly: stdout is
   * the record Req 9.2 is about, and the summary is the convenience.
   *
   * This component writes both lines itself because the workflow's `fail` is a
   * **shell function in the run step**, not something a Node script can call.
   *
   * @param {string} cause one of the four slugs design §Cause vocabulary gives this component
   * @param {string} detail one-line diagnostic, never containing a credential
   * @returns {1} the abort exit code, for `return fail(…)` at each call site
   */
  const fail = (cause, detail) => {
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

  const candidate = typeof sha === "string" ? sha.trim() : "";
  if (!/^[0-9a-f]{40}$/i.test(candidate)) {
    // No cause slug — see the note above. Plain diagnostic on stderr, so it
    // cannot be mistaken for the `::error::` annotation contract.
    console.error(
      `${TAG} confirm-production-deployment expects the full 40-character SHA of the commit ` +
        `actually pushed as its first argument, and received ${JSON.stringify(sha ?? null)}. ` +
        `This is a workflow bug: the sync workflow exits 0 before invoking this script when ` +
        `nothing was pushed (Req 10.6), so reaching it without a SHA means PUSH_SHA was never ` +
        `set. An abbreviated SHA is refused too — it returns zero results (Req 10.1).`,
    );
    return 1;
  }

  const token = env.GH_TOKEN;
  if (!token) {
    // The second of `deploy-api-unavailable`'s two blessed branches. It is kept
    // distinct from the 401/403/404 branch by its detail — a variable name
    // rather than an HTTP status — exactly as `api-auth`'s two triggers are.
    // It exists to stop an anonymous poll before it starts: unauthenticated
    // reads are capped at 60/hour keyed to the *runner's IP*, a limit shared
    // with every other anonymous caller on that host, against ≈ 28× headroom on
    // a per-repository limit the token makes private to this repository.
    return fail(
      "deploy-api-unavailable",
      `GH_TOKEN is not set, so the deployments API would be polled anonymously against a ` +
        `60/hour limit shared across the runner's IP instead of this repository's own ` +
        `1 000/hour. Route it in the step's env: as GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}.`,
    );
  }

  const result = await pollForDeployment({
    repo: env.GITHUB_REPOSITORY ?? "",
    sha: candidate,
    token,
    fetchImpl: options.fetchImpl,
    sleep: options.sleep,
    nowMs: options.nowMs,
  });

  if (result.confirmed) {
    console.log(`${TAG} ${result.detail}`);
    return 0;
  }

  return fail(result.cause, result.detail);
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv[2]);
}
