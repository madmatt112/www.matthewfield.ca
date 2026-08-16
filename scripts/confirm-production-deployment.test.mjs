/**
 * confirm-production-deployment.test.mjs
 *
 * Self-tests for scripts/confirm-production-deployment.mjs (Reqs 10.2, 10.3,
 * 10.4, 10.5). Runs via `node --test` and is wired as its own CI step, so the
 * criterion does not mandate shelfware.
 *
 * Vitest's include pattern targets `src/**`, so this file lives outside
 * Vitest's scope on purpose — invoke with
 * `node --test scripts/confirm-production-deployment.test.mjs`.
 *
 * Four things are held here:
 *
 * 1. **`selectProductionDeployment` against the measured vocabulary.** Across
 *    all 156 deployment records in this repository the complete `environment`
 *    vocabulary is `Production` (58), `Preview` (97) and
 *    `Preview – matthewfield-ca` (1). The cases below use those three strings
 *    verbatim, plus whitespace and case variants of `Production`, plus a
 *    *qualified* `Production – x` asserted **not** selected — that last one is
 *    the whole point of exact equality over a prefix rule, and the only case
 *    that distinguishes them.
 * 2. **The two `created_at` tie-breaks** — among production records for one
 *    SHA (Req 10.3 [v8]) and among statuses for one deployment (Req 10.3).
 *    Both are asserted against arrays whose *position* order contradicts their
 *    *time* order, so an implementation that read the last element would fail.
 * 3. **`classify`'s four verdicts**, including the one that is easiest to get
 *    wrong: `[]` is `pending`, never `unknown-environment` (Req 10.2 [v7]).
 * 4. **`pollForDeployment` driven through its three injected dependencies.**
 *    `fetchImpl` scripts the responses *by call index* — a URL-keyed mock such
 *    as `scripts/__fetch-mock-loader.mjs` is stateless and so cannot express
 *    "call 2 differs from call 1", which the 502-then-success case is entirely
 *    about. `sleep` and `nowMs` share a fake clock, so the ten-minute bound is
 *    exercised in microseconds and the suite never waits in real time.
 *
 * **The timeout case is asserted at the elapsed-time bound, not at an iteration
 * count.** `expectedRequests` derives the count from `DEPLOY_TIMEOUT_MS`,
 * `DEPLOY_POLL_MS` and the per-iteration cost, and the same always-empty script
 * is run four times with different per-iteration costs and different effective
 * budgets. A loop that counted iterations would give the *same* count in all
 * four; the expectations here are 40, 24, 20 and 10.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEPLOY_POLL_MS,
  DEPLOY_REQUEST_TIMEOUT_MS,
  DEPLOY_TIMEOUT_MS,
  classify,
  latestStatus,
  pollForDeployment,
  selectProductionDeployment,
} from "./confirm-production-deployment.mjs";

/**
 * U+2013 EN DASH — **not** a hyphen-minus.
 *
 * Written as an escape rather than as a literal so the character cannot be
 * silently downgraded to `-` by an editor, a terminal or a patch round-trip.
 * The distinction is load-bearing: `Preview – matthewfield-ca` is a measured
 * value from this repository's deployment history, and a hyphenated lookalike
 * would test a string that has never existed.
 */
const EN_DASH = "\u2013";

/** The three measured `environment` values, verbatim. */
const ENV_PRODUCTION = "Production";
const ENV_PREVIEW = "Preview";
const ENV_PREVIEW_QUALIFIED = `Preview ${EN_DASH} matthewfield-ca`;

/**
 * A *qualified* production name. Never observed in this repository; it is the
 * input that separates exact equality from a prefix or `includes` rule, and the
 * one the workflow must refuse to guess about.
 */
const ENV_PRODUCTION_QUALIFIED = `Production ${EN_DASH} x`;

const REPO = "madmatt112/matthew-field.ca";
const SHA = "0123456789abcdef0123456789abcdef01234567";
const LIST_URL = `https://api.github.com/repos/${REPO}/deployments?sha=${SHA}`;

/** Not a credential — `pollForDeployment` only needs a truthy token to send. */
const DUMMY_TOKEN = "dummy-token-for-tests";

/**
 * @param {number|string} id
 * @param {string} environment
 * @param {string} createdAt
 * @returns {object} a deployments-list record, shaped like the real one
 */
function record(id, environment, createdAt) {
  // `production_environment` is `false` on Production and Preview records
  // alike (Assumption A1), and is present here precisely so a test would still
  // pass if the module started reading it — which is why no assertion below
  // depends on it and every assertion depends on `environment`.
  return { id, environment, created_at: createdAt, production_environment: false };
}

/**
 * @param {string} state
 * @param {string} createdAt
 * @returns {object} a deployment-statuses record
 */
function status(state, createdAt) {
  return { state, created_at: createdAt };
}

// --- selectProductionDeployment: the measured vocabulary ---

test("the measured vocabulary — Production is selected, both Preview forms are not", () => {
  const production = record(1, ENV_PRODUCTION, "2026-08-14T10:00:00Z");
  const records = [
    record(2, ENV_PREVIEW, "2026-08-14T10:05:00Z"),
    production,
    record(3, ENV_PREVIEW_QUALIFIED, "2026-08-14T10:06:00Z"),
  ];
  // Both previews are newer than the production record, so a rule that ignored
  // `environment` and took the newest record would select the wrong one.
  assert.equal(selectProductionDeployment(records), production);
});

test("a SHA with only Preview records selects nothing", () => {
  const records = [
    record(2, ENV_PREVIEW, "2026-08-14T10:05:00Z"),
    record(3, ENV_PREVIEW_QUALIFIED, "2026-08-14T10:06:00Z"),
  ];
  assert.equal(selectProductionDeployment(records), null);
});

test("whitespace and case variants of Production are selected", () => {
  for (const environment of [
    "Production",
    "production",
    "PRODUCTION",
    "pRoDuCtIoN",
    "  Production  ",
    "\tProduction\n",
    " production ",
  ]) {
    const only = record(1, environment, "2026-08-14T10:00:00Z");
    assert.equal(
      selectProductionDeployment([only]),
      only,
      `not selected: ${JSON.stringify(environment)}`,
    );
  }
});

test("a qualified `Production – x` is NOT selected — exact equality, not a prefix", () => {
  const qualified = record(9, ENV_PRODUCTION_QUALIFIED, "2026-08-14T12:00:00Z");
  assert.equal(selectProductionDeployment([qualified]), null);

  // Even alongside a genuine — and *older* — Production record, the qualified
  // one never wins. A prefix or `includes` rule would select it here, because
  // it is the newer of the two.
  const production = record(1, ENV_PRODUCTION, "2026-08-14T10:00:00Z");
  assert.equal(selectProductionDeployment([production, qualified]), production);
});

test("near-misses that are not exactly `production` are not selected", () => {
  for (const environment of ["Productions", "pre-production", "Production-", "prod", ""]) {
    assert.equal(
      selectProductionDeployment([record(1, environment, "2026-08-14T10:00:00Z")]),
      null,
      `wrongly selected: ${JSON.stringify(environment)}`,
    );
  }
});

// --- selectProductionDeployment: the multi-record tie-break (Req 10.3 [v8]) ---

test("among several Production records the greatest created_at wins, not the last position", () => {
  const newest = record(3, ENV_PRODUCTION, "2026-08-14T12:00:00Z");
  const records = [
    record(1, ENV_PRODUCTION, "2026-08-14T10:00:00Z"),
    newest,
    record(2, ENV_PRODUCTION, "2026-08-14T11:00:00Z"),
  ];
  // The newest sits in the middle, so array position cannot be standing in for
  // recency here.
  assert.equal(selectProductionDeployment(records), newest);
});

test("equal created_at resolves to the earlier element, not the later", () => {
  const first = record(1, ENV_PRODUCTION, "2026-08-14T10:00:00Z");
  const second = record(2, ENV_PRODUCTION, "2026-08-14T10:00:00Z");
  assert.equal(selectProductionDeployment([first, second]), first);
  assert.equal(selectProductionDeployment([second, first]), second);
});

test("an offset-form timestamp compares equal to the Z form of the same instant", () => {
  const zForm = record(1, ENV_PRODUCTION, "2026-08-14T10:00:00Z");
  const offsetForm = record(2, ENV_PRODUCTION, "2026-08-14T12:00:00+02:00");
  // Same instant. String ordering would rank "2026-08-14T12:00:00+02:00" above
  // the Z form; `Date.parse` makes them a tie, which the incumbent keeps.
  assert.equal(selectProductionDeployment([zForm, offsetForm]), zForm);
});

test("a record with an absent or unparseable created_at never outranks a real one", () => {
  const real = record(1, ENV_PRODUCTION, "2026-08-14T10:00:00Z");
  const undated = record(2, ENV_PRODUCTION, "not-a-timestamp");
  const missing = { id: 3, environment: ENV_PRODUCTION };
  assert.equal(selectProductionDeployment([real, undated, missing]), real);
  assert.equal(selectProductionDeployment([undated, missing, real]), real);
  // Still selectable when it is the only candidate.
  assert.equal(selectProductionDeployment([undated]), undated);
});

test("a non-array, an empty list and malformed members select nothing and do not throw", () => {
  assert.equal(selectProductionDeployment([]), null);
  assert.equal(selectProductionDeployment(undefined), null);
  assert.equal(selectProductionDeployment(null), null);
  assert.equal(selectProductionDeployment({ environment: ENV_PRODUCTION }), null);
  assert.equal(selectProductionDeployment([null, undefined, 7, { environment: 5 }]), null);
});

// --- latestStatus: greatest created_at, not array position (Req 10.3) ---

test("latestStatus takes the greatest created_at even when it is first in the array", () => {
  const newest = status("success", "2026-08-14T10:18:00Z");
  // Modelled on this repository's real multi-status deployment 4811291063,
  // whose two statuses are 18 minutes apart.
  const statuses = [newest, status("in_progress", "2026-08-14T10:00:00Z")];
  assert.equal(latestStatus(statuses), newest);
});

test("latestStatus over an empty list, a non-array and a single undated status", () => {
  assert.equal(latestStatus([]), null);
  assert.equal(latestStatus(undefined), null);
  const undated = status("success", "whenever");
  assert.equal(latestStatus([undated]), undated);
});

// --- classify: the four verdicts ---

test("classify — no records at all is pending, never unknown-environment", () => {
  // Req 10.2 [v7]: `[]` is the normal state for the first 53–81 seconds after a
  // push. Collapsing it into the fail-fast would fail every healthy run.
  assert.deepEqual(classify({ records: [], statuses: [] }), {
    verdict: "pending",
    environments: [],
  });
  assert.deepEqual(classify({}), { verdict: "pending", environments: [] });
  assert.deepEqual(classify(), { verdict: "pending", environments: [] });
});

test("classify — a production record with no status yet is pending", () => {
  const records = [record(1, ENV_PRODUCTION, "2026-08-14T10:00:00Z")];
  assert.equal(classify({ records, statuses: [] }).verdict, "pending");
  assert.equal(classify({ records }).verdict, "pending");
});

test("classify — a non-terminal latest status is pending", () => {
  const records = [record(1, ENV_PRODUCTION, "2026-08-14T10:00:00Z")];
  for (const state of ["queued", "pending", "in_progress", "IN_PROGRESS", " queued "]) {
    assert.equal(
      classify({ records, statuses: [status(state, "2026-08-14T10:01:00Z")] }).verdict,
      "pending",
      `not pending for state ${JSON.stringify(state)}`,
    );
  }
});

test("classify — latest status success is confirmed, decided by time and not by position", () => {
  const records = [record(1, ENV_PRODUCTION, "2026-08-14T10:00:00Z")];
  const statuses = [
    status("success", "2026-08-14T10:18:00Z"),
    status("failure", "2026-08-14T10:00:00Z"),
  ];
  // The failure is last in the array but older. Reading array position would
  // report a healthy deployment as failed.
  assert.equal(classify({ records, statuses }).verdict, "confirmed");
  // Case and surrounding whitespace do not change the verdict.
  assert.equal(
    classify({ records, statuses: [status(" SUCCESS ", "2026-08-14T10:18:00Z")] }).verdict,
    "confirmed",
  );
});

test("classify — the three terminal non-success states are not-success", () => {
  const records = [record(1, ENV_PRODUCTION, "2026-08-14T10:00:00Z")];
  for (const state of ["failure", "error", "inactive"]) {
    assert.equal(
      classify({ records, statuses: [status(state, "2026-08-14T10:18:00Z")] }).verdict,
      "not-success",
      `not not-success for state ${JSON.stringify(state)}`,
    );
  }
  // A later failure supersedes an earlier success, by time rather than position.
  const statuses = [
    status("failure", "2026-08-14T10:18:00Z"),
    status("success", "2026-08-14T10:00:00Z"),
  ];
  assert.equal(classify({ records, statuses }).verdict, "not-success");
});

test("classify — records present but none exactly Production is unknown-environment", () => {
  const records = [
    record(2, ENV_PREVIEW, "2026-08-14T10:05:00Z"),
    record(3, ENV_PREVIEW_QUALIFIED, "2026-08-14T10:06:00Z"),
  ];
  const { verdict, environments } = classify({ records, statuses: [] });
  assert.equal(verdict, "unknown-environment");
  // The values seen come back so the diagnostic can name them.
  assert.deepEqual(environments, [ENV_PREVIEW, ENV_PREVIEW_QUALIFIED]);
});

test("classify — a qualified `Production – x` is unknown-environment, not confirmed", () => {
  const records = [record(9, ENV_PRODUCTION_QUALIFIED, "2026-08-14T10:00:00Z")];
  const statuses = [status("success", "2026-08-14T10:18:00Z")];
  // A successful status on a record nobody can vouch for is exactly the case a
  // human must decide: it must not read as `confirmed`.
  const { verdict, environments } = classify({ records, statuses });
  assert.equal(verdict, "unknown-environment");
  assert.deepEqual(environments, [ENV_PRODUCTION_QUALIFIED]);
});

test("classify — a non-string environment is reported without throwing", () => {
  const { verdict, environments } = classify({ records: [{ id: 1, environment: null }] });
  assert.equal(verdict, "unknown-environment");
  assert.deepEqual(environments, ["null"]);
});

// --- pollForDeployment: driven through injected fetchImpl, sleep and nowMs ---

/**
 * A fake clock plus a call-indexed `fetchImpl`.
 *
 * `sleep` advances the clock by the milliseconds it is handed and returns
 * immediately, so nothing waits in real time; `nowMs` reads that same clock,
 * scaled by `clockScale`. Scaling is how a *different* `DEPLOY_TIMEOUT_MS` is
 * simulated without reassigning an exported constant: a clock that ticks twice
 * as fast against a fixed 600 000 ms budget is arithmetically identical to a
 * 300 000 ms budget against a normal clock.
 *
 * `requestCostMs` is how long each request appears to take. It exists so the
 * per-iteration cost can be varied independently of the number of iterations —
 * which is what separates an elapsed-time bound from an iteration-count one.
 *
 * @param {{ respond: (callIndex: number, url: string) => object,
 *           requestCostMs?: number, clockScale?: number }} options
 */
function harness({ respond, requestCostMs = 0, clockScale = 1 }) {
  let clock = 0;
  /** @type {string[]} */
  const requests = [];
  /** @type {number[]} */
  const sleeps = [];

  const fetchImpl = async (url) => {
    const spec = respond(requests.length, url);
    requests.push(url);
    clock += requestCostMs;
    if (spec.throws) {
      throw spec.throws;
    }
    return {
      status: spec.status,
      json: async () => spec.body,
      text: async () => JSON.stringify(spec.body ?? ""),
    };
  };

  const sleep = async (ms) => {
    sleeps.push(ms);
    clock += ms;
  };

  return { fetchImpl, sleep, nowMs: () => clock * clockScale, requests, sleeps };
}

/**
 * Runs `fn` with `console.log` captured, so the poll's per-iteration progress
 * lines do not drown the test reporter — and so the retry notices can be
 * asserted on.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<{ result: T, lines: string[] }>}
 */
async function quiet(fn) {
  /** @type {string[]} */
  const lines = [];
  const original = console.log;
  console.log = (...args) => lines.push(args.join(" "));
  try {
    return { result: await fn(), lines };
  } finally {
    console.log = original;
  }
}

test("poll — a 502 then a success: the loop continues and confirms", async () => {
  const production = record(4811291063, ENV_PRODUCTION, "2026-08-14T10:00:00Z");
  const script = [
    { status: 502, body: { message: "Bad gateway" } },
    { status: 200, body: [production] },
    { status: 200, body: [status("success", "2026-08-14T10:18:00Z")] },
  ];
  const h = harness({
    respond: (i) => script[i] ?? assert.fail(`unexpected request #${i + 1}`),
  });

  const { result, lines } = await quiet(() =>
    pollForDeployment({ repo: REPO, sha: SHA, token: DUMMY_TOKEN, ...h }),
  );

  assert.equal(result.confirmed, true);
  assert.equal(result.cause, null);
  assert.match(result.detail, /4811291063/);
  assert.match(result.detail, /2026-08-14T10:18:00Z/);

  // Three requests: the 502'd list, the retried list, then the statuses.
  assert.equal(h.requests.length, 3);
  assert.equal(h.requests[0], LIST_URL);
  assert.equal(h.requests[1], LIST_URL);
  assert.equal(
    h.requests[2],
    `https://api.github.com/repos/${REPO}/deployments/4811291063/statuses`,
  );

  // Exactly one sleep, of DEPLOY_POLL_MS — the loop continued past the 502
  // rather than aborting, and it slept the constant rather than a hardcoded
  // interval.
  assert.deepEqual(h.sleeps, [DEPLOY_POLL_MS]);
  assert.ok(
    lines.some((line) => /502/.test(line) && /transient, retrying/.test(line)),
    `no retry notice logged: ${lines.join(" | ")}`,
  );
});

test("poll — a 403 aborts immediately as deploy-api-unavailable", async () => {
  const h = harness({
    respond: () => ({
      status: 403,
      body: { message: "Resource not accessible by integration" },
    }),
  });

  const { result } = await quiet(() =>
    pollForDeployment({ repo: REPO, sha: SHA, token: DUMMY_TOKEN, ...h }),
  );

  assert.equal(result.confirmed, false);
  assert.equal(result.cause, "deploy-api-unavailable");
  assert.match(result.detail, /403/);
  assert.match(result.detail, /Resource not accessible by integration/);

  // Immediately: one request, no sleep. Retrying a denial for the full bound
  // and then reporting `deploy-timeout` is the misnaming Req 10.4 calls a harm.
  assert.equal(h.requests.length, 1);
  assert.deepEqual(h.sleeps, []);
});

test("poll — 401 and 404 are fatal too, and a 429 is not", async () => {
  for (const fatal of [401, 404]) {
    const h = harness({ respond: () => ({ status: fatal, body: { message: "nope" } }) });
    const { result } = await quiet(() =>
      pollForDeployment({ repo: REPO, sha: SHA, token: DUMMY_TOKEN, ...h }),
    );
    assert.equal(result.cause, "deploy-api-unavailable", `HTTP ${fatal} was not fatal`);
    assert.equal(h.requests.length, 1);
  }

  // A 429 is retryable, so it rides to the bound rather than aborting at once.
  const rateLimited = harness({ respond: () => ({ status: 429, body: { message: "slow down" } }) });
  const { result } = await quiet(() =>
    pollForDeployment({ repo: REPO, sha: SHA, token: DUMMY_TOKEN, ...rateLimited }),
  );
  assert.equal(result.cause, "deploy-timeout");
  assert.ok(rateLimited.requests.length > 1);
});

/**
 * How many list requests an always-empty poll may issue before the
 * **elapsed-time** bound stops it.
 *
 * Derived from the exported constants rather than hardcoded, so retuning
 * `DEPLOY_TIMEOUT_MS` or `DEPLOY_POLL_MS` moves the expectation with the
 * implementation instead of failing this file. `clockScale` divides the
 * effective budget — see `harness`.
 *
 * The loop issues a request at raw clock `k * (DEPLOY_POLL_MS + requestCostMs)`
 * for k = 0, 1, 2 …, and stops at the first such instant that has reached the
 * deadline.
 *
 * @param {{ requestCostMs?: number, clockScale?: number }} options
 * @returns {number}
 */
function expectedRequests({ requestCostMs = 0, clockScale = 1 } = {}) {
  const budget = DEPLOY_TIMEOUT_MS / clockScale;
  const perIteration = DEPLOY_POLL_MS + requestCostMs;
  return Math.floor((budget - 1) / perIteration) + 1;
}

test("poll — an always-empty list gives up at the elapsed-time bound", async () => {
  const startedAt = Date.now();
  const h = harness({ respond: () => ({ status: 200, body: [] }) });

  const { result } = await quiet(() =>
    pollForDeployment({ repo: REPO, sha: SHA, token: DUMMY_TOKEN, ...h }),
  );

  assert.equal(result.confirmed, false);
  assert.equal(result.cause, "deploy-timeout");
  assert.match(result.detail, new RegExp(String(DEPLOY_TIMEOUT_MS)));
  // The detail carries what the last poll actually saw, not the pre-poll
  // placeholder — an empty list is a *seen* state, not an unobserved one.
  assert.match(result.detail, /last observed: 0 record\(s\) for the SHA, none production yet/);

  // 600 000 / 15 000 = 40 requests, every one of them the list URL — an empty
  // list never reaches the statuses endpoint.
  assert.equal(h.requests.length, expectedRequests());
  assert.equal(h.requests.length, 40);
  assert.ok(h.requests.every((url) => url === LIST_URL));
  assert.ok(h.sleeps.every((ms) => ms === DEPLOY_POLL_MS));

  // Forty poll iterations of a ten-minute loop, in real milliseconds.
  assert.ok(Date.now() - startedAt < 1000, "the poll waited in real time");
});

test("poll — the give-up point tracks elapsed time, not a count of iterations", async () => {
  /** @param {{ requestCostMs?: number, clockScale?: number }} options */
  const runEmpty = async (options) => {
    const h = harness({ respond: () => ({ status: 200, body: [] }), ...options });
    const { result } = await quiet(() =>
      pollForDeployment({ repo: REPO, sha: SHA, token: DUMMY_TOKEN, ...h }),
    );
    assert.equal(result.cause, "deploy-timeout");
    assert.equal(
      h.requests.length,
      expectedRequests(options),
      `wrong count for ${JSON.stringify(options)}`,
    );
    return h.requests.length;
  };

  const startedAt = Date.now();

  // 1. Free requests: the budget buys 600 000 / 15 000 iterations.
  const free = await runEmpty({});

  // 2. Each request now costs a full DEPLOY_REQUEST_TIMEOUT_MS of the same
  //    budget, so each iteration costs 25 000 ms rather than 15 000 and the
  //    budget buys fewer of them. **A loop that counted iterations would issue
  //    exactly as many requests here as in case 1.**
  const slow = await runEmpty({ requestCostMs: DEPLOY_REQUEST_TIMEOUT_MS });

  // 3 & 4. The budget itself is halved and then quartered, by running the same
  //    poll against a clock that ticks twice and four times as fast — the
  //    arithmetic equivalent of changing DEPLOY_TIMEOUT_MS to 300 000 and then
  //    to 150 000. The give-up point moves with it.
  const halfBudget = await runEmpty({ clockScale: 2 });
  const quarterBudget = await runEmpty({ clockScale: 4 });

  // The values at today's pinned constants. `expectedRequests` above is the
  // assertion that carries the *reason*; this one is the canary — retuning
  // DEPLOY_TIMEOUT_MS moves every number here, which is the point. Measured:
  // halving the constant to 300 000 turns these four into 20, 12, 10 and 5.
  assert.deepEqual([free, slow, halfBudget, quarterBudget], [40, 24, 20, 10]);

  // The four are pairwise distinct, which is the property an iteration-count
  // loop cannot produce: it would return the same number four times. Measured
  // against a mutant whose deadline checks were replaced by `iteration >= 40`:
  // case 1 still gave 40 and case 2 gave 40 instead of 24, so this test fails
  // on it while every other test in this file still passes.
  assert.equal(new Set([free, slow, halfBudget, quarterBudget]).size, 4);

  assert.ok(Date.now() - startedAt < 1000, "the poll waited in real time");
});

test("poll — a fatal status on the statuses request also aborts, mid-loop", async () => {
  const production = record(77, ENV_PRODUCTION, "2026-08-14T10:00:00Z");
  const h = harness({
    respond: (i) =>
      i === 0 ? { status: 200, body: [production] } : { status: 403, body: { message: "denied" } },
  });

  const { result } = await quiet(() =>
    pollForDeployment({ repo: REPO, sha: SHA, token: DUMMY_TOKEN, ...h }),
  );

  assert.equal(result.cause, "deploy-api-unavailable");
  assert.match(result.detail, /deployments\/77\/statuses/);
  assert.equal(h.requests.length, 2);
});

test("poll — a preview-only list fails fast as deploy-environment-unrecognised", async () => {
  const h = harness({
    respond: () => ({
      status: 200,
      body: [record(2, ENV_PREVIEW, "2026-08-14T10:05:00Z")],
    }),
  });

  const { result } = await quiet(() =>
    pollForDeployment({ repo: REPO, sha: SHA, token: DUMMY_TOKEN, ...h }),
  );

  assert.equal(result.cause, "deploy-environment-unrecognised");
  assert.match(result.detail, new RegExp(`"${ENV_PREVIEW}"`));
  // Fast: one request, no sleep, rather than riding out DEPLOY_TIMEOUT_MS.
  assert.equal(h.requests.length, 1);
  assert.deepEqual(h.sleeps, []);
});

test("poll — a terminal non-success status fails immediately, not at the bound", async () => {
  const production = record(88, ENV_PRODUCTION, "2026-08-14T10:00:00Z");
  const h = harness({
    respond: (i) =>
      i === 0
        ? { status: 200, body: [production] }
        : { status: 200, body: [status("failure", "2026-08-14T10:18:00Z")] },
  });

  const { result } = await quiet(() =>
    pollForDeployment({ repo: REPO, sha: SHA, token: DUMMY_TOKEN, ...h }),
  );

  assert.equal(result.confirmed, false);
  assert.equal(result.cause, "deploy-not-success");
  assert.match(result.detail, /"failure"/);
  assert.equal(h.requests.length, 2);
  assert.deepEqual(h.sleeps, []);
});
