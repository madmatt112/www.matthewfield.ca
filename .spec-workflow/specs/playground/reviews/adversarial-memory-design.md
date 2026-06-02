# Adversarial Review Memory — design

Last updated: 2026-06-01 (after round-3 review of v3)

## Cumulative Findings Summary

### Accepted (folded into v2/v3; per-round verdict in [brackets])
- **Blocker 1 — async `params` (Next 16)** (r1): all routes/`generateMetadata` destructured `params` synchronously. v2 rewrote `async` + `params: Promise<{slug}>` + `await params`. **[r2: LANDED, exact-match to `blog/[slug]/page.tsx:36-41,65-70`.] [r3: unchanged in v3; still sound.]**
- **Blocker 2 — `expectLabClose` throws on real `color`** (r1): container `color` serializes to sRGB; v2 keeps RGB tuple, flips to `[10,10,10]`, asserts `expectRgbEqual`. **[r2: LANDED, matches live `playground-isolation.test.ts:286`. Caveat: "empirically confirmed against prod build" unverifiable (no `.next/static/css`).] [r3: v3 CORRECTED the provenance — now "pinned from the toolchain's documented `#0a0a0a` fallback (test header lines 17-19); re-confirmed against prod build in tasks phase." Honesty caveat CLOSED. Value `[10,10,10]` re-verified against live test header lines 17-19 (`color: #0a0a0a; color: lab(2.75381% 0 0);`).]**
- **F3 — Vitest importing route `page.tsx`** (r1): v2 extracted pure `landingParams`/`embedParams`; test imports only `#playground/manifest`. **[r2: LANDED but narrowed coverage → r2-N1.] [r3: see r2-N1 resolution below.]**
- **F6 — `PlaygroundFrame` in forbidden `components/shared/`** (r1): v2 → route-private `(playground)/_components/`. **[r2: path math correct; first-of-kind `_*` folder.] [r3: now enumerated in the first-of-kind verification gate — closed.]**
- **F8 — leak guard "only two escapes" false** (r1): v2 added `composes … from global` + `@import url(...)`. **[r2/r3: landed, sound.]**
- **F7 — iframe E2E ratio not absolute box** (r1): v2 ratio (height ≈ width×10/16). **[r2/r3: sound.]**
- **F9 — bare `#playground` subpath alias unproven** (r1): kept, verify-by-running. **[r2: STILL weakest precedent — `#site/content` terminal-only; chokepoint checkers mark subpaths non-resolving.] [r3: v3 dropped the "proves `#` works for subpaths" claim AND added a documented fallback (`vite-tsconfig-paths` plugin or relative import). Residual run-check remains; mitigation now complete.]**
- **F5 — `color-scheme: normal`** (r1): conscious non-move + authoring-doc note. **[r2/r3: unchanged, fine.]**
- **F4 — `next/dynamic` in server component, first-of-kind** (r1): legal on Next 16 (no `ssr:false`). **[r2: typing sound; SSR-prerender hazard = r2-N2.] [r3: see r2-N2 resolution.]**

### Round-2 NEW findings — ALL RESOLVED in v3
- **r2-N1 (Medium) — integrity test tautological; on-disk route/embed existence unasserted.** **[r3: RESOLVED. v3 (a) adds `fs.existsSync` that every slug has `playground/[slug]/index.tsx` — catching the MOST LIKELY drift (missing/typo'd item module that `import("./slug")` would only fail at build); (b) states an HONEST coverage handoff: integrity test owns slug uniqueness/kebab-case + partition logic + item-module existence; full route/embed *wiring* (incl. a missing `embed/` dir — r2-N1's literal example) handed to `next build` + E2E. The design does NOT over-claim the index.tsx check catches the embed-dir case. `fs`/`process.cwd()` under jsdom Vitest is WELL-PRECEDENTED — `seed-content.test.ts:28` uses `path.join(process.cwd(), "content", "pages", …)` verbatim; `blog.test.ts`, `velite-output-shape.test.ts`, etc. all do node-fs + cwd reads under jsdom. `.tsx` extension matches structure.md tree. SOUND.]**
- **r2-N2 (Medium) — SSR-prerender safety of samples unstated.** **[r3: RESOLVED. v3 adds the SSR-safety constraint to (i) the sample-item section (design.md:394), (ii) Error Scenario 1 (design.md:528-529), (iii) the authoring doc (design.md:450). Correctly scoped: throws at "module or render scope" (covers a `useState(() => window.x)` lazy initializer, which IS render scope) vs safe inside `useEffect`/handlers; canvas acquired in `useEffect` rendering an empty `<canvas ref>` on the server (clean hydration). Correctly states SSR is on by default and `ssr:false` is illegal in the server-component host (no opt-out) — verified against `dynamic.d.ts` (`ssr?: boolean` default-on; `Loader<P>` matches the thunk). SOUND.]**
- **r2-N3 (Low) — embed inherits site `<body>` theme, not neutral.** **[r3: RESOLVED. v3 (design.md:42, 383) reconciles everywhere: embed has "no header/footer chrome and no `.playground-container` reset" but DOES inherit root-layout body theming/fonts/providers. `globals.css:37-40` body theming CONFIRMED live. Consistent with structure.md:277 ("own document, layout stack, and provider context"). No residual "standalone/no-chrome = neutral surface" phrasing remains.]**

### Confirmed sound across rounds (do not re-litigate without new evidence)
- `@layer playground` ordering survives the CSS-import relocation (declared `globals.css:4` before Tailwind; position fixed at first declaration).
- `dynamic(it.load)` type-checks under strict TS (`Loader<{}>` match; re-verified `dynamic.d.ts` r3).
- `../../_components/playground-frame` path math correct.
- `frame` union narrowing correct (else-branch cast redundant but harmless).
- Embed `generateMetadata` `{ title: it?.title }` valid Metadata → template fallback; `notFound()` 404s.
- iframe ratio E2E on Desktop Chrome (1280px; `max-w-3xl`=768 not clamped); `aspectRatio:"16 / 10"` string passes through React verbatim.
- Gallery `ThemeToggle` RSC composition; `ThemeProvider` in root layout.
- `notFound()`→`not-found.tsx` not `error.tsx`; empty-manifest builds clean.
- CSP opt-out covers nested paths; production-scoped indexability; `check-authoring-docs.mjs` parameterized (count assertion at line 110).
- First-of-kind precedents re-verified r3: NO `_*` dir in `src/app`, NO `next/dynamic` in `src` — both genuinely first-of-kind; `#`-subpath alias has no resolving precedent (`#site/content` terminal-only).

### Rejected / not substantiated
- (none across three rounds)

## Patterns & Themes
- **r3 verdict: CONVERGED.** v3 resolved all three r2-Novel findings AND the two r2 honesty caveats with correct, internally-consistent, live-verified mechanisms. The r2-N1 fix is particularly well-judged: it closes the *likely* drift (missing item module) cheaply and is *honest* about handing the *unlikely* drift (missing embed dir) to build+E2E — it does not pretend the index.tsx check does more than it does.
- The design's residual risk is now ENTIRELY (a) verify-by-build/run items the design itself defers to the tasks phase (three first-of-kind patterns: `_components` folder, `next/dynamic`, `#`-subpath alias) + the exact-RGB re-confirm, and (b) cosmetic. No structural objection survives round 3.
- Recurring theme retired: the "first-of-kind-in-repo" cluster is now explicitly enumerated in the design's tasks-phase verification gate (design.md:468) with a documented alias fallback — the mitigation is complete, not just gestured at.

## Guidance for Next Review (round 4 — NOT EXPECTED)
- The design is implementation-ready. A round 4 should only occur if v4 edits introduce a regression. Do NOT manufacture a structural objection.
- **Carry into TASKS phase (deferred-by-design, not defects):** (1) run the integrity test to prove `#playground/manifest` resolves under Vitest (fallback: `vite-tsconfig-paths` or relative import); (2) `next build` to prove the `_components` underscore folder is router-ignored and `next/dynamic` SSRs+hydrates; (3) re-confirm `EXPECTED_CONTAINER_COLOR_RGB = [10,10,10]` against the real prod-build CSS; (4) Vercel preview isolation re-check.
- Do NOT re-mine anything in "Confirmed sound across rounds."
