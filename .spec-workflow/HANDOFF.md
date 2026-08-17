# HANDOFF — spec-workflow in-flight state

Single source of in-flight phase state (per `spec-loop-v3`). The generated roadmap lives in
`.spec-workflow/spec-decomposition/INDEX.md` (never hand-edited); build order lives in
`decomposition.md`.

## Current state (2026-08-17)

**`github-activity-sync` (#12) is Complete — 17/17, merged and live.** Its spec documents were
untracked until 2026-08-17 and are now committed.

**The `decomposition.md` roadmap is finished. A thirteenth spec now exists outside it.**

All twelve specs named in `decomposition.md` exist on disk and are Complete. But `spec-index` no
longer reports `all-on-disk-complete` — it routes to **`newsletter-buttondown`**, a spec that is
**not in `decomposition.md`** and never was. The decomposition predates the newsletter decision;
this is net-new scope added on top of the roadmap rather than derived from it. Anyone reading INDEX
will see it under "Other specs (not in decomposition.md)" — that is correct, not a bug.

### `newsletter-buttondown` — in flight, 10/14

- **Spec captured retroactively** (`4539884`): the code shipped first on branch
  `feat/buttondown-email-template`, then requirements/design/tasks were written against it. Tasks
  1–8 are `[x]` and all eight carry implementation logs; **review coverage is 0/8** — no dashboard
  review has run against this spec, and the tasks header says so rather than letting `[x]` imply one.
- **Two commits of code**: `e3f29b3` (email template ported from tokens) and `8151529` (signup via
  same-origin proxy). Branch pushed, not merged, no PR opened yet.
- **The finding worth carrying forward**: the site CSP (`connect-src 'self'`, `form-action 'self'`)
  blocks Buttondown's own embed snippet outright — both the cross-origin form POST and any client
  fetch. Proven in-browser, not reasoned about. Any future vendor widget on this site hits the same
  wall; the answer is a same-origin proxy route, not a CSP relaxation.
- **Tasks 9 and 10 are now done** (see below). **Remaining**: task 11 (archive) is gated on a
  decision, not effort — see `d-f61320d2`. Task 12 is the welcome-email copy. Tasks 13–14 are
  Matthew's: installing the CSS in Buttondown and running one live subscribe to close the one
  untested path.

### The sync is live and proven

- **Merged:** PR #54 → `aee92ee` on `main`, after the new `ci.yml` self-test step ran green on the
  branch (task 17's stated precondition).
- **First run:** [31924207106](https://github.com/madmatt112/www.matthewfield.ca/actions/runs/31924207106),
  manual dispatch, 1m58s, `[sync] outcome=refreshed`.
- **Bot commit `8d03139`** — authored `github-actions[bot]`, message
  `chore(content): refresh GitHub activity data`, 16 insertions / 16 deletions.
- **Production deployment `5927200751` reported `success`**; `https://www.matthewfield.ca/contributions`
  returns HTTP 200 carrying the new `2026-08-16` anchor.
- **Fact 7 is cleared.** `pnpm gate:github-activity` now exits 0 through all four stages
  (G1→G2→G3→G4) on the refreshed payload. It stays passing while the weekly cadence holds.
- Next scheduled run: the `37 9 * * 2` cron — Tuesdays.

## What the live run proved that no local test could

- **The `seed` expression works on a real dispatch.** `${{ inputs.seed && '--seed' || '' }}` resolved
  to the empty string; the Refresh step invoked the script with no flag. Task 12 explicitly deferred
  this to task 17 as unverifiable locally.
- **The gate reached G4.** Every local run since 2026-08-13 stopped at G3 on the stale seed, so
  `next build` had only ever been exercised under the temporary-substitution licence.
- **The empty-list poll path ran for real.** Five consecutive
  `poll: pending — 0 record(s) for the SHA` lines before the production record appeared. Req 10.2's
  fail-fast correctly did **not** fire while zero records existed — the behaviour the design specified
  for the first 53–81 seconds, previously only driven through injected stubs.
- **CI does not run on the bot commit**, confirmed empirically (`gh run list` for that SHA is empty) —
  the documented assumption the workflow's comments record.

## One prediction that was wrong, recorded rather than glossed

Task 17 predicted a **large** first diff, reasoning that the seeded range `2025-08-12 → 2026-08-10`
cannot equal a range ending at the run date. **The actual diff was 16 insertions / 16 deletions.**
The reasoning was sound; the magnitude assumed a long staleness gap. The seed was only six days stale
at dispatch, so only the rolled-off and rolled-on days plus a few changed counts differ. Anyone
re-reading the spec should not expect a large diff to be a correctness signal.

## Gotchas that outlive this spec

1. **Three commands do less than their names suggest.** `pnpm typecheck` cannot see anything under
   `scripts/`; `pnpm lint` does not lint workflow YAML and exits 0 on warnings; `pnpm test` (vitest)
   includes only `src/**`. **The three sync suites run only via `node --test`** — which is why
   `ci.yml` carries a dedicated step. Do not credit any of the three with covering them.
2. **Prettier does not cover `.spec-workflow/`** — `.prettierignore` contains `/.spec-workflow`, so a
   `--check` there matches zero files and passes vacuously.
3. **Read the LAST `[gate] G<n>` marker, never the first.** pnpm's banner reprints the script text, so
   all four markers appear before anything runs: `grep -c` returns 4 every time and a first-match read
   reports `G1` even when the chain stopped at G2 or G3.
4. **The cause vocabulary grew during implementation, by design.** Component 1 ships nine condition
   rows over eight slugs, not the six the frozen documents describe — `input-unreadable`,
   `flag-missing-value` and `internal-error` were added in task 3 after review found a local file error
   misreported as a GitHub API error and unhandled throws escaping with no cause (Req 9.2). Design
   §Cause vocabulary licenses this: "a floor, not a cap". 13 slugs documented, 13 shipped.
5. **`design.md:1071` is stale** — it shows the gate alias without the `[gate]` echoes that tasks.md
   v5's F6 added and task 12 depends on. tasks.md is the implementation authority; the shipped alias
   is correct.
6. **`tasks.md` cites `30f46b2` in eight places.** That commit was cherry-picked as `a6557de`, which
   is what is reachable from `main`. The authoring doc was corrected and its evidence inlined so the
   argument survives regardless; the frozen tasks document was not rewritten mid-implementation.
7. **Rows 4 and 8's `::error::` detail is multi-line**, so GitHub's annotation surfaces only the first
   line and the 40-hex SHA lands in the step log. Verbatim design-fence behaviour.
8. **Reference block hash `fc442f0c…a211a9`** (97 lines, comment-free) — step 8's extracted `run:`
   scalar matches it. The harness's scratch `block.sh` adds five navigation headers excluded from that
   comparison; with them re-inserted it hashes `998e831b…5939`.

## Deferrals — the debt this spec created

**`github-activity-sync` implementation added 1; `newsletter-buttondown` added 3, then resolved 1. Total open queue: 23.**

Newsletter deferrals (all `originSpec: newsletter-buttondown`):

- **`d-e77bd089`** — the body placeholder in `email/buttondown/template.html` is unverified.
  Buttondown documents every other variable used but never names the one that injects the email body
  into a custom template; `{{ body }}` is a stand-in. Blocks nothing — the CSS path works on the
  Basic plan. Readable from Buttondown's template editor once a Professional plan exists.
- **`d-528554d8` — RESOLVED same day, and worth reading as a caution.** It claimed the shared
  origin check could not be extracted because editing `api/contact` would trip the paired-merge CI
  guard. **That was never true.** `verify-paired-merge.mjs` tracks
  `[next-config-imports.test.ts, next.config.ts, project-errors.ts, blog-errors.ts]`; the two canary
  guards track chokepoint fixtures plus `projects.test.ts`. None names `api/contact/route.ts`. The
  deferral was written from the guards' *existence*, not their file list. **Before deferring on a
  guard in this repo, read its `TRACKED_SET`** — it is four lines and settles the question.
  Now extracted to `src/lib/request-origin.ts`, consumed by both routes.
- **`d-f61320d2`** — whether an on-site newsletter archive is additive at all. Essays are already
  canonical as blog posts, so an archive may just duplicate `/blog`. Settle before building.

- **`d-5abe889e`** (new) — `docs/…:565` still offers "widen the refresh window" as a staleness remedy
  the automation makes impossible: the span is fixed at `PULL_RANGE_DAYS = 364` and Component 2's
  record-count check rejects any other length. Left unfixed because task 15's Success clauses are a
  closed criterion-keyed checklist this line is not on, and all 20 criteria had just been
  independently verified. One-sentence fix next time that file is open.
- **`d-3079c159`**, **`d-ae7216b4`** — predate implementation; both are known false-positive risks in
  Req 10's deployment reads, implemented verbatim on purpose by task 9. **Both now have live data
  against them:** the first run's poll saw zero Preview records before the Production one, and no
  `inactive` status. Keep parked until a real occurrence.
- **`d-65ff36e0`** — the issue-based escalation channel, documented by task 15.

**Worth working next:** `d-65ff36e0`. It is the only one closing a real observability gap — GitHub's
60-day inactivity disablement has no detector in scope, and the sync now depends on the workflow
staying enabled. Then `d-5abe889e`, a one-line fix that stops a reader following bad advice.

## Approval records (resume contract)

- **Requirements: `approval_1786485295072_1uyqe11cx` — approved.**
- **Design: `approval_1786558366724_66mkjbiur` — approved.**
- **Tasks: `approval_1786576914975_v86lwjthf` (v9) is the live one.** v1–v8 coexist, superseded.

## Workspace notes

- The worktree at `/home/mcf/repo/matthew-field.ca-github-activity-sync` (created mid-run when a
  concurrent session took the main checkout's HEAD) has been **removed** — merged and redundant.
- Branch `chore/remove-verify-vercel-token` has been **deleted**; its content reached `main` as the
  cherry-pick `a6557de`, so `30f46b2` is now unreachable. Nothing depends on it — the authoring doc's
  evidence was inlined precisely so no SHA is load-bearing.
- `feat/github-activity-sync` survives, local and remote, fully merged — deletable at will.
- **Never pass `projectPath` to an MCP call.**

## Not started

- Content PR (four external contributions to `contributions.yaml`) — independent of any spec.
- **`content/posts/increasing-my-luck-surface-area.mdx` is untracked and fails velite** with three
  required-field errors (`date`, `description`, `title`). Noisy on every `vitest` and `dev` run.
  Pre-existing, unrelated to any spec — a draft that needs frontmatter or removal.
