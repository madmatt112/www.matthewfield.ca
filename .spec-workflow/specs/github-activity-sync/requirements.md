# Requirements Document

> **Version 9 — final.** Edit pass after adversarial review r8
> (`reviews/adversarial-analysis-requirements-r8.md`). v9 closes both r8 findings: 1 MUST_FIX,
> 1 MINOR. **The convergence loop hard-caps at v9, so this version is terminal**: r8's two findings
> were closed in place and that closure is the one edit no review has seen. Rounds r1–r7 and the full
> disposition history are in `reviews/adversarial-memory-requirements.md`.
>
> **Convergence record.** Eight rounds, **69 findings, every one accepted and none rejected.** Curve
> **18 → 15 → 13 → 10 → 7 → 6 → 2 → 2**. One scope reduction (the escalation channel, deferred as
> `d-65ff36e0`). One criterion — Req 10.2 — decided four times and then confirmed by two independent
> rounds of measurement. r7 and r8 between them attacked no criterion at all: every finding in the
> last two rounds was prose that had fallen out of step with a decision the body had already made
> correctly.
>
> **What changed, by r8 finding:**
>
> | r8 finding | Class | Disposition | Where |
> |---|---|---|---|
> | F1 — the withdrawn second-project premise survived at a fifth site | Recurring | Accepted | Req 10.2's consequence (b); Assumption A1 |
> | F2 — "365/366/367/368-day requests all succeed" is false at 4 of 7 run dates | Novel | Accepted | Out-of-scope note |
>
> **The mystery that drove four rounds is solved, and the open item for Matthew is retired.** r8
> traced `Preview – matthewfield-ca` to a single deployment: a redeploy of commit `8373e57ea1` whose
> Preview build had failed nine hours earlier, inside the same Vercel project as all 155 other
> records. Rounds r4–r7 alternately inferred a second linked project from that one record and built
> three different versions of Req 10.2 on the inference. **There is no second project, no dashboard
> check is needed, and Req 10.2's exact-equality rule stands on the measured `environment` vocabulary
> alone.**
>
> **The defect class that outlived every other was propagation** — a withdrawn premise surviving at a
> site the review had not quoted. It was found at a new site in four consecutive rounds (r5, r6, r7,
> r8) and is the reason v6–v9 each carried a repair-discipline ratchet. v9 removes its last
> occurrence.
>
> **Verification discipline, cumulative.** Existence (v2) → claim-carriage (v3) → ranges on
> single-line cites (v4) → no sentence stronger than its range (v5) → every finding repaired at every
> site (v6) → premises stated as measured must have been measured (v7) → every cause named in an
> enumeration must have a criterion that raises it (v8) → **a withdrawn premise must be removed from
> every site, not only the one the review quoted** (v9).
>
> Pointers to criteria that no longer exist are written as "v3's Req 9.9", never bare.

## Introduction

The `github-activity-sync` spec adds **a scheduled GitHub Actions workflow that refreshes
`content/github-activity.yaml` on its own**. It queries the GitHub contributions calendar with a
stored credential, rewrites the file in the same ascending, fully-covered shape spec #11 validates,
**verifies the payload before committing**, pushes to `main` — which triggers a Vercel production
deploy — and confirms that deploy happened.

**This spec changes no application code**, and everything it adds is a file: workflow YAML under
`.github/workflows/`, a script under `scripts/`, documentation under `docs/`, and one new step in
`ci.yml`. The page stays statically generated, the render path stays network-free, and no credential
enters the deployed application or the browser.

> **[v4] v3 conceded a non-file prerequisite here — an issue label — because its escalation channel
> needed one. That channel is deferred (`d-65ff36e0`), so the concession is withdrawn and the
> four-location claim is true again.** The only remaining external state is recorded as Assumptions
> A1–A5.

### What this closes — stated honestly

Spec #11 shipped with one deliberate manual step.
`docs/contributions-and-resources-authoring.md:341` ("The refresh query") documents a
`gh api graphql` invocation Matthew runs by hand, and
`scripts/check-github-activity-freshness.mjs:70` warns at 45 days when he forgets.

**The thesis was narrowed in v2 and stays narrow.** v1 claimed automation converts that warning "from
a routine nag into a genuine alarm." r1 refuted it: automation raises the warning's *information
content* — after this spec it can only fire on real breakage — but it does nothing about
**delivery**. A signal nobody receives is not an alarm.

The honest thesis: **the refresh stops depending on Matthew remembering to run it.** That is worth
shipping on its own. Making the failure of that automation *reach* him is a separate problem, and v4
states plainly what this spec does and does not do about it (Req 9.7).

### The one asymmetry this spec depends on

A commit pushed by a workflow using the auto-injected `GITHUB_TOKEN` **does not trigger further
workflow runs** — GitHub suppresses them to prevent recursive CI. `.github/workflows/ci.yml:3-5`
triggers on `push` to `main`, so **`ci.yml` will not run against the synced commit**.

Vercel does not share that suppression: it deploys from the push webhook via its GitHub App, not from
an Actions trigger, so the push **does** produce a production build. This is external configuration,
not a property of the repository — recorded as Assumption A1 and given a detector in Req 10.

The consequence is the load-bearing constraint of this entire spec: **between the sync commit and the
Vercel build there is no validation except what this workflow performs itself.** If the workflow
commits a payload that violates spec #11's schema or invariants, the first thing to notice is the
Vercel production build failing — after the bad data is already on `main`. This is why Req 4 requires
validation before the commit rather than after it, and why Req 5 forbids committing a degraded
payload at all.

### Recorded assumptions

Each is true as of `4802b6c` and would break this spec if it changed. A1–A3 were verified in r1 and
re-verified in r2, r3 and r5; A4 was measured in r2; A5 was measured in r4.

- **A1 — Vercel deploys from the push webhook via its GitHub App.** Verified: deployment
  `5855726914` for `4802b6c`, `creator: vercel[bot]`, `environment: "Production"`;
  `.github/workflows/ci.yml:108-109` names the native integration as the default. **Invertible from a
  Vercel dashboard setting**, and `ci.yml` gates five Vercel steps on `vars.DEPLOY_VIA_CI == 'true'`.
  Req 10 is the detector.
  - **Mechanical caveats Req 10 must respect** (all measured): the `?sha=` filter requires the **full
    40-character SHA**; `production_environment` is `false` on **Production and Preview records
    alike**, so the only usable discriminator is the `environment` string; and the deployments list
    response carries **no status field at all**, only `statuses_url`.
  - **Sub-assumption:** **all 60** of the last 60 deployment records carry exactly one status,
    `success`, stamped **0–3 seconds** after the record itself (measured distribution across those
    60: 0s ×40, 1s ×19, 3s ×1) — so **Vercel creates the record at build completion and there is no
    pending window**. v6 said "1–3 seconds", which is false for two thirds of the records it names.
    Req 10.3 does not depend on this, because it asserts on the status rather than on the record's
    existence.
  - **[v9] `Preview – matthewfield-ca` is a live repository environment, and its origin is now
    fully explained.** r8 traced its sole deployment (`4998605725`): a **redeploy of commit
    `8373e57ea1`, whose Preview build (`4993225933`) had failed nine hours earlier**, with
    `original_environment` already qualified and the same `matthewfield-<hash>-mossfoot-digital`
    project-and-team slug as all 155 other records. **It is a one-off redeploy inside a single
    Vercel project — not evidence of a second one.** r6 had already shown the absence of evidence
    (all 159 status objects collapse to one slug); r8 supplied the positive account. Rounds r4–r7
    variously inferred a second project from this record; every such inference is withdrawn.
  - **Re-verify A1 whenever `vars.DEPLOY_VIA_CI` changes or the Vercel Git integration is
    reconfigured.** A note, not a criterion — there is no actor or trigger that could enforce it.
  - **The migration A1 fears is currently blocked anyway.** Three of the five `DEPLOY_VIA_CI`-gated
    steps need `secrets.VERCEL_TOKEN`, and r2 proved from the `verify-vercel-token` job log that this secret does
    not exist. Flipping the flag today breaks deploys loudly, not silently.
- **A2 — `main` is not branch-protected.** Verified three times: the branch protection API returns
  404. If protection is enabled, the workflow's `GITHUB_TOKEN` push is rejected and the sync stops.
- **A3 — the repository is not a fork and is public.** Verified: `fork: false`, `private: false`,
  `visibility: public`, `archived: false`. Scheduled workflows do not run on forks by default, and
  the zero-scope read token's public-only property (Req 7.5) assumes a public profile.
  **[v4]** v3 added "Req 10 also leans on public visibility"; that lean is obsolete now that Req 7.3
  grants `deployments: read` explicitly rather than relying on the endpoint answering anonymously.
- **A4 — the repository's default workflow permission is `read`.** Verified:
  `actions/permissions/workflow` returns `default_workflow_permissions: "read"`. **A workflow that
  declares no `permissions:` block gets a read-only token**, and declaring a block sets every
  unlisted scope to `none`. This is why Req 7.3 enumerates its scopes explicitly. Note that **no
  workflow in this repository currently declares a `permissions:` block.**
- **[v5] A5 — the repository is owned by a `User`, so no organisation policy can cap the scopes
  Req 7.3 declares.** Verified: the owner type is `User`, the organisation Actions-permissions
  endpoint 404s, and the repository endpoint exposes no cap field. **This assumption is therefore
  inert today and is recorded only so that a future transfer to an organisation is a known trigger
  to re-check it** — an org or enterprise policy *can* cap what a workflow may request, silently
  downgrading a declared `contents: write` until the push 403s.
  > **[v5] v4 stated A5 as a live risk with a checkable mechanism. r4 showed the mechanism cannot
  > apply to a user-owned repository**, and that Sequencing's "worth one command" named a command
  > that does not exist. Kept rather than deleted because the transfer trigger is real and costs one
  > sentence; demoted because asserting an inapplicable risk is the same defect class this document
  > has been correcting for four rounds.

### Escalation — a live problem this spec did not cause

**`.github/workflows/verify-vercel-token.yml` has failed on every scheduled run since 2026-06-01 —
eleven consecutive weekly failures, with no successful run in its entire history.** Its own
escalation step (`Open issue on failure`, running `gh issue create`) **also fails**, and the
repository has zero issues, ever. The workflow is still `active`. r2 and r3 root-caused all three
layers from the raw job log of run `31392343605`:

1. **The underlying failure:** `Error: You defined "--token", but it's missing a value` —
   `secrets.VERCEL_TOKEN` interpolates to empty. **The secret does not exist.**
2. **Why the escalation fails:** `could not add label: 'ops' not found`. The repository has exactly
   twelve labels and neither `ops` nor `vercel-token-rotation` is among them.
3. **What is behind that:** the job log's permission group reads `Contents: read, Metadata: read,
   Packages: read` — per A4, a read-only token, so `gh issue create` would 403 anyway.

**All three are one-line fixes** (create the secret or delete the workflow; create the two labels;
add `permissions: issues: write`). Fixing it is out of scope here. **It needs Matthew's attention
independently of this spec** — and it is the empirical evidence behind Req 9.7's honesty.

### Explicitly in scope

- A scheduled + manually-dispatchable workflow file under `.github/workflows/` (Req 1).
- Re-derivation of the request bounds and the resulting anchor, and an anchor-recency rule (Req 2).
- The GraphQL query and its transform into the committed file shape (Req 3).
- A pre-commit validation gate — the four checks enumerated in Req 4.0 (content pipeline, freshness
  decision rule, record-count check, anchor-recency check) — plus the byte-integrity rule and a
  self-test that CI executes (Req 4).
- Refusal to commit a degraded payload (Req 5).
- No commit when the refreshed file is byte-identical to the committed one (Req 6).
- Credential handling, with every permission scope enumerated (Req 7).
- The unchanged-application guarantee (Req 8).
- Failure visibility, with its delivery channel stated honestly (Req 9).
- Confirmation that the pushed commit produced a successful **production** deployment (Req 10).
- Concurrency, push-race policy, and the git mechanics both depend on (Req 11).
- Documentation updates, including the decomposition entry (Req 12).
- Preservation of the manual refresh path, and a recovery path from an absent file (Req 13).

### Explicitly out of scope

- **Any change to the rendered page, the heatmap component, the Velite collection, the schema, the
  invariants, or the freshness script.** This spec consumes spec #11's contract; it does not amend
  it. If a defect in that contract is discovered, it is recorded as a deferral, not fixed here.
- **Backfilling history beyond the 364-day pull.** 364 days is comfortably under GitHub's one-year
  cap on `contributionsCollection`. Spec #11 chose 364 because it is **52 weeks**
  (`docs/contributions-and-resources-authoring.md:379-381`); staying under the cap is a consequence,
  not the reason.
  > **[v5] v4 said "the largest range under" the cap. r4 measured that false** — a 365-day request
  > succeeds and returns 365 records. **[v9]** r8 showed the wider claim v5 made here ("365-, 366-,
  > 367- and 368-day requests all succeed") is itself false at four of seven run dates: with `to` on
  > a Sunday, a 366-day request clamps to 365. **[v8] r7 measured the clamp mechanism exactly and it
  > settles a disagreement open since r5:** the API silently clamps
  > `from` to `sunday_of(to) − 364` rather than erroring, so the apparent boundary moves with `to`'s
  > day of the week — which is why r4 and r5 got different answers at 368 days. **Req 2.1's 364-day
  > window can never clamp, at any run date**, which is a stronger guarantee than the document
  > previously claimed. v3's wording
  > was correct and v4 introduced the falsehood while rewriting this sentence for r3's claim-carriage
  > finding. **The pull range stays 364** — it is spec #11's parameter and this spec does not re-open
  > it; only the false justification is withdrawn. The clamping behaviour is worth knowing at design
  > time: an over-wide request would not fail loudly.
- **Any second data source.** Only `user(login:).contributionsCollection` is queried.
- **[v4] An issue-based escalation channel.** Deferred to a follow-on spec — see `d-65ff36e0` and
  Req 9.7. Email, Slack and third-party monitors remain out of scope permanently.
- **Fixing `verify-vercel-token.yml`.** See Escalation above.
- **Re-running `ci.yml` on the synced commit.** Working around GitHub's loop suppression is
  explicitly rejected — see Req 4.10.

## Alignment with Product Vision

`.spec-workflow/steering/product.md:81` names **"Builder credibility"** as a business objective and
`:96` names **"Simple to maintain"** as a product principle. A heatmap that silently rots contradicts
the first; one that requires a remembered monthly chore contradicts the second. This spec serves both
by removing the human from the refresh loop while keeping the data in git, which preserves `:83`'s
**"Independence from platforms"** — the site still renders correctly during a GitHub outage because
it reads a committed file, not an API.

**Builder credibility also constrains Req 5.** r1 showed that v1's abort-on-all-zero rule would,
during a genuinely quiet year, freeze the committed file at its last busy window and keep publishing
a heatmap of work Matthew is no longer doing. Refusing to publish true-but-unflattering data is a
credibility defect, not a safety feature. Req 5.6 writes it.

## Shared Definitions

- **`anchorDate`** — the maximum `date` in `content/github-activity.yaml`. Originates the entire grid
  derivation (`src/lib/build/github-activity-schema.ts:25-26`).
- **`dataStart`** — the minimum `date` in the file.
- **Span** — `anchorDate − dataStart + 1`, in days. Spec #11's coverage check warns below
  `MIN_COVERAGE_DAYS = 182` (`scripts/check-github-activity-freshness.mjs:83`).
- **The request bounds** — the `from` / `to` RFC 3339 values sent to the API, derived from the
  runner's clock (Req 2.1).
- **The resulting anchor** — the most recent day the API actually reports. Becomes `anchorDate`.
  Distinct from the request bounds; conflating the two was r1's R4.
- **Range length vs. range position** — two properties, not one. A payload can have the right
  *length* (364 records) and the wrong *position* (anchored a year in the past). Req 4.4 checks
  length; Req 4.5 checks position.
- **[v4] A deployment record vs. the production deployment record** — two things, not one. This
  repository generates Preview deployments constantly (twelve of the last fifteen records), and
  `production_environment` is `false` on Production and Preview alike, so **the `environment` string
  is the only discriminator. Req 10.2 owns the matching rule; this definition deliberately does not
  state it.** Treating any record for the SHA as confirmation was r3's R2.
  > **[v7]** This bullet asserted `environment == "Production"` in code form through v5, which r5
  > found still contradicting Req 10.2 after v5 had edited the bullet itself. v6 replaced the code
  > form but kept a prose restatement ("only the unqualified `Production` names the deploy that
  > serves visitors") in the same sentence that claimed not to restate. r6 caught that. The rule now
  > lives in exactly one place.
- **The published period** — the intersection of spec #11's fixed grid frame with the data actually
  present (`docs/contributions-and-resources-authoring.md:416-424`). Owned by spec #11; this spec
  never computes it.
- **Degraded payload** — any API response or derived file that is absent, empty, shorter or longer
  than the pull range, anchored outside Req 4.5's recency window, non-contiguous, duplicated, or
  future-dated. **All-zero counts are NOT degraded** — see Req 5.6.
- **The read token** — the classic PAT with **zero scopes** stored as the repository secret
  `GH_CONTRIBUTIONS_TOKEN`.
- **The write token** — the auto-injected `GITHUB_TOKEN`, scoped by the workflow's `permissions:`
  block (Req 7.3, Assumptions A4 and A5).
- **The validation gate** — the checks enumerated in Req 4.0, all of which must pass before any
  commit.

## Requirements

### Requirement 1: A scheduled workflow refreshes the file without human action

**User Story:** As Matthew, I want the contribution data to refresh on a schedule, so that the
heatmap stays current without me remembering to run a query.

#### Acceptance Criteria

1. The repository SHALL contain a workflow file under `.github/workflows/` dedicated to this refresh,
   separate from `ci.yml`.
2. The workflow SHALL trigger on a `schedule` (cron) and on `workflow_dispatch`.
3. **[v4]** WHEN triggered via `workflow_dispatch` THEN the workflow SHALL perform the same refresh,
   validation, and commit sequence as a scheduled run. It MAY accept dispatch-only inputs — for
   example the seed input of Req 13.4. **No dispatch input SHALL be able to write a payload that a
   scheduled run would have rejected.**
   > **[v4] v3's restrictive clause is deleted.** It said inputs must "not alter that sequence's
   > outcome for a healthy payload" and then named a fault-injection input as permitted — which
   > exists precisely to alter the outcome on a healthy payload. r3's C2 showed the clause excluded
   > the one class it named. The write-safety sentence is the rule that actually holds and is
   > testable. (After the escalation deferral, nothing in this document requires a fault-injection
   > input at all.)
4. The cadence SHALL be **weekly**, and the chosen cron expression SHALL be stated in the workflow
   file with a comment naming the reason.
5. **[v4]** The cron minute SHALL NOT be `00`, `15`, `30` or `45`, and the hour SHALL NOT be `00`.
   GitHub's scheduled runs are best-effort: r2 and r3 measured this repository's existing weekly cron
   (`0 12 * * 1`) starting between 1h19m and 2h51m late across all eleven runs, and GitHub drops
   scheduled runs entirely under load. Quarter-hour marks are the most contended.
   > v3's rationale for this criterion was corrected once already (a midnight-adjacent cron does
   > *not* break the sliding window — `[D−363, D]` and `[D−362, D+1]` are both valid). r3 then noted
   > v3 still gave no width for "avoid the peak window". This states one.
6. The cadence SHALL leave the anchor age inside `STALENESS_THRESHOLD_DAYS = 45`
   (`scripts/check-github-activity-freshness.mjs:70`) for at least six consecutive failed runs, so a
   single flaky run cannot produce a staleness warning.

> **Note, not a criterion:** if the schedule is changed later, criterion 1.6 needs re-checking. v3
> stated this as Req 1.7; r3 correctly observed it has no actor, no trigger and no enforcement
> point — the same shape v3 accepted relocating for v2's Req 10.3. Applied uniformly here.

> **The cadence argument.** v1 argued weekly from an "alarm ratio" against the 45-day detector. r1
> rejected the premise — a detector with no delivery channel cannot justify anything — and noted the
> real token-expiry detector is Req 9.3's red run, within seven days. **Weekly is chosen for churn:
> 52 commits and 52 production deploys a year instead of 365**, to move a graphic no visitor can
> distinguish from its six-day-old self. Surfaced at the phase boundary for veto.

### Requirement 2: The bounds and the anchor

**User Story:** As Matthew, I want each run to fetch the range ending now, so that an automated
refresh actually advances the data instead of re-fetching a frozen year.

#### Acceptance Criteria

1. WHEN the workflow runs THEN it SHALL compute the request bound `to` from the run's own UTC date,
   never from a literal date committed in the workflow file, and SHALL compute `from` as
   `to − 363 days`, giving a 364-day inclusive request.
2. Both request bounds SHALL be sent as RFC 3339 `DateTime` values (`from` at `T00:00:00Z`, `to` at
   `T23:59:59Z`), because `contributionsCollection` rejects a bare `YYYY-MM-DD`
   (`docs/contributions-and-resources-authoring.md:376-377`).
3. `anchorDate` SHALL be **the most recent day present in the API response**, not the runner's date.
   IF the two differ THEN the response is authoritative, which also keeps the schema's future-date
   bound satisfied by construction (`src/lib/build/github-activity-schema.ts:35`).
4. A run that reproduces the procedure but not the range — re-fetching the same fixed year — is a
   defect (`docs/contributions-and-resources-authoring.md:391-393`). **Req 4.5 is its enforcement
   point.**
5. The pull range SHALL remain 364 days and SHALL NOT be shortened, because a short pull is
   contiguous, passes every inherited build check, and silently shortens the published period
   (`docs/contributions-and-resources-authoring.md:410-413`).

### Requirement 3: The transform writes the shape spec #11 already validates

**User Story:** As Matthew, I want the generated file to be indistinguishable in shape from the
hand-seeded one, so that the seed and every later refresh cannot diverge in what they count.

> **Criteria 3.1–3.6 are inherited obligations** — they restate spec #11's contract and the authoring
> guide, and are kept because they are the testable statement of what this workflow must produce.

#### Acceptance Criteria

1. The workflow SHALL issue the same `ContributionCalendar` query documented at
   `docs/contributions-and-resources-authoring.md:348-364`, selecting `date` and `contributionCount`
   from `weeks[].contributionDays[]`.
2. WHEN the response is received THEN the workflow SHALL flatten `weeks[].contributionDays[]` into a
   single list of `{ date, count }` records sorted ascending by `date`.
3. The workflow SHALL write **the whole file** from the response, never patch individual rows, per the
   "Generated file — do not hand-edit it row by row" contract
   (`docs/contributions-and-resources-authoring.md:309`).
4. Each record SHALL carry exactly two keys, `date` and `count`, and no others — the schema is
   `.strict()` and an unknown key is a hard build failure
   (`src/lib/build/github-activity-schema.ts:38`).
5. The workflow SHALL NOT write a `contributionLevel` field; levels are derived locally
   (`src/lib/build/github-activity-schema.ts:13-16`).
6. Every count SHALL be recorded exactly as returned. A trailing `count: 0` on the anchor day is the
   honest value because that day is usually still in progress, and SHALL NOT be adjusted, dropped, or
   back-filled (`docs/contributions-and-resources-authoring.md:385-387`).
7. The emitted YAML SHALL match the existing file's formatting convention — a top-level sequence of
   two-line mappings with a quoted `date` and an unquoted integer `count` — so that a refresh diff
   shows data changes and not a 728-line reformatting.
8. The file SHALL be written to `content/github-activity.yaml` and to no other path.

### Requirement 4: The payload is validated before it is committed

**User Story:** As Matthew, I want the workflow to prove the file is good before it lands on `main`,
because nothing downstream will check it before the production deploy does.

#### Acceptance Criteria

0. **[v4] The validation gate comprises exactly these checks: 4.2, 4.3, 4.4 and 4.5.** Every
   obligation in this requirement that refers to "the gate" reaches all four.
   > **[v4] This closes r3's R5.** v3 defined the anchor-recency check in Req 2.6, outside Req 4, and
   > v3's Req 4.4 explicitly disclaimed it ("range position is Req 2.6" — v3's numbering). Four
   > gate-attached obligations
   > therefore did not reach it — 4.7's runnable-outside-a-workflow rule, 4.8's self-test, 4.1's
   > re-run before a second push, and the enumeration itself — while the in-scope list described the
   > gate as covering "a workflow-owned length-and-position check". An implementer building the gate
   > from Req 4's list would simply never have written the one check this spec invented.
1. WHEN a refreshed payload has been written to the working tree THEN the workflow SHALL run the gate
   against it **before** staging or committing anything, and SHALL re-run it before any second push
   attempt (Req 11.2).
   > **[v4] The gate evaluates the refreshed payload on disk, not the committed file.** r3 showed v3
   > never said so and that Req 4.3's `STALE` rationale asserted the opposite. The distinction is
   > load-bearing: `main(cwd)` in the freshness script
   > (`scripts/check-github-activity-freshness.mjs:249-255`) reads
   > `content/github-activity.yaml` from disk, so at gate time that file **is** the new payload. An
   > implementer who followed v3's rationale and pointed the check at
   > `git show HEAD:content/github-activity.yaml` would make `FILE ABSENT ⇒ block` fire
   > unconditionally on Req 13.4's seed path, where the committed file is absent by definition —
   > permanently blocking the one path that exists to break that deadlock.
2. **The gate SHALL cover both pipelines**, stated as obligations rather than commands. It SHALL
   apply (a) the same per-entry schema and cross-entry invariants the content build applies —
   `githubActivityEntrySchema` (`src/lib/build/github-activity-schema.ts:33`) and
   `runGithubActivityInvariants` (`velite.config.ts:569`), covering duplicate dates and coverage
   contiguity — **and** (b) the render pipeline, `next build`, which exercises the derivation in
   `src/lib/github-activity.ts` and the server component.
   > **Why (b) is not optional.** v1's gate was Velite-only, leaving uncovered the exact failure the
   > Introduction says it fears: a Vercel production build breaking after bad data is on `main`.
   > **Design note:** writing the payload needs the `yaml` package, so an install precedes the write
   > and `postinstall` runs before the payload exists. The content build must re-run *after* the
   > write — `pnpm exec velite build` satisfies (a) without a second full install.
3. **The gate SHALL run `node scripts/check-github-activity-freshness.mjs` and apply this decision
   rule**, because the script always exits 0 (`scripts/check-github-activity-freshness.mjs:7-8`) and
   an exit code proves nothing:
   - `FILE ABSENT`, `EMPTY FILE`, `EMPTY LIST`, `UNEXPECTED SHAPE`, `IMPOSSIBLE DATE`, and any state
     whose message begins `UNREADABLE` ⇒ **block the commit.**
   - `INCOMPLETE COVERAGE` ⇒ **block the commit.** *(Currently unreachable: it fires below 182 days
     and Req 4.4 rejects below 364. Retained as defence-in-depth; flagged so the table is not misread
     as doing work it is not.)*
   - `ALL COUNTS ZERO` ⇒ **do not block**; write and warn. See Req 5.6.
   - `STALE` ⇒ **do not block.** *(Also currently unreachable: any payload satisfying Req 4.5 has an
     anchor within 2 days of the run date and so can never exceed 45. Retained for the same reason,
     and flagged for the same reason.)*
   - Warnings **stack** for the non-terminal states; the file-level states return terminally
     (`scripts/check-github-activity-freshness.mjs:18-20`). IF any blocking state is present THEN the
     commit SHALL be blocked, regardless of which non-blocking states accompany it.
     > **[v5]** v4 said the script "does not return early", which r4 showed is false — `evaluate`
     > returns terminally at six sites. The error was inert, because every terminal state is also a
     > blocking state, so the decision rule blocked correctly either way. Corrected because the
     > document asserts it as a fact about the codebase.
   > **[v4] Both "do not block" rows are now flagged dead.** v3 flagged only `INCOMPLETE COVERAGE`
   > and left `STALE` carrying the table's most prominent rationale, which r3 showed was both
   > unreachable after Req 4.5 and justified by a false statement about what the gate measures.
   > `STALE`'s underlying judgement — that a legitimately quiet anchor cannot be fixed by refusing to
   > write it — remains correct and is why the row is `do not block` rather than deleted.
4. **The gate SHALL check range length**: the payload SHALL contain exactly the 364 records of the
   pull range. **No inherited check can detect a short payload** — `checkCoverageContiguity` derives
   its range from the data itself (`src/lib/build/check-github-activity-invariants.ts:78-88`) and the
   freshness floor is 182 days, not 364 (`scripts/check-github-activity-freshness.mjs:83`).
5. **[v4] The gate SHALL check range position**: the resulting anchor SHALL be within 2 days of the
   run's UTC date. A violation SHALL block the commit.
   > **This was v3's Req 2.6, moved into the gate per r3's R5.** It closes r2's R3: v2 declared
   > "re-fetching a fixed year" a defect and provided no enforcement point, because the schema and
   > invariants derive their range from the data, `next build` renders whatever anchor it is given,
   > and `STALE` — the only signal that could have seen it — is non-blocking. A hardcoded date
   > leaking into the workflow would commit once and then find the file byte-identical forever,
   > producing green runs and a permanently frozen heatmap.
   >
   > **2 days, not 0.** The API's last reported day equalled the run's UTC date at all three clock
   > positions measured across r1–r3, including one with `to` early in a UTC day. Two days absorbs a
   > late-running cron crossing midnight and any API lag while still catching a frozen year by three
   > orders of magnitude.
6. IF any gate check fails THEN the workflow SHALL exit without committing, leaving the previously
   committed file untouched. (Exit status is Req 9.1.)
7. **The bytes that are validated SHALL be the bytes that are committed.** `package.json:21`'s
   `prepare` script sets `core.hooksPath=.githooks` on every `pnpm install` — including the install
   the workflow performs — and `.githooks/pre-commit` then runs `prettier --write` on every staged
   YAML file and re-stages it, mutating the file *after* the gate passed.
   `content/github-activity.yaml` is not in `.prettierignore`, so it is affected. The workflow SHALL
   close this gap, either by formatting before the gate or by bypassing the hook, and SHALL NOT leave
   the outcome to chance.
8. The gate SHALL be reachable and runnable outside a workflow run, so a change to it can be tested
   without pushing to `main`.
9. The gate's decision logic SHALL have a colocated self-test **executed in CI**, following the four
   `node --test scripts/*.test.mjs` steps at `.github/workflows/ci.yml:57-66`.
   `vitest.config.ts:16` includes only `src/**/*.test.{ts,tsx,mjs}`, so this cannot be a Vitest test;
   Req 8.1 permits the `ci.yml` step.
   > **[v4] "Executed in CI", not "checkable".** r3 measured that **thirteen `scripts/*.test.mjs`
   > files exist in this repository and `ci.yml` runs exactly four of them** — a colocated self-test
   > here has a 4-in-13 base rate of ever running. The distinction is not pedantic.
10. The workflow SHALL perform this validation itself and SHALL NOT rely on `ci.yml`, which GitHub
    will not trigger for a `GITHUB_TOKEN`-authored commit, nor on the Vercel build, which fails
    *after* the bad data is on `main`.
    > **r1 and r2 both endorsed keeping this refusal:** a PAT push or `repository_dispatch` bounce
    > would re-run every `ci.yml` step — 31 declared, 26 running by default — including the Pagefind
    > crawl, on a commit whose only change is a data file, and would need a repo-scoped PAT where a
    > zero-scope one suffices.

### Requirement 5: A degraded payload is never committed

**User Story:** As Matthew, I want a bad API response to leave the file alone, because a stale
graphic is a far better outcome than a broken build on `main`.

#### Acceptance Criteria

1. The workflow SHALL refuse to commit when the refreshed payload is any of: absent; empty or
   zero-byte; parsing to `null` or to a non-list; containing other than exactly 364 records
   (Req 4.4); anchored more than 2 days from the run's UTC date (Req 4.5); missing any calendar day
   inside its own covered range; containing a duplicated date; or containing a date ahead of the run
   clock.
2. IF the GraphQL request fails, times out, returns a non-2xx status, or returns a body containing an
   `errors` array THEN the workflow SHALL abort before writing the content file.
3. IF the response contains zero contribution day records THEN the workflow SHALL abort. This is the
   "no data returned" case and is a query or auth failure.
4. WHEN the workflow aborts for any reason in this requirement THEN `content/github-activity.yaml`
   SHALL remain exactly as it was in the previous commit — no partial write, no empty file, no
   truncated file.
5. The workflow SHALL NOT create the content file if it does not already exist, except via the
   explicit seed path of Req 13.4.
6. **A full-length payload whose every `count` is `0` SHALL be written, not aborted**, and the run
   SHALL emit a warning naming the condition.
   > **Why (reversed in v2, upheld by r2 and r3).** v1 aborted on all-zero counts, citing
   > `scripts/check-github-activity-freshness.mjs:199`. That conflates two distinguishable states: a
   > broken query returns an `errors` array, a non-2xx, or zero *records* — all caught by 5.2 and
   > 5.3 — whereas a genuinely quiet year returns a full 364 records that happen to all be zero. That
   > payload is not worse data; it is *truer* data. Aborting on it would freeze the file at its last
   > busy window and keep publishing a heatmap of work Matthew is no longer doing, against "Builder
   > credibility". Not hypothetical: the current seed carries 235 zero-count days out of 364.

> **Note on 5.1 vs. the freshness script's severity.** Spec #11 classifies several of these states as
> *warnings* that must never block, which is correct for **rendering**: a short or stale file still
> produces an honest, disclosed graphic. This requirement classifies some of them as *abort*
> conditions for **writing**, a different question. Spec #11's contract is not amended.

### Requirement 6: An unchanged refresh makes no commit

**User Story:** As Matthew, I want a run that finds nothing new to leave no trace, so the history
records data changes rather than the passage of time.

#### Acceptance Criteria

1. WHEN the refreshed file is byte-identical to the file at the tip of `main` THEN the workflow SHALL
   make no commit and no push. **[v4]** On the retry path this comparison SHALL be re-evaluated
   against the re-synchronised tip, not the tip the run started from (Req 11.4).
2. WHEN no commit is made THEN the run SHALL conclude successfully (green), because "nothing changed"
   is a correct outcome, not a failure.
3. The run SHALL state in its log and run summary which branch it took — committed, or no-change — so
   a reader can tell a working no-op from a silently skipped step.
4. WHEN the first automated run replaces the hand-seeded file THEN the resulting diff SHALL be large
   and SHALL NOT be treated as an anomaly: the seeded range (`2025-08-12` → `2026-08-10`) cannot equal
   a range ending at the run date. Req 4's gate is what makes that diff safe.

### Requirement 7: The credentials are minimal and separated

**User Story:** As Matthew, I want the reading credential and the writing credential to be different
and each as weak as possible, so that neither can do the other's job.

#### Acceptance Criteria

1. The calendar query SHALL authenticate with **the read token** — the classic PAT with zero scopes,
   read from the repository secret `GH_CONTRIBUTIONS_TOKEN`.
2. The read token SHALL NOT be granted repository access and SHALL NOT be used for the commit, the
   push, or the deployment check.
3. **[v4] The workflow SHALL declare exactly these two scopes and no others:**

   | Scope | Value | Needed by |
   |---|---|---|
   | `contents` | `write` | the commit and push (Req 11) |
   | `deployments` | `read` | the deployment check (Req 10) |

   > **[v4] `issues: write` is removed** — v3 granted it for the escalation channel now deferred
   > (`d-65ff36e0`). The explicit enumeration matters because the repository default is `read`
   > (A4) and declaring a `permissions:` block zeroes every unlisted scope: v2's closed enumeration
   > omitted `deployments` entirely, which would have made Req 10 403 on every successful sync.
4. The secret name SHALL remain `GH_CONTRIBUTIONS_TOKEN`; GitHub forbids secret names beginning with
   `GITHUB_`.
5. The zero-scope choice SHALL be preserved and SHALL NOT be "upgraded" to `read:user`, because a
   scoped token would silently begin publishing private contributions above the verifiable public
   profile if any ever appeared. Public-only by construction is the property being protected.
6. Neither token SHALL appear in workflow logs, in the committed file, in any build artifact, or in
   anything served to a browser.

### Requirement 8: The deployed application does not change

**User Story:** As a visitor, I want the page to behave exactly as it did before the automation
existed, so that a build-time convenience never becomes a runtime dependency.

#### Acceptance Criteria

1. This spec SHALL add no file under `src/`, SHALL modify no existing file under `src/`, and SHALL
   modify neither `velite.config.ts` nor `next.config.ts`. It MAY add a step to `ci.yml` (Req 4.9)
   and MAY add files under `.github/workflows/`, `scripts/`, and `docs/`.
2. The rendered `/contributions` page SHALL remain statically generated with zero client JavaScript
   for the heatmap and zero network calls at build or runtime.
3. No CSP change SHALL be required.
4. No credential SHALL exist in the deployed application or its bundle.
5. WHEN the sync commit is deployed THEN the only observable difference to a visitor SHALL be the
   data values and the disclosed `anchorDate`.

> **Note, not a criterion:** if satisfying any requirement here appears to need an application
> change, that is a signal the approach is wrong and should be raised rather than absorbed. v3 stated
> this as Req 8.6; r3 correctly grouped it with v3's Req 1.7 as an obligation with no actor or
> trigger.

### Requirement 9: Failure is visible, and its channel is stated honestly

**User Story:** As Matthew, I want to find out when the sync stops working, because its whole value is
that I am no longer watching it.

#### Acceptance Criteria

1. WHEN a run fails for any reason THEN it SHALL exit non-zero, so the run is red and GitHub's own
   failure notification is sent.
2. Log output and the run summary SHALL name which condition caused an abort, distinguishing at
   minimum: request failure, API-reported error, degraded payload, validation-gate rejection, push
   failure, push-race exhaustion (Req 11.3), **re-synchronisation conflict (Req 11.3)**, deployment
   timeout (Req 10.5), **deployment reported not-`success` (Req 10.4)**, **unrecognised deployment
   environment (Req 10.2's fail-fast)**, and the Req 5.5 abort (file absent and no seed requested).
   > **[v7]** v6 added Req 11.3's and Req 10.2's causes but **silently narrowed v5's
   > "deployment-check failure" to "deployment timeout"**, which dropped the case Req 10 exists for:
   > a record found whose latest status is not `success` — the Vercel production build *failing*.
   > r6 measured **21 of 156 deployments ending non-`success`**, so the case is live, and under v6 it
   > would have been reported as a timeout after a pointless ten-minute wait. Restored as its own
   > cause. The pattern — closing a finding at its criterion while disturbing a sibling — is the same
   > one r5 named.
3. WHEN the read token expires THEN the run SHALL fail with an authentication-specific message rather
   than silently producing an empty calendar. **This is the primary token-expiry detector, and it
   fires within one cadence period (seven days).**
4. Token expiry SHALL be treated as a **foreseen operational event, not an incident**: the one-year
   PAT lapse is expected and scheduled.
5. This spec SHALL NOT weaken, silence, or re-tune the 45-day freshness check. Its role SHALL be
   stated accurately: it is a **backstop that fires only inside a human-initiated CI run**, not a
   notification channel.
6. GitHub disables scheduled workflows after 60 days of repository inactivity. This SHALL be
   documented as a known failure mode, and its detector SHALL NOT be claimed to be the 45-day
   warning, which cannot fire during the inactivity that causes it. **No detector for this case is in
   scope**, and the documentation SHALL say so plainly.
7. **[v4] The delivery channel for a failed sync is the red run of criterion 9.1 and GitHub's own
   workflow-failure notification — and nothing else. The documentation SHALL say so, and SHALL say
   that this channel is known to be weak:** the same notification has been reporting
   `verify-vercel-token.yml`'s failure every week since 2026-06-01 without producing any action.
   > **[v4] v3's Reqs 9.7–9.9 required an issue-based escalation. They are withdrawn and deferred
   > (`d-65ff36e0`).** r3 showed the channel is a whole feature wearing three criteria — create,
   > reuse, distinguish causes, resolve on recovery, verify the labels still exist — and that it was
   > the root of a MUST_FIX in two consecutive rounds. It also has no roadmap support: the
   > decomposition entry names no escalation channel. Deferring costs this one honest sentence, and
   > buys back the spec's only non-file prerequisite, one permission scope, and about ten criteria.
   >
   > **The honesty matters more than the mechanism.** A document that claims a working alarm it does
   > not have is worse than one that says plainly where the gap is. The gap is recorded, with its
   > revisit trigger, in `d-65ff36e0`.

### Requirement 10: The commit reaches a successful production deployment

**User Story:** As Matthew, I want to know that a successful sync produced a deployed change, because
a commit that never deploys leaves the site stale while every signal reads green.

> **This closes r1's R2 and is not scope creep:**
> `.spec-workflow/spec-decomposition/decomposition.md:218` already names "the deployed page reflects
> the new data after the resulting Vercel build" as this spec's end-to-end verification.

#### Acceptance Criteria

1. WHEN the workflow pushes a commit THEN it SHALL query
   `GET /repos/{owner}/{repo}/deployments?sha=<sha>` using the write token's `deployments: read`
   scope (Req 7.3), where `<sha>` is the **full 40-character SHA** of the commit **actually pushed**
   (Req 11.4). The abbreviated SHA SHALL NOT be used — it returns zero results.
2. **[v6]** A record SHALL be treated as the production deployment when its `environment` string,
   trimmed and compared case-insensitively, **equals `Production` exactly**. `production_environment`
   SHALL NOT be used — it is `false` on Production and Preview records alike.
   - **IF records exist for the SHA but none equal `Production` THEN the run SHALL fail immediately
     with a distinct cause naming the `environment` values it saw** (Req 9.2), rather than waiting
     out Req 10.5's bound. When those values include a *qualified* production name
     (`Production – <something>`), the project topology may have changed and **a human must decide
     which project serves visitors** — the workflow SHALL NOT guess.
   - **[v7] This fail-fast SHALL be evaluated only after Req 10.5's poll has observed at least one
     record for the SHA.** An empty response means "Vercel has not created the record yet" — the
     normal state for the first 53–81 seconds after a push — and SHALL NOT trigger it. The two states
     are cleanly distinguishable: `[]` versus a non-empty list.
   > **[v7] Why this criterion exists at all** — it is the seventh instance of the conflation class
   > this document keeps hitting: "a deployment record" is not "the production deployment record".
   > This repository generates Preview deployments constantly (twelve of the last fifteen), so an
   > unfiltered Req 10 would confirm a Preview build and report green while production froze —
   > r1's R2 verbatim, inside the requirement written to close it.
   >
   > **[v7] What is measured, stated separately from what is inferred.** Across all 156 deployment
   > records the complete `environment` vocabulary is **`Production` (58), `Preview` (97),
   > `Preview – matthewfield-ca` (1)** (r5, re-derived by r6). Exact equality on `Production`
   > therefore selects 58 records and excludes every Preview, on every record this repository has
   > ever produced. That is the whole justification the criterion needs.
   >
   > **[v7] The "second Vercel project" premise is NOT measured, and three prior decisions leaned on
   > it.** v4 required exact equality; r4 saw the one qualified record and *inferred* a second linked
   > project, so v5 loosened to a `Production` prefix; v6 reverted on the *further* inference that a
   > second project would keep the primary unqualified. **r6 tested the premise and it does not
   > hold:** all 159 status objects across all 156 deployments carry `target_url` / `environment_url`
   > hosts collapsing to the single project-and-team slug `matthewfield-<hash>-mossfoot-digital` —
   > identical for the qualified record and every unqualified one. A genuinely separate project named
   > `matthewfield-ca` would have produced `matthewfield-ca-<hash>-…`. **There is no evidence of a
   > second project; the one qualified name came from something else.**
   >
   > Exact equality survives that correction — it is supported directly by the vocabulary, and no
   > longer needs the topology story. Two consequences are recorded rather than buried:
   > **(a)** v6's claim that "the deployment payload carries no project identifier" is **false** —
   > `target_url` / `environment_url` carry one, so if a second project ever does appear a
   > discriminator exists and this criterion can be tightened rather than guessed at;
   > **(b) [v9] The qualified environment's origin is now positively explained, not merely
   > unsupported.** r8 traced its sole deployment (`4998605725`): it is a **redeploy of commit
   > `8373e57ea1`, whose Preview build (`4993225933`) had failed nine hours earlier** — same
   > `matthewfield-<hash>-mossfoot-digital` project-and-team slug as all 155 others, with
   > `original_environment` already carrying the qualified name. A one-off redeploy inside a single
   > project, not a second project. **Nothing about this criterion is contingent on anything a human
   > still has to check.**
3. **[v4]** A deployment SHALL count as confirmed only when a matching record exists **and its latest
   status is `success`**. Because the deployments list response carries no status field, this SHALL be
   read from `GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses`, and **"latest" SHALL
   mean the status with the greatest `created_at`**, not array position.
   **[v8] IF more than one record satisfies Req 10.2's exact-`Production` predicate for the SHA THEN
   the record with the greatest `created_at` SHALL be the one evaluated** — the most recent
   production build for that commit is the one whose outcome matters. r4 observed two records for one
   SHA twice, once as a Production/Preview pair; v4 defined "latest" within a record and left the
   choice among records undefined.
   > **[v8]** v6 justified this tie-break with "every record in that set belongs to the same
   > project", which rests on the second-project inference v7 withdrew. r7 found this site
   > unrepaired. The tie-break itself is unchanged and needs no such premise: among production
   > records for one commit, the newest is the current one.
   > **[v4] v3 required a field its own named endpoint does not return.** r3 pulled the full record:
   > the keys include `statuses_url` and no `state` or `status`. Asserting on status rather than mere
   > existence is still right — the Introduction's stated fear is the Vercel build *failing* — but it
   > needs the second endpoint and a defined tie-break.
4. **[v8] IF the evaluated record's latest status is a terminal non-`success` state** (`failure`,
   `error`, or `inactive`) **THEN the run SHALL fail immediately under Req 9 with that status as the
   named cause**, rather than waiting out the bound below.
   > **[v8] v7 restored "deployment reported not-`success`" to Req 9.2's cause list without writing
   > the criterion that raises it** — Req 10.3 is purely definitional, so of the eleven causes in
   > that list this was the only one with no failure obligation behind it, and the state would have
   > been reported as a timeout after exactly the "pointless ten-minute wait" v7's own note named as
   > the harm. r7 also measured that **no deployment in this repository's history has ever
   > transitioned from a non-`success` status to `success`**, so failing immediately forfeits
   > nothing.
5. IF no confirmed deployment is observed within **10 minutes** of the push THEN the run SHALL fail
   under Req 9. **[v6]** r5 measured push-to-record latency at **53–81 seconds across 15 exact
   samples** (GitHub merge commits, where commit time is push time), superseding the "62–68 seconds
   across three samples" v4 and v5 cited. 10 minutes remains roughly an order of magnitude of
   headroom, and is now better supported than when it was chosen.
6. **[v4]** Req 10 SHALL apply only to runs that actually pushed a new commit. A no-change run
   (Req 6.1), and a retry path that resolved to no-change (Req 11.4), SHALL NOT wait for a
   deployment.

### Requirement 11: Concurrency, the push race, and the git mechanics both depend on

**User Story:** As Matthew, I want a routine merge or a double-dispatch not to corrupt the data or
produce a false alarm.

#### Acceptance Criteria

1. The workflow SHALL declare a `concurrency` group so that a scheduled run and a `workflow_dispatch`
   run cannot execute simultaneously.
2. IF the push is rejected as non-fast-forward — because a human commit landed on `main` during the
   run's window — THEN the workflow SHALL re-synchronise with the remote, re-run the validation gate
   (Req 4.1), and — **unless Req 11.4's re-evaluation resolves to no-change** — attempt the push once
   more.
   > **v2 offered a choice between retrying and failing cleanly, which r2 called an undecided
   > decision.** Retry-once is chosen because failing cleanly on every human merge would turn a benign
   > race into a red run, while never retrying would let a persistent push failure (A2 changing, say)
   > look identical to a transient one.
3. IF the second push attempt also fails THEN the run SHALL fail under Req 9, with the cause named as
   push-race exhaustion (Req 9.2) so a routine merge is distinguishable from a data or auth failure.
   **[v5] IF the re-synchronisation itself cannot complete — a conflict rather than a rejected push —
   THEN the workflow SHALL abort with its own distinct cause (Req 9.2), SHALL NOT attempt to resolve
   the conflict, and SHALL leave `main` untouched.**
   > **[v5] v4 had no branch for this.** r4 noted that the *almost*-identical hand-refresh race is
   > strictly likelier than the byte-identical one Req 11.4 constructs: a human refreshes by hand a
   > few hours before the scheduled run, so the two payloads differ only in the in-progress anchor
   > day's count (Req 3.6) — which is a content conflict in the same region of the same file, not a
   > clean rebase. Aborting is right: the next scheduled run starts from the merged tip and succeeds
   > without anyone resolving anything.
4. **[v4] After re-synchronising, the workflow SHALL re-evaluate Req 6.1 against the new tip before
   committing or pushing, and SHALL carry forward the full SHA of whatever commit it actually pushed
   — or the fact that it pushed nothing — to Req 10.**
   > **[v4] This closes r3's R3, which found the retry and the deployment check defeating each
   > other.** Two distinct defects:
   >
   > **(a) The SHA changes.** Every way of re-synchronising — rebase, cherry-pick, reset-and-recommit
   > — produces a new commit object with a new parent and therefore a new SHA. The natural
   > implementation captures `git rev-parse HEAD` right after the commit step and holds it across the
   > push; on the retry path that names a commit never pushed, so Req 10.1's query returns `[]`, the
   > 10-minute bound expires, and the run goes red. **The chosen branch would have reproduced exactly
   > the outcome the rejected branch was rejected for** — a red run on every benign human merge.
   >
   > **(b) Byte-identity becomes reachable.** After re-synchronising, the file being compared is
   > `main`'s *new* file, and Req 13.2 guarantees the manual and automated transforms produce
   > indistinguishable output — so a human merge carrying a hand-refresh lands exactly the bytes the
   > workflow just produced. v3 mandated both "attempt the push once more" and Req 6.1's "no commit
   > and no push" for that state, with three plausible implementations and no rule to choose among
   > them (one of which lands an empty commit and triggers a no-op production deploy).
5. The workflow SHALL never force-push and SHALL never rewrite existing history on `main`.
6. The checkout SHALL fetch enough history to perform the re-synchronisation of 11.2;
   `actions/checkout`'s default `fetch-depth: 1` cannot.
7. The commit SHALL be authored by the `GITHUB_TOKEN` identity. **The entire spec's `ci.yml`-
   suppression premise depends on this** — a commit authored by a different identity may trigger
   workflows the spec assumes are suppressed.
8. The push target SHALL be `main` on `origin`, stated explicitly rather than inherited from whatever
   the runner's checkout left configured.

### Requirement 12: The documentation tells the truth after automation

**User Story:** As Matthew returning to this in a year, I want the docs to describe the system that
exists, so I do not follow a manual procedure that a robot is already performing.

#### Acceptance Criteria

1. `docs/contributions-and-resources-authoring.md` SHALL be updated so its "GitHub activity data"
   section describes the automated refresh as the normal path.
2. The documentation SHALL state that the file is machine-written on a schedule and SHALL warn
   against hand-editing rows, extending the existing "Generated file" contract
   (`docs/contributions-and-resources-authoring.md:309`).
3. The documentation SHALL record the secret name, the token type and scope posture, the expiry
   consequence, and the two workflow permission scopes of Req 7.3 with the reason each is needed.
4. The documentation SHALL state which token commits, that `ci.yml` does not run on the resulting
   commit, and that Vercel deploys anyway (Assumption A1).
5. **[v4]** The documentation SHALL state Req 9.7's delivery channel and its known weakness, and
   SHALL point at deferral `d-65ff36e0` for the escalation that is not being built.
6. Any documentation change SHALL keep `pnpm check:authoring-docs` passing: the `## GitHub activity
   data` heading is pinned in `CANONICAL_HEADINGS` (`scripts/check-authoring-docs.mjs:40`), so that
   heading SHALL NOT be renamed or removed, and any **new** H2 added to that document SHALL be added
   to `CANONICAL_HEADINGS` in the same change.
7. The claim at `docs/contributions-and-resources-authoring.md:316-320` — that the committed fixture
   `scripts/__fixtures__/github-activity/seed-52w.json` lets "any number in the YAML be checked
   against the payload it came from" — **becomes false at the first automated sync** and SHALL be
   corrected in the same change that ships the automation.
8. The existing statement that staleness is a soft failure disclosed by the "as of" line SHALL remain
   true and SHALL NOT be contradicted.
9. The manual anchor rule at `docs/contributions-and-resources-authoring.md:395-396` SHALL be
   reconciled with Req 2, distinguishing the request bounds from the resulting anchor.
10. **The decomposition entry SHALL be corrected in the same change.**
    `.spec-workflow/spec-decomposition/decomposition.md:216` ("Turns spec 11's staleness warning from
    a routine chore reminder into a genuine alarm") and `:228` ("spec 11's 45-day freshness warning is
    the detector, which is why that check is load-bearing") both assert theses this document has
    explicitly withdrawn. It is the first thing a future reader of the roadmap hits.

### Requirement 13: The manual path still works, and an absent file can be recovered

**User Story:** As Matthew, I want to be able to refresh by hand, so that a broken or disabled
workflow never leaves me unable to update the data.

#### Acceptance Criteria

1. The hand-run refresh procedure SHALL remain documented and SHALL remain correct after this spec.
2. WHEN the file is refreshed by hand THEN the result SHALL be indistinguishable in shape from a
   workflow-produced file, so the two paths cannot diverge. IF the automated and manual transforms
   could produce different output for the same response THEN that SHALL be treated as a defect.
3. The `workflow_dispatch` trigger SHALL be the preferred manual path. The raw `gh api graphql`
   invocation SHALL be retained as the fallback for the two cases the workflow cannot serve: **GitHub
   Actions being unavailable, and the workflow itself being disabled or broken.**
4. The workflow SHALL provide an explicit, opt-in way to seed an absent
   `content/github-activity.yaml` — a `workflow_dispatch` input or equivalent — so that Req 5.5's
   refusal to create the file is not a permanent deadlock.
   > **The deadlock this closes.** If a bad merge deletes `content/github-activity.yaml`, Velite's
   > collection resolves to `[]`, `checkCoverageContiguity` returns early on a short array
   > (`src/lib/build/check-github-activity-invariants.ts:78-80`) and `checkNoDuplicateDates` finds
   > nothing, so `next build` succeeds and the section silently stops rendering. Meanwhile the sync
   > workflow aborts forever under Req 5.5. Every check is green, the page is missing a section, and
   > the automation cannot recover on its own.
5. The seed path SHALL apply the same validation gate (Req 4.0) as an ordinary refresh; it is an
   exception to Req 5.5's file-must-exist rule only, not to any validation.

## Sequencing and Prerequisite Work

- **Spec #11 `github-activity` must be implemented, not merely specified**, and is
  (`.spec-workflow/spec-decomposition/INDEX.md:26`: 25/25, `Complete`; shipped in `4802b6c`). The sync
  writes to a contract only the built pipeline enforces
  (`.spec-workflow/spec-decomposition/decomposition.md:220`).
- **`GH_CONTRIBUTIONS_TOKEN` must exist as a repository secret** before the first scheduled run can
  succeed. Created and verified during spec #11 (task 9).
- **Assumptions A1–A5 should be re-checked at implementation time**, since all five are external
  state that can change between approval and build. **A5 needs no command while the repository is
  user-owned** — see its entry.
- **The first automated run replaces a hand-seeded file** — see Req 6.4.

> **[v4] The label prerequisite is gone** with the escalation deferral (`d-65ff36e0`). It was this
> spec's only non-file prerequisite.

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility Principle**: The query/transform logic SHALL live in a script with a pure,
  testable core — following `scripts/check-github-activity-freshness.mjs:119`, whose
  `evaluate(fileContents, nowMs)` is exported specifically so it can be driven without touching the
  real content file or the clock. Req 4.9 makes the test an obligation.
- **Modular Design**: The workflow YAML SHALL orchestrate; it SHALL NOT carry the transform inline as
  a long shell one-liner, because inline logic cannot be unit-tested and this spec's whole safety
  argument rests on the gate being testable.
- **Dependency Management**: The implementation SHALL prefer what the repository already has —
  Node 24 (`.nvmrc`), the `yaml` package (a devDependency at `^2.9.0`), and the `gh` CLI available on
  GitHub-hosted runners — over new dependencies.
- **Clear Interfaces**: The boundary between "fetch and transform" and "decide whether to commit"
  SHALL be explicit, so the decision logic can be tested against fixtures without network access.

### Performance

- A run SHALL complete well within GitHub's per-job limits; one GraphQL query, one file write, one
  `next build`, and a bounded deployment poll is the entire workload.
- The workflow SHALL run only the `ci.yml` steps that can reject this payload — the content build and
  `next build` — and SHALL NOT run the rest of the suite. Of the steps skipped, the only other one
  that touches `content/github-activity.yaml` is `pnpm format:check`, which Req 4.7 addresses. The
  unit suites drive mocked fixtures rather than the real content file, and `check-velite-output.mjs`
  does not reference `githubActivity`.

### Security

- Secrets SHALL be passed via `env:` from `secrets.`, never interpolated into a `run:` command line
  where they could reach process listings or logs.
- The workflow's `permissions:` block SHALL be declared explicitly and enumerate exactly the two
  scopes of Req 7.3 — necessary because the repository default is `read` (A4) and because declaring a
  block zeroes every unlisted scope.
- The read token SHALL remain zero-scope (Req 7.5); this is a data-integrity property as much as a
  security one.
- No workflow in this spec SHALL run on `pull_request_target` or otherwise execute untrusted
  contributor input with write permissions.

### Reliability

- A failed run SHALL leave the repository in exactly its prior state (Req 5.4).
- A transient network failure SHALL be tolerable: the next scheduled run retries. Retry logic inside a
  single run is permitted but SHALL NOT be required, except for the single push retry of Req 11.2.
- **[v4]** Concurrent runs SHALL be prevented outright (Req 11.1), and a run that finds no change
  SHALL make no commit (Req 6.1).
  > **[v4] v3 claimed "two runs in the same UTC day SHALL produce at most one commit". r3 showed that
  > is false**: Req 3.6 records the anchor day exactly as returned while it is still in progress, so
  > two runs hours apart on the same UTC day legitimately differ in the final record's `count` and
  > both correctly commit. Req 6.1 is a byte-identity rule, not a per-day quota, and the NFR
  > overstated it into a contradiction.

### Usability

- The Actions run summary SHALL make the outcome legible at a glance — refreshed, unchanged, or
  failed with a named cause — without opening step logs.
- The commit message SHALL identify the change as an automated data refresh and SHALL follow the
  project's conventional-commit convention.

### Maintainability

- The pinned constants this spec depends on — the 364-day pull range, the 2-day anchor-recency
  window, the weekly cadence, the 10-minute deployment wait, and the 45-day threshold it must stay
  inside — SHALL each be stated once, in a named place, with the reason attached.
- The workflow SHALL be readable by someone who has not read this document, which means its comments
  SHALL carry the four non-obvious facts: that `ci.yml` does not run on its commits, that Vercel
  deploys anyway (an assumption, not a guarantee), that the pre-commit hook reformats staged YAML,
  and that the repository's default workflow permission is `read`.
