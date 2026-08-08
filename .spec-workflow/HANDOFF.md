# HANDOFF — spec-workflow in-flight state

Single source of in-flight phase state (per spec-loop-v3). The generated roadmap lives in
`.spec-workflow/spec-decomposition/INDEX.md`; build order lives in `decomposition.md`.

- **Active spec:** none. `profile-resume` (spec #10) was **implemented and marked Complete on
  2026-08-07**. INDEX.md was regenerated and shows `profile-resume | Complete | 24/24`.
- **Last completed spec:** `profile-resume` (spec #10), implemented 2026-08-07.
- **Roadmap state:** all 10 specs in `decomposition.md` are `Complete`. Nothing is deferred.
- **Next action:** re-running `sdd-router.md` will report **"SDD roadmap complete — no active spec"**
  and exit. There is no next spec to route to. To continue, add a spec to `decomposition.md` first.

## profile-resume — completion record (2026-08-07)

**Workspace.** Code lives in the git worktree `/home/mcf/repo/matthew-field.ca-profile-resume` on
branch `spec/profile-resume`. Spec state lives here, in the main checkout. That worktree carries a
**stale committed copy of `.spec-workflow/`** which predates this spec — reading it will make an
agent conclude the roadmap is complete for the wrong reason. Resolve every `.spec-workflow` path
against the main checkout, and never pass `projectPath` to an MCP call.

**Nothing is merged.** 42 commits sit on `spec/profile-resume` above `main`; none on `main`. No PR
yet. Working tree clean at `2f2d63d`.

> **Before opening a PR, read the spec-docs tracking decision below (`d-d3295c3e`).** The earlier
> version of this file said the spec documents "must be copied into the branch" so the PR carries
> spec and implementation together. **That instruction is now superseded** — see below.

### Tasks 20–24 (this run)

| # | Task | Commit(s) |
|---|---|---|
| 20 | print slice | `06c5d20`, `f3479a9`, `90b92b1`, later `37c3018`, `2f2d63d` |
| 21 | "a decade" consistency test | `27895ab` |
| 22 | coverage + dependency verifiers | `df25f6d`, `1809a68`, `92cf305`, `b5277ef` |
| 23 | Lighthouse run record | `2ab4d9a`, `4f5790e` |
| 24 | E2E + full verification | `0910138`, `a7d3fe8`, `c3fae2b` |

Tasks 1–19 were completed in earlier runs; see the git history and the previous revision of this file.

Every task: implemented → `log-implementation` → independent review → findings actioned → re-review
→ `[x]`. Tasks 20, 22 and 24 each needed the full three fix+re-review rounds; 21 and 23 converged in
one. **Task 20 was reopened after the completion gate** (see below) and re-closed.

### The completion gate earned its keep — read this

The first end-to-end verification returned **`VERIFY: fail`**, catching a defect that **three rounds
of independent class-level review had passed**:

`print.css`'s site-chrome rules were written as bare `header` / `footer` descendant selectors, so they
also matched the role `<header class="profile-role-header">`. **The printed CV showed no employers,
no job titles and no dates on any of the four roles** — the exact artifact R6 exists to produce.
Every prior reviewer had verified that the *rules and class hooks* were correct; none had rendered a
PDF. Fixed in `37c3018` by scoping chrome suppression to `.site-header` / `.site-footer` class hooks
added to the layout components, plus a regression test.

That same fix pass found a second, latent R6.6 violation: **dark-mode printing produced a black 2cm
margin box on every sheet.** next-themes' inline `color-scheme: dark` drives Chrome's page margin box;
`html { background: white }` does nothing and a non-`!important` declaration loses. Resolved with
`color-scheme: light !important` inside `@media print`, guarded by a test (`2f2d63d`).

**The lesson, for any future print work:** target chrome by class, never by element — and verify by
**rendering an actual PDF**. Playwright's `emulateMedia({ media: "print" })` missed both defects.

The second end-to-end verification returned **`VERIFY: pass`** on all five scenario clauses.

### Verified state at `2f2d63d`

- vitest **593 passed / 1 skipped / 0 failed** (589/2 on a clean tree — see the `feed.xml` note below)
- Playwright **182 passed / 16 skipped / 0 failed** (198 total). Developer-run; **CI runs no Playwright.**
- `tsc --noEmit`, `pnpm exec velite build`, `pnpm build`, prettier — all clean
- eslint — 0 errors, 7 pre-existing warnings in untouched files
- axe — **zero violations on `/profile` in both themes**
- Lighthouse `/profile` — **Performance 100, Accessibility 100, Best Practices 100, SEO 100**
  (recorded in `docs/profile-resume-lighthouse-runs.md`; developer-run, not a CI gate)

> A reported Playwright count of "168 passed" during this run was a **misread of the list reporter's
> per-test ordinal**, not lost tests. The true stable count is 198 = 182 passed + 16 skipped,
> confirmed by `--list` and two full runs. Recorded here so it is not re-investigated.

> `src/app/feed.xml/parity.test.ts` is build-gated on `.next/server/app/blog/fixture-code.html`: with
> that artifact present it contributes 4 passes, without it 1 skip. Expect 593/1 after a `pnpm build`,
> 589/2 on a clean tree. **Not a regression.**

### One known pre-existing failure, unrelated to this spec

`scripts/verify-ci-topology.test.mjs` — the "meta-gate — PHASE_POST_23.3 with flag unset" case fails
on missing blog-enhanced `ci.yml` "Build 2" steps. Confirmed pre-existing by stashing, three separate
times. **Do not attribute it to this spec.**

### Deferrals recorded this run

| ID | What |
|---|---|
| `d-d3295c3e` | **profile-resume's spec docs are untracked in git** — the only one of ten. Both verifier scripts therefore print `SKIPPED` for it. **User decision: leave untracked.** This repo is PUBLIC and a personal resume leaked into it once before, requiring a history rewrite; these docs discuss curated employment history specifically. Their clean 45/45 run was obtained against temporary copies. |
| `d-5bfb5a4d` | Nine repo scripts have fragile entrypoint guards (space-in-path and/or symlink) that make them **silently exit 0**. `check-authoring-docs.mjs` is the sharpest risk — it genuinely runs in CI. |
| `d-71a32ac4` | The `n/a` sentinel is now the **only** way to declare deliberate no-coverage in a requirements matrix. Undocumented in spec-authoring guidance. |
| `d-11755b74` | `pnpm lhci` aborts at URL 4/7 unless built with `BLOG_INCLUDE_DRAFTS=1` — the four `/blog/fixture-*` URLs 404 as drafts, and lhci exits before the assert step, so gates are never evaluated. |
| `d-fcec30d3` | **Two sibling Lighthouse runs-logs falsely claim a CI cadence gate that does not exist.** Neither cadence script is wired into `ci.yml`. Only this spec's new runs-log was corrected. |
| `d-007389a8` | The DOI mask in `/profile`'s contact-data scan can swallow a phone number typed hard against a `10.NNNN/` prefix. Accepted as strictly better than the `wa.me/` hole it replaced. |
| `d-a31e2253` | **`pnpm build` alone does not gate malformed content** — it exits 0 against a stale `.velite/`. The real gate is `pnpm exec velite build`, reached via `postinstall`. Supersedes the standing constraint previously recorded here as `d-096a531a`. |

Still open from earlier runs: `d-c216e0c9` (raw NUL byte in `src/lib/mail.ts:52` makes git treat the
file as binary), `d-b2055869` (velite `strict: true`), `d-3a396493` (content chokepoint parity —
**settled, do not re-litigate**), `d-096a531a` (see `d-a31e2253` above).

### Decisions taken during this run

- **`.spec-workflow/specs/profile-resume/` stays untracked.** See `d-d3295c3e`. This **supersedes**
  the earlier instruction in this file to copy the spec documents into the branch before opening a
  PR. If that is revisited, the docs must first be reviewed against the R3 curation checklist in
  `docs/experience-authoring.md` — and staged directory-by-directory, **never** with `git add -A`.
- **AC 6.1's coverage-matrix cell was rewritten** to `n/a — no /resume route created; negative
  requirement, verified by absence`, because task 22 tightened the verifier to require a real task
  number or an explicit sentinel. R6.1 is a negative requirement and legitimately has no covering task.
- **Task 20 deviated from "do not touch the token re-declaration block."** Justified: R6.6 (light CV
  from dark mode) is squarely in that task's scope and could not be satisfied otherwise. Reviewed and
  ruled sound.
- **Task 23 ships no cadence script**, unlike the two sibling runs-logs. The non-parity is stated
  explicitly in that doc's header rather than implied.

### Open follow-ups for the human (non-blocking, NOT defects)

- **`content/experience.yaml:113`** says "a couple of hours" where the master resume says "a few
  hours" — a small unsourced tightening. Worth a glance.
- **Cosmetic, task 7.** A comment and error message in `src/lib/build/check-experience-project-links.ts`
  say drafts are filtered "on production only"; `getPublishedProjects()` filters them in every
  environment unless `PROJECTS_INCLUDE_DRAFTS=1`. Only the `fixture-` filter is production-only.
- **Minor, task 19.** `getExperience()/getSkills()/getEducation()` each run twice per render (once for
  the page, once inside `buildProfileJsonLd()`). Trivial under `force-static`.
- **Detector limits, task 16.** The recursive JSON-LD contact-data test is defence in depth, not a
  security boundary. Its `PHONE_SHAPED` pattern matches any 7+ digit run, so **moving employment dates
  to day precision would turn the R7.3 test spuriously red.**
- **The site is not deployed from this branch.** Per standing preference, site changes go on a feature
  branch and get pushed for a Vercel preview — never straight to `main`.
