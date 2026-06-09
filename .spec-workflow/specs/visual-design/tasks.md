# Tasks: visual-design

Converts the approved Design (v3) into atomic implementation tasks. The work is ordered so the
**token + font foundation** lands first (everything consumes it), then the **components and
signature**, then **motion/print/artifacts**, then **per-section application**, and finally the
**gates and visual review**. Token/font tasks block the component and section tasks; the atomic
prose-migration (Task 18) lands as one change so the site is never mid-migration.

> Baselines already captured: `design-baseline/*.png` (both themes) exist and are the side-by-side
> reference for Task 23 — do **not** regenerate them after styling begins.

## Phase 1: Token foundation (R2, R5, R6, R7)

- [x] 1. Add the rust brand accent token family + brand focus ring
  - File: src/styles/tokens.css, src/styles/globals.css
  - In `tokens.css`, add matched `:root`/`.dark` pairs: `--brand` (light `oklch(0.50 0.13 42)` / dark `oklch(0.75 0.12 55)`), `--brand-foreground` (light `oklch(0.99 0 0)` / dark `oklch(0.205 0 0)`), and `--brand-visited` (light `oklch(0.50 0.06 42)` / dark `oklch(0.72 0.05 55)`)
  - Repoint `--ring` to `var(--brand)` in **both** `:root` and `.dark` (was zero-chroma)
  - In the `@theme inline` block of `globals.css`, map `--color-brand`, `--color-brand-foreground`, `--color-brand-visited` so `text-brand` / `bg-brand` / `text-brand-visited` resolve
  - Keep every neutral role (`background`, `foreground`, `card`, `popover`, `primary(/-foreground)`, `secondary`, `muted`, `accent`, `border`, `input`) at chroma 0 — do not recolor `--primary`
  - Confirm the values against the **design §1 pre-computed figures** (brand link 5.8–8.6:1; ring ≥3:1 non-text; visited ~6.1/7.9) — these were verified across three design rounds; the rendered-DOM axe contrast check is Task 21 (there is no token-level contrast tool in the repo, and no DOM exists yet at this task)
  - Purpose: Introduce the single chromatic brand role and a brand-carrying focus ring (R2.2, R2.1)
  - _Leverage: src/styles/tokens.css (existing matched-pair convention), src/styles/globals.css:47 (@theme inline)_
  - _Requirements: R2 AC1, R2 AC2, R2 AC4, R5 AC2_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Design-systems engineer fluent in OKLCH and Tailwind v4 @theme | Task: Add the `--brand`/`--brand-foreground`/`--brand-visited` matched pairs and repoint `--ring` to brand in tokens.css, and map the brand colors in the globals.css @theme inline block, per design §1 | Restrictions: Use the exact OKLCH values from design §1; keep all neutral roles at chroma 0 (do NOT recolor --primary); do not add arbitrary Tailwind values; match the existing :root/.dark pair formatting | Success: text-brand/bg-brand/text-brand-visited utilities resolve, --ring is brand in both themes, brand link ≥4.5:1 and ring ≥3:1 matching the design §1 pre-computed figures (rendered-DOM axe check is Task 21), tsc + build clean. Set this task to [-] before starting; after it works, call log-implementation, then mark it [x]_

- [x] 2. Add the success / warning / info status roles
  - File: src/styles/tokens.css, src/styles/globals.css
  - Add matched `:root`/`.dark` pairs for `--success` (`oklch(0.50 0.15 150)` / `oklch(0.74 0.15 150)`), `--warning` (`oklch(0.52 0.12 85)` / `oklch(0.76 0.13 85)`), `--info` (`oklch(0.52 0.14 240)` / `oklch(0.74 0.13 240)`), each with a `-foreground` (near-white light / near-black dark); leave `--destructive` unchanged
  - Map `--color-success(/-foreground)`, `--color-warning(/-foreground)`, `--color-info(/-foreground)` in `@theme`
  - Confirm each role's text clears **≥4.6:1** over its own `/10` tint composited on **both** `background` and `card` in both themes against the **design §1 status table** (those figures were computed and re-verified across three design rounds for the composited tint, not the solid role; the rendered-DOM axe check is Task 21)
  - Purpose: Move success/warning/info from "deferred" to "active" status roles (R6.1)
  - _Leverage: src/styles/tokens.css (existing `--destructive` pair as the model), src/styles/globals.css @theme_
  - _Requirements: R6 AC1, R6 AC3, R5 AC1_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Design-systems engineer | Task: Add success/warning/info matched pairs + foregrounds to tokens.css and map them in the globals.css @theme block, per design §1 status table | Restrictions: Use the exact OKLCH values; do not touch --destructive; hold --warning's hue (85) away from brand's 42–55; confirm the ≥4.6 margin over the /10 tint on both background and card, both themes, against the design §1 status figures (axe rendered-DOM check is Task 21) | Success: text-success/-warning/-info + bg-*/10 utilities resolve, all three match the design §1 status figures (≥4.6:1 over their tint on background and card in both themes), build clean. Set [-] before starting; log-implementation then [x] when done_

- [x] 3. Add the measure + z-index layout tokens
  - File: src/styles/globals.css
  - In `@theme`, add `--container-measure: 75ch` (the `--container-*` namespace yields `max-w-measure`) and the z-index scale using Tailwind v4's **`--z-index-*`** namespace (NOT `--z-*`): `--z-index-base: 0`, `--z-index-sticky: 40`, `--z-index-overlay: 50`, `--z-index-toast: 60` — the v4 `z` utility reads `themeKeys: ["--z-index"]`, so these generate `z-base`/`z-sticky`/`z-overlay`/`z-toast`; `--z-sticky` would generate nothing
  - Note the header's current `z-40` is already a valid static v4 step (so this tokenization is a naming/clarity improvement, not a grep-gate fix); verify a `z-sticky` utility actually generates before relying on it
  - Purpose: Tokenize the prose measure and the z-index scale with the correct v4 namespaces (R4.3, design §4 z-index)
  - _Leverage: src/styles/globals.css @theme inline (Tailwind v4 `--container-*` and `--z-index-*` namespaces)_
  - _Requirements: R1 AC2, R4 AC3, R7 AC1_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Tailwind v4 engineer | Task: Add --container-measure (75ch → max-w-measure) and the z-index scale via the --z-index-* namespace (--z-index-base/-sticky/-overlay/-toast → z-base/z-sticky/z-overlay/z-toast) to the @theme inline block | Restrictions: Use the correct v4 namespaces — `--z-index-*` for z (NOT `--z-*`, which generates no utility) and `--container-*` for the measure; do not yet rewire consumers (header z-40 swap is Task 15); keep Radix portals managing their own stacking | Success: `max-w-measure` AND a `z-sticky` utility both actually generate (verify in build output), build clean. Set [-] before starting; log-implementation then [x]_

## Phase 2: Typography system (R4) — blocked by Phase 1

- [x] 4. Add the Fraunces serif display face via next/font
  - File: src/app/layout.tsx, src/styles/globals.css
  - Register `Fraunces` through `next/font/google` (self-hosted at build, CSP-safe), latin subset, `display: "swap"`, variable weight, exposed as `--font-display` on `<html>` alongside the existing Geist Sans/Mono variables
  - Map `--font-display` in the `@theme` block so a `font-display`/serif utility resolves for headings
  - Rely on `next/font`'s automatic size-adjust fallback metrics to bound CLS
  - Purpose: Add the editorial serif display voice (R4.1, R4.4)
  - _Leverage: src/app/layout.tsx:2-15 (existing Geist next/font setup), src/styles/globals.css @theme_
  - _Requirements: R4 AC1, R4 AC2, R4 AC4_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Next.js performance engineer | Task: Add Fraunces via next/font/google mirroring the existing Geist setup in layout.tsx, expose it as --font-display on the `<html>` element, and map --font-display in the @theme block | Restrictions: Self-host via next/font only (no external font origin — CSP font-src 'self'); variable, latin subset, display swap; headings-only glyph use; do not add client JS | Success: --font-display variable is present on the `<html>` element, the serif resolves on a heading utility, build clean, no CSP/font console errors. Set [-] before starting; log-implementation then [x]_

- [x] 5. Add @tailwindcss/typography and theme `.prose` to tokens
  - File: src/styles/globals.css, package.json
  - Add `@tailwindcss/typography` as a dependency and the v4 `@plugin "@tailwindcss/typography";` directive in `globals.css`
  - Theme **both** variable sets to token roles: `--tw-prose-body/-headings → foreground`, `--tw-prose-links → brand`, `--tw-prose-captions → muted-foreground`, `--tw-prose-borders → border`, **and** the matching `--tw-prose-invert-*` set to the same token roles (so dark-mode prose links resolve to `--brand`, not the plugin default)
  - Headings inherit the display serif; respect the unlayered-`tokens.css` cascade note (theme via `--tw-prose-*` custom properties, do not fight the plugin's layered rules)
  - **Measure ownership (critical — get the mechanic right):** the plugin ships a built-in `.prose { max-width: 65ch }` emitted in Tailwind's **components** layer; `max-w-*` utilities live in the **utilities** layer, which v4 declares **after** components — so a **bare `prose max-w-measure`** wins on layer order and yields 75ch. **Do NOT add `max-w-none`**: verified in `tailwindcss@4.2.2` that `.max-w-none` is emitted *after* `.max-w-measure` at equal specificity, so `max-w-none max-w-measure` on the same element resolves to `max-width: none` (no cap at all — worse than the plugin's 65ch). The canonical prose class set Task 18 applies is therefore `prose dark:prose-invert max-w-measure` (no `max-w-none`)
  - **Deterministic fallback** (only if a build check shows the plugin's 65ch still winning — e.g. the plugin resolves into the utilities layer): override it with an **unlayered** `.prose { max-width: var(--container-measure); }` rule (the design §2 unlayered-tokens cascade sits above Tailwind's layers). Still never `max-w-none`. Task 18 measures the rendered width, so a wrong outcome is caught
  - If `@tailwindcss/typography` turns out to resolve via another path, substitute hand-authored prose CSS to the same spec (no built-in 65ch cap; measure = `--container-measure`)
  - Purpose: Make `.prose` real and themed to tokens in both themes (design §2 prose decision)
  - _Leverage: src/styles/globals.css (import order + unlayered tokens.css note)_
  - _Requirements: R1 AC1, R4 AC2, R4 AC3, R5 AC1_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Tailwind v4 CSS architect | Task: Add @tailwindcss/typography (@plugin) and theme both the --tw-prose-* and --tw-prose-invert-* sets to token roles per design §2 (body/headings→foreground, links→brand, captions→muted-foreground, borders→border) | Restrictions: Theme via prose CSS variables, not competing layered rules; both variable sets must be themed so dark-mode links are brand; do not wrap any page bodies yet (that is Task 18) | Success: a .prose block renders themed body/headings/links in both themes with links → brand, build clean. Set [-] before starting; log-implementation then [x]_

## Phase 3: Signature + interactive components (R3, R2, R6) — blocked by Phases 1–2

- [x] 6. Create the Wordmark component
  - File: src/components/layout/wordmark.tsx, src/components/layout/wordmark.test.tsx
  - `Wordmark({ className?, asLink? })` renders mono `mf` + brand `/`; when `asLink` (default true) wraps in `Link href="/"` with accessible name "Matthew Field — home"
  - Unit test: renders the `mf/` text/structure, the `/` carries the brand class, and (as link) links to `/` with the accessible name
  - Purpose: The brand identity mark (R8.1, R3.3) — consumed by the header (Task 15) and hero (Task 16)
  - _Leverage: src/lib/utils.ts (cn), next/link, --font-mono, --brand_
  - _Requirements: R3 AC3, R8 AC1_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React/TypeScript component author | Task: Create the Wordmark component per design "Components → Wordmark" and a colocated Vitest test | Restrictions: kebab-case file, one PascalCase named export, no default export, no barrel; mono font + brand `/` via tokens (no literals); accessible name "Matthew Field — home" | Success: component renders mf/ with a brand-colored slash, links to / when asLink, unit test passes, tsc clean. Set [-] before starting; log-implementation then [x]_

- [x] 7. Create the SectionKicker component
  - File: src/components/shared/section-kicker.tsx, src/components/shared/section-kicker.test.tsx
  - `SectionKicker({ label, className? })` renders `<p class="font-mono text-xs uppercase tracking-widest text-brand">/ {label}</p>`
  - Unit test: renders `/ {label}`, mono/uppercase/tracked classes, brand color
  - Purpose: The recurring mono `/ kicker` signature label above headings (R3.1 load-bearing element)
  - _Leverage: src/lib/utils.ts (cn), --font-mono, --brand_
  - _Requirements: R3 AC1, R3 AC3, R3 AC5_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React/TypeScript component author | Task: Create SectionKicker per design "Components → SectionKicker" plus a colocated Vitest test | Restrictions: kebab-case file, named export only, tokens only (no literal colors/sizes), text-xs/uppercase/tracking-widest/font-mono/text-brand | Success: renders `/ {label}` with the brand slash in the mono kicker style, unit test passes, tsc clean. Set [-] before starting; log-implementation then [x]_

- [x] 8. Add the Button `brand` variant + ring and link edits
  - File: src/components/ui/button.tsx
  - Add CVA `variant: "brand"` → `bg-brand text-brand-foreground hover:bg-brand/90`
  - Change the shared focus utility `focus-visible:ring-ring/50` → `focus-visible:ring-ring` (full-alpha brand ring, meets non-text 1.4.11 per design §1 ring-alpha note)
  - Change the `link` variant `text-primary` → `text-brand`
  - Leave the neutral `default` (`bg-primary`) variant and `--primary` unchanged
  - Purpose: The single primary-CTA control + brand links + a focus ring that clears ≥3:1 (R2.3, R5.2)
  - _Leverage: src/components/ui/button.tsx (existing CVA), --brand/--brand-foreground/--ring_
  - _Requirements: R2 AC3, R5 AC2, R8 AC4_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: shadcn/ui maintainer | Task: Add the brand CVA variant and make the two edits (ring-ring/50 → ring-ring; link variant text-primary → text-brand) in button.tsx per design "Components → Button" | Restrictions: Do not change the default/secondary/ghost variants or --primary; brand variant is a small control, never a surface; keep the existing ring width (ring-[3px]) | Success: the brand variant renders bg-brand/text-brand-foreground, link buttons are brand, focus ring is full-alpha brand and clears ≥3:1, existing button tests pass. Set [-] before starting; log-implementation then [x]_

- [x] 9. Status feedback: StatusCallout pairing color + icon
  - File: src/components/shared/status-callout.tsx (new) and/or src/components/shared/contact-form.tsx
  - Provide consistent status feedback that pairs a status role color with a lucide icon + text: `StatusCallout({ tone: "success"|"warning"|"info"|"error", icon, children })` → `bg-<tone>/10 text-<tone>` with an accessible-named icon; OR, if the contact form's existing feedback markup already suffices, realize this as the same tokenized utility convention there (decide at implementation)
  - Wire the contact-form result state to use it so state is never color-alone (R5.3/R6.2)
  - Purpose: Status feedback uses a role + non-color signal (R6.2, R5.3)
  - _Leverage: src/components/shared/contact-form.tsx (existing feedback markup), lucide-react, the status roles from Task 2, cn_
  - _Requirements: R6 AC2, R5 AC3_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Accessibility-minded React developer | Task: Implement status feedback that pairs a status-role color with an icon+text (StatusCallout component or the equivalent utility convention in contact-form.tsx) per design "Components → StatusCallout", and wire the contact-form result to it | Restrictions: Color is never the sole signal — always icon/text paired; use `bg-<role>/10 text-<role>` tokens; do not regress the contact form's submit/validation behavior or its existing tests | Success: success/error feedback shows role color + icon + text, contact-form E2E stays green, tsc clean. Set [-] before starting; log-implementation then [x]_

## Phase 4: Motion, print, brand artifacts (R7, R8) — blocked by Phases 1–2

- [x] 10. Reduced-motion rule + no-flash theme toggle
  - File: src/styles/globals.css, src/components/layout/theme-provider.tsx
  - Add a global `@media (prefers-reduced-motion: reduce)` rule in `globals.css` reducing transition/animation durations to ~0 site-wide (generalizing the per-file handling in `reading-progress.css`)
  - Add `disableTransitionOnChange` to the `NextThemesProvider` in `theme-provider.tsx`
  - Purpose: Minimal/purposeful motion that honors reduced-motion + no-FOUC theme switch (R7.3, R10.3)
  - _Leverage: src/components/layout/theme-provider.tsx (spreads `{...props}`), src/styles/blog/reading-progress.css (existing reduced-motion branch)_
  - _Requirements: R7 AC3, R10 AC3_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Front-end engineer | Task: Add the global prefers-reduced-motion rule to globals.css and set disableTransitionOnChange on ThemeProvider per design §4 | Restrictions: One-line provider prop (no new component); the reduced-motion rule is global but must not break Radix overlay open/close usability; suppressHydrationWarning already on the `<html>` element — don't duplicate | Success: theme toggle does not flash, reduced-motion users get ~0 transition durations, theme-toggle E2E stays green. Set [-] before starting; log-implementation then [x]_

- [x] 11. Fold the reading-progress fill into the brand role
  - File: src/styles/blog/reading-progress.css
  - Replace the one-off blue fill (the `:root` fill `oklch(0.55 0.2 240)` at line 12 and the `.dark` fill `oklch(0.7 0.16 240)` at line 17) with `var(--brand)` so the site's only pre-existing chroma becomes the brand role
  - Purpose: Single accent — no second chromatic color (design Code Reuse)
  - _Leverage: src/styles/blog/reading-progress.css (fill declarations at lines 12 and 17), --brand_
  - _Requirements: R2 AC1, R1 AC1_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CSS maintainer | Task: Swap the reading-progress blue fill for var(--brand) in both light/dark blocks | Restrictions: Use the token, not a literal; keep the existing reduced-motion branch; the reading-progress parity E2E must stay green (brand light ≠ dark) | Success: the reading-progress bar renders in brand in both themes, parity E2E green. Set [-] before starting; log-implementation then [x]_

- [x] 12. Print/PDF profile stylesheet
  - File: src/styles/print.css (new), src/styles/globals.css (import)
  - Add `src/styles/print.css` imported from `globals.css` (mirroring the `blog/*.css` slice convention) under `@media print`
  - **Re-declare token custom properties under `@media print { :root, .dark { … } }`** to force light: neutral surfaces (`--background: white`, `--foreground: black`, `--card`/`--popover`/`--muted: white`, `--border: #ccc`, `--muted-foreground: #444`) **and** brand ink (`--brand: oklch(0.45 0.13 42)`, `--brand-visited: oklch(0.45 0.06 42)`, `--brand-foreground: white`) so a CV printed from dark mode is readable
  - Scope to the profile route: hide chrome (header/nav, footer, theme toggle, search, contact **form**) keeping email + social links as text; black-on-white prose at the 75ch measure; page margins; avoid breaking inside headings/list items; expand external link `href`s (`a[href]::after { content: " (" attr(href) ")" }`)
  - Purpose: Clean, light, readable CV regardless of on-screen theme (R8.5)
  - _Leverage: src/styles/blog/*.css (slice convention), src/styles/globals.css (import list), design §5 print block_
  - _Requirements: R8 AC5_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CSS engineer experienced with print stylesheets | Task: Create print.css per design §5 — re-declare neutral + brand tokens under @media print to force light, and scope the chrome-hiding/measure rules to the profile route — and import it from globals.css | Restrictions: Must re-declare the custom properties (utility classes alone won't override .dark on the `<html>` element); brand ink must be on-white-legible rust; keep email/social as text, hide the contact form | Success: printing /profile from BOTH light and dark mode yields a light, high-contrast CV with legible rust kicker labels/links at the 75ch measure. Set [-] before starting; log-implementation then [x]_

- [x] 13. Favicon / brand-mark icon set
  - File: src/app/icon.svg (new), src/app/apple-icon.png (new), src/app/favicon.ico (regenerate)
  - Add `icon.svg` (the `/` path-mark in a rounded square, brand on neutral) and `apple-icon.png` (180×180) via the Next.js App Router metadata-file convention; regenerate `favicon.ico` to match; brand-on-neutral so it reads in light and dark browser chrome
  - Purpose: A favicon set matching the wordmark (R8.1)
  - _Leverage: Next.js App Router metadata-file convention (src/app), the Wordmark `/` mark, --brand_
  - _Requirements: R8 AC1_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Brand/asset engineer | Task: Create the icon.svg + apple-icon.png (180×180) metadata files and regenerate favicon.ico, all expressing the `/` path-mark brand-on-neutral, per design §5 | Restrictions: Use the App Router metadata-file convention (not manual `<link>` tags); brand-on-neutral for both browser chromes; keep file sizes small | Success: the new icons are served, the tab/bookmark icon shows the path-mark, build clean. Set [-] before starting; log-implementation then [x]_

- [x] 14. Build-time Open Graph image + remove the dangling og-default ref
  - File: src/app/opengraph-image.tsx (new), src/config/site.ts
  - Add `src/app/opengraph-image.tsx` rendered at build via `next/og` `ImageResponse`, composing the identity (serif name, `mf/` mark, rust `/`, neutral field); derive a default `twitter-image` from the same route
  - **Load font glyph data explicitly**: `ImageResponse` does not read `next/font`. Do **not** try to read the hashed `.next`/node_modules woff2 (those filenames are content-hashed and unstable across builds). Instead **commit a Fraunces + Geist Mono font binary (`.ttf`/`.otf`) at a fixed path under `public/fonts/` (create the dir) or `src/`** and read that committed file at build time, passing it via `ImageResponse`'s `fonts: [...]` option. **Source:** there is no `geist` npm package installed (Geist loads via `next/font/google`), so download the static OFL-1.1 binaries directly — Fraunces and Geist Mono are both OFL-1.1 (redistribution-OK to commit) from Google Fonts / their upstream repos; commit the one or two weights the OG layout needs (the display weight for the name, mono for the `/`)
  - Remove the dangling `ogImage: "/images/og-default.png"` reference at `src/config/site.ts:42` (the file does not exist) — point metadata at the generated route instead
  - Purpose: A templated default OG/twitter image consistent with the identity; fixes the dangling ref (R8.2)
  - _Leverage: next/og ImageResponse, src/config/site.ts:42, Fraunces + Geist Mono font binaries_
  - _Requirements: R8 AC2_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Next.js metadata engineer | Task: Add opengraph-image.tsx (next/og ImageResponse) composing the identity with explicit font-data loading from a COMMITTED font binary under public/fonts/ (not the unstable hashed .next path), derive twitter-image, and replace the dangling og-default.png reference in site.ts per design §5 | Restrictions: ImageResponse needs explicit `fonts:[{name,data,style,weight}]` (it ignores next/font) read from a fixed committed path; PNG served under img-src 'self' data: (runtime font-src CSP does not apply); no per-page OG (deferred) | Success: build emits a valid OG PNG with the serif name + mf/ mark, the og-default.png reference is gone, no dangling asset, build clean. Set [-] before starting; log-implementation then [x]_

## Phase 5: Apply the identity across the eight sections (R1, R9) — blocked by Phases 3–4

- [x] 15. Header: swap the text link for the Wordmark
  - File: src/components/layout/header.tsx, plus any header test
  - Replace the `siteConfig.name` text link (`header.tsx:12-14`) with `<Wordmark />`; optionally swap the header's `z-40` to the generated `z-sticky` utility (from Task 3's `--z-index-sticky`) for clarity — `z-40` already works, so this is cosmetic
  - Update any Vitest/Playwright assertion that selects the header brand text
  - Purpose: The wordmark becomes site chrome (R8.1, R9.1)
  - _Leverage: src/components/layout/header.tsx, src/components/layout/wordmark.tsx (Task 6)_
  - _Requirements: R9 AC1, R9 AC4, R8 AC1_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Front-end developer | Task: Replace the header text link with Wordmark and update affected tests per design Code Reuse | Restrictions: Keep header layout/stickiness; update (don't delete) any test asserting the old brand text; the z-sticky swap is optional/cosmetic (z-40 already works) | Success: header renders the mf/ wordmark linking home, header/nav tests pass. Set [-] before starting; log-implementation then [x]_

- [x] 16. Landing hero re-style (priority surface) — establishes the shared conventions
  - File: src/app/(site)/page.tsx, src/components/shared/hero-card.tsx, plus e2e/landing test
  - Replace the hero `AvatarPlaceholder` (`page.tsx:17`) with the `Wordmark` mark; render the name in the serif display step (`text-4xl` mobile with `text-balance`, → `text-5xl`/`text-6xl` at sm/md); add a `SectionKicker` and the hairline brand rule; brand links
  - **Define the two shared conventions the later section tasks reuse** (name them here so they are not reinvented per section):
    - **Tokenized card-hover convention** = `group-hover:bg-accent` — re-point `hero-card.tsx:17`'s `group-hover:bg-accent/40` to the neutral shadcn `accent` hover-tint role at full token (drop the ad-hoc `/40` alpha; `accent` stays the neutral hover surface per design §1). This named value is what Task 19 means by "brand links + hover convention".
    - **Named spacing rhythm** (design §4, R7.1) = page gutter `px-4 sm:px-6 lg:px-8`, hero vertical `pt-20 md:pt-28` — replacing today's `px-4 py-12 sm:py-16` (`page.tsx:15`). Section rhythm `py-16 md:py-24` is applied by the section tasks (17, 19).
  - Update the landing test if it asserts the avatar/name markup
  - Purpose: Landing hero carries the signature most fully + fixes the shared hover/spacing conventions (R3.2, R8.3, R9.1, R7.1)
  - _Leverage: src/app/(site)/page.tsx, Wordmark (Task 6), SectionKicker (Task 7), src/components/shared/hero-card.tsx:17_
  - _Requirements: R1 AC3, R3 AC2, R7 AC1, R8 AC3, R9 AC2_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Front-end developer with an eye for layout | Task: Re-style the landing hero per design §3/§6 — Wordmark mark, serif display name (text-balance, mobile text-4xl → md text-6xl), SectionKicker, hairline brand rule, brand links — and establish the two shared conventions: re-point hero-card.tsx:17 group-hover:bg-accent/40 → group-hover:bg-accent, and apply the named gutter px-4 sm:px-6 lg:px-8 + hero pt-20 md:pt-28 | Restrictions: AvatarPlaceholder is retained only as the profile headshot fallback elsewhere — remove it from the hero; named Tailwind steps only (no arbitrary values); keep hero-card link/count structure (landing.test asserts it) | Success: hero shows wordmark + serif name + rust / kicker + hairline rule, card hover uses group-hover:bg-accent, the named gutter/hero spacing is applied, landing E2E green. Set [-] before starting; log-implementation then [x]_

- [x] 17. Professional profile re-style (priority surface)
  - File: src/app/(site)/profile/page.tsx
  - Add a serif display headline + `SectionKicker`; make the contact/"Get in touch" action the page's single `brand` CTA button; brand links; keep the page container wider (`max-w-5xl`) while the body column is constrained to `max-w-measure` so gutters widen and the measure holds (R4.3); apply the named spacing rhythm (gutter `px-4 sm:px-6 lg:px-8`, section `py-16 md:py-24` — replacing today's `px-4 py-12 sm:py-16` at `profile/page.tsx:24`); the print stylesheet (Task 12) covers PDF
  - Purpose: Profile carries the signature + the one primary CTA + the named spacing rhythm (R3.2, R8.3, R2.3, R7.1)
  - _Leverage: src/app/(site)/profile/page.tsx, SectionKicker (Task 7), Button brand variant (Task 8)_
  - _Requirements: R1 AC3, R3 AC2, R7 AC1, R8 AC3, R2 AC3_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Front-end developer | Task: Re-style /profile per design §3/§6 — serif headline, / kicker, brand contact CTA (the single brand-filled button), brand links, widen gutters while the body holds max-w-measure, and apply the named spacing rhythm (px-4 sm:px-6 lg:px-8 gutter, py-16 md:py-24 section) | Restrictions: Exactly one brand-filled button on the page; do not widen the prose measure (widen gutters); named Tailwind steps only; the prose-body wrapper itself lands in Task 18 | Success: profile shows the serif headline + kicker + one brand CTA, measure held with wider gutters, named spacing rhythm applied, tests green. Set [-] before starting; log-implementation then [x]_

- [x] 18. Atomic prose-migration across the six long-form bodies
  - File: src/app/(site)/profile/page.tsx, src/app/(site)/about/page.tsx, src/app/(site)/now/page.tsx, src/app/(site)/colophon/page.tsx, src/app/(site)/blog/[slug]/page.tsx, src/app/(site)/projects/[slug]/page.tsx, plus affected tests
  - Wrap the four currently-unstyled MDX bodies (profile `<article>`, about/now/colophon `<div class="text-base leading-relaxed text-foreground">`) in `prose dark:prose-invert max-w-measure`
  - Blog `[slug]`: replace `max-w-[75ch]` (the only one in `(site)`, at `blog/[slug]/page.tsx:143`) with `max-w-measure` and **drop `prose-lg`** (the themed scale owns sizing); ensure `dark:prose-invert` present
  - Projects `[slug]`: today the body is an **outer `mx-auto max-w-prose mt-8` wrapper at `projects/[slug]/page.tsx:86`** around an inner `<div class="prose dark:prose-invert">` (`:87`). Put `max-w-measure` **on the inner `.prose` element** (giving `prose dark:prose-invert max-w-measure`) and **remove the outer `max-w-prose`** (leaving it would re-cap to 65ch) so projects holds the same 75ch as the other five — **do not add `max-w-none`**
  - **Update the existing layout test** `e2e/tests/projects-detail-layout.test.ts`: its `PROSE_MAX_WIDTH = 700` constant (line 49, commented "`max-w-prose` ~ 65ch ≈ 700px") asserts the prose `<p>` width ≤ `700 + tolerance`. The new ceiling is 75ch **on the sans body face** — do not guess the pixel value: **measure the actual rendered `<p>` width** (75ch on the sans face is ≈600px, i.e. *narrower* than today's 700, so the old ceiling won't false-fail — but set the constant to the real measured value and fix the comment to read "75ch ≈ the measured px", since the design mandates all six routes at 75ch)
  - **Canonical prose class set** (per Task 5): every prose body uses `prose dark:prose-invert max-w-measure` — and **NOT** `max-w-none` (verified: `max-w-none` emits after `max-w-measure` in `tailwindcss@4.2.2`, so combining them yields `max-width: none`). The bare `prose max-w-measure` wins over the plugin's components-layer `.prose { max-width: 65ch }` via the utilities-after-components layer order → 75ch. For **projects `[slug]`** put `max-w-measure` **on the `.prose` element itself** (`:87`) and **remove the outer `max-w-prose`** (`:86`) so there is one element carrying the 75ch measure
  - Land all of these as **one change** so the site is never mid-migration with a mixed measure or a surviving arbitrary value; update any other selector/text assertions the wrappers touch
  - Purpose: Uniform themed prose + 75ch measure on all six routes (no surviving 65ch wrapper), clearing the R1.2 grep without an R9.4 test regression (R4.3, R9.1, R9.4)
  - _Leverage: themed .prose from Task 5, max-w-measure from Task 3, the six page files above, e2e/tests/projects-detail-layout.test.ts:49_
  - _Requirements: R1 AC2, R4 AC3, R9 AC1, R9 AC4_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Careful refactoring developer | Task: Perform the atomic prose-migration per design §2/§6 — standardize all six bodies to `prose dark:prose-invert max-w-measure` (the bare utility wins over the plugin's components-layer .prose 65ch via v4 layer order → 75ch): wrap the four MDX bodies, swap blog's max-w-[75ch] → the canonical set and drop prose-lg, put max-w-measure on projects/[slug]'s INNER .prose element (page.tsx:87) and remove the outer max-w-prose (page.tsx:86), then measure the rendered 75ch paragraph width and set projects-detail-layout.test.ts PROSE_MAX_WIDTH (line 49) to that real value | Restrictions: One atomic change (no partial mid-migration); do NOT add max-w-none (verified in tailwindcss@4.2.2 it emits after max-w-measure → max-width:none, removing the cap); no surviving max-w-prose or max-w-[75ch]; do not change MDX content; do not guess the test px — measure it (75ch on sans ≈600px, a ≤ ceiling); if a build check shows the plugin's 65ch still winning, use an unlayered .prose max-width override per design §2, never max-w-none | Success: all six routes render themed prose at the 75ch measure in both themes (verified by measuring, not assumed), no max-w-[75ch]/max-w-prose/max-w-none on prose remains, projects-detail-layout.test.ts passes against the measured width, Vitest/Playwright green. Set [-] before starting; log-implementation then [x]_

- [x] 19. Apply identity to the remaining sections
  - File: src/app/(site)/projects/page.tsx, src/app/(site)/contributions/page.tsx, src/app/(site)/blog/page.tsx, src/app/(site)/resources/page.tsx, src/app/(site)/sitemap/page.tsx, src/app/(site)/slashes/page.tsx, src/app/(site)/about/page.tsx, src/app/(site)/now/page.tsx, src/app/(site)/colophon/page.tsx
  - Apply brand links, a `SectionKicker` over each section heading, serif `h1`/`h2` where appropriate, the named spacing rhythm (gutter `px-4 sm:px-6 lg:px-8`, section `py-16 md:py-24`), the `group-hover:bg-accent` card-hover convention (Task 16) where cards appear, and status roles where used; keep each section's existing layout/gallery (codify, not re-style) per the design §6 table
  - **Include About/Now/Colophon** here for the `/ kicker` + brand links the design §6 row mandates (their prose-body wrap is Task 18's job; this task adds the kicker/links). These three files are also touched by Task 18 — apply Task 19 **after** Task 18 on them so the prose wrap is in place first (additive, no clobber)
  - Purpose: Coherent identity (incl. the named spacing rhythm + hover convention) applied to every built section, not just the priority surfaces (R9.1, R1.3, R7.1)
  - _Leverage: SectionKicker (Task 7), the brand link + `group-hover:bg-accent` + spacing conventions defined in Task 16, the design §6 per-section table_
  - _Requirements: R1 AC1, R1 AC3, R7 AC1, R9 AC1, R9 AC2_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Front-end developer | Task: Apply brand links + / kicker + serif headings + the named spacing rhythm (px-4 sm:px-6 lg:px-8 gutter, py-16 md:py-24 section) + the group-hover:bg-accent card hover (and status roles where used) to projects, contributions, blog index, resources, sitemap, slashes, AND about/now/colophon (the / kicker + links per design §6) — apply after Task 18 on the three MDX pages | Restrictions: Codify (keep) existing layouts/galleries — do not re-architect; named Tailwind steps only; signature is concentrated on priority surfaces, so apply the kicker/links here without the full hero treatment; (playground) is out of scope and untouched | Success: every (site) section uses brand links + kicker + serif headings + the named spacing rhythm consistently, suites green, (playground) visually unchanged. Set [-] before starting; log-implementation then [x]_

## Phase 6: Gates + verification (R5, R9.4, R10, R1.3/R3.6) — blocked by Phases 1–5

- [x] 20. Token-presence (active-role ↔ token) unit test
  - File: src/styles/tokens.test.ts (new, or colocated)
  - Assert every role the design system calls "active" — incl. `brand`/`brand-foreground`/`brand-visited`, `success`/`warning`/`info` (+ foregrounds), `destructive` — exists in `tokens.css` and is mapped in the `@theme` block (a lightweight stand-in until the deferred CI active-role↔token check lands)
  - Purpose: No doc↔token divergence (R6.3)
  - _Leverage: src/styles/tokens.css, src/styles/globals.css @theme, Vitest_
  - _Requirements: R6 AC3, R10 AC1_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA/test engineer | Task: Write a Vitest test asserting each active role exists in tokens.css (matched :root/.dark) and is mapped in @theme per design Testing Strategy | Restrictions: Read the CSS as text and assert presence/mapping; keep it lightweight; do not duplicate the deferred CI check's full scope | Success: the test passes and fails loudly if a role is added to the doc but missing from tokens/@theme. Set [-] before starting; log-implementation then [x]_

- [x] 21. Accessibility / contrast verification (axe, both themes)
  - File: e2e/tests (axe coverage), as needed
  - Run axe on landing, profile, a blog post, and a status-feedback state in **both** themes — zero color-contrast violations; verify the §1 legal-pairing matrix holds at the deepest legal nest (status text on `/10` over card); confirm the brand focus ring meets non-text contrast
  - Purpose: AA contrast in both themes, verifying the design §1 matrix (R5.1, R5.2)
  - _Leverage: existing Playwright/axe setup, design §1 matrix_
  - _Requirements: R5 AC1, R5 AC2, R10 AC1_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Accessibility QA engineer | Task: Add/extend axe checks on landing, profile, blog post, and a status state in both themes; verify the §1 matrix and the brand focus-ring non-text contrast | Restrictions: Both themes required; assert zero color-contrast violations; test the composited /10 tint on a card, not just the solid role | Success: axe reports zero contrast violations across the named pages in both themes, focus ring ≥3:1 confirmed. Set [-] before starting; log-implementation then [x]_

- [x] 22. Full suite green + no-flash + R1.2 arbitrary-value gate
  - File: (verification across the repo)
  - Run the full Vitest + Playwright suites and fix any assertions broken by the markup changes (header wordmark, prose wrappers, projects measure); assert the theme-toggle no-flash behavior is wired (provider prop)
  - Run the R1.2 grep gate **pinned to the exact narrow pattern** the design enumerates — arbitrary **color/font-size/padding-margin** one-offs only: `text-\[`, `bg-\[#`, and `[pm][xytrbl]?-\[` — across `src/app/(site)` and the shared components it renders. **Do NOT** flag layout sizing (`min-h-[…]`, `max-h-[…]`, `min-w-[…]`, `max-w-[…]`, `h-[…]`, `w-[…]`) which are legitimate and out of scope: the repo legitimately uses `min-h-[300vh]` (the `blog/component-preview` route), `min-h-[28rem]` and `min-h-[1.25rem]` (`contact-form.tsx`), and Radix sizing tokens in `ui/`. `(site)` has no color/font/padding one-offs of this pinned shape today, so the pinned grep returns zero. (The `max-w-[75ch]` that Task 18 removes is a *layout-measure* value outside this pinned pattern — its removal serves the design's measure-coherence intent, not this color/font/padding grep; do not expect the grep to have ever matched it.)
  - Purpose: No functional regression + the arbitrary-value gate clears without false-failing on legitimate layout sizing (R9.4, R1.2)
  - _Leverage: pnpm test, pnpm test:e2e, grep with the pinned pattern_
  - _Requirements: R1 AC2, R9 AC4, R10 AC3_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Release-gate engineer | Task: Run the full Vitest + Playwright suites, fix any markup-driven assertion breakage, confirm no-flash wiring, and run the R1.2 arbitrary-value grep PINNED to color/font/padding-margin one-offs only (`text-\[`, `bg-\[#`, `[pm][xytrbl]?-\[`) | Restrictions: Do not weaken tests to make them pass — fix the assertion or the code; the grep must NOT flag layout sizing (min-h/max-h/min-w/max-w/h-/w- arbitrary values) or Radix tokens in ui/ — those are legitimate and out of the spec's removal scope | Success: pnpm test and pnpm test:e2e both green, the pinned color/font/padding grep returns zero hits in (site). Set [-] before starting; log-implementation then [x]_ Set [-] before starting; log-implementation then [x]_

- [x] 23. Visual review vs design-baseline + distinctiveness + Lighthouse
  - File: (review; capture any "after" screenshots alongside design-baseline/)
  - Side-by-side review every `(site)` route against `design-baseline/*.png` in both themes at the named Tailwind breakpoints; apply the R3.6 distinctiveness test (a reviewer who cannot tell the result from a stock shadcn-neutral site = FAIL — the result must show serif name + `mf/` mark + rust `/` kicker + hairline surfaces); confirm 90+ Lighthouse Performance and theme parity hold
  - Purpose: The R1.3/R3.6 subjective-quality arbiter + the perf/parity gates (R1.3, R3.6, R10.1)
  - _Leverage: design-baseline/ screenshots, the design §3 reference targets (maggieappleton.com, rauno.me, Stripe Press)_
  - _Requirements: R1 AC3, R3 AC6, R10 AC1_
  - _Prompt: Implement the task for spec visual-design, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Design reviewer | Task: Review every (site) route in both themes against design-baseline/, apply the R3.6 distinctiveness test, and confirm 90+ Lighthouse Performance + theme parity | Restrictions: This is the subjective-quality arbiter — fail if the result is mistakable for stock shadcn-neutral; verify the priority surfaces (hero, profile) carry the signature most fully | Success: every route reads as the deliberate identity (serif + mf/ + rust / + hairlines), distinct from stock shadcn, Lighthouse ≥90, both themes at parity. Set [-] before starting; log-implementation then [x]_

## Deferred / out of scope (surfaced for veto at the phase boundary)

Recorded in the design and carried here unchanged — not silently cut:

- **Per-page custom OG images** — this spec ships one templated default OG/twitter image (Task 14); per-page variants are deferred.
- **Data-viz / chart palette** — out of scope (no charts on the built site); `chart-*` stays reserved.
- **Internationalization / RTL & logical-properties** — deferred; the site is single-locale LTR.
- **CI gate upgrades** (LCP/CLS/INP + byte-weight assertions, full-route Lighthouse, the active-role↔token CI check) — owned by `tech.md`/CI, not this spec (R10.2); Task 20 ships a lightweight unit-test stand-in for the active-role↔token check only.

## Revision History

- **v4** — addressed adversarial r3 (1 must-fix, 1 should-fix, 0 minor; both accepted — r3 compiled
  `tailwindcss@4.2.2` and proved the v3 prose-measure fix was wrong). Fixes: **(MUST, recurring on the
  r2 prose-measure issue — mis-fixed in v3, not rejected)** the v3 canonical set
  `prose max-w-none max-w-measure` is broken: `.max-w-none` is emitted *after* `.max-w-measure` at
  equal specificity (verified by compiling the installed Tailwind), so the same-element pair resolves
  to `max-width: none` — **no cap at all**, worse than the plugin's 65ch. Corrected the canonical set
  to **bare `prose dark:prose-invert max-w-measure`** (no `max-w-none`): the utility wins over the
  plugin's components-layer `.prose { max-width: 65ch }` via v4's utilities-after-components layer
  order → 75ch. Added a deterministic unlayered-`.prose` fallback (design §2) and kept Task 18's
  rendered-width measurement as the safety net; Tasks 5 and 18 updated. **(SHOULD)** Task 14 now names
  the OG font **source** (no `geist` npm package exists; download the OFL-1.1 Fraunces + Geist Mono
  binaries and commit them) since "copy from node_modules" had no valid source here. No finding
  rejected. (Side note recorded for the human, not a task change: the **design doc** §4/Data-Models
  still names the z-index tokens with the non-generating `--z-base/-*` namespace; Task 3 correctly
  uses `--z-index-*` — a stale design-doc inconsistency to optionally clean up later.)
- **v3** — addressed adversarial r2 (1 must-fix, 3 should-fix, 2 minor; all accepted — r2 confirmed
  every v2 artifact reference was correctly grounded and all six r1 fixes landed; the new findings
  were Tailwind-v4/typography mechanics the tasks assumed but didn't specify). Fixes: **(MUST)** the
  `@tailwindcss/typography` plugin ships a built-in `.prose { max-width: 65ch }`, so a bare
  `prose max-w-measure` leaves 65ch competing on the same property and the mandated 75ch measure is
  unreachable (on projects, a 65ch `.prose` child can't be widened by a 75ch parent wrapper). Tasks 5
  and 18 now specify the canonical `prose dark:prose-invert max-w-none max-w-measure` set (`max-w-none`
  drops the plugin cap so `--container-measure` governs) and require the measure to sit **on the
  `.prose` element** for projects (removing the outer `max-w-prose`). **(SHOULD)** Task 3's z-index
  tokens used the wrong v4 namespace — verified the v4 `z` utility reads `themeKeys: ["--z-index"]`,
  so `--z-sticky` generates no utility; switched to `--z-index-base/-sticky/-overlay/-toast`
  (→ `z-sticky` etc.) and noted the header `z-40` already works (cosmetic tokenization); Task 15
  updated to match. **(SHOULD)** About/Now/Colophon's design-§6 `/ kicker` + brand links had no task
  (Task 18 only wrapped their prose, Task 19 excluded them) — added the three files to Task 19, applied
  after Task 18. **(SHOULD)** Task 14's OG font path ("read from `.next`/node_modules") is unstable
  (content-hashed filenames) — pinned to a committed font binary under `public/fonts/`. **(MINOR)**
  corrected Task 22's grep rationale (the pinned color/font/padding pattern never matched the
  layout-measure `max-w-[75ch]`; its removal serves measure-coherence, not this grep); **(MINOR)**
  Task 18's `PROSE_MAX_WIDTH` is now set by **measuring** the rendered 75ch `<p>` width (≈600px on the
  sans face), not a guessed ~810px. No finding rejected.
- **v2** — addressed adversarial r1 (1 must-fix, 4 should-fix, 1 minor; all accepted — the review
  confirmed every artifact reference in v1 was correctly grounded, and that the only real failures
  were coverage/atomicity gaps). Fixes: **(MUST)** Task 18 now names the pre-existing
  `mx-auto max-w-prose` wrapper at `projects/[slug]/page.tsx:86` (≈65ch — would override the 75ch
  target) and instructs replacing it with `max-w-measure`, AND updating the existing
  `projects-detail-layout.test.ts` `PROSE_MAX_WIDTH = 700` constant (line 49) to the 75ch target so
  the atomic migration doesn't silently fail or break the layout E2E (R9.4). **(SHOULD)** defined the
  previously-undefined "tokenized card-hover convention" as `group-hover:bg-accent` and pinned it in
  Task 16 (re-pointing `hero-card.tsx:17`'s `bg-accent/40`), referenced by Task 19. **(SHOULD)**
  pinned Task 22's R1.2 grep to the exact narrow color/font/padding pattern (`text-\[`, `bg-\[#`,
  `[pm][xytrbl]?-\[`) and explicitly excluded legitimate layout sizing (`min-h-[300vh]` etc.) so the
  gate doesn't false-fail. **(SHOULD)** folded the design §4 **named spacing rhythm** (R7.1:
  `px-4 sm:px-6 lg:px-8` gutter, `py-16 md:py-24` section, hero `pt-20 md:pt-28` — replacing today's
  `px-4 py-12 sm:py-16`) into Tasks 16/17/19, which previously left R7.1 only implicitly covered.
  **(SHOULD)** reworded Tasks 1/2 to confirm contrast against the **design §1 pre-computed figures**
  (noting the rendered-DOM axe check is Task 21) rather than implying a token-level contrast tool
  exists. **(MINOR)** corrected Task 11's reading-progress line cite (fill declarations at lines 12 &
  17). No finding rejected; the reviewer's note that the design's "mobile-nav z-40" consumer does not
  exist was confirmed (only `header.tsx:10`) — the tasks were already correct to swap only the header,
  so no change.
- **v1** — initial tasks. 23 atomic tasks across six phases: token foundation (brand/status/measure/z-index), typography (Fraunces + @tailwindcss/typography themed to tokens), signature + interactive components (Wordmark, SectionKicker, Button brand variant, StatusCallout), motion/print/artifacts (reduced-motion + no-flash, reading-progress→brand, print.css, favicon set, build-time OG), per-section application (header wordmark, landing hero, profile, atomic prose-migration, remaining sections), and gates/verification (token-presence test, axe both themes, full-suite + arbitrary-value grep, visual review vs design-baseline + distinctiveness + Lighthouse). File paths and design-section references grounded against the real codebase.
