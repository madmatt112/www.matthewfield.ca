# Adversarial Analysis — Playground Design (v1)

Reviewer stance: principal Next.js/React platform engineer, tasked to break the design before approval. Every claim below is grounded in the live repo at `/home/mcf/repo/matthew-field.ca`. Installed versions (from `package.json`): **Next 16.2.2, React 19.2.4, react-dom 19.2.4, next-themes ^0.4.6, Vitest ^4.1.4, Tailwind v4.** These versions are the lens for every framework claim.

The design is genuinely strong: most mechanisms it asserts (CSP opt-out, root-layout `ThemeProvider`/fonts, the parameterized authoring-doc checker, `card.tsx`, the absence of a project-root alias) check out against code exactly as written. The verification section is unusually honest. But there are **two hard blockers** (one will not even type-check, one will throw at test runtime) and several softer gaps. They follow.

---

## BLOCKER 1 — Every route snippet accesses `params` synchronously; Next 16 makes `params` a `Promise`. This is a type error and a runtime bug across all three routes.

The design's `page.tsx` / `generateMetadata` / `embed` snippets all destructure `params` synchronously:

- `design.md:269` — `generateMetadata({ params }: { params: { slug: string } })` then `find(params.slug)`
- `design.md:275` — `ItemLanding({ params }: { params: { slug: string } })` then `find(params.slug)`
- `design.md:326-327` — `generateMetadata({ params })` then `playgroundItems.find((i) => i.slug === params.slug)`
- `design.md:330-331` — `ItemEmbed({ params })` then `…params.slug`

The installed repo convention is the opposite. The sibling dynamic route `src/app/(site)/blog/[slug]/page.tsx` (verified, the live file) types params as a **Promise** and awaits it:

```ts
// blog/[slug]/page.tsx:36-41, 65-70
export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { slug } = await params;
  …
}
export default async function BlogPostPage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  …
}
```

On Next 16, `params` (and `searchParams`) are async. The design's synchronous `params.slug` will fail `tsc --noEmit` (the repo runs `strict: true`, `tsconfig.json:7`) and, even if it compiled, `params.slug` on a Promise is `undefined` at runtime → `find()` returns `undefined` → every landing/embed page renders empty or 404s. `generateStaticParams` itself is fine (it returns the array, no params arg), but the three components and both `generateMetadata` functions are broken.

**Fix the design before implementation:** type `params: Promise<{ slug: string }>`, make the components `async`, and `await params` — matching `blog/[slug]/page.tsx`. The design's own verification section (`design.md:13`) explicitly cites the blog route as the convention to mirror, yet the snippets diverge from it. This is the single most important correction.

---

## BLOCKER 2 — The `EXPECTED_CONTAINER_COLOR_RGB` → `expectLabClose` flip will throw: the container's real `color` property serializes to `rgb(...)`, not `lab(...)`.

The design (`design.md:525`, Req 5.3b) says: after M1, the container `color` becomes `oklch(0.145 0 0)`, so "replace the RGB constant + its `rgb` assertion with an `expectLabClose` check." `expectLabClose` **does exist** (`e2e/tests/playground-isolation.test.ts:127`) — so that part of the design is not invented. The problem is *which serialization* it accepts.

`expectLabClose` calls `parseLab` (line 105), whose regex **only** matches `^lab(...)$` and throws `Expected lab() color, got …` on anything else (line 110-112). The container `color` is read off the element's **real** `color` property:

```ts
// playground-isolation.test.ts:275 (the "stays light" test) and 286
color: cs.color,
…
expectRgbEqual(before.color, EXPECTED_CONTAINER_COLOR_RGB);
```

The test file's own header comment is explicit about how Chromium serializes this (lines 18-27):

> "lab() values round-trip as lab() for custom properties but **collapse to sRGB (`rgb(...)`) when read off real color properties**."

`cs.color` is a real color property, not a custom property. So after M1, `getComputedStyle().color` will serialize to `rgb(10, 10, 10)` (the sRGB form of `oklch(0.145 0 0)` ≈ `#0a0a0a`), **not** `lab(2.75% 0 0)`. Feeding that to `expectLabClose` → `parseLab` throws → the migrated test errors out. The same trap exists in the dark-mode re-read.

Note the irony: the test already proves the correct path — `EXPECTED_FOREGROUND_LIGHT` (line 49) is a `lab()` tuple, but it is read off the **custom property** `--foreground` (line 273, `cs.getPropertyValue("--foreground")`), which is why `expectLabClose` works *there*. The container's real `color` is a different readout path.

The requirement text (Req 5.3b) itself asserts "the fixed `color` is a `lab()`/`oklch()` value, not `rgb`," which the live test file contradicts. The requirement is fixed and I am not re-litigating it — but the **design** propagated that claim verbatim (`design.md:525`) without reconciling it against the serialization the test file documents 460 lines above the assertion. The design must specify the correct helper: keep `EXPECTED_CONTAINER_COLOR_RGB` as a tuple and use `expectRgbEqual` against `[10, 10, 10]` (the sRGB of `oklch(0.145 0 0)` through Lightning CSS), OR read `color` via a parser that accepts `rgb()`. As written ("use `expectLabClose`"), the migrated test throws. **This must be resolved in the design, ideally by empirically capturing the production serialization of `cs.color` after M1 before pinning the constant.**

(Secondary: the exact RGB triple depends on Lightning CSS's oklch→sRGB rounding; `#0a0a0a` = `rgb(10,10,10)` is the expected value but should be confirmed against the actual prod build, since the existing comment at lines 64-70 notes the toolchain emits an RGB/hex fallback.)

---

## Softer findings — must be addressed, not blockers

### F3 — Importing the route `page.tsx` into the Vitest integrity test is unprecedented in this repo and may explode under jsdom.

The integrity test (`design.md:516`) imports `generateStaticParams` from the `[slug]` and `embed` route modules. Those modules `import dynamic from "next/dynamic"`, `import { notFound } from "next/navigation"`, and `import { PlaygroundFrame } from "@/components/shared/playground-frame"` (which itself does `import "@/styles/playground.css"`). No existing Vitest test in the repo imports a route `page.tsx` — the closest, `src/app/feed.xml/parity.test.ts`, imports only `#site/content` and lib helpers, not a page module with `next/dynamic`. Risks: (a) `import "@/styles/playground.css"` at module scope — Vitest must be able to swallow a CSS import (usually fine with the `@vitejs/plugin-react` setup, but unverified here); (b) `next/dynamic` / `next/navigation` resolving under jsdom without a Next request context. `notFound`/`dynamic` are not *called* at module scope (only inside component bodies and `generateStaticParams` doesn't touch them), so eval *should* be safe — but "should" is doing work. **The design must either prove this import is clean (run it) or have the integrity test import the manifest + a pure partition helper and reconstruct the expected `generateStaticParams` output from the manifest, rather than importing the route modules.** The latter is safer and still satisfies Req 10.1's intent (it asserts the partition logic, which can live in a tested pure function the routes also call).

### F4 — `next/dynamic` in a server component: the claim is *correct* for Next 16, but unproven in this repo.

The design uses `dynamic(it.load)` **without** `{ ssr: false }` inside a server component (`design.md:297, 333`). This is the one configuration that is still legal: `next/dynamic` with `ssr: false` is rejected in Server Components on Next 15+/16, but the default (SSR on) is allowed and SSRs+hydrates the `"use client"` child. So the design correctly avoids `ssr: false`. However, **there is zero existing `next/dynamic` usage anywhere in the repo** (grep confirms none in `src/`), so this is a first-of-its-kind pattern here. Also note `dynamic(it.load)` is called fresh **on every render** inside the component body — acceptable, but creating the dynamic component inline per-render is slightly wasteful and differs from the canonical module-scope `const X = dynamic(() => import(...))`. Pin it as "must be verified against a real `next build` + render," not assumed.

### F5 — The M1 second-unlayered-rule cascade is sound, but the design under-specifies one interaction.

Two unlayered rules on `.playground-container` with equal specificity → later source wins (`design.md:152-159`). In `playground.css` the reset is lines 14-20 and the new rule is appended after it in the same file (verified source order is controllable). That part is correct. But: the existing `@layer playground` block also re-declares `box-sizing: border-box` (line 37) and `color-scheme: light` (line 38). The design moves only `font-family`, `font-size`, `line-height`, `color` to the unlayered rule and leaves `color-scheme: light` layered (`design.md:164`), so `all: initial` resets it to `normal`. The design calls this "cosmetically equivalent." This is *probably* fine (token colors are explicit `oklch()`, not `color-scheme`-derived, and no test asserts `color-scheme`), but `color-scheme: normal` vs `light` does change form-control and scrollbar rendering inside the container and the UA's default text color interpretation. For a "drawing toy" with a `<canvas>` and possibly a `<Button>`, this is a low but real risk. **Flag accepted as a conscious non-move (the design already does), but the authoring doc should warn that form controls inside same-page items render under `color-scheme: normal`.**

### F6 — `PlaygroundFrame` in `src/components/shared/` is importable by items, violating the boundary the design relies on.

`structure.md:287` says playground items "should not import from `src/components/shared/`." The design places `<PlaygroundFrame>` in exactly `src/components/shared/playground-frame.tsx` (`design.md:73, 128`). Nothing *enforces* this — the leak guard (`check-playground-css.mjs`) only greps CSS Modules, not TS imports; the boundary is a "convention" per `structure.md:271`. So a future item author can `import { PlaygroundFrame }` and double-wrap the reset, or build a recursive surface. This is not a build break and the *current* samples don't do it, but the design claims module-boundary conformance (`design.md:47`) while creating the precise import path the boundary forbids. **Either accept and document it, or note that no import-boundary lint exists to catch a violation.** (`structure.md:287` even suggests the escape hatch — "if a `src/components/shared/` component has no visual coupling, move it to `src/lib/`" — but `PlaygroundFrame` is JSX, so `src/lib/` is a poor fit; `src/components/playground/` would at least not be the explicitly-forbidden `shared/`.)

### F7 — E2E iframe "spans content-column width AND meets declared 16/10 aspect" is viewport-dependent and flaky as specified.

`design.md:531` asserts the iframe's rendered box "spans the content-column width AND meets its declared `16 / 10` aspect … via bounding box." An `aspect-ratio` box derives its height from its rendered width, which derives from `max-w-3xl` minus padding *at the test viewport*. The expected bounding box is therefore a function of the Playwright viewport, not a constant. Asserting exact pixels will drift if the default viewport changes; asserting the *ratio* (height ≈ width × 10/16, within tolerance) is the only stable form. The design should specify the **ratio assertion**, not an absolute box. Also confirm `aspectRatio: "16 / 10"` (with spaces) is passed through by React inline styles — it is (React only special-cases unitless numerics for the `aspect-ratio` property; a string is passed verbatim), so that sub-claim is fine.

### F8 — The leak-guard grep has known false negatives the design half-acknowledges; weigh against Req 10.6's "cheap grep."

`scripts/check-playground-css.mjs` (`design.md:362`) fails on `:global(` and non-`*.module.css` `@import`. It will miss `composes: x from global;` (a real CSS-Modules global escape), `@import url(global.css);` (the `url()` form), and whitespace/quote variants. The design's self-test (`design.md:517`) covers only the two happy-path constructs. This is acceptable for a "cheap grep" if the design *names* the gaps and the authoring doc lists `composes … from global` as forbidden — but as written it claims `:global` and global-`@import` are "the only two constructs that escape CSS-Module scoping" (`design.md:362`), which is false (`composes from global` also escapes). **Correct that claim or add the `composes … from global` pattern to the grep.**

### F9 — The `vitest.config.ts` alias is a bare key, not a wildcard — confirm it actually resolves `#playground/manifest`.

`tsconfig.json` gets `"#playground/*": ["./playground/*"]` (wildcard), but `vitest.config.ts` gets a **bare** `"#playground": fileURLToPath(new URL("./playground", …))` (`design.md:71`). Vite string aliases do prefix substitution, so `#playground/manifest` → `<dir>/manifest` resolves correctly **only because** Vite treats a bare-string alias as a prefix match. This is the same shape as the existing `"#site/content"` alias (which is exact, non-wildcard) — but `#site/content` is a *terminal* import (no subpath), whereas `#playground/manifest` is a *subpath* import. The existing precedent (`#site/content`) does **not** prove the wildcard/subpath case resolves in Vitest; it's a different access pattern. **Verify the Vitest alias resolves `#playground/manifest` (run the integrity test), and confirm `moduleResolution: "bundler"` + the `#`-prefix don't collide with Node subpath-imports** — the repo has no `"imports"` field in `package.json`, so no collision, but `#`-prefixed specifiers are reserved by Node for `package.json#imports`; `moduleResolution: "bundler"` tolerates the tsconfig-paths mapping, and the existing `#site/content` proves the bare `#` works. Net: probably fine, but the subpath wildcard is unproven and is the kind of thing that passes `tsc` and fails Vitest.

---

## What checks out (so the implementer doesn't re-verify)

- **Root layout** (`src/app/layout.tsx`) has `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>` wrapping all groups, `<html lang="en">`, and Geist font variables — Decision #9 is buildable. Confirmed.
- **The reset lives in `(playground)/layout.tsx`** today as a `<div className="playground-container" data-testid="playground-container">` importing `playground.css`. The extraction to `<PlaygroundFrame>` + pass-through layout is exactly right. Confirmed.
- **M1 is real**: `playground.css:14-20` unlayered reset, `:22-77` layered re-declaration including `color: oklch(0.145 0 0)` (line 36). Unlayered beats layered. The second-unlayered-rule fix is sound (modulo F5). Confirmed.
- **The theme-toggle reuse works**: `src/components/layout/theme-toggle.tsx` depends only on `next-themes` `useTheme()` and `ui/` primitives (`Button`, `DropdownMenu`) — no `(site)` chrome, no `(site)`-only provider. It lives in `components/layout/`, which items may not import, but the *gallery is a route*, not an item, so the reuse is legal. Confirmed.
- **CSP opt-out** (`next.config.ts:84`, `source: "/((?!playground(?:/|$)).*)"`) excludes `/playground`, `/playground/[slug]`, `/playground/[slug]/embed`; no `X-Frame-Options` set; same-origin iframe loads. Confirmed.
- **`check-authoring-docs.test.mjs`**: only the `notFoundLines.length === 2` assertion (actual **line 110**, design says ~109 — trivially off) hardcodes the count; the title string says "two" (line 101). `writeDocs` (line 38-45) iterates `AUTHORING_DOCS` automatically; `subjectHeadings`/`SUBJECT_REL` stay `slash-pages` (lines 27-28) and are unaffected by appending a third doc; the zero-byte `warningCount === subjectHeadings.length` test (line 120-135) is unaffected. The design's analysis here is accurate.
- **`sitemap.ts`** lists `/playground` (line 14) and derives dynamic entries via lib getters — additive manifest-derived landing URLs are clean. Minor: the repo uses `new URL(route, siteConfig.url).toString()`, the design's snippet uses `${base}/playground/${it.slug}` template strings — a stylistic divergence to align, not a bug.
- **`notFound()` is not swallowed by `error.tsx`**: in App Router, `notFound()` renders the nearest `not-found.tsx`, not `error.tsx`. The design's worry about the boundary swallowing the 404 is unfounded; that path is fine.
- **Empty-manifest** `generateStaticParams` returning `[]` with `dynamicParams=false`: Next builds a param-less segment cleanly (no pages, all unknown slugs 404). Fine.

---

## Top 5 risks/gaps (ranked)

1. **Synchronous `params` access — will not compile on Next 16.** `design.md:269, 275, 326, 330`. The repo convention (`blog/[slug]/page.tsx:36-70`) is `params: Promise<…>` + `await`. Every landing/embed component and both `generateMetadata` are wrong. → `tsc` red; or, if forced through, every item page renders empty. **Must fix before implementation.**
2. **`expectLabClose` on the container `color` throws.** `design.md:525` vs `playground-isolation.test.ts:18-27, 127, 275, 286`. The real `color` property serializes to `rgb(...)`; `parseLab` rejects it. The migrated isolation test errors instead of asserting. **Must specify `expectRgbEqual` against the sRGB form (≈`rgb(10,10,10)`), empirically captured.**
3. **Vitest importing route `page.tsx` (with `next/dynamic`, `next/navigation`, a CSS import) is unprecedented and may fail under jsdom.** `design.md:516`. No repo test does this. → integrity-test red/erroring at import. **Reconstruct the partition from the manifest via a pure helper instead.**
4. **`vitest.config.ts` bare `#playground` alias resolving a subpath (`#playground/manifest`) is unproven.** `design.md:71`. The `#site/content` precedent is a terminal import, not a subpath — it does not generalize cleanly. → integrity-test module-resolution failure that passes `tsc`. **Verify by running.**
5. **E2E iframe aspect/width assertion is viewport-dependent.** `design.md:531`. An absolute bounding-box assertion will flake; only a ratio (height ≈ width×10/16 ± tolerance) is stable. **Specify the ratio form.**

## Top 3 conclusions to challenge / reverse

1. **"Use `expectLabClose` for the flipped container color."** (`design.md:525`) — reverse to `expectRgbEqual` (rgb readout off a real property). The design copied the requirement's `lab()` assumption past the test file's own contradicting serialization note.
2. **"`:global` and global-`@import` are the only two constructs that escape CSS-Module scoping."** (`design.md:362`) — false. `composes: x from global;` also escapes. Add it to the grep + authoring doc or correct the claim.
3. **"The integrity test imports the route modules' `generateStaticParams`."** (`design.md:516`) — challenge. Importing `page.tsx` drags `next/dynamic` + a CSS import into jsdom with no repo precedent. Reframe Req 10.1 around a pure partition helper the routes call, so the test imports the manifest, not the routes.

## What's missing before this design is implementation-ready

- **Correct the async-`params` signatures** in all three route snippets to match `blog/[slug]/page.tsx` (`Promise<{slug}>` + `async`/`await`). This is non-negotiable on Next 16.
- **Empirically pin the post-M1 container `color` serialization** from a real prod build and rewrite the Req 5.3b assertion accordingly (almost certainly `expectRgbEqual([10,10,10])`, not `expectLabClose`).
- **Redesign the integrity test** to avoid importing route `page.tsx` modules — extract the manifest-partition logic into a pure tested function, or at minimum prove the import is jsdom-clean by running it.
- **Verify the `#playground/manifest` subpath alias resolves under Vitest** (not just `tsc`), since the `#site/content` precedent is a terminal, not subpath, import.
- **Specify the iframe E2E assertion as a ratio**, not an absolute box.
- **Add `composes … from global`** to the leak guard (or scope the claim) and add a `color-scheme: normal` warning for same-page form controls to the authoring doc.
- **Pick a home for `PlaygroundFrame` that isn't the boundary-forbidden `components/shared/`**, or explicitly document that no import-boundary lint enforces the item→`shared/` prohibition.
