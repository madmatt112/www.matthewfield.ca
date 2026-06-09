# HANDOFF — spec-workflow in-flight state

Single source of in-flight phase state (per spec-loop-v3). INDEX-style roadmap lives in
`.spec-workflow/spec-decomposition/decomposition.md`.

- **Active spec:** `visual-design` (spec #9 in the decomposition)
- **Live phase:** Tasks
- **Current version:** v4 — **CONVERGED** (r4: `VERDICT: converged`, 0 must / 0 should / 1 minor,
  DESIGN_READY: yes, ESCALATE: none). The lone r4 MINOR is a **design-doc** staleness, not a tasks
  defect (see below) — no tasks version bump, no re-review.
- **Last verdict trajectory:** r1 iterate (1 must / 4 should / 1 minor, →v2); r2 iterate (1 must /
  3 should / 2 minor, →v3); r3 iterate (1 must / 1 should / 0 minor, →v4); **r4 converged**. Must-fix
  trajectory 1→1→1→0. Every finding across all four rounds was **accepted** (none rejected) — the
  prose-measure mechanic took three formulations (v2 wrapper → v3 `max-w-none max-w-measure` → v4 bare
  `prose max-w-measure`) and closed by progressive correction, **not a standoff**.
- **State:** Tasks phase converged for adversarial purposes; **awaiting human approval** (the phase
  boundary). Tasks is the **last** of the spec's three docs.
- **Pending approval for v4:** `approval_1780954854151_z0a4pe91t` (visual-design — Tasks (v4); reads
  the live `tasks.md`). Coexisting pending v1/v2/v3 approvals may be cleaned up.
- **Upstream approved:** `visual-design` **Design v3** (`approval_1780951859154_491ma0l8f`, approved) —
  that approval drove this run's advance from Design → Tasks.
- **What a re-run will do next:** all three `visual-design` docs (Requirements v4, Design v3, Tasks v4)
  will then be approved-or-converged. Per spec-loop-v3 this is a **HARD STOP**: do NOT start the next
  roadmap spec and do NOT start implementation from this loop. Approve Tasks (v4) in the dashboard,
  then **implement `visual-design` in full via the task-implementation prompt**
  (`/home/mcf/repo/prompts/spec-workflow/task-implementation-loop-v2.md`) before any later spec. The
  next spec becomes active only once implementation marks `visual-design` `[x] Complete`.
- **Tasks doc shape:** 23 atomic tasks across 6 phases — token foundation (brand/status/measure/
  z-index) → typography (Fraunces + @tailwindcss/typography themed to tokens) → signature + components
  (Wordmark, SectionKicker, Button brand variant, StatusCallout) → motion/print/artifacts (reduced-
  motion + no-flash, reading-progress→brand, print.css, favicon, build-time OG) → per-section
  application (header, hero, profile, atomic prose-migration, remaining sections incl. about/now/
  colophon) → gates/verification (token-presence test, axe both themes, full-suite + pinned grep,
  visual review vs design-baseline + distinctiveness + Lighthouse). Grounded against the real codebase
  and the installed Tailwind v4 toolchain across four adversarial rounds.
- **Deferred (surfaced for veto at the boundary):** per-page OG images (ships one templated default),
  data-viz/chart palette, i18n/RTL, and the CI gate upgrades (owned by tech.md/CI). Consistent with
  the design's deferred set; nothing silently cut.
- **Open follow-up for the human (non-blocking, NOT a task defect):** `design.md` §4 / Data Models
  (`:423-424`, `:570`) still names the z-index tokens with the stale, non-generating `--z-base/-*`
  Tailwind-v4 namespace; **Task 3 correctly uses `--z-index-*`**. Optionally clean up the design doc
  later — it does not affect implementation.
