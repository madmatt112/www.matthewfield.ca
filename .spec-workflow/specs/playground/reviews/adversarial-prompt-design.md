# Adversarial Review — Playground Design (v1)

You are a principal Next.js / React platform engineer brought in to **tear apart** a technical design document before it is approved for implementation. You have deep, current (2026) expertise in the Next.js App Router (route groups, `generateStaticParams`, `dynamicParams`, `next/dynamic`, server vs client component boundaries, the single-root-layout constraint, the Next 15 async-`params` change), the CSS cascade (`@layer`, `all: initial`, layered-vs-unlayered specificity, CSS Modules scoping), Vitest/Playwright, and build-time vs runtime failure modes. Your job is to find every weakness, gap, contradiction, and unproven claim — **not** to validate. Assume the author is over-confident. Where the design asserts a mechanism works, verify it against the live repo; if you cannot confirm it, say so and treat it as a risk.

This is a small personal Next.js site (`matthew-field.ca`). The design under review is `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/playground/design.md`. The **approved** requirements are at `.spec-workflow/specs/playground/requirements.md` (v4, treat as fixed — do not re-litigate requirements; flag only where the design *contradicts* or *fails to satisfy* them). Steering docs are at `.spec-workflow/steering/{product,tech,structure}.md`. **Read the design, the requirements, and the relevant code before attacking.** Ground every finding in a `file:line` citation or a concrete failure scenario. The repo root is `/home/mcf/repo/matthew-field.ca` — read `package.json` for the exact Next/React versions and verify every framework claim against the installed version.

## Analysis dimensions

Attack at least these, plus anything else you find. Frame findings as directives backed by evidence.

### 1. App Router feasibility of the mode-routing and embed model
- Verify that `next/dynamic(it.load)` works **inside a server component** without `{ ssr: false }` and still SSRs + hydrates a `"use client"` item, on the installed Next version. If `next/dynamic` in a server component requires a client wrapper or `{ ssr: false }` is now disallowed in server components, the same-page render path is broken — pin the failure.
- **Probe the Next 15 async-`params` change.** The design's `page.tsx`/`generateMetadata`/`embed` snippets access `params.slug` **synchronously** (`{ params }: { params: { slug: string } }`). If the installed Next treats `params` as a `Promise`, every one of those is a type error and a runtime bug. Check `package.json` and a sibling dynamic route (e.g. `src/app/(site)/blog/[slug]/page.tsx`, `projects/[slug]`) for the actual `params` signature in use, and report whether the design matches the repo's real convention.
- Stress-test the **single `<h1>` per landing route** claim. Same-page: the *item* supplies the `<h1>`, the route renders none; iframe: the *route* supplies the `<h1>`. Verify this guarantees exactly one `<h1>` per rendered page and is consistent with the Accessibility NFR (gallery, landing, embed).
- Challenge the **embed "standalone document"** reconciliation. The design admits one root `<html>` and routes the embed under the shared root layout. Does that satisfy `structure.md:277`? Does the embed inherit root-layout artifacts (global CSS, `<body>` wrapper, font variables, the `ThemeProvider`) that contaminate a "standalone" item or break iframe sizing? Is there `(site)` chrome leaking in?

### 2. The `#playground/*` alias and manifest import graph
- Verify that adding `"#playground/*": ["./playground/*"]` to `tsconfig.json` plus a mirrored `vitest.config.ts` alias is **sufficient for every consumer**: Next build (app routes, `sitemap.ts`), Vitest (integrity test, jsdom), ESLint import-resolver / any `no-restricted-imports`, `tsc --noEmit`, Prettier, and the Velite build. Find a consumer the design forgot. Does the `#`-prefix collide with Node subpath-imports (`package.json` `imports`) or with `moduleResolution: "bundler"`? Confirm the repo's existing `#site/content` precedent actually generalizes to a wildcard `#playground/*`.
- Challenge that `import type { ComponentType } from "react"` keeps the manifest "server/build-safe." Confirm the type import is erased and nothing else (the `load` thunks, the `frame` union) pulls a runtime dependency or a browser global at module scope. Is `() => import("./scribble-pad")` resolvable from the manifest's location during the Next build pass **and** the Vitest (jsdom) run?
- The integrity test imports the route modules' `generateStaticParams`. Importing `page.tsx` into Vitest may drag in `next/dynamic`, `next/navigation` (`notFound`), server-only APIs, or a `"use client"` boundary that explodes under jsdom. Verify the integrity test can import those functions without executing route-only machinery — or show that it can't and the test design is unsound.

### 3. The M1 fix and the isolation-test re-point
- Verify the **second unlayered rule** actually wins. Both `all: initial` and the new typography rule are unlayered on `.playground-container`; equal specificity → later source wins. Confirm the new rule is genuinely *after* the reset in `playground.css` source order and that import/`@layer` ordering can't defeat it.
- The design leaves `color-scheme: light` **layered** (so `all: initial` resets it to `normal`), calling it "cosmetically equivalent." Challenge this: does `color-scheme: normal` change form-control/scrollbar rendering or the foreground interpretation on the sample, and does it affect the dark-mode "stays light" assertion?
- Scrutinize the `EXPECTED_CONTAINER_COLOR_RGB` flip (`playground-isolation.test.ts:63`). After M1 the container `color` becomes `oklch(0.145 0 0)`. Verify what Chromium's `getComputedStyle().color` actually **serializes** that to (`oklch()`? `rgb()`? `color(srgb …)`?). The design says use `expectLabClose` — **does that helper exist in the test file**, and does it accept the serialized form? If `expectLabClose` does not exist, the design has invented an API; pin that. Also: does the dark-mode re-read still prove isolation when light and dark now both expect the same non-zero foreground?
- The test is re-pointed from the static `/spike` to the **dynamically-imported, hydrated** `/playground/scribble-pad`. Verify the existing wait/`getComputedStyle` strategy still produces stable values against a `dynamic()`-loaded client component (probes may run pre-hydration/pre-paint). Find the flake.

### 4. Static generation, sizing, and the iframe path
- Challenge `dynamicParams = false` + `generateStaticParams` returning `[]` for an **empty manifest**: does Next build a `[slug]` segment with zero params cleanly, or error/warn? Does the gallery empty-state coexist with a param-less `[slug]` route?
- The iframe host uses `style={{ aspectRatio }}` / `{ height }` + `className="w-full"`. Verify the E2E "spans content-column width AND meets declared aspect" is stably assertable — an `aspect-ratio` box derives height from width, so the expected bounding box is viewport-dependent. Is `"16 / 10"` (with spaces) a valid React inline-style `aspectRatio` value? Find the flaky/incorrect assertion.
- The `starfield` item uses `position: fixed` / `100vw`×`100vh` **inside the iframe**. Confirm viewport units resolve against the iframe viewport (contained), and that the host's `aspect-ratio` box gives the iframe a non-zero layout viewport. Find the collapse/escape failure.

### 5. CI gates, test placement, and sequencing
- The leak guard greps `playground/**/*.module.css` for `:global(` and non-`.module.css` `@import`. Find false negatives (`composes: x from global`, `@import url(...)`, whitespace variants, `@import "...";` of a `.css` that isn't a module) and false positives (a `:global` inside a comment). Is a new script + self-test justified or over-build for Req 10.6's "cheap grep"?
- **Re-read `scripts/check-authoring-docs.test.mjs` directly.** The design bumps only the `notFoundLines.length === 2` assertion (line ~109) to `AUTHORING_DOCS.length`. Find every *other* assertion that hardcodes `2`, the subject doc, `SUBJECT_REL`, or the doc-set size, that appending a third doc would break. Confirm the per-doc `writeDocs` helper and the zero-byte `subjectHeadings.length` test are genuinely unaffected.
- Attack the **sequencing** claim. Trace: integrity test → route modules → manifest → item folders. If any is absent when a gate runs, what's red? Does the proposed "land together" ordering actually avoid a red-by-construction intermediate, or merely assert it?
- The design has E2E **hardcode the two sample slugs** to avoid `#playground` in Playwright. Is that a real resolver limitation, or an unjustified divergence that drifts from the manifest?

### 6. Steering / requirements conformance and missing failure modes
- Cross-check every proposed import against `structure.md` module boundaries (item → `src/components/ui`/`src/lib` only; route/`sitemap.ts` → manifest). Does `<PlaygroundFrame>` in `src/components/shared/` create a path where an item could import it (forbidden by structure.md 256-271)? Should it live elsewhere?
- The gallery reuses "the site theme-toggle component." **Verify that component exists** (find it), is importable into a gallery rendered under the **root** layout (not `(site)`), and does not itself import `(site)` chrome or a `(site)`-only provider. If the toggle assumes the `(site)` shell or a provider not in the root layout, the themed-gallery story breaks — pin it.
- Find unaddressed failure modes: a same-page item calling a browser-only API during the `dynamic()` default SSR; an item CSS Module `composes`-ing from a global; the `error.tsx` boundary swallowing the intended `dynamicParams=false` / `notFound()` 404; canvas/hydration warnings counting as E2E console errors; the `<noscript>` placement relative to `<PlaygroundFrame>`.

## Deliverables

Conclude with:
- **Top 5 risks/gaps**, ranked, each with a concrete failure scenario and a `file:line` or doc-section citation.
- **Top 3 conclusions to challenge or reverse**, with specific reasoning.
- **What's missing** — work that must be done before this design is implementation-ready.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on. Verify claims against the live code in `/home/mcf/repo/matthew-field.ca` — do not take the design's word for any mechanism.

Write your analysis to `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/playground/reviews/adversarial-analysis-design.md`.
