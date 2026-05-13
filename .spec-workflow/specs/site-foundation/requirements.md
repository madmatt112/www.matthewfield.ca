# Requirements: site-foundation

## Introduction

Site foundation establishes the complete development and deployment infrastructure for matthewfield.ca — a markdown-driven, statically-generated personal website replacing the existing WordPress.com site. This spec delivers the project scaffolding, build pipeline, CI/CD, content processing, site shell (layout, navigation, theme toggle), landing page, and a CSS isolation spike that determines the playground's architectural approach. It is the largest spec by scope because all downstream specs depend on the toolchain, conventions, and infrastructure established here.

## Alignment with Product Vision

This spec directly supports every product principle and business objective by providing the foundation they depend on:

- **Markdown-first content**: Velite content pipeline with typed schemas enables all content specs to follow a consistent pattern.
- **Simple to maintain**: CI/CD automation, TypeScript strict mode, and linting ensure content changes deploy reliably without manual intervention.
- **Wide and spacious / Responsive**: The root layout, CSS theme variables, and Tailwind configuration establish the design system that all pages inherit.
- **Approachable and human**: Landing page hero cards give visitors an immediate overview of who Matthew is and what the site offers.
- **Progressive complexity**: The CSS isolation spike validates whether playground items can coexist with the main site's styles, enabling the playground spec's architecture decision.
- **Professional inbound funnel**: Without a deployed, navigable site shell, no downstream spec can deliver user-facing value.

## Requirements

### R1: Project Scaffolding

**User Story:** As Matthew, I want a properly configured Next.js project with TypeScript strict mode, ESLint, Prettier, and pinned tool versions, so that the codebase is consistent and reproducible across machines and CI.

#### Acceptance Criteria

1. WHEN the project is initialized THEN the system SHALL use Next.js App Router with TypeScript strict mode enabled in `tsconfig.json`.
2. WHEN a developer clones the repo THEN the system SHALL enforce the correct Node.js version via `.nvmrc` (Node.js 24 LTS) and pnpm version via the `packageManager` field in `package.json`.
3. WHEN code is written THEN ESLint (with Next.js config) and Prettier SHALL be configured and runnable via `pnpm lint` and `pnpm format`.
4. WHEN `pnpm install` completes THEN all dependencies SHALL install without errors or unresolved version conflicts (exit code 0).

---

### R2: CI/CD Pipeline

**User Story:** As Matthew, I want automated lint, type-check, test, build, and deploy steps on every push to main, so that broken code never reaches production.

#### Acceptance Criteria

1. WHEN code is pushed to any branch THEN GitHub Actions SHALL run lint, type-check, unit tests (Vitest), and build steps.
2. WHEN code is pushed to main and all checks pass THEN the system SHALL deploy to Vercel automatically.
3. WHEN a pull request is opened THEN Vercel SHALL create a preview deployment accessible via a unique URL.
4. WHEN Velite content processing is required THEN the CI pipeline SHALL run Velite build before type-checking, so that imports from `#site/content` resolve without TypeScript errors.
5. WHEN Playwright E2E tests are configured THEN the CI pipeline SHALL include a step to run them against the built site.
6. The CI pipeline established in this spec is a foundation that downstream specs extend. Specifically, spec 4 (blog-enhanced) adds the Pagefind crawl step. Extensions are added as additional steps or jobs in the existing GitHub Actions workflow file. Link checking (lychee) is deferred to the first content spec that produces link-heavy pages (blog-core or later), not site-foundation.

---

### R3: Velite Content Pipeline

**User Story:** As Matthew, I want a build-time content processing pipeline with typed schemas, so that I can author content in markdown/MDX files and have it validated and available as typed data at build time.

#### Acceptance Criteria

1. WHEN Velite is configured THEN the system SHALL define a `pages` schema for landing page and slash page content as the initial working pattern.
2. WHEN `velite build` runs THEN it SHALL generate typed JSON collections in `.velite/` importable via `#site/content`.
3. WHEN `velite build` runs with empty content directories THEN the build SHALL succeed, either natively (empty array) or via placeholder content files.
4. WHEN a downstream spec needs a new content type THEN code comments in `velite.config.ts` SHALL explain the pattern for adding a new schema, covering both MDX and YAML collection types. Note: YAML patterns are documented guidance; downstream specs are responsible for validating their specific YAML schemas work end-to-end.
5. WHEN `pnpm install` runs THEN a postinstall script or explicit build step SHALL generate `.velite/` so that TypeScript compilation succeeds without manual intervention. Note: this serves local development ergonomics (editor type resolution); the CI pipeline (R2 AC4) runs Velite build as the authoritative step for builds.

---

### R4: Site Layout and Navigation

**User Story:** As a visitor, I want a consistent site shell with header, navigation, and footer, so that I can navigate between sections of the site from any page.

#### Acceptance Criteria

1. WHEN any page loads THEN the system SHALL render a root layout containing a header with navigation links, main content area, and footer.
2. WHEN the navigation renders THEN it SHALL include links to all major sections, even if those sections are placeholder pages. Section-to-path mapping (structure doc is authoritative):

   | Section | Path |
   |---|---|
   | Professional Profile | `/profile` |
   | Projects | `/projects` |
   | Contributions | `/contributions` |
   | Blog | `/blog` |
   | Resources | `/resources` |
   | Playground | `/playground` |

3. WHEN a visitor is on a mobile device THEN the navigation SHALL remain accessible and fully functional at all breakpoints, adapting to a responsive layout on small screens.
4. WHEN a visitor navigates between pages THEN the layout shell (header, footer) SHALL persist without full-page reloads (Next.js App Router behavior).
5. WHEN the site renders THEN it SHALL use semantic HTML elements (`<header>`, `<nav>`, `<main>`, `<footer>`) for accessibility.
6. WHEN the footer renders THEN it SHALL include links to slash pages or a link to `/slashes` for discoverability of secondary pages.

---

### R5: Dark/Light Theme Toggle

**User Story:** As a visitor, I want to switch between dark and light themes, so that I can view the site in my preferred color scheme.

#### Acceptance Criteria

1. WHEN the site loads for the first time THEN the system SHALL respect the visitor's OS color scheme preference via next-themes system detection.
2. WHEN a visitor clicks the theme toggle THEN the system SHALL switch between dark and light themes without a full page reload.
3. WHEN the theme is toggled THEN the system SHALL persist the preference so that subsequent visits use the chosen theme.
4. WHEN the page initially renders THEN the system SHALL NOT flash the incorrect theme (no FOUC — next-themes handles this).
5. WHEN theme variable values are chosen during implementation THEN they SHALL meet WCAG 2.1 AA color contrast ratios (4.5:1 normal text, 3:1 large text), verified via automated tooling or manual check during R9 implementation (when theme values are finalized).

---

### R6: Landing Page

**User Story:** As a visitor, I want a full-viewport landing page with a short personal intro and hero cards for each major section, so that I can quickly understand who Matthew is and navigate to what interests me.

#### Acceptance Criteria

1. WHEN the landing page loads THEN the system SHALL display a personal introduction section with photo(s) at the top.
2. WHEN the landing page loads THEN the system SHALL display hero cards for each major section (same sections and paths as the R4 AC2 mapping table).
3. WHEN a hero card is clicked THEN the system SHALL navigate to the corresponding section page.
4. WHEN hero cards are configured THEN they SHALL be data-driven (defined in `src/config/site.ts`), so that sections can be added or removed by editing the site config file rather than modifying page component JSX.
5. WHEN a linked section has not yet been built THEN the hero card SHALL link to a styled placeholder page that communicates the section is coming soon.
6. WHEN the landing page renders on mobile THEN the hero cards SHALL reflow to a responsive layout that is fully usable on small screens.

---

### R7: Placeholder Pages

**User Story:** As a visitor arriving via navigation, I want to see a styled placeholder page for sections not yet built, so that I understand the section exists but is not yet available (rather than seeing a 404).

#### Acceptance Criteria

1. WHEN a visitor navigates to a section that has not yet been implemented THEN the system SHALL render a styled placeholder page indicating the section is under construction. Note: short, fixed UI text for placeholder pages is hardcoded in JSX — the markdown-first product principle applies to regularly-updated authored content, not static UI chrome.
2. WHEN placeholder pages render THEN they SHALL use the site's layout shell (header, navigation, footer) and respect the current theme.
3. The `/contact` route SHALL be a placeholder page in this spec. Contact form infrastructure is delivered in spec 2 (professional-profile).

---

### R8: Custom 404 Page

**User Story:** As a visitor who navigates to a nonexistent URL, I want a styled 404 page, so that I understand the page doesn't exist and can navigate back to valid content.

#### Acceptance Criteria

1. WHEN a visitor navigates to a URL that does not match any route THEN the system SHALL render a custom 404 page. Note: 404 page text is hardcoded in JSX — the markdown-first product principle applies to regularly-updated authored content, not static UI chrome.
2. WHEN the 404 page renders THEN it SHALL include the site layout shell and a link back to the landing page.

---

### R9: Global Styles and CSS Theme Variables

**User Story:** As a developer, I want theming infrastructure with CSS variables and Tailwind integration, so that all pages and components share a cohesive visual foundation that can be customized later.

#### Acceptance Criteria

1. WHEN shadcn/ui is initialized THEN `globals.css` SHALL contain CSS custom properties matching shadcn/ui's default theme tokens (as generated by `npx shadcn@latest init`) for both light and dark modes. Custom design values are a downstream concern — this spec delivers the infrastructure. Downstream specs extend theme tokens by adding CSS custom properties to `globals.css` following the shadcn/ui naming convention.
2. WHEN Tailwind CSS v4 is configured THEN Tailwind utility classes (`bg-primary`, `text-foreground`, etc.) SHALL resolve to the CSS theme variables defined in AC1.
3. WHEN shadcn/ui is initialized THEN at least one component (Button) SHALL be installed and visually verified in both light and dark themes during implementation.

---

### R10: Metadata and SEO Convention

**User Story:** As Matthew, I want a consistent metadata/SEO pattern across all pages, so that the site is discoverable via search engines and link previews render correctly.

#### Acceptance Criteria

1. WHEN any page renders THEN it SHALL include a `<title>` following the template pattern (e.g., "Page Title | matthewfield.ca").
2. WHEN the site is deployed THEN a default Open Graph image SHALL be available in `public/images/` for pages that don't specify their own. Minimum dimensions: 1200×630 pixels. Format: PNG or JPG.
3. WHEN a page component is created THEN it SHALL export a `generateMetadata()` function following the established convention.
4. WHEN the site is built THEN an XML sitemap SHALL be generated and available at `/sitemap.xml`.

---

### R11: CSS Isolation Spike (Playground)

**User Story:** As a developer, I want to validate CSS isolation for the playground route group, so that the playground spec can make an informed architectural decision about same-page rendering vs. iframe-only isolation.

#### Acceptance Criteria

1. WHEN the spike is implemented THEN the system SHALL create a `(playground)` route group with a playground container. The container MUST apply `all: initial`, `isolation: isolate`, `display`, `box-sizing`, and `unicode-bidi` overrides in a single CSS rule block on the container element (preventing cascade conflicts if styles are later refactored). The container also applies `@layer playground`. The `@layer playground` declaration order relative to Tailwind v4's internal layers (`base`, `components`, `utilities`) must be explicitly defined and documented as a spike deliverable. IF `@layer playground` cannot be ordered predictably relative to Tailwind v4's internal layers, THEN the spike SHALL document the alternative approach (e.g., high-specificity selectors, CSS Modules without layers). A playground base stylesheet SHALL re-establish typographic properties (`font-family`, `font-size`, `line-height`, `color`, `box-sizing`) and the CSS custom properties required by shadcn/ui components (`--background`, `--foreground`, `--primary`, `--radius`, and other theme tokens from `globals.css`) after the `all: initial` reset.
2. WHEN a plain div with conflicting colors/fonts is placed inside the playground container THEN the site's global styles SHALL NOT affect it (proves basic `all: initial` works).
3. WHEN a shadcn/ui component (Button or Card) is rendered inside the playground container THEN it SHALL render correctly using CSS custom properties re-established by the playground base stylesheet.
4. WHEN Tailwind utility classes are applied inside the playground container THEN they SHALL work correctly within `@layer playground`.
5. WHEN the spike is tested THEN it SHALL be verified in both light and dark themes, and in both dev (Turbopack) and production (Webpack) builds. Verification SHALL compare computed style values for key properties (color, font-family, padding, background) on the test components between builds, not just visual inspection.
6. WHEN a Radix UI overlay component (e.g., shadcn/ui Dialog or DropdownMenu) is rendered inside the playground container THEN the spike SHALL verify whether the portal renders within the isolation boundary or escapes to `document.body`. If portals escape isolation, the spike SHALL document this as a known limitation with a mitigation path (e.g., portal containment or iframe fallback for items using overlays).
7. The spike SHALL produce a graduated outcome, not a binary pass/fail: (a) **full same-page isolation viable** — all ACs pass, playground items can use same-page rendering freely; (b) **same-page isolation viable with restrictions** — some ACs fail with documented mitigations (e.g., portal escape requires iframe for overlay-heavy items, but simple items work same-page); (c) **same-page isolation not viable** — AC2 or AC4 fail fundamentally, playground defaults to iframe-only. The graduated result directly informs the playground spec's per-item `iframeIsolated` decision. Items encountering isolation issues not covered by the spike's mitigations SHALL use iframe isolation per the tech doc's decision rule ("when in doubt, use iframe").

---

### R12: Testing Infrastructure

**User Story:** As a developer, I want Vitest and Playwright configured and ready to use, so that downstream specs can add tests without setup overhead.

#### Acceptance Criteria

1. WHEN Vitest is configured THEN `pnpm test` SHALL run unit tests and report results.
2. WHEN Playwright is configured THEN `pnpm test:e2e` SHALL run end-to-end tests against the built site. Playwright config SHALL live at `e2e/playwright.config.ts` per the structure doc.
3. WHEN tests are added THEN they SHALL be runnable both locally and in CI.
4. The system SHALL include at least one canary test per runner: a Vitest unit test proving path aliases and TSX transforms resolve correctly, and a Playwright test proving the site starts and a page loads. This validates that the test infrastructure actually works before downstream specs depend on it.

---

### R13: CSP Headers

**User Story:** As a developer, I want Content Security Policy headers configured, so that the site has baseline protection against resource injection.

#### Acceptance Criteria

1. WHEN content pages are served THEN the response SHALL include CSP headers with: `default-src 'self'`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:`, `object-src 'none'`, `base-uri 'self'`, `frame-src 'self'`, `connect-src 'self'`.
2. WHEN playground routes (`/playground/*`) are served THEN the response SHALL NOT include CSP headers (effectively opting out of CSP). This is acceptable per the tech doc's threat model: playground items have no auth, no stored data, and no sensitive operations.
3. WHEN CSP headers are configured THEN they SHALL be defined via path-based headers in `next.config.ts`.

### R14: Font Loading

**User Story:** As a visitor, I want the site to load fonts without visible layout shift, so that the reading experience is smooth from first paint.

#### Acceptance Criteria

1. WHEN the site loads THEN fonts SHALL be loaded via `next/font` to eliminate layout shift (CLS) from font swapping.
2. WHEN `next/font` is configured THEN it SHALL use either `next/font/local` with self-hosted font files in `public/fonts/` or `next/font/google` with automatic self-hosting (Next.js downloads and serves Google Fonts from the same domain at build time). The specific font choice is a design-phase decision; system font stack is an acceptable initial baseline.
3. WHEN the font configuration is complete THEN the fallback font stack SHALL use `next/font`'s automatic font metric adjustment (`adjustFontFallback`) or equivalent `size-adjust`/`ascent-override` declarations to eliminate layout shift.

---

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility**: Each file has one purpose — layout components, page components, content schemas, and configuration are in separate files.
- **Modular Design**: Components are isolated and reusable. shadcn/ui components are the base building blocks. Layout components compose without tight coupling.
- **Server Components by Default**: Page components are React server components. Client components (`"use client"`) are used only for interactive elements (theme toggle).
- **Content/Presentation Separation**: Content is in `content/` as MDX files; presentation is in React components. Velite provides the bridge.

### Performance

- Static pages should target 90+ Lighthouse performance score. This is a design target verified via manual Lighthouse audit after deployment (per the decomposition's cross-spec convention), not a CI gate in this spec.
- The site SHALL use server components by default to minimize client-side JavaScript.
- Site chrome images (landing page photos, UI assets) SHALL be optimized via Next.js Image component (automatic WebP/AVIF, lazy loading, responsive sizes). MDX content images go through Velite's copy pipeline as standard `<img>` tags — content image optimization is a downstream spec concern.

### Security

- CSP headers SHALL be configured as specified in R13.
- No user data is stored or processed in this spec (contact form is spec 2).

### Reliability

- Velite build SHALL validate content schemas at build time, catching malformed content before it reaches production.

### Usability

- The site SHALL be responsive across desktop, tablet, and mobile breakpoints using Tailwind CSS v4 default breakpoints (`sm`, `md`, `lg`, `xl`, `2xl`).
- Mobile is a first-class target — navigation, landing page, and all layout elements SHALL adapt gracefully to small screens.

### Accessibility

- This spec delivers structural accessibility: semantic HTML, keyboard navigation, and ARIA attributes for all interactive elements. Color contrast conformance depends on finalized theme values (R9 uses shadcn/ui defaults which meet AA); content accessibility (image alt text coverage, screen reader testing) is a constraint on downstream content specs.
- All layout elements SHALL use semantic HTML (`<header>`, `<nav>`, `<main>`, `<footer>`).
- Keyboard navigation SHALL work for all interactive elements (navigation links, theme toggle).
- The theme toggle SHALL be keyboard-accessible and have an accessible label.
