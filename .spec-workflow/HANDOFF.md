# HANDOFF — spec-workflow in-flight state

Single source of in-flight phase state (per spec-loop-v3). INDEX-style roadmap lives in
`.spec-workflow/spec-decomposition/decomposition.md`.

- **Active spec:** none in flight.
- **Last spec:** `visual-design` (spec #9 in the decomposition) — **IMPLEMENTED & COMPLETE**
  (implemented 2026-06-08 via the task-implementation loop).
- **visual-design is the final roadmap spec (#9 of 9).** There is **no next spec** — the eight content
  specs shipped earlier and visual-design was the cross-cutting retrofit added last. A re-run of
  `spec-loop-v3.md` has nothing further to start; the roadmap is complete.

## visual-design — completion record

- **All 23 tasks `[x]`** in `.spec-workflow/specs/visual-design/tasks.md`. Each task: implemented →
  `log-implementation` → independent review (`VERDICT: pass`) → marked complete. Implementation logs
  in `.spec-workflow/specs/visual-design/Implementation Logs/task-*.md`.
- **End-to-end verification: `VERIFY: pass`** (fresh-build, fresh-server final run):
  - typecheck: clean
  - lint: 0 errors (7 pre-existing warnings, none introduced by this spec)
  - Vitest (full unit suite): all green (~450 passed / 2 skipped)
  - Playwright (full E2E, fresh server, `reuseExistingServer:false`): **185 passed / 0 failed /
    4 skipped** — no regressions; the new `e2e/tests/visual-design-axe.test.ts` passes
  - migrations: n/a (static site)
- **R3.6 distinctiveness: PASS** (serif Fraunces name + `mf/` rust wordmark + rust `/` mono kickers +
  hairline brand surfaces — independently verified against `design-baseline/` before-shots; after-shots
  in `design-baseline/after/`). **Lighthouse Performance:** landing 95 / profile 97 / blog post 98
  (all ≥90, CLS=0). **Theme parity:** confirmed (identity reads in both themes at both breakpoints).
- **AA contrast:** axe reports zero color-contrast violations on landing/profile/blog-post/status in
  both themes; brand focus ring ≥3:1 (computed); status text on `/10` tint over `card` verified.

## What was built (per phase)

Token foundation (brand/status/measure/z-index tokens; brand focus ring) → typography (Fraunces via
next/font; `@tailwindcss/typography` themed to tokens, verified 75ch prose measure via v4 layer order)
→ signature + components (Wordmark, SectionKicker, Button `brand` variant, StatusCallout) →
motion/print/artifacts (global reduced-motion + `disableTransitionOnChange`; reading-progress fill →
`--brand`; profile print.css; favicon/icon set; build-time OG + twitter image with committed OFL
fonts) → per-section application (header wordmark, landing hero, profile, atomic six-body
prose-migration, remaining sections incl. about/now/colophon) → gates (token-presence unit test, axe
both themes, full-suite + pinned R1.2 grep [zero hits], visual review + distinctiveness + Lighthouse).

## Implementation-surfaced infrastructure fix (landed)

- **Tailwind v4 content-scanning:** `src/styles/globals.css` now has `@source not "../../.spec-workflow";`
  and `@source not "../../e2e";` after `@import "tailwindcss";`. Without these, Tailwind's automatic
  content detection scanned committed non-source docs/test files whose prose contains literal arbitrary
  classes (e.g. `bg-[var(...)]`, `oklch()`), generating malformed CSS that broke the `NODE_ENV=test`
  build and prevented the E2E suite from running at all. Both builds now pass; built CSS is clean.

## Deferrals (recorded via the `deferrals` tool)

- **`d-7d8e19e7` — RESOLVED:** Tailwind scanning `.spec-workflow`/`e2e` broke the test build. Fixed by
  the two `@source not` directives above.
- **`d-426821c5` — RESOLVED (premise corrected):** an early "47/173 E2E failures" baseline blamed on a
  NODE_ENV=test dev-React/`unsafe-eval`/CSP hydration problem turned out to be a **stale-server
  measurement artifact** (a reused server on port 3013 lacking the test build, compounded by the
  then-unfixed Tailwind build blocker). On a fresh build the suite is green. **Residual minor footgun
  for CI/tech.md (non-blocking):** `scripts/run-e2e.mjs` / the Playwright config can reuse a stale
  server on 3013 and yield false results; the contact server-error/timeout tests emit harmless
  `[WebServer] NoFallbackError` stderr noise from test/prod NODE_ENV interplay (tests still pass).
- **Standing design-deferred set (unchanged, surfaced and not silently cut):** per-page custom OG
  images (ships one templated default OG/twitter — Task 14); data-viz/chart palette; i18n/RTL; CI gate
  upgrades (LCP/CLS/INP + byte-weight assertions, full-route Lighthouse, the active-role↔token CI
  check) — owned by `tech.md`/CI (R10.2). Task 20 ships a lightweight unit-test stand-in for the
  active-role↔token check only.

## Open follow-up for the human (non-blocking, NOT a defect)

- `design.md` §4 / Data Models (`:423-424`, `:570`) still names the z-index tokens with the stale,
  non-generating `--z-base/-*` Tailwind-v4 namespace; **Task 3 correctly uses `--z-index-*`**. Optional
  design-doc cleanup; does not affect the implementation.
