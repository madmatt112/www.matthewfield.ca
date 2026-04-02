# Design: site-foundation

## Overview

Site-foundation delivers the complete development infrastructure and site shell for matthew-field.ca. This is a greenfield implementation — there is no existing codebase to integrate with. The design covers: project scaffolding, CI/CD pipeline, Velite content pipeline, site layout with navigation, dark/light theme toggle, landing page with hero cards, placeholder pages, custom 404, global styles via shadcn/ui defaults, metadata/SEO conventions, CSS isolation spike for the playground route group, testing infrastructure, CSP headers, and font loading.

All downstream specs depend on the toolchain, conventions, and infrastructure established here.

## Steering Document Alignment

### Technical Standards (tech.md)

- **Framework**: Next.js App Router with TypeScript strict mode, as specified.
- **Styling**: Tailwind CSS v4 + shadcn/ui. Components are owned source code via shadcn CLI.
- **Content pipeline**: Velite with MDX, generating typed collections in `.velite/` importable via `#site/content`.
- **Theme**: next-themes for dark/light toggle with system preference detection.
- **Testing**: Vitest for unit tests, Playwright for E2E, as specified.
- **Deployment**: Vercel via GitHub Actions. Preview deploys per PR.
- **CSP**: Route-scoped headers in `next.config.ts`. Content pages get restrictive CSP; playground routes opt out.
- **Font loading**: `next/font` to eliminate layout shift.

### Project Structure (structure.md)

Implementation follows the directory structure exactly as documented:

- `src/app/layout.tsx` — root layout (`<html>`, `<body>`, providers)
- `src/app/(site)/layout.tsx` — site layout (nav, footer)
- `src/app/(site)/page.tsx` — landing page
- `src/app/(playground)/layout.tsx` — playground layout (style reset)
- `src/components/layout/` — header, footer, nav, theme toggle
- `src/components/ui/` — shadcn/ui primitives
- `src/config/site.ts` — site metadata, nav items, hero card definitions
- `src/styles/globals.css` — Tailwind v4 import, CSS theme variables
- `content/pages/` — MDX content for slash pages
- `e2e/` — Playwright tests and config

Naming conventions: kebab-case files, PascalCase component exports, no barrel files, absolute imports via `@/*` alias.

## Code Reuse Analysis

### Existing Components to Leverage

This is a greenfield project. No existing components to reuse. The following are established by this spec for downstream consumption:

- **shadcn/ui Button**: Installed and verified in both themes. First UI primitive available.
- **Site layout components**: Header, Footer, Nav — consumed by all `(site)` route pages.
- **ThemeProvider + ThemeToggle**: Theme infrastructure reused by every page.
- **`src/config/site.ts`**: Central config consumed by nav, landing page hero cards, and metadata.
- **Velite `pages` schema**: Pattern for downstream specs to follow when adding content types.
- **`generateMetadata()` convention**: Pattern all page components follow.

### Integration Points

- **Vercel**: Deployment target. GitHub integration for preview deploys. Environment variables for downstream specs (e.g., `RESEND_API_KEY` in spec 2).
- **GitHub Actions**: CI pipeline. Downstream specs add steps (e.g., spec 4 adds Pagefind crawl).
- **Velite build output (`.velite/`)**: TypeScript imports via `#site/content`. Downstream specs add schemas to `velite.config.ts`.

## Architecture

### Overall Structure

```
Root Layout (layout.tsx)
├── ThemeProvider (next-themes)
├── Font loading (next/font)
│
├── (site) Route Group
│   ├── Site Layout (header + nav + main + footer)
│   │   ├── Landing Page (/)
│   │   ├── Placeholder Pages (/profile, /projects, etc.)
│   │   ├── Custom 404
│   │   └── [future content pages from downstream specs]
│
└── (playground) Route Group
    └── Playground Layout (style reset container)
        ├── Playground Index (/playground)
        └── [slug] routes (spike test fixtures)
```

### Build Pipeline

```
pnpm install
  └── postinstall: velite build (generates .velite/)

GitHub Actions (on push):
  1. pnpm install (triggers postinstall → velite build)
  2. pnpm lint (ESLint)
  3. pnpm format:check (Prettier)
  4. pnpm typecheck (tsc --noEmit)
  5. pnpm test (Vitest)
  6. pnpm build (Next.js build)
  7. pnpm test:e2e (Playwright against built site)
  8. Deploy to Vercel (main branch only, all checks pass)
```

### Modular Design Principles

- **Single file responsibility**: Layout components, page components, content schemas, and configuration are separate files.
- **Server components by default**: Only the theme toggle requires `"use client"`. All page components are server components.
- **Content/presentation separation**: Content in `content/` as MDX; presentation in React components; Velite bridges them.
- **Configuration-driven UI**: Nav items and hero cards defined in `src/config/site.ts`, not hardcoded in JSX.

## Components and Interfaces

### Root Layout (`src/app/layout.tsx`)

- **Purpose**: Wraps entire app with `<html>`, `<body>`, font classes, and ThemeProvider.
- **Interfaces**: `children: React.ReactNode`
- **Dependencies**: next-themes `ThemeProvider`, `next/font` configuration, `globals.css`
- **Exports**: `metadata` (default site metadata), `default` layout component

### Site Layout (`src/app/(site)/layout.tsx`)

- **Purpose**: Provides consistent header/nav/main/footer chrome for all content pages.
- **Interfaces**: `children: React.ReactNode`
- **Dependencies**: `Header`, `Footer`, `Nav` from `@/components/layout/`
- **Renders**: `<header>` with `<nav>`, `<main>{children}</main>`, `<footer>`

### Header (`src/components/layout/header.tsx`)

- **Purpose**: Site header containing navigation and theme toggle.
- **Dependencies**: `Nav`, `ThemeToggle`, `siteConfig` from `@/config/site.ts`
- **Behavior**: Sticky or fixed top bar. Contains site title/logo link to `/` and nav items.

### Nav (`src/components/layout/nav.tsx`)

- **Purpose**: Primary navigation links. Responsive — full links on desktop, collapsed menu on mobile.
- **Dependencies**: `navItems` from `@/config/site.ts`, Next.js `Link`
- **Behavior**: Renders links for all 6 major sections. Collapses into an accessible hamburger menu at the `lg` breakpoint (1024px) — 6 nav items plus site title and theme toggle require this space. Uses shadcn/ui `Sheet` (Radix UI primitive) for the mobile menu. Active link state based on current pathname.
- **Accessibility**: All links keyboard-navigable. Mobile menu toggle has `aria-label`, `aria-expanded`, `aria-haspopup="dialog"`. `aria-controls` is handled automatically by Radix Sheet's `Trigger` component.
- **Mobile layout**: On mobile, the header bar contains: site title, ThemeToggle button, hamburger button. ThemeToggle remains visible in the header at all breakpoints — users should not need to open the menu to change themes.
- **Known limitation**: After a client-side navigation triggered from the mobile Sheet, Radix returns focus to the hamburger button. The user must Tab through the header to reach the new page content. Next.js App Router does not manage focus on client-side navigation. A `usePathname()` effect that moves focus to `<main>` after route changes is the standard mitigation — deferred to a downstream accessibility pass rather than site-foundation scope.

### ThemeToggle (`src/components/layout/theme-toggle.tsx`)

- **Purpose**: Dropdown to switch between light, dark, and system themes.
- **Interfaces**: Standalone client component, no props.
- **Dependencies**: `useTheme` from next-themes. Renders a `Button` (shadcn/ui) trigger with sun/moon icon and a `DropdownMenu` (shadcn/ui) with three options: Light, Dark, System.
- **Behavior**: `"use client"` directive. 3-state selection (light / dark / system) via dropdown menu — the only way to return to system preference after overriding. Each option has an accessible label. Trigger button has `aria-label="Toggle theme"`.

### Footer (`src/components/layout/footer.tsx`)

- **Purpose**: Site footer with secondary links and slash page references.
- **Dependencies**: `siteConfig` from `@/config/site.ts`
- **Renders**: A link to `/slashes` for slash page discoverability, social links (GitHub, LinkedIn), and copyright.

### Landing Page (`src/app/(site)/page.tsx`)

- **Purpose**: Full-viewport page with personal intro and hero cards for each section.
- **Dependencies**: `heroCards` from `@/config/site.ts`, `HeroCard` component
- **Behavior**: Server component. Renders intro section with photo (Next.js `Image` component, sourced from `public/images/`, path hardcoded in component), then maps over `heroCards` config to render cards. Responsive grid: multi-column on desktop, single-column stack on mobile.

### HeroCard (`src/components/shared/hero-card.tsx`)

- **Purpose**: Card linking to a site section. Displays section title and short description.
- **Interfaces**: `{ title: string; description: string; href: string }`
- **Dependencies**: shadcn/ui `Card` component, Next.js `Link`
- **Behavior**: Clickable card navigating to section path. Hover state for visual feedback. The `Link` wraps the entire card content — a single focusable element per card. No `onClick` handler on the card container.

### Placeholder Page (`src/components/shared/placeholder-page.tsx`)

- **Purpose**: Styled page indicating a section is under construction.
- **Interfaces**: `{ title: string; description?: string }`
- **Behavior**: Renders section name, a short message ("This section is under construction"), and a link back to the landing page. Text is hardcoded in JSX — not content-pipeline-driven.
- **SEO**: Placeholder pages include `robots: { index: false }` in their `generateMetadata()` to prevent search engines from indexing empty pages during the launch window. The `noindex` directive is removed when a downstream spec replaces the placeholder with real content.

### Custom 404 (`src/app/not-found.tsx`)

- **Purpose**: Styled 404 page for nonexistent routes.
- **Dependencies**: Site layout (inherits from root layout)
- **Behavior**: Displays "Page not found" message with link to landing page. Text hardcoded in JSX.

### Site Config (`src/config/site.ts`)

- **Purpose**: Single source of truth for site metadata, navigation items, hero card definitions, and social links.
- **Exports**:
  - `siteConfig`: Site name, description, URL, default OG image path
  - `navItems`: Array of `{ label: string; href: string }` for navigation
  - `heroCards`: Array of `{ title: string; description: string; href: string }` for landing page

```typescript
type NavItem = {
  label: string
  href: string
}

type HeroCardConfig = {
  title: string
  description: string
  href: string
}

type SiteConfig = {
  name: string
  description: string
  url: string
  ogImage: string
  navItems: NavItem[]
  heroCards: HeroCardConfig[]
}
```

### Playground Layout (`src/app/(playground)/layout.tsx`)

- **Purpose**: Minimal layout for playground routes. Applies CSS isolation reset.
- **Dependencies**: Root layout (inherits `<html>`, `<body>`, ThemeProvider)
- **Behavior**: Does NOT render site header/nav/footer. Wraps children in the isolation container (see CSS Isolation Spike section).

## Data Models

### Velite `pages` Schema (`velite.config.ts`)

```typescript
const pages = defineCollection({
  name: "Page",
  pattern: "pages/*.mdx",
  schema: s.object({
    title: s.string(),
    description: s.string(),
    slug: s.path(),
    body: s.mdx(),
  }),
})
```

The glob uses `pages/*.mdx` (flat, no subdirectories) since each slash page has its own explicit route file — nested paths would produce slugs requiring catch-all routing.

This is the initial working pattern. Downstream specs add their own schemas (blog, projects, contributions, resources) following this pattern. Code comments in `velite.config.ts` document:
- How to add a new MDX collection (copy the `pages` pattern)
- How to add a YAML collection (example below)
- How computed fields work (e.g., slug derivation via `s.path()`)

YAML collection example for downstream reference:
```typescript
const resources = defineCollection({
  name: "Resource",
  pattern: "resources.yaml",
  schema: s.object({
    title: s.string(),
    url: s.string(),
    description: s.string(),
    category: s.string(),
  }),
})
```

### Site Configuration Shape

Defined in `src/config/site.ts` (see Components section above). This is TypeScript data, not Velite content — it's configuration about routes and sections, not authored prose content.

## CSS Isolation Spike Design

### Container Setup (R11 AC1)

The `(playground)` route group layout wraps children in a container `<div>` with a single CSS rule block:

```css
.playground-container {
  all: initial;
  isolation: isolate;
  display: block;
  box-sizing: border-box;
  unicode-bidi: normal;
}
```

All five properties in one rule block prevents cascade conflicts if styles are later refactored (per adversarial review finding 1.2).

### Layer Declaration (Hypothesis Under Test)

The spike's primary hypothesis is that declaring `@layer playground` before `@import "tailwindcss"` in `globals.css` establishes `playground` at the lowest cascade priority:

```css
@layer playground;
/* Tailwind v4 imports follow */
@import "tailwindcss";
```

Per the CSS spec, layers are ordered by their first `@layer` declaration in document order. Tailwind v4's `@import` expands into its own internal `@layer` declarations (`base`, `components`, `utilities`), which should appear after `playground` in the order. **This ordering behavior is the primary thing the spike must verify** — it depends on how Tailwind v4 emits its layer declarations after import expansion, which could vary between Tailwind minor versions and between bundlers (Turbopack vs. Webpack).

**If layer ordering fails**: The spike produces outcome (c) — same-page isolation not viable — and the playground defaults to iframe-only isolation. Spec 8 scope reduces accordingly. There is no intermediate CSS-only fallback; layers are the mechanism that makes same-page isolation viable, and without them the complexity of managing specificity and source order across bundlers is not justified.

### Playground Base Stylesheet

After `all: initial` resets inherited properties, a playground base stylesheet re-establishes typographic properties and properties whose initial values cause subtle failures:

```css
@layer playground {
  .playground-container {
    font-family: system-ui, sans-serif;
    font-size: 16px;
    line-height: 1.5;
    color: var(--foreground);
    box-sizing: border-box;
    color-scheme: light;
    -webkit-text-size-adjust: 100%;

    /* Re-establish shadcn/ui theme tokens (light-mode values only).
       Values must match tokens.css :root declarations.
       The playground container does not theme-switch — playground items
       control their own presentation per the tech doc. */
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --radius: 0.625rem;
    /* ... other tokens needed by shadcn/ui components */
  }
}
```

- **`color-scheme: light`**: Without this, `all: initial` resets to `normal`. Set to `light` because the playground container uses light-mode token values only — playground items do not inherit the site's dark/light mode per the tech doc.
- **`-webkit-text-size-adjust: 100%`**: Without this, `all: initial` resets to `auto`, allowing iOS Safari to independently inflate font sizes on narrow viewports.

### Playground Token Synchronization

`all: initial` breaks CSS custom property inheritance — tokens declared on `:root` in `tokens.css` do not cascade into the playground container. The playground base stylesheet must manually re-declare token values on `.playground-container` with literal values matching `tokens.css` `:root` declarations (light-mode only).

This is a known maintenance coupling: when `tokens.css` values change (e.g., during a downstream design pass), the playground base stylesheet must be updated to match. For ~20 tokens on a solo-developer site, this is an acceptable cost. The playground base stylesheet must mirror the complete token set from `tokens.css` `:root` declarations, not a guessed subset. The Playwright CSS isolation regression test (`e2e/tests/playground-isolation.test.ts`) serves as the enforcement mechanism — if token values drift, computed style assertions will fail.

**Known limitation**: The Playwright test checks a fixed set of tokens it was written to assert against. It does not automatically detect new tokens added to `tokens.css`. When new tokens are added (e.g., after a shadcn/ui component update introduces `--chart-*` or `--sidebar-*` tokens), both the playground base stylesheet and the Playwright test assertion list must be updated. Comments in the test file document this procedure.

`tokens.css` is the documented reference source. Comments in the playground stylesheet point to it explicitly.

### Spike Test Fixtures

Three test cases under the `(playground)` route group:

1. **Plain div with conflicting styles** (AC2): A `<div>` with explicit `color: red; font-family: serif;` inside the playground container. Verify site global styles don't override these values.

2. **shadcn/ui Button** (AC3): Render a `Button` component inside the playground container. Verify it renders correctly using CSS custom properties re-established by the base stylesheet. Test in both light and dark themes.

3. **Tailwind utilities** (AC4): Apply Tailwind classes (`bg-blue-500`, `p-4`, `text-lg`) inside the playground container. Verify they resolve correctly within `@layer playground`.

4. **Radix UI overlay** (AC6): Render a shadcn/ui `Dialog` inside the playground container. Radix UI renders all overlay components (Dialog, DropdownMenu, Popover, Tooltip, Select, etc.) to `document.body` by default via React portals — this is documented, expected behavior, not an unknown. The spike validates whether Radix's `container` prop can redirect portal rendering into the playground container. The spike should produce a brief matrix of which shadcn/ui overlay components support containment via `container` prop and which do not.

### Spike Verification (AC5)

Compare computed style values (`getComputedStyle()`) for key properties between dev (Turbopack) and production (Webpack) builds:
- `color`, `background-color`, `font-family`, `padding`: exact string match
- `font-size`, `line-height`: match within 1px

### Graduated Outcome (AC7)

The spike produces one of three results:

- **(a) Full same-page isolation viable**: All ACs pass. Playground items can use same-page rendering freely.
- **(b) Same-page isolation viable with restrictions**: Some ACs fail with documented mitigations (e.g., portal escape requires iframe for overlay-heavy items, but simple items work same-page).
- **(c) Same-page isolation not viable**: AC2 or AC4 fail fundamentally. Playground defaults to iframe-only. Spec 8 scope reduces accordingly.

Items encountering isolation issues not covered by the spike's mitigations use iframe isolation per the tech doc's decision rule ("when in doubt, use iframe").

## CI/CD Pipeline Design

### GitHub Actions Workflow (`.github/workflows/ci.yml`)

Single job with sequential steps. A two-job split (build + e2e) would require artifact passing to avoid rebuilding from scratch in the second job — unnecessary complexity for a solo-developer project.

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "pnpm"
      - run: pnpm install  # triggers postinstall → velite build
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build

      # E2E tests — run against the production build from the step above
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ hashFiles('pnpm-lock.yaml') }}
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
```

Vercel handles deployment via its GitHub integration — automatic deploy on push to main when checks pass, preview deploys on PRs. No deploy step needed in the Actions workflow.

### Package Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "concurrently --kill-others-on-fail --names velite,next \"velite dev\" \"next dev --turbopack\"",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "postinstall": "velite build"
  }
}
```

`concurrently` (dev dependency) runs Velite's file watcher alongside Next.js dev server. This is necessary because Turbopack does not execute webpack plugins — the `VeliteWebpackPlugin` pattern used by many Velite guides is inert under `next dev --turbopack`. Without `velite dev`, content file changes (adding/editing MDX in `content/`) would require a manual `velite build` or dev server restart.

## Global Styles and Theming Design

### CSS Theme Variables (`src/styles/globals.css`)

```css
@layer playground;

@import "tailwindcss";

/* tokens.css is intentionally unlayered — unlayered CSS cascades above
   Tailwind's layered base/components/utilities, ensuring token values
   take priority. Do not wrap this import in a @layer declaration. */
@import "./tokens.css";

@theme {
  /* Map Tailwind utilities to shadcn/ui CSS custom properties */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ... additional shadcn/ui token mappings */
}
```

### Theme Tokens (`src/styles/tokens.css`)

Source of truth for CSS custom property values. Imported by `globals.css` (applied to `:root`/`.dark` for the main site). The playground base stylesheet manually re-declares light-mode values from this file on `.playground-container` (see Playground Token Synchronization above).

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --radius: 0.625rem;
  /* ... full shadcn/ui default token set */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  /* ... dark mode overrides */
}
```

Exact values are generated by `npx shadcn@latest init` — the above illustrates the pattern. Downstream specs extend by adding new CSS custom properties to `tokens.css` following the same naming convention.

### Font Loading

```typescript
// src/app/layout.tsx
import { Geist, Geist_Mono } from "next/font/google"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})
```

`next/font/google` is the chosen approach — it auto-self-hosts fonts at build time (no external font requests) and works reliably on GitHub Actions public runners. `adjustFontFallback` is enabled by default, eliminating CLS from font swapping. Fallback to `next/font/local` with committed font files in `public/fonts/` only if the deployment environment changes (e.g., air-gapped CI). Font families can be revised in a downstream design pass — the infrastructure pattern is what this spec establishes.

## Metadata and SEO Design

### Title Template

```typescript
// src/app/layout.tsx
export const metadata: Metadata = {
  title: {
    default: "Matthew Field",
    template: "%s | matthew-field.ca",
  },
  description: "Infrastructure/Platform/DevOps engineer...",
  openGraph: {
    images: ["/images/og-default.png"],
  },
}
```

### Per-Page Pattern

```typescript
// src/app/(site)/profile/page.tsx
export function generateMetadata(): Metadata {
  return {
    title: "Professional Profile",
    description: "...",
  }
}
```

All downstream page components follow this pattern. The title template appends `| matthew-field.ca` automatically.

### XML Sitemap

```typescript
// src/app/sitemap.ts
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/", "/profile", "/projects", "/contributions", "/blog", "/resources", "/playground", "/about", "/contact", "/colophon", "/now", "/sitemap", "/slashes"]
  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
  }))
}
```

Downstream specs extend this file to include dynamic routes (blog posts, project pages).

### Default OG Image

A static 1200x630 PNG created and committed to the repo at `public/images/og-default.png`. Simple branded image with site name. Used by pages that don't specify their own OG image. Dynamic OG image generation via `next/og` is a downstream concern — unnecessary complexity for a default image.

## CSP Headers Design

### Configuration (`next.config.ts`)

```typescript
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-src 'self'",
  "connect-src 'self'",
].join("; ")

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/((?!playground(/|$)).*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: cspDirectives,
        },
      ],
    },
  ],
}
```

- Content pages get the full CSP. `default-src 'self'` provides a baseline fallback.
- `connect-src 'self'` is sufficient — the contact form (spec 2) uses `/api/contact` (same origin). Note: `connect-src` must be updated when external analytics (Plausible, Umami, Vercel Analytics) are added.
- `font-src 'self'` explicit for clarity since `next/font` self-hosts.
- Playground routes (`/playground` and `/playground/*`) are excluded via negative lookahead regex with segment boundary (`(/|$)`) — prevents accidentally excluding unrelated routes like a hypothetical `/playground-tips`.
- **Nonce-based CSP was considered and rejected.** Next.js 14+ supports nonce-based CSP which eliminates `'unsafe-inline'` for scripts, but it requires dynamic header generation (a new nonce per request) via edge middleware. This adds latency (~1-5ms), consumes Vercel edge function invocations, and conflicts with the static-first architecture. For a personal site with no user authentication and no stored data, `'unsafe-inline'` is an acceptable tradeoff.

## Velite Pipeline Design

### Configuration (`velite.config.ts`)

```typescript
import { defineConfig, defineCollection, s } from "velite"

const pages = defineCollection({
  name: "Page",
  pattern: "pages/*.mdx",
  schema: s.object({
    title: s.string(),
    description: s.string(),
    slug: s.path(),
    body: s.mdx(),
  }),
})

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    clean: true,
  },
  collections: { pages },
  // Code comments documenting:
  // - How to add a new MDX collection (copy pages pattern)
  // - How to add a YAML collection
  // - How computed fields work
})
```

### TypeScript Integration

Path alias in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "#site/content": ["./.velite"]
    }
  }
}
```

### Empty Directory Handling

Velite must succeed with empty content directories. If Velite requires at least one file per defined collection, add a minimal placeholder MDX file in `content/pages/` (e.g., a placeholder about page). This is verified during implementation.

### Next.js Integration

No `VeliteWebpackPlugin` in `next.config.ts` — Turbopack (used by the dev script) ignores webpack plugins entirely. Content rebuilds during development are handled by `velite dev` running as a parallel process (see Package Scripts). In CI, `postinstall` runs `velite build` before `next build`, so the `.velite/` directory is always fresh.

## Testing Design

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
})
```

### Playwright Configuration

```typescript
// e2e/playwright.config.ts
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  webServer: {
    command: "pnpm start",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:3000",
  },
})
```

### Canary Tests

**Vitest canary** (`src/components/ui/button.test.tsx`): Renders a shadcn/ui `Button` via `@testing-library/react`, asserts it renders visible text. Proves path aliases resolve, JSX transforms work, and the jsdom test environment is functional.

**Playwright canary** (`e2e/tests/smoke.test.ts`): Navigates to `/`, asserts page loads with expected title and a visible `<h1>` heading. Proves the site starts and renders content (not just serves a response).

### Site-Foundation Specific Tests

**Playwright — theme toggle** (`e2e/tests/theme.test.ts`):
- Load page, verify initial theme matches system preference or default
- Click theme toggle, verify theme class changes on `<html>`
- Reload page, verify theme persists

**Playwright — navigation** (`e2e/tests/navigation.test.ts`):
- Navigate to each major section via nav links
- Verify placeholder pages render (not 404)
- Verify 404 page renders for nonexistent route
- Verify mobile nav menu opens/closes at small viewport

**Playwright — landing page** (`e2e/tests/landing.test.ts`):
- Verify hero cards render for all sections
- Click a hero card, verify navigation to correct path

**Playwright — CSS isolation spike** (`e2e/tests/playground-isolation.test.ts`):
- Navigate to the playground spike fixture page
- Use `page.evaluate(() => getComputedStyle(...))` to read computed values on the test div inside the playground container
- Assert site global styles don't leak (e.g., `color` matches the fixture's explicit value, not the global theme's `--foreground`)
- Assert shadcn/ui Button renders with expected computed styles inside the container
- This test runs against the production build in CI, providing regression coverage against Tailwind updates, bundler changes, or `globals.css` modifications that could break isolation

**Playwright — CSP headers** (`e2e/tests/csp.test.ts`):
- Navigate to a content page, assert `Content-Security-Policy` header is present with expected directives (`default-src 'self'`, `script-src 'self' 'unsafe-inline'`, etc.)
- Navigate to a playground page, assert `Content-Security-Policy` header is absent
- Prevents silent CSP removal via `next.config.ts` refactoring

## Error Handling

### Build-Time Errors

1. **Velite schema validation failure**
   - **Handling**: Velite exits with non-zero code, build fails
   - **User impact**: CI blocks deployment. Developer sees schema validation error in build output.

2. **TypeScript compilation failure**
   - **Handling**: `tsc --noEmit` fails in CI
   - **User impact**: CI blocks deployment. Type error shown in build output.

3. **Missing `.velite/` directory**
   - **Handling**: `postinstall` script runs `velite build`. If skipped, `tsc` fails on `#site/content` imports.
   - **User impact**: Clear error message about missing content imports.

### Runtime Errors

4. **Theme flash (FOUC)**
   - **Handling**: next-themes injects a blocking script to set the theme class before first paint.
   - **User impact**: None — handled by library.

5. **404 — unknown route**
   - **Handling**: Next.js serves custom `not-found.tsx`
   - **User impact**: Styled 404 page with link back to home.

### Silent Failures

6. **CSS syntax errors in `tokens.css` or `globals.css`**
   - **Handling**: CSS syntax errors are not build errors — the CSS parser silently ignores malformed rules. Affected tokens become undefined, causing components to render with browser defaults (transparent backgrounds, black text).
   - **Mitigation**: Caught visually via Vercel preview deploys before merging to main. Acceptable risk for a solo-developer project.

7. **Error boundaries (`error.tsx`)**
   - Deferred — not included in site-foundation. The default Next.js error page is functional for a solo-developer site. Added when needed by downstream specs.

## Implementation Order

Per the decomposition's recommendation, with R12 moved to phase 1 (the spike in phase 2 requires Playwright for computed style verification — deferring test infrastructure to phase 4 would force manual-only spike validation):

1. **Scaffolding + CI/CD + testing infrastructure** (R1, R2, R12): Initialize Next.js project, configure TypeScript, ESLint, Prettier, pnpm, .nvmrc, GitHub Actions workflow, Vitest + Playwright configuration with canary tests. Testing infrastructure has no dependencies and is needed by phase 2.
2. **CSS isolation spike + Velite pipeline** (R11, R3): Run the spike before CSS architecture is finalized so findings inform layout/theme decisions. Set up Velite with `pages` schema.
3. **Styles + fonts + theme → layouts + metadata + CSP** (R9, R14, R5, R4, R10, R13): Internal sub-ordering:
   1. R9 (global styles/tokens) — foundation for everything visual
   2. R14 (font loading) — configured in root layout
   3. R5 (theme toggle) — depends on styles infrastructure
   4. R4 (layouts + nav) — uses styles, fonts, theme
   5. R10 (metadata/SEO) — can parallel with R4
   6. R13 (CSP headers) — independent, done whenever
4. **Landing page + hero cards + placeholders + 404** (R6, R7, R8): Landing page, placeholder pages (with `noindex`), 404 page.

### Playground Layout Under Spike Outcome (c)

If the spike produces outcome (c) — same-page isolation not viable — the `(playground)/layout.tsx` simplifies:

- No `all: initial` style-reset container
- No `@layer playground` or playground base stylesheet
- The layout is a minimal wrapper that renders children directly
- All playground items load via iframe pointing to `/playground/[slug]/embed` routes
- The playground index/gallery page is unaffected — it still lists items from the manifest
- Spec 8's scope reduces: no same-page rendering path, no CSS isolation infrastructure beyond what the iframe provides natively
