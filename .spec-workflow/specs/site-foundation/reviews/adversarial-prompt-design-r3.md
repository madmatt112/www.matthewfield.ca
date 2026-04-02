# Adversarial Review Prompt — site-foundation Design (Round 3)

You are a senior frontend architect with deep expertise in Next.js App Router, CSS cascade layers, Tailwind CSS v4, and accessibility standards. You have shipped multiple production sites using these exact technologies. Your job is to tear apart the design document below and find every remaining weakness, inconsistency, and gap. Do not validate. Do not praise. Attack.

Read the following files in order before beginning your analysis:

1. `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md` — product vision and principles
2. `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md` — technology decisions and constraints
3. `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md` — project structure conventions
4. `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/requirements.md` — requirements this design must satisfy
5. `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/design.md` — **the target document**

## Prior Review Context

This design has been through two rounds of adversarial review. Both rounds were highly effective — nearly all findings were accepted and incorporated. The design is now substantially tighter than its original version. Your job is to find what two prior reviewers missed or what their fixes introduced.

### What was addressed (do NOT re-discover these — they are resolved):
- CSS layer ordering is correctly framed as a hypothesis the spike must verify, not an assumed fact
- `all: initial` side effects (`color-scheme`, `-webkit-text-size-adjust`) are handled in the playground base stylesheet
- Playground token mechanism is now manual re-declaration of literal values on `.playground-container`, not a CSS import. The design honestly acknowledges this as a maintenance coupling
- Playground is explicitly light-mode only — no dark mode mechanism needed
- `tokens.css` is intentionally unlayered, documented with a comment explaining cascade priority
- `VeliteWebpackPlugin` removed; dev script uses `concurrently "velite dev" "next dev --turbopack"` for content rebuilds
- CI/CD is a single job with sequential steps, Playwright browser caching included
- Radix Sheet committed for mobile nav, ARIA attributes specified (`aria-haspopup="dialog"`, `aria-controls` via Radix)
- ThemeToggle stays in header bar at all breakpoints on mobile
- Sitemap includes all routes (slash pages added)
- Placeholder pages use `robots: { index: false }`
- OG image is a static PNG committed to repo
- Error boundaries explicitly deferred
- CSS syntax errors acknowledged as silent failure category
- `next/font/google` chosen with documented fallback
- R12 (testing) moved to phase 1; phase 3 sub-ordered (R9 → R14 → R5 → R4 → R10 → R13)
- Playground layout under spike outcome (c) described

### Low-severity items still unresolved (note but don't dwell on):
- No integration test for `.velite/` output contract (TypeScript compiler provides reasonable coverage)
- `output.clean: true` race condition during dev (transient annoyance, not correctness issue)

### Classification for your findings:
Label each finding as one of:
- **Novel**: Not identified in any prior review
- **Compounding**: Builds on or deepens a prior finding — escalate severity
- **Recurring**: Same issue found before but not resolved — severity escalates automatically

---

## 1. Playground Token Synchronization Enforcement

The design's sole enforcement mechanism for playground token drift is a Playwright E2E test (`e2e/tests/playground-isolation.test.ts`) that compares computed styles. Stress-test this:

- Challenge the assertion strategy: `getComputedStyle()` returns resolved values. If a token value is wrong but resolves to the same computed color (e.g., different oklch representations that produce the same sRGB output), the test passes while the source is out of sync. Determine whether this is a real risk or a theoretical one given the token value format.
- Examine what happens when shadcn/ui releases a new default theme token that existing components start consuming. The playground base stylesheet doesn't have it. The Playwright test only checks properties it was written to check — it doesn't detect missing tokens. Identify the failure mode: silent visual regression? Broken component? Does the test catch it or not?
- The design says "~15 tokens" are needed. Count the actual shadcn/ui default token set (background, foreground, card, card-foreground, popover, popover-foreground, primary, primary-foreground, secondary, secondary-foreground, muted, muted-foreground, accent, accent-foreground, destructive, border, input, ring, radius). That's 19+ tokens. Challenge whether the "~15" estimate is accurate and whether the Playwright test covers all of them.
- Evaluate whether a simpler enforcement mechanism exists: a build-time script that diffs `:root` custom properties in `tokens.css` against `.playground-container` custom properties in the playground stylesheet and fails if they diverge. Determine if this would be over-engineering or a genuine improvement.

## 2. `concurrently` Dev Script Failure Modes

The dev script `concurrently "velite dev" "next dev --turbopack"` was added to fix the VeliteWebpackPlugin/Turbopack incompatibility. Now stress-test the fix:

- Determine what happens when `velite dev` crashes (schema error, file system permission issue, or OOM). Does `concurrently` kill `next dev`? Does it surface the Velite error clearly or bury it in interleaved output? The default `concurrently` behavior on child process exit varies by flag configuration (`--kill-others`, `--kill-others-on-fail`). The design doesn't specify which flags are used.
- Examine the startup race: `velite dev` must complete its initial build before `next dev` can serve pages that import from `#site/content`. If Next.js starts faster than Velite's initial build, the first page load fails with "Module not found: Can't resolve '#site/content'". The `postinstall` script runs `velite build` during `pnpm install`, so `.velite/` should exist from a prior install — but after a `git clean -xdf` or fresh clone without `pnpm install`, running `pnpm dev` directly would hit this race. Determine if this is a realistic scenario or an edge case.
- The `velite dev` watcher and Next.js Turbopack both watch files. When Velite rebuilds `.velite/`, Turbopack detects the change and triggers HMR. Identify whether this double-watch creates unnecessary rebuild cycles or if the file change propagation is clean.

## 3. Accessibility Beyond ARIA — Keyboard Flows and Focus Management

The design specifies ARIA attributes for the mobile nav and theme toggle. Go deeper into the keyboard interaction model:

- Trace the full keyboard flow for the theme toggle: user tabs to the trigger button, presses Enter/Space to open the DropdownMenu, uses arrow keys to navigate options, presses Enter to select. After selection, where does focus go? Radix DropdownMenu returns focus to the trigger by default — verify this is the correct behavior for a theme toggle (it is for a menu, but a theme toggle that closes after selection should arguably move focus forward, not back to itself). Determine if this creates a focus trap for keyboard users who want to continue tabbing past the toggle.
- Examine the mobile Sheet's focus management when navigating: user opens Sheet, clicks a nav link, Sheet closes, page navigates. After navigation completes (App Router client-side navigation), where is focus? It should move to the main content area of the new page. If focus returns to the Sheet trigger (which is now closed) or to the beginning of the document, keyboard users lose their place. The design doesn't specify post-navigation focus management.
- The landing page hero cards are clickable cards wrapping a `Link`. Verify that the entire card is a single tab stop (not the card and the link as separate tab stops). If the card component renders as `<div>` with an `onClick` that navigates AND contains a `<Link>`, there are two focusable elements per card — a common accessibility anti-pattern. The design specifies both a `Card` wrapper and a `Link` but doesn't specify the DOM structure.

## 4. CSP and Script Integrity Edge Cases

The CSP has been reviewed twice. Now look for interaction effects with other parts of the system:

- `script-src 'self' 'unsafe-inline'` allows all inline scripts. The `next-themes` blocking script that prevents FOUC is an inline script injected into `<head>`. This works. But challenge whether any downstream spec could inadvertently widen the attack surface: the contact form (spec 2) uses client-side JavaScript — is there a scenario where user input reaches an `eval()` or `innerHTML` path via the contact form's client component? The design says "User-provided fields sent as plain text via Resend's `text` parameter" but doesn't address the client-side component's handling before submission.
- `frame-src 'self'` allows iframes from the same origin. Playground iframe embeds (`/playground/[slug]/embed`) are same-origin, so this works. But if a playground item needs to embed external content (a third-party widget, a CodePen embed, an external iframe), `frame-src 'self'` blocks it. The design says playground routes opt out of CSP — verify this is true for the embed routes. The CSP exclusion regex `/((?!playground(/|$)).*)` matches `/playground` and `/playground/*`. Does `/playground/my-toy/embed` match the exclusion? Trace the regex: the path `/playground/my-toy/embed` starts with `playground/` — the negative lookahead `(?!playground(/|$))` at position after the leading `/` checks if "playground/" follows. It does, so the lookahead fails, the overall pattern doesn't match this path, and the CSP header is NOT applied. Confirm this analysis — if it's correct, the design works; if the regex evaluation differs from this analysis, there's a CSP leak.
- `connect-src 'self'` restricts fetch/XHR to same origin. The design notes this must be updated for analytics. But `next/font/google` downloads fonts during build, not at runtime — confirm there's no runtime font fetch that `connect-src` would block. If `next/font` falls back to a runtime fetch in any scenario (e.g., font not found in cache during ISR revalidation), the CSP would block it silently.

## 5. Design-Requirements Traceability and Completeness

Cross-reference the design against every requirement and acceptance criterion. Find gaps:

- R4 AC4 says "the layout shell (header, footer) SHALL persist without full-page reloads (Next.js App Router behavior)." The design describes shared layouts but doesn't explicitly address or test this persistence. Is there any scenario where the layout remounts during client-side navigation (e.g., navigating between `(site)` pages that share the same layout)? This should be guaranteed by App Router's layout model, but the design should acknowledge it rather than leaving it as an implicit framework assumption.
- R11 AC1 requires "The `@layer playground` declaration order relative to Tailwind v4's internal layers must be explicitly defined and documented as a spike deliverable." The design shows `@layer playground;` before `@import "tailwindcss";` in `globals.css` and explains the ordering hypothesis. But the requirement says the ordering must be "documented as a spike deliverable" — the design documents the intended ordering, not the verified ordering. The spike is supposed to verify it. Is the design conflating what it intends with what it has proven?
- R11 AC6 says the spike "SHALL verify whether the portal renders within the isolation boundary or escapes to `document.body`" and "SHALL document this as a known limitation with a mitigation path." The design says the spike should "produce a brief matrix of which shadcn/ui overlay components support containment via `container` prop and which do not." Verify that the design's spike test fixtures (section "Spike Test Fixtures") actually include a test case for AC6. Count the numbered test cases — is there a test fixture for the Radix overlay/portal scenario?
- R14 AC3 requires "automatic font metric adjustment (`adjustFontFallback`) or equivalent." The design mentions `adjustFontFallback` is "enabled by default" for `next/font/google`. Verify this claim — is `adjustFontFallback` actually the default for `next/font/google`? If it defaults to a different value (e.g., `false` for Google fonts vs. `true` for local fonts), the design has an unstated assumption.

## 6. Build Pipeline Robustness and Edge Cases

The CI pipeline has been tightened. Look for remaining gaps:

- The Playwright browser cache key is `playwright-${{ hashFiles('pnpm-lock.yaml') }}`. This means the cache invalidates whenever any dependency changes, not just Playwright. If a developer updates an unrelated package (e.g., bumps `next` patch version), the Playwright browser cache is thrown away and browsers are re-downloaded (~300MB). A more precise key would use `hashFiles('**/package.json')` filtered to the Playwright version, or the Playwright version directly. Determine if the current key is wasteful enough to matter for a solo-developer project or if this is acceptable imprecision.
- The CI runs `pnpm exec playwright install --with-deps` on every run. With the cache, this is a no-op when browsers are cached. Without the cache (miss), it downloads browsers and OS dependencies. The `--with-deps` flag installs system dependencies via `apt-get` — on GitHub Actions `ubuntu-latest`, are all required system deps already present, or does `--with-deps` add packages? If `ubuntu-latest` ships with the needed deps, `--with-deps` adds unnecessary `apt-get` calls on every cache miss.
- The build step runs `pnpm build` which executes `next build`. The `postinstall` hook already ran `velite build`. But `next build` also triggers Velite via... what mechanism? The design removed `VeliteWebpackPlugin`. So during `next build`, Velite does NOT run again — it relies on the `.velite/` output from `postinstall`. If the content files change between `pnpm install` and `pnpm build` (unlikely in CI, but possible in a long-running local build), the `.velite/` output is stale. Confirm this is a non-issue in CI (where the entire pipeline runs from a clean checkout).

---

## Closing Deliverables

Conclude your analysis with:

1. **Top 5 risks/gaps** — ranked by severity × likelihood. Be specific: name the failure scenario, not the abstract risk category.
2. **Top 3 conclusions to challenge or reverse** — identify specific design decisions that should be reconsidered, with concrete reasoning for why the current conclusion is wrong or incomplete.
3. **What's missing** — work that should be done before this design is implemented. List concrete deliverables, not vague suggestions.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

Write your analysis to: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/reviews/adversarial-analysis-design-r3.md`
