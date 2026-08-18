# HANDOFF — spec-workflow in-flight state

Single source of in-flight phase state (per `spec-loop-v3`). The generated roadmap lives in
`.spec-workflow/spec-decomposition/INDEX.md` (never hand-edited); build order lives in
`decomposition.md`.

## Current state (2026-08-18)

**`github-activity-sync` (#12) is Complete — 17/17, merged and live.** Its spec documents were
untracked until 2026-08-17 and are now committed.

**The `decomposition.md` roadmap is finished. A thirteenth spec now exists outside it, and it is
now merged.**

All twelve specs named in `decomposition.md` exist on disk and are Complete. But `spec-index` no
longer reports `all-on-disk-complete` — it routes to **`newsletter-buttondown`**, a spec that is
**not in `decomposition.md`** and never was. The decomposition predates the newsletter decision;
this is net-new scope added on top of the roadmap rather than derived from it. Anyone reading INDEX
will see it under "Other specs (not in decomposition.md)" — that is correct, not a bug.

### `newsletter-buttondown` — MERGED, 14 of 17 task checkboxes ticked

- **Merged 2026-08-18**: [PR #55](https://github.com/madmatt112/www.matthewfield.ca/pull/55) →
  `9d2cb3c` on `main`. 25 commits, 59 files, +7896/-311.
- **Count the checkboxes, not the numbers.** `tasks.md` numbers **two different tasks `14`**
  (lines 194 and 204), so anything derived from the numbering reads 14/16 while `grep -c '^- \[[ x]\]'`
  reports 17 tasks. The three outstanding are task 13 (point Buttondown's "After confirming"
  redirect at `/newsletter/welcome` — free, one field), the first task 14 (blocked on a paid plan),
  and the second task 14 (one live subscribe). All three are owner actions or plan-blocked; no code
  is waiting.
- **Spec captured retroactively** (`4539884`): the code shipped first on branch
  `feat/buttondown-email-template`, then requirements/design/tasks were written against it. Every
  completed task carries an implementation log, but **review coverage is still 0** — no dashboard
  review has run against this spec, and the tasks header says so rather than letting `[x]` imply one.
- **The branch carried far more than the newsletter by the end.** `/about` removed and 308-redirected
  to `/profile`; `/contact` given the site-standard `max-w-3xl` container and a SectionKicker;
  `/newsletter` and `/newsletter/welcome` prose extracted into `content/pages/`; the reading list on
  `/now` gained a StoryGraph profile link and an optional book `url`; Makefile gained `dev`, `build`,
  `preview`, `check` and `drafts`. Anyone archaeologising a change in those areas should look at
  PR #55 even though its title says Buttondown.
- **The finding worth carrying forward**: the site CSP (`connect-src 'self'`, `form-action 'self'`)
  blocks Buttondown's own embed snippet outright — both the cross-origin form POST and any client
  fetch. Proven in-browser, not reasoned about. Any future vendor widget on this site hits the same
  wall; the answer is a same-origin proxy route, not a CSP relaxation.
- **Tasks 9, 10, 11, 12 and 15 are done.** Task 11 closed with NO code: Matthew decided against an
  archive. Posts sent as issues get the tag `newsletter`, and `/blog/tags/newsletter` is the
  archive via the tag system that already existed.
- **The newsletter is called Field Notes, and task 15 rewrote every surface to say so.** The first
  pass sold a platform-engineering newsletter; the real thing is a career-transition story told
  while it happens, with a deliberately wide range (small software, consulting, classical music,
  production, options trading). **The positioning and voice authority is the Eden "North star" note
  on the Brand HQ board** — it pins Matthew's hand-written Buttondown vetting answers as what bios
  and positioning copy should sound like. Read it before writing any copy for this site.
- **Eden MCP gotcha, cost several turns**: `eden_get_note_markdown` wants the note document id from
  the item's `storagePath`, **not** the item id that `eden_list_workspace_items` / `eden_read_board`
  return. The item id 404s with `status: "not-found"`, which looks like auth or a deleted note and
  is neither. `previewText` on list results also truncates at 1200 chars.
- **The email work is PARKED on plan cost.** Nothing in `email/buttondown/` installs on the free
  plan: custom CSS needs Basic, the welcome email needs Standard (Buttondown treats it as a
  transactional email), the full HTML template needs Professional. Matthew is not ready to pay.
  Task 16 routed around it: `/newsletter/welcome` is a confirmed-subscriber landing page, wired
  from the free "After confirming" redirect, so the site delivers the welcome the email cannot.
- **Remaining**: see the checkbox note above. Nothing in the queue is code.

### Findings from the merge-day work that outlive the spec

- **An HTTP 200 proved nothing three separate times on this branch.** StoryGraph's favicon endpoints
  return `200` with a **zero-byte body**; WorldCat's `/isbn/<n>` returns `200` while redirecting to a
  search page whose body says "No results"; and Buttondown's own embed endpoint answers a successful
  subscribe with a 302. Read the body, not the status line.
- **Velite never prunes `public/static/`.** Removing a cover from `content/reading.yaml` leaves its
  hashed asset behind, tracked and unreferenced. Audit by diffing the directory against the names
  mentioned in `.velite/*.json`. As of 2026-08-18 it is clean: 17 assets, 17 referenced.
- **`next.config.ts` is in `verify-paired-merge.mjs` TRACKED_SET**, and the non-revert path is
  literally all-four-or-none. A one-line redirect there would have forced edits to
  `project-errors.ts` and `blog-errors.ts`. The `/about` redirect is a route file calling
  `permanentRedirect()` instead — unguarded, and honoured by `next dev`, which `vercel.json`
  redirects are not.
- **Brand icons come from simple-icons, and the slug is not the obvious one.** The StoryGraph mark is
  `thestorygraph.svg`, not `storygraph.svg`. `social-links.tsx` documents why brand marks are inlined
  rather than imported: lucide-react dropped them over trademark.

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

**`github-activity-sync` implementation added 1; `newsletter-buttondown` added 3, then resolved 2. Total open queue: 22.**

**Three of the 22 moved on merge day and should be actioned before anything new is started:**

- **`d-eb289402` looks already fixed.** It claims the footer link row overflows the body at 320px on
  every page. Removing `/about` took that nav from 5 links to 4. Measured 2026-08-18: the nav is
  273px inside a 305px content width (320 minus scrollbar, the stricter case), with **zero**
  overflowing elements on `/` and `/now`, and an identical 4-link nav on all 8 routes checked.
  Re-measure and close it.
- **`d-cd92bbdf`'s trigger fired.** It says "next time content schemas or build-error messages are
  worked on, fix github-activity, resources and reading together". `reading-schema.ts` was edited on
  2026-08-18 to make `url` optional. The deferral is about future-date rejection surfacing Zod's
  generic message; do all three schemas in one pass.
- **`d-a31e2253` and `d-096a531a` are the same complaint twice** — `pnpm build` never runs velite, so
  it does not gate content. `make build` now runs velite first and `make preview` depends on it, so
  the hole is plugged for anyone using the Makefile. Update both to name it rather than leaving them
  reading as though nothing changed.

Newsletter deferrals (all `originSpec: newsletter-buttondown`):

- **`d-e77bd089`** — still open, still plan-blocked. The body placeholder in
  `email/buttondown/template.html` is unverified.
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
- **`d-f61320d2` — RESOLVED, and it deleted a feature rather than shaping one.** The question was
  whether an on-site archive is additive when essays are already canonical as blog posts. Answer:
  no. Posts sent as issues carry the tag `newsletter`, and `/blog/tags/newsletter` is the archive,
  produced by the tag system that already existed. Zero newsletter-specific code, no build-time API
  call, nothing to degrade when Buttondown is down. The original Req 7.2 contained its own
  refutation: it demanded the archive not duplicate posts that are also blog posts, which here is
  all of them.

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

**Worth working next**, in order:

1. The three merge-day movers above (`d-eb289402`, `d-cd92bbdf`, `d-a31e2253`/`d-096a531a`). Two are
   bookkeeping on work already done; only `d-cd92bbdf` needs code.
2. `d-65ff36e0`. The only one closing a real observability gap — GitHub's 60-day inactivity
   disablement has no detector in scope, and the sync depends on the workflow staying enabled.
3. `d-5abe889e`, a one-line fix that stops a reader following bad advice.

`d-c216e0c9` is worth pulling forward opportunistically: a raw NUL byte in `src/lib/mail.ts` makes
git treat the file as binary, so every review of it shows no diff at all.

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
- `feat/buttondown-email-template` is merged as of 2026-08-18 and likewise deletable.
- **Never pass `projectPath` to an MCP call.**

## Not started

- Content PR (four external contributions to `contributions.yaml`) — independent of any spec.
- **`content/posts/increasing-my-luck-surface-area.mdx` is now tracked and passes velite** (`583b72c`)
  but is still a **2-line stub** carrying placeholder frontmatter and `draft: true`. It needs writing
  or deleting; it is not blocking anything either way.
- **`docs/slash-pages-authoring.md` has two stale spots** left by the merge. Its worked YAML example
  is "Do I Stay Christian?" including `cover: ./reading/do-i-stay-christian.jpg`, a file deleted in
  `373dff6` — copy-pasting the example now fails velite on a missing image. And its "which file
  renders which page" table lost the `/about` row without gaining rows for `newsletter.mdx` and
  `newsletter-welcome.mdx`, both of which now live in `content/pages/`.
- **Owner actions still open on the newsletter**: point Buttondown's "After confirming" redirect at
  `/newsletter/welcome`, and perform one live subscribe. Neither needs a developer.
