# HANDOFF — spec-workflow in-flight state

Single source of in-flight phase state (per `spec-loop-v3`). The generated roadmap lives in
`.spec-workflow/spec-decomposition/INDEX.md` (never hand-edited); build order lives in
`decomposition.md`.

## Current state (2026-08-10)

- **Active spec:** `github-activity` (spec #11). INDEX `## Next` → `State: active`.
- **All three documents are approved.** Requirements v4 (2026-08-09), design v9 (2026-08-10),
  **tasks v9 (2026-08-10 15:28 UTC — `approval_1786345399035_a9cvusyk2`)**.
- **The document loop is finished for this spec.** `spec-status` reports `implementing`, so the next
  "continue the SDD process" run routes to the **implementation loop**
  (`task-implementation-loop-v2.md`), not the document loop.
- **Nothing is committed.** See §Uncommitted below — this is the first thing to deal with.

## What the next run does

Runs `task-implementation-loop-v2.md` against 25 tasks, starting at task 1. Tasks 1–8 and 11–16, 18,
19, 21, 22 (eighteen of twenty-five) can complete without any human input.

**Two tasks need Matthew and they gate `Complete`:**

- **Task 9 — seed the real data.** One GitHub GraphQL query, then write ~364 `{date, count}` rows.
  Six tasks sit behind it (10, 17, 20, 23, 24, 25). **The auth is fully settled** — see below.
- **Task 17 — visual verification.** Checks 1 and 2 are irreducibly by-eye: whether adjacent ramp
  steps resolve at a 9px mark. The two tightest pairs are both in the **light** theme (2→3 at 1.39,
  1→2 at 1.41); dark's 0→1 at 1.65 is the widest of the eight and is *not* where it will fail.

**Stall protocol** (written into tasks.md, applies to any task that cannot run): write nothing to the
artifact, leave the checkbox `[-]`, append `— BLOCKED (Matthew)` to the task title, record the exact
command in the implementation log, and continue with everything not downstream. **Never fabricate** —
task 9's file is published as fact on a public site.

## GitHub token — settled 2026-08-10, verified by query

Task 9 and the follow-on sync spec both use the same credential, so the seed and every later refresh
cannot diverge in what they count.

- **Classic PAT with zero scopes ticked.** Verified working against
  `user(login: "madmatt112").contributionsCollection.contributionCalendar` → 2004 contributions in
  the trailing 52 weeks. Fine-grained PATs are not used (GraphQL support for `contributionsCollection`
  is undocumented); there is no unauthenticated route.
- **No-scope over `read:user`, deliberately.** `restrictedContributionsCount` is 0, so both return
  the same figure today — but a scoped token would silently begin inflating the published graph above
  the verifiable public profile if private work ever appeared. No-scope makes the number
  **public-only by construction**.
- Secret name **`GH_CONTRIBUTIONS_TOKEN`** (GitHub forbids `GITHUB_`-prefixed secrets, and the
  auto-injected `GITHUB_TOKEN` is repo-scoped and cannot read the calendar at all). One-year expiry;
  Req 9's 45-day freshness check is the detector when it lapses.

## Uncommitted — deal with this first

Nothing from this spec is in git. Per the project's own rules: **never `git add -A` here**, and site
changes go on a feature branch rather than straight to `main`. Current branch is `main`.

| Path | State |
|---|---|
| `.spec-workflow/specs/github-activity/` | untracked — requirements, design, tasks, 9 reviews |
| `.spec-workflow/deferrals/d-db7c55e9.md` | untracked — the data-viz palette deferral |
| `.spec-workflow/spec-decomposition/decomposition.md` | modified — spec #11 and new spec #12 blocks |
| `.spec-workflow/spec-decomposition/INDEX.md` | modified — regenerated |
| `.spec-workflow/HANDOFF.md` | modified — this file |
| `.spec-workflow/specs/visual-design/design.md` | modified — non-text-data-marks amendment (a Req 4.1 prerequisite) |
| `.spec-workflow/steering/design-system.md` | modified — sequential-ramp carve-out (the other Req 4.1 prerequisite) |

These are spec documents only — no application code has been written yet.

## Roadmap change

**`### 12. github-activity-sync` added to `decomposition.md`** and INDEX regenerated. It has no spec
directory yet (specs are created lazily), so it will not appear in the roadmap table until
`github-activity` is Complete — at which point it becomes the active spec. Its auth, commit path and
validation posture are already pinned in the decomposition block.

## Recorded, not resolved

**Design §Components' `TZ` premise is false.** It justifies the `test:tz` split-run with *"Vitest
reads `process.env.TZ` at worker start, so a single run cannot hold two zones."* Assigning
`process.env.TZ` mid-process switches both `Date` and `Intl` under Node 24, and
`src/lib/format-date-tz.test.ts:4` — the precedent the design itself cites — is the counterexample. A
single-run `beforeAll` form would give both zones inside the existing `Unit tests` step and delete a
`package.json` script, a CI step and two full Velite builds per CI run. **The approved mechanism is
implemented as specified**; tasks v9 corrects only its rationale. Matthew's call whether to amend the
design later. Decided 2026-08-10: leave it.

## Tasks-phase convergence record

Nine versions, nine adversarial rounds. **Finding curve 25 → 15 → 11 → 7 → 5 → 4 → 6 → 5 → 2**,
`DESIGN_READY: yes` from r4 onward, zero MUST_FIX in four of the last five rounds. Capped at v9; r9's
two remaining items were closed in place (v10 is forbidden) and that closure is the one edit no review
has seen. From r6 onward every round's findings were defects introduced by the previous round's own
repair, all circling one ~20-line neighbourhood — the print block and its single gate — while the
other twenty-four tasks went untouched from r4 on.

Verified mechanically after every version: 25 tasks; **32 DAG edges from the `_Depends on:_` footers,
32 from the mermaid graph, identical in both directions**, acyclic, valid topological order; **all 99
acceptance criteria covered**, coverage table and footers agreeing both ways, all 25 embedded
`_Prompt:` strings matching their footers; **zero citation drift across six consecutive versions**.

## Approval records (resume contract)

- Requirements v4 — approved 2026-08-09, record deleted after approval.
- Design v9 — `approval_1786330529757_4d3qmr95l`, approved 2026-08-10.
- Tasks v1–v9 — nine coexisting records, none deleted (the loop never deletes approvals). **v9 is the
  live one: `approval_1786345399035_a9cvusyk2`, approved.** v7 was also approved by mistake — ignore
  it; v9 supersedes.

## Workspace contract

- Main checkout **is** the cwd: `/home/mcf/repo/matthew-field.ca`. `git rev-parse --git-common-dir`
  and `--git-dir` agree — no worktree/spec-state split for this spec.
- **Never pass `projectPath` to an MCP call.**
- Per `spec-loop-v3`, commits land on whatever branch HEAD is on and the loop never switches branches.

## Not started

- Implementation of all 25 tasks.
- Content PR (four external contributions to `contributions.yaml`) — independent of this spec, ship
  any time.
- Spec #12 `github-activity-sync` — after this spec completes.
