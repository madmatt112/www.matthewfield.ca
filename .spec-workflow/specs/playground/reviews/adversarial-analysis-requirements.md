# Adversarial Analysis — Playground Requirements (v1)

Reviewer stance: principal frontend architect. Brief: tear the document apart, verify
every code claim against reality, surface gaps that will bite during design/implementation.
Where the doc is fine, one line and move on.

All findings are **Novel** (v1).

---

## Verification of the "Current state" claims (Req intro)

I opened every file the document cites. Result: the *code* claims are largely accurate,
but the *file-location* claims contradict the steering structure doc, and one test-edit
claim is incomplete.

| Doc claim | Reality | Verdict |
|---|---|---|
| `layout.tsx` wraps children in `.playground-container`, `all: initial` reset | Confirmed (`src/app/(playground)/layout.tsx:5`; `playground.css:14-20`) | Accurate |
| `playground.css` has unlayered reset + layered `@layer playground` typography/token block; tokens correct, typography needs M1 fix | Confirmed (`playground.css:14-20` reset, `:22-77` layer) | Accurate |
| `globals.css` declares `@layer playground;` before `@import "tailwindcss"` | Confirmed via spike-results.md `globals.css:4`; not re-read but corroborated | Accurate |
| Placeholder gallery `robots: { index: false }`, "Return home" link | Confirmed (`page.tsx:6,16-21`) | Accurate |
| CSP opt-out via `/((?!playground(?:/|$)).*)` already in place | Confirmed (`next.config.ts:84`) | Accurate |
| `INTENDED_PLAYGROUND_FONT_FRAGMENT = "ui-sans-serif"` used with `not.toContain` ~line 243 | Confirmed: constant at `:103`, assertion at `:240` (the doc says ~243; close enough) | Accurate but see Finding 6 |
| `sitemap.ts` lists `/playground`; `site.ts heroCards` links to `/playground` | Confirmed (`sitemap.ts:14`; `site.ts:74-78`) | Accurate |
| Manifest at `src/app/(playground)/playground/manifest.ts`; items in `_items/<slug>/` under the route group (Req 1.1, 6.3) | **CONTRADICTS structure.md** which places `playground/manifest.ts` and `playground/[item-name]/index.tsx` **at the project root**, outside `src/` (structure.md:83-88, 220-239, 256-258) | **WRONG / unreconciled** — see Finding 1 |

So the headline: the document is honest about the code it inherits, but it silently
relocates the manifest and item modules in a way that breaks the steering doc's
module-boundary diagram and its explicit import-graph rules. That is the single biggest
defect and the requirements do not even acknowledge the divergence exists.

---

## Top 5 Risks / Gaps (ordered by severity)

### Risk 1 — Manifest/item location contradicts structure.md; module-boundary rules are silently violated. (Req 1.1, 6.3, NFR "Single Responsibility"/"Modular Design"; Decision #2)

**The conflict is concrete, not stylistic.** structure.md is unambiguous:

- Tree (structure.md:83-88): `playground/` is a **top-level project-root directory**, sibling
  to `src/`, containing `manifest.ts` and `[item-name]/index.tsx`.
- Prose (structure.md:233-235): "The App Router route at
  `src/app/(playground)/playground/[slug]/page.tsx` dynamically imports the matching item
  from `playground/[slug]/index.tsx`."
- Import graph (structure.md:256-258, 271): `playground/manifest.ts → imported by
  src/app/(playground)/`; `playground/[item]/index.tsx → dynamically imported by …`; and
  the boundary rule "`playground/` items may import from `src/lib/` and
  `src/components/ui/` but should not import from `src/components/shared/`,
  `src/components/layout/`, or **`src/app/`**."

The requirements put the manifest at `src/app/(playground)/playground/manifest.ts`
(Req 1.1) and item modules at `_items/<slug>/` **inside** `src/app/(playground)/`
(Req 6.3). That move:

1. Breaks the steering import-direction rule the moment an item needs to be imported by a
   route under `src/app/` while *living* under `src/app/` — the "items don't live in
   `src/app/`" boundary is gone, and the "items may not import from `src/app/`" rule
   becomes ambiguous (the item is now physically a sibling of route files).
2. Invalidates the structure.md tree and prose without a documented override. A reviewer
   reading both docs cannot tell which is authoritative.

**Failure scenario.** Design phase author follows the requirements and colocates items
under `src/app/(playground)/playground/_items/`. A later contributor reads structure.md,
"corrects" the layout back to root-level `playground/`, and the manifest's relative import
specifiers (`() => import("./_items/foo")` vs `() => import("../../../../playground/foo")`)
break. Worse: nobody updates the steering doc, so the contradiction persists and every
future playground PR re-litigates where files go. **Decision #2's justification ("manifest
is code, not Velite") is sound and not in dispute — but it says nothing about the
*location*, which is where the real conflict is.** The requirements must either (a) adopt
structure.md's root-level `playground/` layout, or (b) explicitly amend structure.md and
state why. Right now it does neither.

### Risk 2 — The `next/dynamic` + per-slug manifest thunk is the load-bearing technical assumption and it is under-specified for static export. (Req 1.1, 3.3, 3.4; NFR Performance)

The contract (Shared Definitions; Req 3.3) is that `[slug]/page.tsx` reads
`manifest[slug].load` (a `() => import(...)` thunk) and hands it to `next/dynamic`. Two
real problems the requirements wave past:

1. **`next/dynamic` is a client-component API.** `[slug]/page.tsx` is mandated to be a
   statically-generated **server component** (Req 2.5 for the gallery; Req 3.4 +
   "statically generated server components" in NFR Performance for items). `next/dynamic`
   with `{ ssr: false }` is not allowed in a server component in App Router; even with SSR
   enabled, the idiomatic App-Router path for code-splitting a server tree is a
   `"use client"` boundary or `React.lazy` inside a client component — not `next/dynamic`
   inside a server page. The requirement conflates "server-rendered route" with
   "client-side dynamic import" without specifying the client boundary. **The design must
   name where the `"use client"` boundary sits**, and the requirement should not assert
   `next/dynamic` as if it drops into a server page unchanged.

2. **Bundler static-analyzability.** `next/dynamic`/the bundler need a statically
   analyzable import specifier to code-split. A thunk pulled out of a runtime-resolved
   `manifest[slug]` object **is** statically analyzable *as long as the literal
   `import("...")` strings are written in the manifest source* (they are — each entry
   hardcodes its own `() => import("./_items/foo")`). So code-splitting per item is
   achievable. **But** Req 1.2 also requires the gallery to import the manifest. If the
   manifest module is a single file containing every `() => import(...)` thunk, importing
   it for the gallery does **not** eagerly pull item code (thunks are lazy) — that part is
   fine. The real tension is more subtle: any *eager* top-level value in an item's barrel
   (`index.tsx`) that the manifest references for metadata would defeat the split. The
   requirement says metadata lives in the manifest entry (good), so this is salvageable —
   but the requirement never states the invariant "the manifest must contain **only**
   data + lazy thunks, never an eager import of an item module," which is exactly the rule
   that keeps Req 3.3 true.

**Failure scenario.** Implementer writes `[slug]/page.tsx` as a server component and calls
`next/dynamic(manifest[slug].load)`. Build fails or — worse — silently renders nothing/falls
back to a client tree that bloats the bundle, and the "one item's code is not bundled into
unrelated routes" guarantee (Req 3.3) is quietly violated with no test catching it (there
is no per-route bundle-size assertion in Req 10).

### Risk 3 — Double layout wrapping of the embed route defeats the "fresh browsing context" goal, and iframe dimensioning is untestable. (Req 3, 4.2, 4.3, 4.4)

`(playground)/layout.tsx` wraps **all** `(playground)` routes in `.playground-container`
with `all: initial`. The embed route (`/playground/[slug]/embed`) lives under that group,
so the iframe's *document* gets wrapped in `.playground-container` too. The whole point of
the iframe path (Req 4, tech.md:55 "complete CSS/JS/dependency isolation") is a fresh
browsing context — re-applying the host's playground reset/token layer inside it is at
best redundant and at worst actively wrong for an item that wants its own document-level
styling (Req 7.3 explicitly wants the iframe sample to do document-level styling). The
requirements never address whether the embed route should bypass or override the
`(playground)` layout. structure.md:277 even says embed routes are "complete standalone
HTML pages with their own document, layout stack, and provider context — not fragments" —
which the shared `(playground)/layout.tsx` contradicts.

Compounding: the host landing route (`/playground/[slug]` in iframe mode) renders an
`<iframe>` *inside* `.playground-container`. `all: initial` applies to the `<iframe>`
element itself, resetting its `border`, `width`, `height` to initial values — an iframe
with no author width/height collapses to the CSS default `300×150`. Req 4.4 says "sensible
default size/aspect" which is **not testable** and gives no guidance (full-bleed?
aspect-ratio box? fixed px?).

**Failure scenario.** Implementer ships the iframe sample. In the host page the iframe is
300×150 with the UA default 2px inset border stripped by `all: initial`, the embed content
is double-reset, and the "viewport-escaping" behavior the iframe was supposed to enable
(Req 7.3) is clipped by the tiny default box. Passes a naive "iframe present" E2E
(Req 10.3) while looking broken.

**Required:** a requirement that (a) the embed route opts out of / nests differently from
the `.playground-container` reset, and (b) a concrete, assertable iframe sizing rule.

### Risk 4 — `dynamicParams` / 404 behavior for embed is asserted but not mechanized. (Req 3.2, 4.5)

Req 4.5 says a same-page-only slug's `/embed` path "404s," and Req 3.2 says an unknown
`[slug]` returns `notFound()`. In App Router, `generateStaticParams` **does not** 404
unlisted params by default — with the default `dynamicParams = true`, an unlisted slug is
rendered **on demand** at request time, not 404'd. To get the asserted behavior you must
set `export const dynamicParams = false` on both the `[slug]` segment and the `[slug]/embed`
segment, **and** the embed `generateStaticParams` must enumerate only iframe slugs. The
requirement asserts the *outcome* (404) without stating the *mechanism* (`dynamicParams =
false`), and the landing route's own `notFound()` (Req 3.2) is a separate code path from
the segment-level param gating. These can disagree: a same-page slug hitting `/embed` could
fall through to a dynamically-rendered embed page that then has no item to render and
crashes, rather than cleanly 404ing.

**Failure scenario.** `/playground/some-same-page-item/embed` is hit (a crawler follows a
guessed URL, or a copy-paste). With default `dynamicParams`, Next renders the embed page
dynamically; the embed host tries to load an item whose `isolation` is `same-page` (no
embed contract) and throws a runtime error / blank page instead of a 404 — directly
violating the Reliability NFR ("never crash or render blank").

### Risk 5 — `noindex` embed routes remain crawlable; the sitemap-exclusion rationale undersells the SEO cost; no robots.txt strategy. (Req 8.3, 8.4; Decision #6)

Three layered issues:

1. **`noindex` ≠ not crawled.** Req 8.3 makes embed routes `noindex`. A `noindex` page is
   still fetched by crawlers (they must fetch it to *see* the noindex). The embed route
   renders the item's full content; Google will crawl it, see `noindex`, and drop it from
   the index — but only after spending crawl budget and potentially briefly surfacing it.
   There is **no `robots.txt`** in the repo (confirmed: `find robots*` → nothing) and no
   requirement to add a `Disallow: /playground/*/embed` or to set `X-Robots-Tag` /
   `rel=nofollow` on the host→embed link. The cleaner posture (crawler never fetches embed)
   is unaddressed.

2. **Duplicate-content risk.** For an iframe item, the *same* item content exists at two
   URLs: the landing route `/playground/[slug]` (indexable, Req 8.2) frames the embed, and
   the embed `/playground/[slug]/embed` (noindex) *is* the content. The landing page's
   indexable HTML is mostly an empty iframe shell — thin content — while the real content
   sits at a noindex URL. Google indexes a near-empty page and ignores the real one. This
   is an SEO own-goal the requirements do not see.

3. **Decision #6's "harmless, mirrors slash-pages" is a weak analogy.** Blog taxonomy
   permutations excluded from the XML sitemap are *derivative* views of content that is
   itself in the sitemap. Playground items are *primary content destinations* the product
   wants discovered (product.md §7, target user #3). Feeding the manifest to `sitemap.ts`
   is ~5 lines (the file already maps over `getPublishedProjects()` etc.; an analogous
   `manifest.map(...)` for `isolation !== "iframe-embed"` landing routes is trivial). The
   marginal cost is near-zero; the SEO benefit (indexable item URLs actually advertised) is
   real. **Recommendation: reverse Decision #6 for landing routes** (`/playground/[slug]`),
   keep embed routes out. The requirement currently picks the lower-effort, lower-value
   option and rationalizes it.

---

## Top 3 Conclusions to Challenge or Reverse

### Challenge 1 — Reverse the manifest/item *location* (Decision #2 location, Req 1.1/6.3)
Adopt structure.md's root-level `playground/` directory (sibling to `src/`), or formally
amend structure.md. As written, two steering-aligned docs disagree on where the most
important new files live. The "code not Velite" decision is right; the placement is wrong
or at least unreconciled. (Grounded in structure.md:83-88, 220-239, 256-271.)

### Challenge 2 — Reverse Decision #6 for landing routes (Req 8.4, Decision #6)
Put `/playground/[slug]` landing routes in the XML sitemap; keep `/embed` out. The
slash-pages analogy doesn't hold (items are primary content, not derivative views), the
implementation cost is trivial given the existing `sitemap.ts` shape, and the current
choice creates the thin-landing/noindex-content split in Risk 5. (Grounded in product.md
§7, sitemap.ts:66-95.)

### Challenge 3 — Challenge the chrome-less, theme-pinned **gallery** (Req 2.2, 2.4, 5.4)
The doc treats it as settled that the *gallery* lives under `(playground)` and is therefore
chrome-less and pinned to light tokens. The gallery is a **site-section navigation
surface**, not an isolated item. Pinning it to light-only means: (a) a dark-mode visitor
clicking the "Playground" nav card lands on a jarring forced-light page with no header,
no nav, no theme toggle, and only a hand-rolled "Return home" link (Req 2.4); (b) the
gallery cannot use the site's `Card` hover/theme behavior the cross-spec convention
promises (decomposition "UI primitives"). The defensible architecture is: **gallery under
`(site)`** (full chrome + theme, normal Card, normal nav), and **only items** isolated
under `(playground)`. The product vision (product.md §10) says *playground items* don't
inherit the theme — it does **not** say the *gallery* must be chrome-less. The requirements
over-apply the isolation boundary to a navigation page. At minimum this trade-off must be
argued explicitly rather than inherited by accident of route-group placement.

(If the gallery stays under `(playground)`, Risk 5's M1 dependency bites: a chrome-less
light-only gallery rendered through the *currently broken* typography reset will render in
Times New Roman until M1 lands — so Req 5 is a hard prerequisite for Req 2, which the
ordering does not make explicit.)

---

## What's Missing (work to do before design)

1. **Reconcile file locations with structure.md** (Risk 1 / Challenge 1). Pick root-level
   `playground/` or amend the steering doc. Blocking — everything else references these
   paths.

2. **Specify the client/server boundary for item loading** (Risk 2). State that
   `[slug]/page.tsx` server-renders metadata + a `"use client"` wrapper that performs the
   dynamic import, and add the invariant "manifest contains data + lazy thunks only, no
   eager item imports." Optionally add a per-route bundle assertion to Req 10 so Req 3.3 is
   actually enforced rather than assumed.

3. **Embed route layout behavior** (Risk 3). Add a requirement that the embed route is a
   standalone document not wrapped by the host `.playground-container` reset (reconciling
   with structure.md:277), and a concrete, assertable iframe sizing rule (replace "sensible
   default size/aspect," Req 4.4).

4. **Make `dynamicParams = false` explicit** (Risk 4) on both `[slug]` and `[slug]/embed`
   segments, and define the same-page-slug-hits-/embed path as a 404, not a runtime crash.

5. **Crawler strategy for embeds** (Risk 5). Decide robots.txt `Disallow` and/or
   `X-Robots-Tag` and/or `rel="nofollow"` on host→embed links; address the thin-landing /
   noindex-content duplication for iframe items.

6. **Complete the test-fallout list, don't truncate it** (Req 5.3, 10.2). The spike's
   "Test-file fallout" note (spike-results.md:59, :89, :97) calls for **more than one edit**:
   (a) invert `INTENDED_PLAYGROUND_FONT_FRAGMENT` from `not.toContain` (the assertion is at
   `playground-isolation.test.ts:240`, not ~243) to `toContain`; (b) remove the
   "broken-state marker"/"SPIKE FINDING" comment blocks (`:72-103`, `:196-219`); (c) the
   spike's explicit instruction to **re-audit `applyDarkMode`** (`:157-172`) after the
   next-themes integration (task 16) for the hydration race, per spike-summary.txt:365-398.
   Req 5.3 mentions only the single assertion flip and the comment removal — it silently
   drops the `applyDarkMode` re-audit, which is the part most likely to flake in CI.

7. **No-global-CSS guard cost/benefit** (Req 6.2). The doc declines an automated check.
   For a feature whose *entire* safety story is "items don't leak," a one-line grep for
   `:global` / unscoped selectors across item modules is cheap insurance against a single
   careless author breaking isolation site-wide with no failing test. structure.md and
   tech.md both lean on "first-party only, no automated check" — but those items now live
   inside `src/app/` (per the requirements) where a stray `:global{}` in a `.module.css`
   would escape. Recommend a cheap CI grep, not a full linter.

8. **Class-name selection brittleness** (Req 6, 10.3). tech.md:70/147 warns CSS Modules
   hashing differs Turbopack↔Webpack. No requirement mandates `data-testid` for E2E
   selection of item content; if the sample-item E2E (Req 10.3) selects by hashed module
   class it will be brittle across bundlers. Mandate `data-testid`.

9. **Loading / error / no-JS states** (gap vs. Reliability NFR). No `loading.tsx` /
   `error.tsx` requirement for a same-page item that throws or loads slowly; no `noscript`
   fallback requirement for an interactive item with JS disabled. The Reliability NFR
   promises "never crash or render blank" but only covers the unknown-slug 404, not a
   *known* item that throws at runtime.

10. **Preview/thumbnail field** (Req 2.1, product vision). product.md §3/decomposition #5
    describe galleries with **visual preview cards**; the project-showcase gallery has
    cover images. Req 2.1 cards show title + description only — no thumbnail — and the
    `PlaygroundItem` contract has no preview/image field. This is a silent under-delivery
    against "gallery of visual previews." Either add an optional `preview` field or
    explicitly justify text-only cards for playground (defensible — playground items are
    code, not photo-worthy — but it should be a stated decision, not an omission).

---

## Items that are actually fine (one line each)

- **CSP opt-out regex** (Req 9.1, 10.5). `/((?!playground(?:/|$)).*)` correctly excludes
  `/playground`, `/playground/foo`, **and** `/playground/foo/embed` (the negative lookahead
  matches `playground/` for the deeper paths). No silent CSP-applies-to-embed bug.
  *Caveat:* the existing E2E (`csp.test.ts:35`) only asserts `/playground` lacks CSP — it
  does **not** test the deeper `/playground/foo` or `/embed` paths. Req 10.5 should require
  asserting the *nested* paths too, since that's where a future regex refactor would regress.
- **No `X-Frame-Options: DENY` problem** (Req 9.2). Next.js sets no `X-Frame-Options` by
  default, `next.config.ts` sets none, and the CSP (which has no `frame-ancestors`) is not
  even served on playground routes — so same-origin framing of `/embed` will not be blocked.
  The "no framing error" claim holds. (Note for completeness: the parent's CSP `frame-src
  'self'` is irrelevant because the parent route is CSP-exempt.)
- **M1 fix approach** (Req 5.2, Decision #4). "Second unlayered rule after the reset" is
  exactly the spike's preferred option (spike-results.md:54-57) and will work: an unlayered
  typography rule on `.playground-container` declared *after* the unlayered `all: initial`
  reset wins on source order, and inherited typography flows to descendants normally; it
  does not "leak out" because the boundary is the container element itself. Keeping tokens
  layered preserves the Tailwind-wins property. Correct.
- **M2 per-item default** (Req 3.5, Decision #5) matches the spike matrix
  (spike-results.md:62-77) faithfully.
- **Empty-manifest graceful state** (Req 2.3) and **unique-slug integrity check** (Req 1.3,
  10.1) are well-formed and testable.
- **Reuse of the existing CSP rule, not re-adding it** (Req 9.1, Decision #8) is correct and
  matches `next.config.ts:84`.
