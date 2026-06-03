# Playground authoring guide

Reference documentation for authoring playground items — the small interactive
toys, visualizations, and experiments listed on `/playground`. The build
enforces these constraints; this doc explains them so you learn them BEFORE
breaking CI.

The canonical section headings below are checked mechanically by
`scripts/check-authoring-docs.mjs` (wired into CI before the first build). Each
heading must remain an exact single line — no commas, no colons. Do not rename
one without updating that check in the same PR.

Items live at the **project root** under `playground/`, not under `src/`. Each
item is a self-contained folder. The typed manifest at `playground/manifest.ts`
is the single source of truth — the gallery, both route loaders, and the XML
sitemap all derive from it. Adding an item is a two-step job: create the item
folder, then register it in the manifest.

## Where item modules live

Each item is a folder at `playground/[slug]/` containing exactly two files:

- `index.tsx` — the item component. It is a **client component**: the first
  line is `"use client"`. It renders its own single `<h1>` (the page chrome
  does not supply one for same-page items).
- `styles.module.css` — a colocated CSS Module. Class names are hashed and
  collision-free; see [CSS Modules and the no-global-CSS rule](#css-modules-and-the-no-global-css-rule).

The `slug` is the folder name and must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`
(kebab-case). It is the route segment (`/playground/[slug]`), the manifest key,
and the sitemap URL, so it must be unique. The manifest↔route integrity test
(`manifest-integrity.test.ts`) fails CI if a slug is duplicated or if a
registered item folder has no `index.tsx`.

```
playground/
├── manifest.ts            # the registry — edit this to add an item
├── scribble-pad/
│   ├── index.tsx          # "use client" component, own <h1>
│   └── styles.module.css  # colocated CSS Module
└── starfield/
    ├── index.tsx
    └── styles.module.css
```

### The SSR-safety rule

Items are **SSR-prerendered**. The route loads each item via `next/dynamic`
with SSR **on** — and there is no opt-out: `dynamic(it.load, { ssr: false })`
is illegal in a Server Component on Next 16, so every item is statically
prerendered at `next build`. The server renders your component once with no DOM
present.

Therefore an item **must not** touch `window`, `document`, `canvas.getContext`,
`requestAnimationFrame`, or `ref.current` at module scope or in the render body.
An unguarded browser-global access throws during the prerender and **fails the
build**. Move all of it into `useEffect` (or event handlers); render only a
bare `<canvas ref={…}>` on the server and acquire the context / start the
animation loop inside the effect.

```tsx
"use client";
import { useEffect, useRef } from "react";

export default function Toy() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d"); // browser globals live here
    // … start the loop, requestAnimationFrame, etc.
  }, []);
  return (
    <>
      <h1>My toy</h1>
      <canvas ref={ref} /> {/* bare on the server — no globals at render */}
    </>
  );
}
```

## Adding a manifest entry

After the item folder exists, register it in `playground/manifest.ts` by
appending one object to the `playgroundItems` array. The entry shape is:

```ts
{
  slug: "scribble-pad",            // matches the folder name; kebab-case, unique
  title: "Scribble Pad",           // shown on the gallery card + page <title>
  description: "A freehand canvas drawing toy.", // gallery card + meta description
  tags: ["canvas", "interactive"], // string[]; shown on the card
  iframeIsolated: false,           // false = same-page; true = iframe — see below
  load: () => import("./scribble-pad"), // lazy thunk; code-split per item
  // frame is REQUIRED for iframe items, omitted for same-page items:
  // frame: { aspectRatio: "16 / 10" },   // or { height: "600px" }
}
```

- `load` is a **lazy thunk** — `() => import("./slug")`, never an eager
  top-level import. This keeps each item in its own code-split chunk and keeps
  the manifest itself server/build-safe (no `"use client"`, no React runtime
  import, no browser global at module scope).
- `frame` (a `PlaygroundFrameHint`) is only meaningful for `iframeIsolated:
true` items and sizes the host `<iframe>`. Use `{ aspectRatio: "16 / 10" }`
  for a visualization that fills its box, or `{ height: "600px" }` for a fixed
  height. If omitted on an iframe item the host falls back to a `16 / 10`
  aspect; the iframe's default `300×150` would clip viewport-escaping content,
  so always declare a `frame` that fits.

The manifest drives everything downstream, so there is nothing else to wire:
the gallery card, the `/playground/[slug]` landing route, the
`/playground/[slug]/embed` route (iframe items only), and the sitemap all read
this array. Do not hand-maintain a parallel list anywhere.

## Choosing an isolation mode

The `iframeIsolated` flag picks one of two isolation modes:

- **`false` — same-page.** The item renders inline on the landing route inside
  the `.playground-container` reset (an `all: initial` reset + an
  `@layer playground` token re-declaration). This is the default and the
  lighter-weight path: the item shares the page's document and theme tokens but
  is shielded from the site's typographic and layout styles by the reset.
- **`true` — iframe.** The item renders full-bleed in a standalone embed
  document (`/playground/[slug]/embed`) loaded inside an `<iframe>` on the
  landing page. This is a separate browsing context — full CSS and layout
  isolation, its own viewport.

**When in doubt, use iframe.** Same-page isolation is a reset, not a sandbox;
some patterns escape it. Use `iframeIsolated: true` if the item does any of:

- pulls in **conflicting dependencies** or third-party **global CSS**;
- uses `position: fixed` or viewport units (`100vw` / `100vh`) — it needs its
  own viewport;
- styles `:root`, `html`, or `body` (document-level styling escapes the
  container);
- wants a **custom CSP** or otherwise needs to act as its own document.

If none of those apply, same-page is fine and preferable.

### Same-page form controls render under `color-scheme: normal`

The `.playground-container` reset applies `all: initial`, which resets
`color-scheme` to `normal` inside the container (the layered `color-scheme:
light` is reset by the unlayered `all: initial`). Native form controls,
scrollbars, and other UA-themed widgets in a same-page item therefore render
under `color-scheme: normal`, not the site's `light` scheme. Token colors are
unaffected — they are explicit `oklch()` values, not `color-scheme`-derived. If
a same-page item relies on system-themed form controls and that matters, set
`color-scheme` explicitly in your CSS Module or use the iframe mode.

## CSS Modules and the no-global-CSS rule

All item styling goes in the colocated `styles.module.css`. **No global CSS.**
A leak guard (`scripts/check-playground-css.mjs`, run in CI) scans every
`playground/**/*.module.css` and fails the build on the three constructs that
escape CSS-Module scoping:

- `:global(...)` — escapes the hashing and leaks a real class name into the
  global scope.
- a global `@import` — any `@import` (including the `@import url(...)` form)
  whose target is not another `*.module.css`.
- `composes: … from global` — composing from the global scope.

Bare element selectors (`button`, `canvas`, `div`) are scoped by the compiler
within the module and are **permitted**. Style your item with hashed class
names and element selectors; never reach into the global stylesheet.

## Import boundaries

Items live at the project root, outside `src/`, and import via the `@/` alias.
The allowed import surface is:

- `@/lib/…` — shared utilities.
- `@/components/ui/…` — the shadcn UI primitives.
- the item's own folder (relative imports within `playground/[slug]/`).

Items **must not** import from `src/app/` (route internals), nor from
`@/components/shared/` or `@/components/layout/` (site chrome). The dependency
must point inward to leaf utilities and UI primitives, never to the application
or layout layer. An item that needs site-layout behaviour is the wrong
abstraction — keep items self-contained.

## Overlay containment (M2)

If an item mounts a shadcn overlay (dialog, popover, tooltip, dropdown) on a
**same-page** item, the overlay portals to `document.body` by default — outside
the `.playground-container` reset — so it renders against the **site** theme
tokens, not the playground-scoped ones.

Decision rule:

- **Accept the `document.body` escape (the default)** unless the overlay must
  render against playground-scoped tokens. For most overlays the site tokens
  are the correct, expected surface — do nothing.
- **Contain the portal** only when the overlay genuinely must inherit the
  item's scoped tokens. In that case give the overlay a `container` prop
  pointing at an element inside `.playground-container` so the portal mounts
  within the reset.

Neither shipped sample mounts an overlay, so no containment ships as code; this
rule is the contract for future items. Iframe items do not have this problem —
they are a separate document.

## Launch constraints

Playground items run under deliberate constraints. These are authorship rules,
not enforced sandboxes:

- **Client-side only.** Items are client components prerendered at build. There
  is **no playground backend** — no API routes, no server actions, no
  persistence. Anything an item needs, it computes in the browser.
- **First-party only.** Every item is code you wrote and reviewed. The
  playground does not host third-party or user-submitted content.
- **No auth, no user data, no sensitive operations.** Items have no
  authentication and store no user data at launch.
- **The relaxed CSP is an authorship privilege, not a sandbox.** The
  `/playground/*` routes opt out of the site Content-Security-Policy so items
  can use inline code and external resources freely. This is acceptable _only
  because_ items are first-party. The relaxed CSP does **not** sandbox an item —
  it is permission to author freely, not a containment boundary. Treat item code
  with the same care as the rest of the site.

### External links from items

If an item links externally with `target="_blank"`, it **must** also carry
`rel="noopener noreferrer"`:

```tsx
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  Example
</a>
```

`target="_blank"` without `rel="noopener noreferrer"` exposes the opened page
to `window.opener` (a reverse-tabnabbing vector) and is not permitted. Neither
shipped sample needs an external link; this is the rule for items that do.
