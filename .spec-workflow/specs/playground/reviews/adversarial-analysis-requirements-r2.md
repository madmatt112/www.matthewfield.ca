# Adversarial Analysis — Playground Requirements (v2, round 2)

**Reviewer stance:** principal frontend architect, App Router scar tissue.
**Method:** every v2 claim checked against the live repo (`src/app/(playground)/layout.tsx`, `src/app/layout.tsx`, `src/styles/playground.css`, `src/app/sitemap.ts`, `next.config.ts`, `e2e/tests/csp.test.ts`, `e2e/tests/playground-isolation.test.ts`, `src/app/(playground)/spike/page.tsx`, `structure.md`, `spike-results.md`, slash-pages requirements) before raising it.
**Classification:** Novel / Compounding / Recurring per the prompt. Round-1 findings are not re-discovered.

---

## Verdict up front

v2 is a genuine, substantial improvement and most of its claims survive contact with the code. But the **single biggest new claim — the layout refactor (Decision #9 / Req 5.1) — is asserted as a requirement without acknowledging that it forces a route-group restructuring it never specifies, and it sits in a latent contradiction with the "keep the spike fixture" option (Decision #7 / Req 10.2).** That is the headline. The `robots.txt` mechanism (Req 8.4) is the second real problem: the chosen tool (`Disallow`) is both non-portable for the stated pattern and the *wrong* tool for the stated goal, and it conflicts with the existing preview-deploy `X-Robots-Tag`. The remaining findings are smaller but real.

Things v2 genuinely closed (one line each, not re-litigated):
- Manifest/item file locations now match `structure.md` verbatim — confirmed against the tree at lines 83-88 and prose 220-239. Fine.
- Client/server boundary + "data + lazy thunks only" manifest invariant — present and correct (Req 1.3, 3.1). Fine.
- `dynamicParams = false` on both segments with the embed `generateStaticParams` enumerating only iframe slugs — present (Req 3.2, 4.5). Fine.
- Empty-manifest and unique-slug guards — present (Req 2.3, 10.1). Fine.
- CSP nested-path test extension — present (Req 10.5). Fine.

---

## Detailed findings

### F1 — The layout refactor requires a route-group restructuring that the doc never states (Decision #9 / Req 5.1, 2.2, 4.3) — **Compounding, escalated**

This is the central v2 claim and it is mechanically under-specified to the point of being a latent blocker.

**The reality in the code.** `src/app/(playground)/layout.tsx` is a single segment layout that unconditionally wraps **every** `(playground)` child in `<div className="playground-container" data-testid="playground-container">`. Three route types live under this one layout:
- `/playground` (gallery) — v2 wants this **outside** the reset, **themed**.
- `/playground/[slug]` (item landing) — v2 wants same-page items **inside** the reset, iframe items **outside** it (Req 4.1 renders title/description as page text + an `<iframe>`, none of which should be reset-wrapped).
- `/playground/[slug]/embed` — v2 wants this a **standalone document, outside** the reset (Req 4.3).
- `/spike` (existing fixture) — currently **depends on** being inside the reset; all seven isolation tests read `data-testid="playground-container"` and its descendants.

In App Router a segment layout wraps **all** its children; you cannot conditionally skip a parent layout per-child. So "wrap only same-page item render surfaces" is **not achievable by editing `layout.tsx` in place** — it requires one of:
  (a) **remove the wrapper from the group layout entirely** and push `.playground-container` down into the per-item same-page render path (a component inside `[slug]/page.tsx`'s render, only for `iframeIsolated: false`); or
  (b) **split the route groups** (e.g. move the gallery to `(site)` or a new group, give items a nested layout).

Req 5.1 says only "its application scope SHALL be refactored ... reconciling the current blanket `(playground)/layout.tsx`." Decision #9 says "This requires refactoring the current blanket `(playground)/layout.tsx`." **Neither states which restructuring, nor that a restructuring of the route tree / render path is mandatory.** The memory doc's own guidance flagged exactly this ("Is there now an unstated requirement to restructure the route group?") — v2 did not answer it; it renamed the problem ("refactor the scope") without mechanizing the answer. That is the same "assert the outcome, hand-wave the mechanism" pattern the memory doc calls out as the secondary v1 theme. Escalate: requirements should at minimum pin that the reset moves **out of the group layout and into the same-page item render surface** (approach (a)), because (b) — moving the gallery to `(site)` — would contradict `structure.md`'s explicit assignment of the playground index to `(playground)` (line 275-276) and re-import site chrome (nav/footer) the gallery is supposed to omit.

**Failure scenario:** design picks "edit `layout.tsx`" literally, discovers it wraps everything, and either (i) ships the gallery wrapped in `all: initial` (forced-light, chrome-stripped — the exact regression Decision #9 says it is preventing), or (ii) invents an ad-hoc `usePathname()` conditional inside the layout to skip the wrapper for `/playground` and `/embed` — which forces the group layout to become a **client component**, dragging the whole group out of static generation and breaking Req 2.5 ("statically generated server component") and the lazy-thunk code-split story. Both are real, both flow directly from the missing requirement.

### F2 — Retaining the spike fixture and doing the refactor are mutually contradictory as written (Decision #7 + Req 10.2 vs Req 5.1) — **Novel**

Decision #7 says the spike fixture "may be removed ... or kept as a harness," and "the layout refactor (Decision #9) must not break the fixture if it is retained." Req 10.2 says isolation regression coverage "must not regress."

But under approach (a) — the only refactor consistent with `structure.md` (see F1) — the reset is **removed from the group layout** and moved into the same-page **item** render path. The spike fixture (`/spike`) is **not** an item; it is a sibling page under `(playground)` rendered directly by its own `page.tsx`. Once the wrapper leaves the layout, **`/spike` is no longer inside any `.playground-container`**, and all seven tests in `playground-isolation.test.ts` that select `data-testid="playground-container"` and its descendants (`spike-ac2-inherit-target`, `spike-token-access-target`, etc.) break — the container element ceases to exist on that route.

So "retain the spike fixture **and** refactor the scope **and** don't regress isolation coverage" cannot all three hold simultaneously without **also** editing the spike fixture to add its own `.playground-container` wrapper (which the doc never authorizes and which the spike's comments treat as layout-owned). v2 lists this as a soft "must not break ... if retained" caveat but the constraint is actually a hard fork: **either** delete the spike and move its assertions onto the real same-page sample (Req 7.4/10.3 give you the `data-testid` hooks to do it), **or** keep the spike and explicitly require it to self-wrap. Requirements should force that choice, not defer a contradiction to design.

**Failure scenario:** design keeps the spike "for safety," runs the refactor, the CI E2E suite goes red on five container tests, and the implementer "fixes" it by reverting the wrapper back into the layout — silently undoing Decision #9 and re-wrapping the gallery.

### F3 — `robots.txt` is the wrong tool, the pattern is non-portable, and it conflicts with the existing preview `X-Robots-Tag` (Req 8.4) — **Novel**

Three distinct problems, all confirmed against `next.config.ts` and the repo state.

**(a) No mechanism is chosen, and the repo has none today (confirmed).** There is no `public/robots.txt` and no `app/robots.ts` (verified — `public/` holds only svgs + `pagefind/` + `static/`). Next App Router offers two routes: a static `public/robots.txt` or a generated `app/robots.ts` (`MetadataRoute.Robots`). Req 8.4 says "`robots.txt` ... (or equivalent `X-Robots-Tag`)" — conflating two tools that are **not interchangeable** (see (c)). This is a mechanism gap of the same class v1 was dinged for.

**(b) The wildcard pattern is non-portable.** `Disallow: /playground/*/embed` relies on mid-path `*` wildcards. Wildcard support in `Disallow` is a **Google/Bing extension, not part of the original robots.txt standard**; conformant-but-basic crawlers treat `*` as a literal character, so `/playground/*/embed` matches the literal path `/playground/*/embed` and **fails to match** `/playground/pixel-art/embed`. Even on Google, a cleaner portable expression of the same intent does not exist via prefix `Disallow` because the slug is in the middle — you'd need per-slug `Disallow` lines (which defeats the manifest-derived single-source-of-truth goal) or accept the wildcard's Google-only semantics. The requirement asserts a portable outcome the chosen syntax does not deliver.

**(c) `Disallow` is the wrong tool for the stated goal and harms the landing page.** The goal (Req 8.4/8.5) is: embed internals should not surface as **standalone indexed pages**, while the landing page **should** be indexed. `Disallow` blocks **fetching/crawling**, not indexing — a URL that is `Disallow`ed but linked can still appear in results as a URL-only entry, *and* blocking the crawler from fetching the embed means Google cannot render it. The embed is loaded as the `<iframe src>` of the indexable landing page (Req 4.1); `Disallow`ing it can produce "indexed, though blocked by robots.txt"-adjacent warnings and degrade the landing page's rendered snapshot during indexing. The correct tool for "fetchable but not separately indexed" is **`noindex`** — which Req 8.4 already independently requires via `robots: { index: false }` on the embed route's metadata. The `noindex` meta/header **already fully achieves the stated goal**; the additional `robots.txt Disallow` is at best redundant and at worst actively harmful (a `Disallow`ed page can't even be crawled to *see* the `noindex`). Recommendation to reverse: **drop the `robots.txt Disallow` entirely; rely on the per-embed `robots: { index: false }` (which Req 8.4 already mandates) plus sitemap exclusion.** This is also exactly the pattern slash-pages settled on (its Decision #3 / Req 7.6: noindex pages stay out of the XML sitemap, no robots.txt needed).

**(d) Conflict with the existing preview noindex.** `next.config.ts:93-103` already pushes `X-Robots-Tag: noindex, nofollow` onto **`/(.*)` — every route — when `VERCEL_ENV === "preview"`.** v2 never addresses production-vs-preview. On preview, the *entire* gallery + landing routes are already `noindex` (so the new "gallery is indexable" Req 8.1 is a production-only statement the doc never qualifies), and a robots.txt `Disallow` layered on top of a blanket header noindex is pure redundancy in that env. Requirements should state that the indexability rules in Req 8 are **production-scoped**, because preview deliberately suppresses all of it.

### F4 — Manifest → `sitemap.ts` import: the invariant is necessary but the doc never makes it load-bearing for `sitemap.ts` specifically (Req 8.3, 1.3) — **Compounding**

`src/app/sitemap.ts` is a build/server module; today it imports only from `src/lib/*` and `src/config/site`. Req 8.3 newly requires it to import the project-root `playground/manifest.ts` and derive landing URLs. The "data + lazy thunks only, no eager item imports" invariant (Req 1.3) is the thing that makes this safe — **if** it holds. The gap: Req 1.3 frames the invariant as protecting **code-splitting** ("does not pull item code into unrelated bundles"), not as protecting the **server/build context** of `sitemap.ts`. They are related but not identical guarantees. The actual hazard: if `manifest.ts` ever acquires a top-level import of anything carrying `"use client"` or a React-runtime/browser-only dependency (a shared type that pulls a component, a `next/dynamic` call evaluated at module scope, etc.), `sitemap.ts` — and any server consumer — breaks at build, even though the `load` thunks themselves are lazy, because **the manifest module body still evaluates on import.**

v2's invariant covers the common case (no eager item imports) but does not explicitly forbid the manifest from having **any** top-level `"use client"` / React-runtime dependency, which is the precise condition `sitemap.ts` needs. Recommendation: tighten Req 1.3 to state the manifest module SHALL be safe to import in a server/build context — no top-level `"use client"`, no React-runtime or browser-global dependency at module scope — and cite `sitemap.ts` (Req 8.3) and `generateStaticParams` as the server consumers that depend on it. Low effort, closes the second-order hazard the prompt flagged.

### F5 — iframe sizing is still not assertable; the E2E (Req 10.3) is a weak proof and the sample (Req 7.3) is undermined by it (Req 4.4, 7.3, 10.3) — **Recurring, escalated**

v1's Risk 4 was "sensible default size" with no number; v2 claims to have made it "explicit, assertable." It did not. Req 4.4 now says: width 100% of the content column, height "a default min-height or `aspect-ratio`, **overridable per item via the manifest in a later iteration**." Deferring the per-item override to "a later iteration" means **at launch every iframe item shares one fixed height.** The iframe SAMPLE (Req 7.3) is specifically required to demonstrate viewport-escaping behavior (`position: fixed` / viewport units) — and a single fixed min-height iframe **clips** exactly that kind of content. So the one launch artifact meant to prove the iframe path works is the artifact most likely to render visibly broken inside a fixed-height box. The requirement re-introduces the under-specification under a new label.

Worse, Req 10.3 asserts only that the iframe is "present with **non-collapsed dimensions**." The `all: initial` collapse target is 300×150; the only thing this E2E meaningfully rules out is the 150px UA default. **A layout that is broken in every other way (wrong width, clipped content, scrollbars) still passes** as long as height ≠ 150. That is the weak assertion the prompt predicted. Recommendation: requirements should (i) pin a concrete launch height/aspect for the sample (a number or `aspect-ratio`, not "min-height or aspect-ratio, TBD"), and (ii) strengthen Req 10.3 to assert the iframe's rendered box is at least the declared height AND spans the content-column width — not merely "≠ collapsed."

### F6 — Single `[slug]/error.tsx` + `loading.tsx` straddles two render modes awkwardly (Req 3.5) — **Novel**

Req 3.5 adds `loading`/`error` segment files "for same-page items" under `[slug]/`. But Next.js `loading.tsx`/`error.tsx` are **segment-level** — they wrap the **entire** `[slug]` segment, which serves **both** modes (same-page inline render *and* the iframe-shell render for `iframeIsolated: true`). Two mismatches:
- A `loading.tsx` Suspense fallback is meaningful for the dynamically-imported same-page client component, but the iframe-mode render is a trivially-fast server shell (`<iframe>` + title text) — the loading state there is a no-op flash at best.
- The requirement scopes these states "for same-page items," but the segment file applies to **both**. Either the requirement means "branch the loading/error UI on `iframeIsolated` inside the segment" (in which case say so), or it tacitly assumes the iframe shell never errors/suspends (it can — bad slug resolution, thunk rejection).

This isn't fatal, but "segment-level loading/error" + "behavior branches on `iframeIsolated` inside the same segment" need reconciling in the requirement, not in surprised-implementer territory. Note also: a thrown error in a **client** item that errors **after** hydration is caught by the React `error.tsx` boundary only if it throws during render; runtime event-handler throws are not — the requirement should not over-promise "a throwing item degrades gracefully" without that nuance.

### F7 — The leak-guard grep conflates `:global` with bare element selectors and risks false positives (Req 6.2, 10.6) — **Novel**

Req 6.2 forbids "`:global`, bare element selectors," and Req 10.6 fails CI if a `*.module.css` "contains a `:global` or **unscoped global selector**." This conflates two different things. In a CSS Module, a **bare element selector** (`div { … }`, `button { … }`) **is scoped** by the CSS Modules compiler — it does **not** leak globally. Only `:global(...)` actually escapes scope. So "fails on unscoped global selector" is ambiguous: a literal grep for bare element selectors will **false-positive on legitimate, fully-scoped element selectors** that authors are entitled to write inside a module. Recommendation: target the guard at `:global` specifically (and optionally `@import` of non-module global stylesheets) — that is the only construct that genuinely leaks. As written, the guard is over-broad and will either be annoyingly noisy or quietly weakened by the implementer to dodge false positives, defeating its purpose.

### F8 — No requirement that the embed *document* is itself accessible (Req 4.4) — **Novel**

Req 4.4 gives the **host iframe** a `title` attribute (good). But the embed route is a **standalone document** (Req 4.3) loaded in its own browsing context. There is no requirement that the **embedded document** has its own `<title>`, a `lang` attribute, and a single `<h1>`. The iframe `title` attribute does **not** cover the document inside; screen-reader users who enter the frame land in a document with no title/lang/heading. The Accessibility NFR mandates a single `<h1>` and semantic landmarks for the **landing route** and gallery, but is silent on the **embed document**. Given embeds are full standalone HTML pages and a11y violations are blocking (NFR), add an explicit requirement that each embed document carries `<title>`, `lang`, and an appropriate heading.

### F9 — Sample category still unnamed at the requirements level (Req 7.3) — **minor, Compounding**

Req 7.3 tells design to "name the specific sample (so the implementer does not invent scope)" but the requirements doc names neither sample nor even a *category*. Deferring the concrete sample to design is defensible, but pinning at least the **category** (e.g. "an interactive canvas/game" same-page; "a viewport-fixed visualization" iframe) at the requirements level would make Req 7.2/7.3 verifiable without a design round-trip. Acceptable as-is; flagged as the cheapest possible tightening.

---

## Top 5 risks/gaps (by severity)

1. **Layout refactor forces an unstated route-group/render-path restructuring (F1) — Compounding, escalated.** *Failure:* design edits `layout.tsx` literally, can't selectively skip children, and either ships a reset-wrapped (forced-light, chrome-stripped) gallery or makes the group layout a client component — breaking static generation (Req 2.5) and the code-split story. Requirements must pin "reset moves out of the group layout into the same-page item render surface."

2. **Spike-retention vs refactor is a hard contradiction, not a soft caveat (F2) — Novel.** *Failure:* spike kept "for safety," refactor removes the layout wrapper, five `playground-container` E2E tests go red, implementer reverts the wrapper into the layout and silently undoes Decision #9. Force the choice: delete-and-migrate-assertions, or keep-and-self-wrap.

3. **`robots.txt Disallow` is wrong tool + non-portable pattern + preview conflict (F3) — Novel.** *Failure:* `Disallow: /playground/*/embed` is a Google-only wildcard that basic crawlers miss; meanwhile it blocks Google from fetching the embed to render the indexable landing page and to even see the `noindex` it's supposed to enforce. Drop the `Disallow`; the already-required per-embed `noindex` + sitemap exclusion fully achieves the goal (matches slash-pages Decision #3). Scope Req 8 indexability statements to production (preview noindexes everything).

4. **iframe sizing still not assertable; the sample is undermined by the fixed height (F5) — Recurring, escalated.** *Failure:* one fixed min-height iframe at launch clips the viewport-escaping sample meant to prove the iframe path; Req 10.3's "non-collapsed (≠150px)" assertion passes on a layout broken every other way. Pin a concrete sample height/aspect and assert width+height, not just "not collapsed."

5. **Manifest server-import safety not load-bearing for `sitemap.ts` (F4) — Compounding.** *Failure:* manifest later gains a top-level React-runtime/`"use client"` dependency; `sitemap.ts` and `generateStaticParams` break at build even though `load` thunks are lazy. Tighten Req 1.3 to mandate the manifest module body be server/build-import-safe and cite `sitemap.ts` as the consumer.

## Top 3 conclusions to challenge or reverse

1. **Reverse: drop `robots.txt Disallow` for embeds (Req 8.4).** Grounded in `next.config.ts` (preview already blanket-noindexes via `X-Robots-Tag` on `/(.*)`) and slash-pages Decision #3/Req 7.6 (noindex → sitemap exclusion, no robots.txt). `noindex` (already required) is the correct, portable tool; `Disallow` blocks the fetch the crawler needs to render the landing page and to read the `noindex`. Keep only `robots: { index: false }` + sitemap exclusion.

2. **Challenge "the existing blanket `(playground)/layout.tsx` must be refactored" (Decision #9 / Req 5.1) as if it were an in-place edit.** Grounded in the layout file (unconditional wrapper, shared by gallery + items + embed + spike) and App Router semantics (a parent layout cannot be skipped per child). The doc must specify the restructuring (reset moves into the same-page item render surface), or it has shipped an outcome with no legal mechanism — exactly the v1 anti-pattern the memory doc warns recurs.

3. **Challenge "explicit, assertable iframe sizing" (Req 4.4) — it is neither.** Grounded in `spike-results.md` (300×150 collapse) and Req 10.3's weak assertion. "min-height OR aspect-ratio, overridable later" is two unspecified options plus a deferral; the test only rules out 150px. Pin a number and strengthen the assertion.

## What's missing — work to do before design

- **Specify the route/render restructuring** that moves `.playground-container` off the group layout onto same-page item surfaces only (F1), and **resolve the spike fork** explicitly: delete + migrate its isolation assertions onto the real same-page sample's `data-testid`s, or keep it and require it to self-wrap (F2).
- **Rewrite Req 8.4:** drop `robots.txt Disallow`; rely on per-embed `noindex` + sitemap exclusion; **scope all Req 8 indexability statements to production** given the preview blanket `X-Robots-Tag` (F3).
- **Tighten Req 1.3** to mandate the manifest module is safe to evaluate in a server/build context (no top-level `"use client"`/React-runtime/browser-global), citing `sitemap.ts` and `generateStaticParams` (F4).
- **Pin the iframe sample's concrete launch height/aspect** and strengthen Req 10.3 to assert rendered width + height, not just "not collapsed" (F5).
- **Reconcile Req 3.5's segment-level loading/error with the dual-mode `[slug]`** — state whether the boundary branches on `iframeIsolated`, and don't over-promise error-boundary coverage of post-hydration runtime throws (F6).
- **Narrow the leak guard to `:global`** (and non-module `@import`), not "bare element selectors," to avoid false positives on legitimately scoped element selectors inside modules (F7).
- **Add an embed-document a11y requirement** (`<title>`, `lang`, single `<h1>`) — the host iframe `title` does not cover the framed document (F8).
- *(Optional, cheap)* Name the sample **category** for each mode at the requirements level (F9).
