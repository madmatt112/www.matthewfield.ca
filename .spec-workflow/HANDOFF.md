# HANDOFF — spec-workflow in-flight state

Single source of in-flight phase state (per spec-loop-v3). INDEX-style roadmap lives in
`.spec-workflow/spec-decomposition/decomposition.md`.

- **Active spec:** `visual-design` (spec #9 in the decomposition)
- **Live phase:** Design
- **Current version:** v3 — **CONVERGED** (r3: `VERDICT: converged`, 0 must / 0 should / 2 minor,
  DESIGN_READY: yes). The two r3 MINORs were folded into v3 in place (no version bump, no re-review).
- **Last verdict trajectory:** r1 iterate (4 must / 5 should / 6 minor, →v2); r2 iterate (0 must /
  3 should / 2 minor, →v3); **r3 converged**. Must-fix trajectory 4→0→0; the reviewer recomputed all
  OKLCH contrast independently across all three rounds.
- **State:** Design phase converged for adversarial purposes; **awaiting human approval** (the phase
  boundary). Does NOT auto-flow into Tasks — approve the Design (v3) in the dashboard to advance.
- **Pending approval for v3:** `approval_1780951859154_491ma0l8f` (visual-design — Design (v3); reads
  the live `design.md`). Coexisting pending v1/v2 approvals may be cleaned up.
- **Upstream approved:** `visual-design` **Requirements v4** (`approval_1780949644650_ajymkcwbs`,
  approved) — that approval drove this run's advance from Requirements → Design.
- **Adversarial lens:** `frontend-design` skill (distinctiveness / anti-generic), per the user's
  request — passed the R3.6 bar across all three rounds.
- **What a re-run will do next:** orientation reads Design as the live phase, already converged; it
  does ONE status check on the Design approval. If `approved` ⇒ start the **Tasks** phase at v1. If
  `pending`/absent ⇒ report "Design converged at v3, awaiting your approval" and exit (no advance).
- **Design decisions of note (so the human can veto at the boundary):** identity = minimal + one
  **rust** brand accent + an editorial-technical type system (Geist Sans body / Geist Mono code+kicker
  / **Fraunces** serif display) with the **`/`-path-mark** signature (`mf/` wordmark, mono `/ kicker`,
  hairline rule). Adds `@tailwindcss/typography` (today's `.prose` is inert), a print/PDF profile
  stylesheet, status roles (success/warning/info), brand artifacts (wordmark, favicon set, build-time
  OG — replacing the currently-dangling `og-default.png` ref), and `disableTransitionOnChange`.
  **Deferred (surfaced for veto):** per-page OG images, data-viz/chart palette, i18n/RTL, and the CI
  gate upgrades (owned by tech.md/CI).
