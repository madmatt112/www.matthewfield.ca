# Tasks: site-foundation

## Phase 1: Scaffolding + CI/CD + Testing Infrastructure (R1, R2, R12)

- [x] 1. Initialize Next.js project with TypeScript strict mode
  - File: package.json, tsconfig.json, .nvmrc, next.config.ts
  - Initialize Next.js App Router project with TypeScript strict mode enabled
  - Pin Node.js 24 LTS via `.nvmrc`, set `packageManager` field for pnpm in `package.json`
  - Configure path aliases (`@/*` and `#site/content`) in `tsconfig.json`
  - Purpose: Establish reproducible project foundation with correct tooling versions
  - _Requirements: R1 AC1, R1 AC2, R1 AC4_
  - _Prompt: Role: Full-stack developer setting up a greenfield Next.js App Router project | Task: Initialize Next.js with TypeScript strict mode using create-next-app with --tailwind flag (ensures tailwindcss is installed as a dependency), configure .nvmrc for Node.js 24 LTS, set pnpm via packageManager field, configure path aliases @/* and #site/content in tsconfig.json | Restrictions: Use App Router (not Pages Router), must use --tailwind flag, TypeScript strict mode must be enabled, follow kebab-case file naming convention, no barrel files | Success: pnpm install exits 0, tsc --noEmit passes, path aliases resolve correctly, tailwindcss is in dependencies_

- [x] 2. Configure ESLint and Prettier
  - File: eslint.config.mjs, .prettierrc, .prettierignore
  - Set up ESLint with Next.js config and Prettier for code formatting
  - Add `pnpm lint` and `pnpm format` / `pnpm format:check` scripts
  - Purpose: Enforce consistent code style across the project
  - _Requirements: R1 AC3_
  - _Prompt: Role: Developer configuring linting and formatting for a Next.js TypeScript project | Task: Configure ESLint with Next.js config and Prettier, add lint/format/format:check scripts to package.json | Restrictions: Use flat ESLint config, ensure ESLint and Prettier do not conflict, add .prettierignore for build artifacts (.next, .velite, node_modules) | Success: pnpm lint and pnpm format:check run without errors on the initial codebase_

- [x] 3. Set up GitHub Actions CI pipeline
  - File: .github/workflows/ci.yml
  - Create single-job CI workflow with: install, lint, format:check, typecheck, test, build, Playwright install, test:e2e
  - Trigger on push to main and pull requests to main
  - Purpose: Automate quality gates so broken code never reaches production
  - _Requirements: R2 AC1, R2 AC2, R2 AC4, R2 AC5, R2 AC6_
  - _Prompt: Role: DevOps engineer configuring CI for a Next.js project on GitHub Actions | Task: Create .github/workflows/ci.yml with single-job pipeline: checkout, pnpm setup, node setup with .nvmrc, pnpm install, lint, format:check, typecheck, test (vitest), build, playwright install with browser caching, test:e2e. Note: postinstall script (velite build) is added in task 7 — CI should tolerate its absence until then | Restrictions: Single job (no artifact passing), use pnpm/action-setup@v4 and actions/setup-node@v4 with cache: pnpm, cache Playwright browsers via actions/cache@v4 keyed on pnpm-lock.yaml hash. Vercel handles deployment via its own GitHub integration — no deploy step in this workflow | Success: Workflow runs all steps sequentially, caches pnpm and Playwright browsers, fails fast on any step failure_

- [x] 4. [MANUAL] Configure Vercel project and preview deploys
  - Vercel platform configuration (non-code task — requires Vercel dashboard or authenticated CLI access)
  - Link GitHub repo to Vercel project
  - Enable automatic deploys on push to main and preview deploys on PRs
  - Verify preview deploy works by opening a test PR
  - This task does not block any subsequent task and can be completed at any point before the first production deployment
  - Purpose: Enable automated deployment and PR preview environments
  - _Requirements: R2 AC2, R2 AC3_
  - _Prompt: Role: DevOps engineer configuring Vercel deployment | Task: Link the matthew-field.ca GitHub repo to a Vercel project. Configure automatic production deploys on push to main (when CI checks pass). Verify preview deploys are enabled for pull requests. Open a test PR to confirm a preview deployment is created with a unique URL | Restrictions: No deploy step in GitHub Actions — Vercel's GitHub integration handles this. Do not configure custom domains yet | Success: Push to main triggers production deploy, PRs get preview deploys with unique URLs_

- [ ] 5. Configure Vitest with canary test
  - File: vitest.config.ts, src/canary.test.tsx
  - Set up Vitest with jsdom environment, React plugin, and path aliases
  - Add `pnpm test` script. Write canary test rendering a plain React component (not shadcn/ui — components not installed yet)
  - Purpose: Validate unit test infrastructure works before downstream specs depend on it
  - _Requirements: R12 AC1, R12 AC3, R12 AC4_
  - _Prompt: Role: Developer setting up Vitest for a Next.js App Router project | Task: Create vitest.config.ts with jsdom environment, @vitejs/plugin-react, path alias @/ → /src. Write canary test in src/canary.test.tsx that renders a plain React component (e.g., a simple button element) via @testing-library/react and asserts visible text. Do not use shadcn/ui components — they are not installed until Phase 3 | Restrictions: Test includes in `src/**/*.test.{ts,tsx}`, path aliases must match tsconfig.json | Success: pnpm test runs and passes the canary test, proving path aliases and JSX transforms work_

- [ ] 6. Configure Playwright with canary test
  - File: e2e/playwright.config.ts, e2e/tests/smoke.test.ts
  - Set up Playwright config with webServer pointing to `pnpm start` on port 3000
  - Add `pnpm test:e2e` script. Write canary test that loads `/` and asserts page title and visible heading
  - Purpose: Validate E2E test infrastructure works before downstream specs depend on it
  - _Requirements: R12 AC2, R12 AC3, R12 AC4_
  - _Prompt: Role: Developer setting up Playwright for E2E testing a Next.js site | Task: Create e2e/playwright.config.ts with testDir ./tests, webServer command pnpm start on port 3000 (reuseExistingServer when not CI), baseURL http://localhost:3000. Write smoke test in e2e/tests/smoke.test.ts that navigates to / and asserts page title and visible h1 | Restrictions: Config lives at e2e/playwright.config.ts per structure doc, reuseExistingServer only in non-CI | Success: pnpm test:e2e runs against the built site and the smoke test passes_

## Phase 2: Content Pipeline + CSS Isolation Spike (R3, R9 partial, R11)

- [ ] 7. Configure Velite content pipeline
  - File: velite.config.ts, content/pages/about.mdx, src/styles/globals.css (placeholder)
  - Define `pages` collection schema (title, description, slug, body) with pattern `pages/*.mdx`
  - Configure output to `.velite/` with assets to `public/static`
  - Add `postinstall: velite build` script and `dev` script with concurrently
  - Add `#site/content` path alias. Include code comments documenting how to add MDX and YAML collections
  - Add placeholder MDX file so Velite succeeds with content present
  - Purpose: Establish typed content pipeline that all downstream specs extend
  - _Requirements: R3 AC1, R3 AC2, R3 AC3, R3 AC4, R3 AC5_
  - _Prompt: Role: Developer configuring Velite content pipeline for a Next.js project | Task: Install velite and concurrently as devDependencies. Create velite.config.ts with pages collection (title, description, slug via s.path(), body via s.mdx()), root content, output to .velite with assets to public/static. Add postinstall script for velite build, dev script using concurrently for velite dev + next dev --turbopack. Add placeholder content/pages/about.mdx. Include code comments explaining how to add new MDX and YAML collections | Restrictions: No VeliteWebpackPlugin (Turbopack ignores it), use concurrently for dev, glob pattern pages/*.mdx (flat, no subdirectories), #site/content alias must resolve to .velite | Success: velite build generates .velite/ with typed output, pnpm dev runs both velite and next concurrently, TypeScript imports from #site/content resolve_

- [ ] 8. Create CSS theme tokens and shadcn/ui scaffolding
  - File: src/styles/tokens.css, src/styles/globals.css, components.json, src/lib/utils.ts
  - Create `tokens.css` manually with `:root` and `.dark` CSS custom properties using shadcn/ui documented default oklch values (neutral theme)
  - Configure `globals.css` with `@layer playground;` declaration, `@import "tailwindcss"`, and unlayered `@import "./tokens.css"`
  - Create `components.json` manually (shadcn/ui project config — specifies paths, style preferences, aliases)
  - Create `src/lib/utils.ts` manually with `cn()` helper (clsx + tailwind-merge)
  - Purpose: Establish token values and shadcn/ui scaffolding so the spike and component installation can proceed without running shadcn init
  - _Requirements: R9 AC1 (partial — tokens and scaffolding only, full @theme block mapping deferred to task 15)_
  - _Prompt: Role: Frontend developer creating CSS theme token infrastructure and shadcn/ui scaffolding | Task: Do NOT run npx shadcn init in the project directory — it has broad side effects including overwriting globals.css. To get exact oklch token values, run `npx shadcn@latest init --defaults` in a temporary directory outside the project, then copy the generated CSS custom property values into tokens.css. Create all project files manually: (1) src/styles/tokens.css with :root and .dark blocks containing all shadcn/ui default theme tokens copied from the temp init output. Include at minimum: --background, --foreground, --card, --card-foreground, --popover, --popover-foreground, --primary, --primary-foreground, --secondary, --secondary-foreground, --muted, --muted-foreground, --accent, --accent-foreground, --destructive, --destructive-foreground, --border, --input, --ring, --radius, --chart-1 through --chart-5, and --sidebar-* tokens. (2) src/styles/globals.css with exact content: @layer playground declaration, @import "tailwindcss", unlayered @import "./tokens.css". (3) components.json with shadcn/ui project configuration matching project paths (src/components/ui, src/lib/utils, @/* alias, tailwind css variables style). (4) src/lib/utils.ts exporting cn() function using clsx and tailwind-merge. Install clsx and tailwind-merge as dependencies. Clean up the temporary directory when done | Restrictions: No shadcn init in the project directory. tokens.css must be unlayered. @layer playground must come before @import tailwindcss. oklch values must match shadcn/ui neutral theme defaults exactly (verified via temp init). Full @theme block mapping happens in task 15 | Success: tokens.css contains complete :root and .dark token sets with verified oklch values, globals.css has correct import/layer structure, components.json exists for shadcn add CLI, cn() helper is importable_

- [ ] 9. Install shadcn/ui components for spike and site shell
  - File: src/components/ui/ (multiple component files)
  - Install shadcn/ui components needed by the spike and downstream tasks: Button, Dialog, Card, Popover, Tooltip, Select, DropdownMenu, Sheet
  - Uses `components.json` created in task 8 for CLI configuration
  - Purpose: Make components available for spike fixtures (tasks 11-12) and site shell (tasks 16-19, 22)
  - _Requirements: R9 AC3, R11 AC3, R11 AC6_
  - _Prompt: Role: Developer installing shadcn/ui components via CLI | Task: Run `npx shadcn@latest add button dialog card popover tooltip select dropdown-menu sheet` to install all components needed by the spike and site shell. The components.json from task 8 provides CLI configuration. Do not run shadcn init. If the shadcn CLI warns about globals.css configuration, proceed with component file creation only — do not allow the CLI to modify globals.css | Restrictions: Do not run shadcn init. Do not modify globals.css. All components install into src/components/ui/ per components.json config | Success: All listed component files exist in src/components/ui/, each imports cn from @/lib/utils, no globals.css modifications_

- [ ] 10. Implement CSS isolation spike — container and layer setup
  - File: src/app/(playground)/layout.tsx, src/styles/playground.css
  - Create playground layout with isolation container (`all: initial`, `isolation: isolate`, `display: block`, `box-sizing: border-box`, `unicode-bidi: normal` in single rule block)
  - Create playground base stylesheet re-establishing typography and shadcn/ui tokens after reset
  - Purpose: Test whether CSS cascade layers can isolate playground styles from the main site
  - _Requirements: R11 AC1_
  - _Prompt: Role: CSS architect implementing cascade layer isolation for a Next.js route group | Task: Create (playground)/layout.tsx wrapping children in .playground-container div. Create playground.css with container reset (all: initial, isolation: isolate, display: block, box-sizing: border-box, unicode-bidi: normal in one rule block) and @layer playground block re-establishing font-family, font-size, line-height, color, box-sizing, color-scheme: light, -webkit-text-size-adjust: 100%, and shadcn/ui CSS custom properties (light-mode values matching tokens.css :root). The @layer playground declaration already exists in globals.css from task 8. Note: if during development you observe that playground-container styles are being overridden by Tailwind utilities despite the layer declaration, this may indicate the layer ordering hypothesis is invalid — the spike exists to test this. Note the observation and continue; formal verification is in task 13 | Restrictions: All five reset properties must be in a single CSS rule block, playground container uses light-mode tokens only (no dark mode), token values must exactly match tokens.css :root declarations (created in task 8), add comments pointing to tokens.css as reference source | Success: Playground layout renders without site chrome, container resets inherited styles, tokens are re-declared for shadcn/ui component use_

- [ ] 11. Implement CSS isolation spike — test fixtures
  - File: src/app/(playground)/spike/page.tsx
  - Create spike fixture page with three test cases: (1) plain div with explicit conflicting styles, (2) shadcn/ui Button inside playground container (installed in task 9), (3) div with Tailwind utility classes
  - Purpose: Provide visual and programmatic test targets for isolation verification
  - _Requirements: R11 AC2, R11 AC3, R11 AC4_
  - _Prompt: Role: Developer creating test fixtures for CSS isolation verification | Task: Create (playground)/spike/page.tsx with three test sections: (1) a div with inline style color:red, font-family:serif to verify global styles don't override, (2) a shadcn/ui Button (installed in task 9) to verify it renders using re-established CSS custom properties, (3) a div with Tailwind classes bg-blue-500 p-4 text-lg to verify utilities work within @layer playground | Restrictions: Each test case should have a data-testid attribute for Playwright selectors, page is a server component unless interactivity needed | Success: All three test cases render on /playground/spike, visually verifiable in both dev and production builds_

- [ ] 12. Implement CSS isolation spike — Radix overlay verification
  - File: src/app/(playground)/spike/page.tsx (extend from task 11)
  - Add Radix UI overlay test case: render shadcn/ui Dialog inside playground container (Dialog installed in task 9)
  - Verify whether portal renders within isolation boundary or escapes to document.body
  - Produce matrix of which overlay components support `container` prop containment (all overlay components installed in task 9)
  - Purpose: Determine whether overlay-heavy playground items need iframe fallback
  - _Requirements: R11 AC6_
  - _Prompt: Role: Developer testing Radix UI portal behavior within CSS isolation boundaries | Task: Add a shadcn/ui Dialog component (installed in task 9) to the spike fixture page inside the playground container. Test whether the Dialog portal renders within .playground-container or escapes to document.body. This requires client component ("use client") for Dialog interaction. Test container prop on Dialog portal to see if it can be redirected. Test the other overlay components installed in task 9 (DropdownMenu, Popover, Tooltip, Select) for container prop support. Document which components support containment and which escape to document.body | Restrictions: Must be testable via Playwright (data-testid attributes), document findings as code comments or a brief markdown file | Success: Dialog renders, portal behavior is verified programmatically, overlay containment matrix is documented for all tested components_

- [ ] 13. Implement CSS isolation spike — Playwright verification tests
  - File: e2e/tests/playground-isolation.test.ts, e2e/spike-summary.txt
  - Write Playwright tests using `page.evaluate(() => getComputedStyle(...))` to verify computed styles
  - Verify: (1) global styles don't leak into plain div, (2) Button renders with correct token values, (3) Tailwind utilities resolve, (4) dark-mode isolation holds (playground stays light when site is dark)
  - CI runs against production build only. Dev (Turbopack) comparison is a documented manual verification step
  - Write spike-summary.txt with pass/fail per test case and key computed values for task 14 to reference
  - Purpose: Automated regression coverage for CSS isolation — prevents silent breakage from Tailwind updates or bundler changes
  - _Requirements: R11 AC2, R11 AC3, R11 AC4, R11 AC5, R11 AC7_
  - _Prompt: Role: QA engineer writing and running Playwright tests for CSS computed style verification | Task: Create e2e/tests/playground-isolation.test.ts. Use page.evaluate(() => getComputedStyle(element)) to read computed values on spike fixture elements. Assert: (1) plain div color matches red not global --foreground, font-family matches serif, (2) Button has expected padding/background from re-established tokens, (3) Tailwind bg-blue-500 resolves to expected blue value, p-4 resolves to 16px padding, (4) dark-mode isolation — toggle site to dark mode via page.evaluate(() => document.documentElement.classList.add("dark")), then assert playground container computed styles for --background, --foreground, and color still match light-mode token values from tokens.css :root. CI runs these tests against the production build only. Dev (Turbopack) vs production (Webpack) comparison is a manual verification step: run tests locally against the dev server during development and compare key computed values. Document expected computed values in comments so future developers can spot-check. IMPORTANT: After writing the test file, run `pnpm build && pnpm test:e2e` and write e2e/spike-summary.txt based on actual test results — not assumed results. The spike is empirical validation; results must come from execution. Write spike-summary.txt with pass/fail per test case and key computed values (this artifact is used by task 14 to determine the graduated outcome). Add comments documenting token sync maintenance procedure | Restrictions: Tests must use data-testid selectors, document known limitation about new tokens not being auto-detected, do not configure dual Playwright projects for dev/production — manual comparison is sufficient, spike-summary.txt must reflect actual test execution results | Success: All assertions pass against production build, dark-mode isolation verified, spike-summary.txt written from actual results, graduated outcome (a/b/c) is determinable from test results_

- [ ] 14. Document CSS isolation spike outcome
  - File: .spec-workflow/specs/site-foundation/spike-results.md
  - Read test results from e2e/spike-summary.txt (written by task 13)
  - Record graduated outcome: (a) full same-page isolation viable, (b) viable with restrictions, or (c) not viable
  - Document any mitigations needed (e.g., portal containment, iframe fallback for overlays)
  - Document overlay component containment matrix
  - If outcome is (c), document which site-foundation artifacts must be modified by spec 8
  - Purpose: Inform spec 8 (playground) architectural decision
  - _Requirements: R11 AC7_
  - _Prompt: Role: Technical writer documenting spike findings for downstream architectural decisions | Task: Read test results from e2e/spike-summary.txt (task 13 output) and create spike-results.md documenting: (1) graduated outcome (a/b/c), (2) layer ordering behavior observed in Turbopack vs Webpack, (3) overlay component containment matrix, (4) any mitigations or known limitations, (5) recommendation for spec 8 playground architecture. If outcome is (c) — same-page isolation not viable — additionally document which site-foundation artifacts must be modified by spec 8: the @layer playground declaration in globals.css, the playground.css stylesheet, and the isolation container in (playground)/layout.tsx. Spike fixture code in (playground)/spike/ can remain as a test artifact or be removed at spec 8's discretion | Restrictions: Be factual — report what was observed, not what was hoped. Include specific computed style values where relevant | Success: Document clearly states the outcome, provides actionable guidance for the playground spec, and includes contingency instructions if outcome is (c)_

## Phase 3: Styles + Fonts + Theme + Layouts + Metadata + CSP (R9, R14, R5, R4, R10, R13)

- [ ] 15. Complete global styles setup and verify shadcn/ui theming
  - File: src/styles/globals.css (already exists from task 8)
  - Add `@theme` block to globals.css mapping Tailwind utilities to CSS custom properties
  - Verify shadcn/ui Button (installed in task 9) renders correctly in both light and dark themes with the new @theme mappings
  - Verify WCAG 2.1 AA contrast ratios on key foreground/background token pairs
  - Purpose: Complete the visual design system foundation that all components inherit
  - _Requirements: R9 AC1, R9 AC2, R9 AC3, R5 AC5_
  - _Prompt: Role: Frontend developer completing shadcn/ui theming with Tailwind CSS v4 | Task: globals.css and tokens.css already exist from task 8 with @layer playground, @import tailwindcss, and token definitions. shadcn/ui components (including Button) were installed in task 9. Add the @theme block to globals.css mapping --color-background to var(--background), --color-foreground to var(--foreground), etc. for all shadcn/ui tokens. Verify Button renders correctly in both light and dark themes with the new @theme mappings. Verify WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large text) on these token pairs in both :root and .dark modes: foreground/background, primary/primary-foreground, secondary/secondary-foreground, muted/muted-foreground, destructive/destructive-foreground. Use browser DevTools Accessibility panel contrast checker or compute from oklch values. shadcn/ui defaults are known to pass — this step verifies the extracted token values are correct | Restrictions: Do not run shadcn init. Do not overwrite existing globals.css structure. Preserve @layer playground declaration and import order | Success: Tailwind utility classes (bg-primary, text-foreground) resolve to CSS theme variables, Button renders correctly in both themes, all checked token pairs meet AA contrast ratios_

- [ ] 16. Create root layout with font loading and ThemeProvider
  - File: src/app/layout.tsx, src/components/layout/theme-provider.tsx
  - Install next-themes as a dependency
  - Create root layout with `<html>`, `<body>`, Geist font loading via `next/font/google`, and ThemeProvider (next-themes)
  - Export default metadata with title template `%s | matthew-field.ca`
  - Import globals.css
  - Purpose: Establish the root layout with fonts, theming, and base metadata in a single coherent pass
  - _Requirements: R14 AC1, R14 AC2, R14 AC3, R5 AC1, R5 AC4, R10 AC1_
  - _Prompt: Role: Frontend developer building the root layout for a Next.js App Router site | Task: Install next-themes as a dependency. Create src/app/layout.tsx as server component. Import Geist and Geist_Mono from next/font/google with subsets: ["latin"] and variable names --font-sans and --font-mono (adjustFontFallback enabled by default). Wrap children in html element (with font variable classes from Geist/Geist_Mono and suppressHydrationWarning) and body. Create theme-provider.tsx as client component wrapping next-themes ThemeProvider with attribute="class", defaultTheme="system", enableSystem. Wrap body children in ThemeProvider. Import globals.css. Export metadata with title object (default: "Matthew Field", template: "%s | matthew-field.ca"), description, and openGraph image | Restrictions: Root layout is a server component, ThemeProvider must be a separate client component, use next/font/google (auto self-hosts at build time, no external font requests), import globals.css in root layout | Success: Pages render with correct title template, Geist fonts load without layout shift, --font-sans and --font-mono CSS variables available, theme class applied to html without FOUC_

- [ ] 17. Implement theme toggle component
  - File: src/components/layout/theme-toggle.tsx
  - Create client component with shadcn/ui Button trigger (sun/moon icon) and DropdownMenu with Light/Dark/System options
  - Use `useTheme` from next-themes
  - Purpose: Allow visitors to switch between light, dark, and system themes
  - _Requirements: R5 AC2, R5 AC3, R5 AC4_
  - _Prompt: Role: Frontend developer building an accessible theme toggle with shadcn/ui | Task: Install lucide-react as a dependency. Create theme-toggle.tsx as "use client" component. Use useTheme from next-themes (installed in task 16). Render shadcn/ui Button (variant ghost, size icon) with sun/moon icons from lucide-react as trigger, and DropdownMenu (already installed in task 9) with three items: Light, Dark, System. Trigger button has aria-label="Toggle theme" | Restrictions: Must be keyboard-accessible, DropdownMenu is already installed — do not reinstall | Success: Clicking toggle opens dropdown, selecting option changes theme class on html, preference persists across page reloads_

- [ ] 18. Create site config
  - File: src/config/site.ts
  - Define and export `siteConfig` object with name, description, URL, OG image path, navItems, and heroCards nested inside
  - Purpose: Single source of truth for navigation, hero cards, and site metadata
  - _Requirements: R4 AC2, R6 AC4_
  - _Prompt: Role: Developer creating centralized site configuration | Task: Create src/config/site.ts exporting a single siteConfig object of type SiteConfig containing: name, description, url, ogImage, navItems (array of NavItem with label and href for Professional Profile→/profile, Projects→/projects, Contributions→/contributions, Blog→/blog, Resources→/resources, Playground→/playground), and heroCards (array of HeroCardConfig with title, description, and href for the same sections). Define NavItem, HeroCardConfig, and SiteConfig types with navItems and heroCards nested inside SiteConfig (matching the design doc type definition). Consumers access via siteConfig.navItems and siteConfig.heroCards | Restrictions: Types defined in same file (no separate types file needed), descriptions should be concise placeholder text | Success: Config is importable, types are correct, all 6 sections represented in both navItems and heroCards, single siteConfig export with nested arrays_

- [ ] 19. Implement site layout with header, nav, and footer
  - File: src/app/(site)/layout.tsx, src/components/layout/header.tsx, src/components/layout/nav.tsx, src/components/layout/footer.tsx
  - Create site layout wrapping children with header (nav + theme toggle), main, and footer
  - Nav: "use client" component with full links on desktop, shadcn/ui Sheet hamburger menu on mobile (collapse at lg breakpoint), active link state via usePathname
  - Footer: link to /slashes, GitHub/LinkedIn links (hardcoded in JSX), copyright
  - All semantic HTML elements
  - Purpose: Consistent site chrome for all content pages
  - _Requirements: R4 AC1, R4 AC2, R4 AC3, R4 AC4, R4 AC5, R4 AC6_
  - _Prompt: Role: Frontend developer building responsive site layout with accessible navigation | Task: Create (site)/layout.tsx (server component) rendering Header, main (children), Footer. Header (server component) contains site title link to /, Nav component, ThemeToggle. Nav is a "use client" component — it needs usePathname for active link state and Sheet requires client interactivity. Nav renders siteConfig.navItems as links — full horizontal on desktop, shadcn/ui Sheet (hamburger menu) below lg breakpoint. Mobile header shows: site title, ThemeToggle, hamburger button. Footer (server component) renders link to /slashes, GitHub and LinkedIn social links (hardcoded URLs in footer.tsx — not worth adding to siteConfig for two links), and copyright. Use semantic HTML (header, nav, main, footer) | Restrictions: Nav is the only client component in this task — layout, header, and footer are server components. ThemeToggle visible at all breakpoints (not inside mobile menu). Hamburger has aria-label, aria-expanded, aria-haspopup="dialog" | Success: Layout renders on all pages, navigation works at all breakpoints, mobile menu opens/closes, active link highlighted, all links functional_

- [ ] 20. Configure metadata and SEO conventions
  - File: src/app/sitemap.ts
  - Create sitemap.ts generating XML sitemap for all known routes
  - Manual prerequisite: default OG image (1200x630 PNG) must be placed at `public/images/og-default.png` by hand — AI agents cannot generate image files
  - Purpose: Ensure search engine discoverability and correct link previews
  - _Requirements: R10 AC2, R10 AC3, R10 AC4_
  - _Prompt: Role: Developer configuring SEO for a Next.js site | Task: Create src/app/sitemap.ts exporting default function that returns MetadataRoute.Sitemap with entries for /, /profile, /projects, /contributions, /blog, /resources, /playground, /about, /contact, /colophon, /now, /sitemap, /slashes. Each entry has url (siteConfig.url + route) and lastModified (new Date()). The default OG image at public/images/og-default.png (1200x630 PNG) is a manual task — reference it in metadata but do not attempt to generate the binary file | Restrictions: Use siteConfig.url for base URL, downstream specs extend this file for dynamic routes | Success: /sitemap.xml serves valid XML sitemap, OG image path is referenced in metadata_

- [ ] 21. Configure CSP headers
  - File: next.config.ts
  - Add route-scoped headers: full CSP for content pages, no CSP for playground routes
  - Use negative lookahead regex to exclude `/playground` and `/playground/*`
  - Purpose: Baseline protection against resource injection for content pages
  - _Requirements: R13 AC1, R13 AC2, R13 AC3_
  - _Prompt: Role: Security-aware developer configuring CSP headers in Next.js | Task: In next.config.ts, add headers() config returning CSP header for source /((?!playground(/|$)).*) with directives: default-src 'self', script-src 'self' 'unsafe-inline', style-src 'self' 'unsafe-inline', img-src 'self' data:, font-src 'self', object-src 'none', base-uri 'self', frame-src 'self', connect-src 'self' | Restrictions: Playground routes must be completely excluded from CSP, regex must use (/|$) segment boundary to avoid excluding hypothetical /playground-tips route, no nonce-based CSP (static-first architecture) | Success: Content pages return Content-Security-Policy header, playground pages do not_

## Phase 4: Landing Page + Placeholders + 404 (R6, R7, R8)

- [ ] 22. Create landing page with hero cards
  - File: src/app/(site)/page.tsx, src/components/shared/hero-card.tsx
  - Server component rendering personal intro section with photo (Next.js Image) and hero cards grid
  - Manual prerequisite: profile photo must be placed at `public/images/` by hand — AI agents cannot generate photos
  - HeroCard: clickable card with title, description, link to section. Uses shadcn/ui Card and Next.js Link
  - Responsive grid: multi-column desktop, single-column mobile
  - Export generateMetadata() per R10 AC3 convention
  - Purpose: Give visitors an immediate overview and navigation entry point
  - _Requirements: R6 AC1, R6 AC2, R6 AC3, R6 AC4, R6 AC5, R6 AC6, R10 AC3_
  - _Prompt: Role: Frontend developer building a landing page with data-driven hero cards | Task: Create (site)/page.tsx as server component. Export generateMetadata() returning title "Home" (uses root layout template to produce "Home | matthew-field.ca"). Render intro section with a placeholder reference to a personal photo via Next.js Image (src from public/images/profile.jpg, path hardcoded in component — the actual image file is a manual task). Render brief intro text. Map over siteConfig.heroCards from @/config/site.ts to render HeroCard components in a responsive grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3). Create hero-card.tsx accepting title, description, and href props, rendering shadcn/ui Card wrapped in Next.js Link. Card has hover state for visual feedback | Restrictions: Server component (no "use client"), Link wraps entire card (single focusable element), no onClick on card container, do not attempt to generate the profile photo binary file | Success: Landing page shows intro + 6 hero cards, cards link to correct paths, responsive layout works at all breakpoints, page exports generateMetadata()_

- [ ] 23. Create placeholder page component and all placeholder routes
  - File: src/components/shared/placeholder-page.tsx, plus page.tsx for: profile, projects, contributions, blog, resources, contact, colophon, now, sitemap (HTML), slashes (all under (site) route group); and playground index (under (playground) route group)
  - PlaceholderPage component: renders section title, "under construction" message, link to home
  - Create page.tsx for each unbuilt section and slash page using PlaceholderPage. Every route in the sitemap and every route linked from nav/footer must resolve to a page
  - The /about route renders its MDX content from Velite (content/pages/about.mdx created in task 7) rather than using PlaceholderPage
  - The /playground index is under the (playground) route group (no site chrome) and uses a minimal placeholder
  - Each page exports generateMetadata() with `robots: { index: false }`
  - Purpose: Prevent 404s for any linked or sitemap-listed route
  - _Requirements: R7 AC1, R7 AC2, R7 AC3, R10 AC3_
  - _Prompt: Role: Frontend developer creating placeholder pages for unbuilt sections | Task: Create placeholder-page.tsx accepting title and optional description props, rendering section title, "This section is under construction" text, and Link back to /. Create page.tsx in each route listed below, importing PlaceholderPage with appropriate title. Each page exports generateMetadata() returning title and robots with index: false. Routes under (site) route group: /profile, /projects, /contributions, /blog, /resources, /contact, /colophon, /now, /sitemap (HTML page, distinct from sitemap.ts XML), /slashes. The /about route should render MDX content from Velite (the about.mdx created in task 7) instead of using PlaceholderPage — import the page data from #site/content. Additionally, create a minimal placeholder at src/app/(playground)/page.tsx for the /playground index (under the playground route group, no site chrome). All routes in the XML sitemap and all routes linked from nav or footer must resolve to a page — no 404s on linked URLs | Restrictions: Text hardcoded in JSX (not content-pipeline-driven), noindex prevents search engine indexing, /contact is a placeholder per R7 AC3, playground index is under (playground) route group not (site) | Success: All section and slash page routes render styled placeholder pages, /about renders MDX content, /playground renders a minimal placeholder, site layout (header/footer) present on (site) pages, all pages are noindexed_

- [ ] 24. Create custom 404 page
  - File: src/app/not-found.tsx
  - Styled 404 page with "Page not found" message and link back to landing page
  - Inherits root layout
  - Purpose: Friendly error page for nonexistent routes
  - _Requirements: R8 AC1, R8 AC2_
  - _Prompt: Role: Frontend developer creating a custom 404 page for Next.js App Router | Task: Create src/app/not-found.tsx displaying "Page not found" heading, brief message, and Link to /. Text hardcoded in JSX. Page inherits root layout automatically | Restrictions: Must include site layout shell, simple and clean design using theme variables | Success: Navigating to /nonexistent-route renders the styled 404 page with working home link_

## Phase 5: E2E Tests + Final Verification

- [ ] 25. Write E2E tests — theme toggle
  - File: e2e/tests/theme.test.ts
  - Test: load page, verify initial theme, click toggle, verify theme class changes on html, reload, verify persistence
  - Purpose: Regression coverage for theme functionality
  - _Requirements: R5 AC1, R5 AC2, R5 AC3_
  - _Prompt: Role: QA engineer writing Playwright E2E tests for theme toggle | Task: Create e2e/tests/theme.test.ts. Test initial theme matches system preference or default. Click theme toggle, select Dark, verify html element has class "dark". Reload page, verify dark theme persists. Select Light, verify class changes. Select System, verify it respects system preference | Restrictions: Use Playwright locators, test in a single browser (chromium sufficient for theme testing) | Success: All theme toggle scenarios pass_

- [ ] 26. Write E2E tests — navigation and placeholder pages
  - File: e2e/tests/navigation.test.ts
  - Test: click each nav link, verify placeholder renders (not 404). Test 404 for nonexistent route. Test mobile nav menu open/close at small viewport
  - Purpose: Regression coverage for navigation and routing
  - _Requirements: R4 AC2, R4 AC3, R7 AC1, R8 AC1_
  - _Prompt: Role: QA engineer writing Playwright E2E tests for site navigation | Task: Create e2e/tests/navigation.test.ts. Navigate to each section via nav links, assert placeholder page renders with correct title (not 404). Navigate to /nonexistent, assert 404 page renders. Set viewport to mobile size, verify hamburger menu appears, opens on click, contains all nav links, closes after selection | Restrictions: Test mobile nav at a viewport width below lg breakpoint (`< 1024px`) | Success: All navigation paths verified, 404 correctly served, mobile menu functional_

- [ ] 27. Write E2E tests — landing page and hero cards
  - File: e2e/tests/landing.test.ts
  - Test: verify all 6 hero cards render, click each card, verify navigation to correct path
  - Purpose: Regression coverage for landing page
  - _Requirements: R6 AC2, R6 AC3_
  - _Prompt: Role: QA engineer writing Playwright E2E tests for the landing page | Task: Create e2e/tests/landing.test.ts. Verify all 6 hero cards are visible on /. Click each hero card, verify navigation to the correct section path (/profile, /projects, /contributions, /blog, /resources, /playground) | Restrictions: Use accessible selectors where possible (link role, heading text) | Success: All hero cards render and link to correct destinations_

- [ ] 28. Write E2E tests — CSP headers
  - File: e2e/tests/csp.test.ts
  - Test: navigate to content page, assert CSP header present with correct directives. Navigate to playground page, assert CSP header absent
  - Purpose: Prevent silent CSP removal via next.config.ts refactoring
  - _Requirements: R13 AC1, R13 AC2_
  - _Prompt: Role: QA engineer writing Playwright E2E tests for CSP header verification | Task: Create e2e/tests/csp.test.ts. Navigate to / (content page), read response headers, assert Content-Security-Policy header is present and contains expected directives (default-src 'self', script-src 'self' 'unsafe-inline', etc.). Navigate to /playground (stable route — do not use /playground/spike as it may be removed by spec 8), assert Content-Security-Policy header is absent | Restrictions: Use page.goto() return value to access response headers, use /playground as the playground test target (not /playground/spike) | Success: CSP header verified present on content pages and absent on playground pages_
