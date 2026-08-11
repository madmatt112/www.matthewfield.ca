# HANDOFF — spec-workflow in-flight state

Single source of in-flight phase state (per `spec-loop-v3`). The generated roadmap lives in
`.spec-workflow/spec-decomposition/INDEX.md` (never hand-edited); build order lives in
`decomposition.md`.

## Current state (2026-08-11)

- **`github-activity` (spec #11) is COMPLETE — 25/25 tasks, INDEX regenerated and showing `Complete`.**
- Shipped on branch **`feat/github-activity`**, pushed, open as **PR #50**. Not merged — Matthew
  reviews the Vercel preview first.
- Every gate green at completion: 747 unit tests, `test:tz` in both pinned zones, 203 e2e, lint 0
  errors, `pnpm build`, and Lighthouse **100/100/100/100** on `/contributions`.
- **INDEX `## Next` is now `ambiguous`** — see §What the next run does.

## What this spec actually shipped

364 real contribution days (2025-08-12 → 2026-08-10, 2,003 contributions across 129 active days),
hand-seeded from one authenticated `contributionsCollection` query and verified against an
independent re-query with **zero mismatches**. The published 26-week window shows 1,712 across 107
active days. No network call anywhere in the build (Req 1.7 verified by tripwire).

Both human-owned tasks were completed rather than stalled:

- **Task 9** — Matthew authorised running the query in-session; data seeded and API-verified.
- **Task 17** — Matthew gave the two by-eye verdicts on 2026-08-11: 9px ramp resolvability **PASS in
  both themes**, including the ramp's two tightest pairs (light 2→3 at 1.39:1, 1→2 at 1.41:1).
  Checks 3 and 4 passed mechanically; forced-colors used the **emulated** Playwright route (host High
  Contrast was off), and that is named as emulated in design.md's appended `## Implementation
  evidence` section, per Req 5.6.

## What the next run does

`spec-status` will report `github-activity` complete, so the router hands the **next** spec to the
document loop. But **INDEX `## Next` currently reports `ambiguous`**, with one candidate:
`listening-sockets` (Requirements, no tasks), which is not in `decomposition.md`.

`### 12. github-activity-sync` is named in `decomposition.md` but has **no spec directory yet**
(specs are created lazily). Per the router's `all-on-disk-complete` rule that is the real next spec —
it starts at Requirements. Resolve the ambiguity by naming it explicitly, or by sequencing
`listening-sockets` into `decomposition.md`.

## Deferrals recorded during implementation

- **`d-eb289402`** — a link row in `src/components/layout/footer.tsx` overflows `<body>` to 342px at
  a 320px viewport on **every** site route, heatmap or not. Pre-existing; this spec did not cause it.
  Req 3.10 only asks that the heatmap not *cause* overflow, so task 23 asserts causation instead and
  the page bug stays visible rather than masked.
- **`d-cd92bbdf`** — a future-dated entry is correctly rejected, but with Zod's generic
  `Invalid input` rather than a message naming the `BUILD_START_UTC` rule. Matches the existing
  `resources-schema.ts` / `reading-schema.ts` precedent, so fixing one without the other three would
  be inconsistent. Diagnostic quality, not correctness.
- `d-db7c55e9` (the data-viz palette deferral) was carried in from the document phase, unchanged.

## Corrected in passing

`docs/profile-resume-lighthouse-runs.md` said "all seven URLs"; task 21 added `/contributions` as the
eighth and thereby falsified it, so this branch fixed it. Everything else out of scope was recorded
rather than edited.

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

## Committed

Everything from this spec is committed on `feat/github-activity` (17 commits) and pushed. Spec
documents landed first, then one commit per task or coupled task-group, following the project's rules:
**never `git add -A`**, and site changes go on a feature branch rather than straight to `main`.

`Implementation Logs/` and the task-17 screenshot evidence are gitignored (`.gitignore:63`) by design —
they are evidence, not repository artifacts.

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
