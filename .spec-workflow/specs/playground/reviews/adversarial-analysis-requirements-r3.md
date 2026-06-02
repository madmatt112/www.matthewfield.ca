# Adversarial Analysis — Playground Requirements (v3, round 3)

**Verdict up front:** v3 has substantially converged. The two under-mechanized v2 fixes (the layout refactor → `<PlaygroundFrame>`, and iframe sizing) are now pinned with sound, App-Router-correct mechanisms, and the large number of v3 edits introduced no contradiction that would block design. I verified every NEW v3 claim against the live repo and they hold. I found **one genuinely Novel gap** (an incomplete "Test-file fallout" list — the M1 fix breaks a test assertion v3 does not name) and **two minor clarifications** worth a sentence in design but not blocking. Everything else is converged.

Method: read `requirements.md` (v3) and the cumulative memory; verified claims against `(playground)/layout.tsx`, `src/app/layout.tsx`, `playground.css`, `globals.css`, `spike/page.tsx`, `spike-overlays.tsx`, `playground-isolation.test.ts`, `sitemap.ts`, `next.config.ts`, `csp.test.ts`, `e2e/spike-summary.txt`, and `structure.md` lines 83-88 / 277.

---

## Verification of v3's NEW claims (all confirmed accurate)

- **`<PlaygroundFrame>` server component wrapping a dynamically-imported client item composes correctly.** This is standard App Router — a server component rendering a client component (the dynamic item) is fine; the client boundary is the item module's own `"use client"`. Req 3.1's story stays consistent: `[slug]/page.tsx` (server) → `<PlaygroundFrame>` (server) → dynamic client item. No contradiction.
- **`(playground)/layout.tsx` currently wraps ALL children** (`<div className="playground-container" data-testid="playground-container">`, line 5) and imports `playground.css` (line 1). v3's claim that the wrapper must be removed and re-homed is correct, and the App Router constraint (a segment layout cannot skip wrapping a child) is real.
- **Spike removal orphans are correctly identified.** `spike/page.tsx` + `spike-overlays.tsx` are the only `src/` files importing the spike; nothing else references the `/spike` route. `csp.test.ts` targets `/playground` (line 35), not `/spike` — confirmed, so removing the spike does not break CSP. `csp.test.ts:7-8` even anticipates the removal ("a spike artifact that may be removed by spec 8").
- **`spike-summary.txt` survives and Req 5.3's citation is accurate.** The file exists (398 lines); lines 365-398 are exactly the "ThemeProvider integration follow-up (task 16)" block describing the `applyDarkMode` next-themes hydration concern. Req 5.3(c)'s `applyDarkMode` re-audit citation is sound. Note the file is 398 lines, so "spike-summary.txt:365-398" is the tail of the file — fine.
- **Sitemap is emitted in all environments** (`sitemap.ts` is a static function with no env guard) and currently lists `/playground` (line 14). v3's production-scoping reasoning is internally consistent.
- **`next.config.ts` confirms:** CSP negative-lookahead `/((?!playground(?:/|$)).*)` (line 84); preview `X-Robots-Tag: noindex, nofollow` on `/(.*)` (lines 93-102); no `X-Frame-Options` anywhere. All as v3 states.
- **`structure.md`** lines 83-88 (project-root `playground/` tree) and 277 (embed = standalone documents) match v3's citations verbatim.

---

## Top risks / gaps

### 1. [Novel] Req 5.3's "Test-file fallout" set is still incomplete — the M1 fix flips a second assertion that v3 does not name

This is the same class of problem rounds 1-2 kept finding ("complete the test-fallout list"), recurring on a *different* assertion than the one v2 caught.

Req 5.3 enumerates exactly three fallout items: (a) invert `INTENDED_PLAYGROUND_FONT_FRAGMENT` at line 240, (b) remove SPIKE FINDING comment blocks, (c) re-audit `applyDarkMode`. But the M1 fix (Req 5.2: a second **unlayered** rule re-declaring `font-family`/`font-size`/`line-height`/`color` on `.playground-container`) will *also* break this assertion at `playground-isolation.test.ts:286`:

```
expectRgbEqual(before.color, EXPECTED_CONTAINER_COLOR_RGB);   // [0, 0, 0]
```

`EXPECTED_CONTAINER_COLOR_RGB = [0,0,0]` is explicitly documented (lines 54-63) as encoding the **broken** state: "`color: oklch(0.145 0 0)` declared in @layer playground cannot override the unlayered `all: initial`… Chromium's computed value for `color` on the container therefore ends up as the initial CanvasText keyword, which serializes to rgb(0,0,0)." Once M1 lands an unlayered `color: oklch(0.145 0 0)`, the container's computed `color` becomes the foreground lab value (~`lab(2.75 0 0)`), and this assertion **fails** — and it is read on *both* the light baseline and the dark re-read inside the `"playground container stays light when host site is dark"` test, so it is load-bearing for the M2/dark-mode regression proof, not a throwaway.

**Failure scenario:** an implementer follows Req 5.3 literally, applies the three named edits, runs the isolation suite against the prod build, and the `stays light when host is dark` test fails on the container-`color` assertion that Req 5.3 never told them to update. Worse, the constant's name and its multi-line comment still assert the *broken* serif/CanvasText rationale, so the implementer has to reverse-engineer the intended post-fix value (and decide whether it should now be the lab() foreground, asserted via `expectLabClose` against `EXPECTED_FOREGROUND_LIGHT`).

**Recommendation:** Req 5.3 should generalize from "these three edits" to "all assertions encoding the M1 broken state," and explicitly name `EXPECTED_CONTAINER_COLOR_RGB` (line 63) + its comment block (lines 54-62) as needing to flip from the CanvasText/rgb(0,0,0) broken value to the re-established foreground (read via `expectLabClose`, since the fixed color is a lab() value, not rgb). One sentence. (The sibling `EXPECTED_RADIUS = "10px"` constant at lines 64-70 is **fine** — its comment frets that font-size is reset to the 16px browser default, but the M1 fix re-declares `font-size: 16px` (playground.css:34), the same value, so `var(--radius)` still resolves to 10px. Worth not over-correcting it.)

### 2. [Compounding, minor] Overlay-containment (M2) regression coverage is silently dropped when the spike goes — acceptable, but the requirements should say so

`spike-overlays.tsx` exercises the full M2 matrix as a Playwright-verifiable fixture: default-escape Dialog/Popover/Tooltip/Select/DropdownMenu **and** a contained Dialog branch (`DialogPrimitive.Portal container={portalHost}`). The spike header and `spike-summary.txt` describe "task 13 verifies both the default-escape and contained branches with Playwright."

After spike removal, M2 becomes a **per-item authoring choice** (Decision #5, Req 3.6) and the sample items' categories (canvas/drawing toy; viewport-fixed visualization) do **not** require any overlay. So no shipped fixture exercises overlay containment, and the only M2 coverage left is the prose decision rule in the authoring doc. Req 10.2 promises "Net isolation coverage SHALL NOT regress relative to the spike fixture" — but overlay-containment coverage **does** regress (it disappears), unless one reads "isolation coverage" narrowly as "the container reset + token re-declaration," excluding overlays.

This is most likely **acceptable** (overlays are no longer a guaranteed-present fixture, and forcing a sample to mount a contained Dialog purely for regression coverage is the "busywork" Decision #7 explicitly avoids). But Req 10.2's "SHALL NOT regress" is then slightly overstated. **Recommendation:** add half a sentence to Req 10.2 or Decision #7 scoping "isolation coverage" to the reset/token/leak-guard behaviors and explicitly acknowledging that the spike's overlay-containment matrix is intentionally retired (M2 is now an authoring-doc rule, not a fixtured regression test). This prevents a design/impl reviewer from treating the missing overlay test as a coverage bug.

### 3. [Novel, minor] No requirement covers build-time failure of an item's dynamic import

Neither round surfaced this. `generateStaticParams` enumerates every slug and the route statically prerenders each via the manifest `load` thunk. If an item module has a build-time error (bad import, type error, syntax error in `index.tsx`), `next build` fails the *whole* build — not just that route. Req 3.5's error boundary explicitly covers only **render-time** throws and **runtime** thunk rejections, not build-time module-resolution failure. This is arguably correct default Next behavior (a broken item shouldn't ship), but the requirements are silent on it, and a designer might wrongly assume the error boundary or `dynamicParams = false` provides graceful degradation for a broken item at build. **Recommendation:** one line clarifying that a build-time-broken item fails the build (fail-loud is intended), distinct from the runtime error boundary. Flag-only; not blocking.

---

## Conclusions to challenge or reverse

**None.** I specifically pressure-tested the four conclusions the prompt flagged and all hold:

- **Listing iframe-item landing routes in the sitemap (Req 8.3 + 8.5) is NOT self-contradictory.** The landing route carries the item's title + description as real text (Req 4.1/8.5), which is the same non-thin-content bar the gallery cards meet; the `noindex` lives on the `/embed` URL, not the landing. A landing page with a title, a description paragraph, and an iframe is legitimately indexable primary content. Consistent.
- **A `noindex`'d-on-preview sitemap is harmless.** v3 correctly scopes indexability to production; on preview the sitemap still lists routes but `X-Robots-Tag` noindexes everything. Bots do not treat a listed-but-noindex'd URL as an error; this is a non-issue and v3 already reasons it through.
- **Gallery rendering outside `.playground-container` resolves all tokens correctly.** The gallery is a normal themed page under the shared root layout (`src/app/layout.tsx` provides `ThemeProvider` + fonts + `globals.css`/`tokens.css`); shadcn `Card` (Req 2.2) gets its tokens from `:root`/`:root.dark`, not from the now-absent container re-declaration. No token resolves to undefined. Decision #9 is sound.
- **`<PlaygroundFrame>` as a server component is the right call** and the only restructuring consistent with `structure.md` (the `usePathname()`-in-layout alternative would force a client layout and break SSG, exactly as v3 argues).

The `<noscript>` requirement (Req 3.5) for an iframe-mode landing is mildly redundant (the landing's title/description are server-rendered and the iframe loads regardless), but it is harmless and the requirement reads "since items are interactive and require JavaScript," which is true of same-page items — not confusing enough to change.

---

## What's missing before design

Nothing material blocks design. Two one-sentence additions would tighten it:

1. **Finish the test-fallout list** (Top risk #1): name `EXPECTED_CONTAINER_COLOR_RGB` (line 63) as a fourth M1 fallout edit, flipping it from the broken CanvasText `rgb(0,0,0)` to the re-established foreground via `expectLabClose`. This is the highest-value change — it is the one item that will actually break a green build if missed.
2. **Scope "isolation coverage SHALL NOT regress" honestly** (Top risk #2): acknowledge the spike's overlay-containment matrix is intentionally retired and M2 coverage now lives as an authoring rule, not a fixtured test.

Item #3 (build-time import failure) is optional clarification.

Absent #1, this requirements doc is ready for design. #1 is small but concrete and grounded in the live test file, so it is worth one more touch before the design phase inherits a test that goes red the moment M1 is fixed.
