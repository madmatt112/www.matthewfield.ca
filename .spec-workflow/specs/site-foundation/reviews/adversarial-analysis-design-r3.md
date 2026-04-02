# Adversarial Analysis — site-foundation Design (Round 3)

## 1. Playground Token Synchronization Enforcement

### 1.1 `getComputedStyle()` oklch Resolution Risk — **Novel, Low Severity**

The concern is that different oklch representations could resolve to the same sRGB output, making the test pass while source values diverge. In practice, this is a theoretical risk, not a real one. The design specifies that playground tokens are **literal copies** of the values from `tokens.css`. The Playwright test compares computed styles, and browsers resolve oklch to a canonical computed form (typically `oklch(...)` in supporting browsers, or an `rgb()` fallback). Two different oklch expressions that produce the same color would still serialize to different computed strings if their oklch parameters differ. The only way this fails silently is if both `tokens.css` and the playground stylesheet independently change to different oklch values that happen to produce identical computed serializations — vanishingly unlikely for a manual copy-paste workflow.

**Verdict**: Theoretical. Not worth additional mitigation.

### 1.2 New shadcn/ui Token Detection Gap — **Novel, Medium Severity**

This is a real gap. The Playwright test checks a fixed set of properties it was written to assert against. If shadcn/ui introduces a new default token (e.g., `--chart-1` through `--chart-5` in recent versions, or `--sidebar-*` tokens), existing components may start consuming it. The failure mode:

1. A shadcn/ui component update adds a new component or updates an existing one to reference `--sidebar-background`.
2. `tokens.css` gets the new token via `npx shadcn@latest init` or manual addition.
3. The playground base stylesheet does **not** get the new token.
4. The component renders inside the playground container. `var(--sidebar-background)` resolves to the CSS initial value (empty/transparent) because the custom property is not declared on `.playground-container`.
5. **The Playwright test does not catch this** because it doesn't test for `--sidebar-background` — it only checks properties it was written to check.
6. Result: **silent visual regression** in the playground. The component renders but looks broken (transparent backgrounds, missing colors).

The design's enforcement mechanism is reactive (catches drift in known tokens) but blind to new tokens.

**Recommendation**: Add a comment in `playground-isolation.test.ts` noting that when new shadcn/ui components are added, their consumed tokens must be verified against the playground base stylesheet. Alternatively, the Playwright test could dynamically extract all custom properties from both `:root` and `.playground-container` and compare the sets — this is more robust but adds test complexity.

### 1.3 Token Count — **Novel, Low-Medium Severity**

The design says "~15 tokens." The actual shadcn/ui default token set (as of current shadcn/ui):

1. `--background`
2. `--foreground`
3. `--card`
4. `--card-foreground`
5. `--popover`
6. `--popover-foreground`
7. `--primary`
8. `--primary-foreground`
9. `--secondary`
10. `--secondary-foreground`
11. `--muted`
12. `--muted-foreground`
13. `--accent`
14. `--accent-foreground`
15. `--destructive`
16. `--border`
17. `--input`
18. `--ring`
19. `--radius`

That's 19 tokens. Recent shadcn/ui versions also add `--destructive-foreground`, `--chart-1` through `--chart-5`, and potentially sidebar tokens, pushing the count to 25+. The "~15" estimate understates the actual count by at least 25%.

This matters because an implementer taking the "~15" figure literally may stop after re-declaring 15 tokens, leaving 4+ tokens undeclared. Components consuming missing tokens (`--border`, `--input`, `--ring`) would render with browser defaults inside the playground container.

**Recommendation**: Update "~15 tokens" to "~20 tokens" and specify that the playground base stylesheet must mirror the complete set from `tokens.css`, not a guessed subset.

### 1.4 Build-Time Token Diff Script — **Novel, Assessment**

A build-time script parsing `:root` properties from `tokens.css` and `.playground-container` properties from the playground stylesheet, failing on divergence, would catch both drift and missing tokens. This is approximately 20-30 lines of Node.js.

**Verdict**: Over-engineering for now. The Playwright test provides reasonable coverage for known tokens. If token coverage becomes a recurring issue during implementation (especially after 1.2 materializes), the build-time script is the correct escape hatch. Not worth building preemptively for a solo-developer project.

---

## 2. `concurrently` Dev Script Failure Modes

### 2.1 Missing `--kill-others-on-fail` Flag — **Novel, Medium Severity**

The design specifies `concurrently "velite dev" "next dev --turbopack"` without any flags. The default `concurrently` behavior when a child process exits:

- It does **not** kill other processes. If `velite dev` crashes (schema error, OOM, file system issue), `next dev` continues running. The developer sees the Velite error in interleaved terminal output — but if they are focused on component work and not watching the terminal, they may not notice until they edit content and it fails to update.
- If `next dev` crashes, Velite continues watching files pointlessly.

The `--kill-others-on-fail` flag makes either process's crash kill the other, giving the developer a clear "dev environment is down" signal. The `--names` flag labels output (`[velite]`, `[next]`), making interleaved output readable.

**Recommendation**: Specify `concurrently --kill-others-on-fail --names velite,next "velite dev" "next dev --turbopack"`. Without these flags, the failure mode is a silently degraded dev environment where content changes stop working but the dev server remains up.

### 2.2 Startup Race After Fresh Clone — **Novel, Non-Issue**

The race between `velite dev` initial build and `next dev` startup is mitigated by the `postinstall` script: `pnpm install` runs `velite build`, populating `.velite/` before `pnpm dev` is ever executed. The only scenario where this race matters is `git clean -xdf` followed by `pnpm dev` without `pnpm install` — which fails immediately because `node_modules/` is also gone.

**Verdict**: Non-issue. Standard workflow is safe.

### 2.3 Double-Watch Rebuild Cycles — **Novel, Non-Issue**

The signal chain is unidirectional: content file change → Velite rebuilds `.velite/` → Turbopack detects `.velite/` change → HMR triggers. No feedback loop exists (Turbopack doesn't write to `content/`, Velite doesn't watch `.velite/`). The only minor concern is if Velite writes multiple files non-atomically during a rebuild, triggering 2-3 rapid HMR cycles — a transient DX nuisance, not a correctness issue.

**Verdict**: Clean propagation. No design change needed.

---

## 3. Accessibility — Keyboard Flows and Focus Management

### 3.1 ThemeToggle Post-Selection Focus — **Novel, Non-Issue**

Radix DropdownMenu returns focus to the trigger after item selection. For the theme toggle, this is correct behavior per WAI-ARIA Authoring Practices for menu buttons. The user opened a menu, made a selection, and focus returns to where they were. Tab moves to the next element normally — focus is not trapped.

**Verdict**: Correct behavior. No change needed.

### 3.2 Post-Navigation Focus After Mobile Sheet Close — **Novel, Medium Severity**

This is a genuine gap. The flow:

1. User opens mobile Sheet (focus moves into Sheet).
2. User activates a nav `Link` inside the Sheet.
3. Sheet closes (Radix returns focus to hamburger trigger).
4. App Router performs client-side navigation.
5. New page content renders in `<main>`.

After step 5, focus is on the hamburger button in the header. The user navigated to new content but must Tab through the entire header (~8 elements) to reach it. For keyboard and screen reader users, this is a usability gap.

Next.js App Router does not automatically manage focus on client-side navigation. The standard mitigation is a `usePathname()` effect that moves focus to `<main>` or the page's `<h1>` after route changes (~10 lines of code).

This is not a WCAG violation (focus is not trapped — the user can Tab forward), but for a site targeting WCAG 2.1 AA, it's a notable usability gap.

**Recommendation**: Either specify the focus management pattern (a small client component that calls `.focus()` on `<main>` after pathname changes) or document this as a known limitation for a post-foundation accessibility pass.

### 3.3 HeroCard Tab Stop Structure — **Novel, Medium Severity**

The design specifies `HeroCard` uses a shadcn/ui `Card` + Next.js `Link` but doesn't specify the DOM structure. Two possible implementations:

**Correct**: `<Link href={href}><Card>...</Card></Link>` — single `<a>` wrapping the card. One tab stop. Screen reader announces it once.

**Anti-pattern**: `<Card onClick={() => router.push(href)}><Link href={href}>{title}</Link></Card>` — the `Card` div gets a click handler, the `Link` is a separate focusable element. Two potential tab stops, or a non-keyboard-accessible card if `tabIndex`/`onKeyDown` aren't added.

The design should make the correct structure explicit to prevent the anti-pattern during implementation.

**Recommendation**: Add to the `HeroCard` specification: "The entire card is wrapped in a single `Link` element — one focusable element per card. No separate `onClick` on the card container."

---

## 4. CSP and Script Integrity Edge Cases

### 4.1 Contact Form Client-Side Attack Surface — **Novel, Non-Issue**

The contact form (spec 2) uses a standard React form component with controlled inputs. React's rendering model does not use `innerHTML` — it uses `createElement` and DOM property assignment. User input is stored in React state as strings and sent to `/api/contact` via `fetch()`. There is no path from user input to `eval()` or `innerHTML`.

The CSP's `'unsafe-inline'` for scripts doesn't create additional risk here — React prevents XSS by default, and the only way to render raw HTML is `dangerouslySetInnerHTML`, which would be a deliberate implementation choice.

**Verdict**: No additional risk from the CSP configuration.

### 4.2 CSP Regex for Playground Embed Routes — **Novel, Confirmed Correct**

Tracing the regex `/((?!playground(/|$)).*)` against `/playground/my-toy/embed`:

- After the leading `/`, the path is `playground/my-toy/embed`.
- The negative lookahead `(?!playground(/|$))` at position after `/` checks if `playground/` follows. It does → lookahead fails → overall pattern doesn't match → **CSP header is NOT applied**.

All paths under `/playground` (including nested `/embed` routes) are excluded from CSP. The regex works as intended.

**Verdict**: Correct. No CSP leak.

### 4.3 `connect-src` and `next/font` Runtime Fetch — **Novel, Non-Issue**

`next/font/google` downloads fonts during `next build` and writes them to `.next/static/media/`. At runtime, fonts are served from `/_next/static/media/` — same origin. There is no runtime fetch to Google Fonts servers. ISR revalidation re-runs page data fetching, not font loading.

**Verdict**: `connect-src 'self'` is correct. No font-related blocking.

---

## 5. Design-Requirements Traceability and Completeness

### 5.1 R4 AC4 — Layout Persistence — **Novel, Low Severity**

R4 AC4 requires the layout shell to persist without full-page reloads. This is guaranteed by App Router's layout model — layouts are preserved during client-side navigation within the same route group. The design uses Next.js `Link` for all navigation, ensuring client-side routing.

The only way this breaks is if a nav link uses a standard `<a>` instead of Next.js `Link`, triggering a full-page navigation. This would be caught by the existing navigation Playwright test (which implicitly verifies client-side routing works).

**Recommendation**: A one-sentence acknowledgment in the design ("Layout persistence is guaranteed by App Router's layout model for same-group navigations") would improve traceability but is not required.

### 5.2 R11 AC1 — Intended vs. Verified Ordering — **Not a Finding**

The design correctly frames layer ordering as a hypothesis: "This ordering behavior is the primary thing the spike must verify." It describes what the spike tests and how, specifies a graduated outcome if it fails, and does not claim the ordering is proven. The requirement says the ordering must be "documented as a spike deliverable" — meaning the spike's output records the verified result. The design's job is to describe the test plan. No conflation.

**Verdict**: Correctly handled.

### 5.3 R11 AC6 — Spike Test Fixture Coverage — **Not a Finding**

The design lists four numbered spike test fixtures:

1. Plain div with conflicting styles (AC2)
2. shadcn/ui Button (AC3)
3. Tailwind utilities (AC4)
4. Radix UI overlay — Dialog (AC6)

Test fixture 4 explicitly covers AC6. The design also specifies the spike should "produce a brief matrix of which shadcn/ui overlay components support containment via `container` prop and which do not." AC6 is fully covered.

**Verdict**: No gap.

### 5.4 R14 AC3 — `adjustFontFallback` Default — **Novel, Confirmed Correct**

For `next/font/google`, `adjustFontFallback` defaults to `true` — it automatically generates a fallback font with adjusted metrics (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`) to minimize CLS. The design uses `next/font/google` (Geist, Geist_Mono) without explicitly setting `adjustFontFallback`, correctly relying on the default.

For `next/font/local`, the default differs (`false` or a base font string), but the design uses Google fonts, so this distinction is irrelevant.

**Verdict**: Claim is accurate. No gap.

---

## 6. Build Pipeline Robustness and Edge Cases

### 6.1 Playwright Cache Key Precision — **Novel, Negligible Severity**

The cache key `playwright-${{ hashFiles('pnpm-lock.yaml') }}` invalidates on any dependency change, not just Playwright. A tighter key using the Playwright version specifically would avoid ~300MB browser re-downloads on unrelated dependency updates.

For a solo-developer project with infrequent dependency updates (2-4 times/month), the imprecise key wastes ~2-4 minutes of CI time per month. A precise key adds a CI step and inter-step dependency. The complexity cost exceeds the time savings.

**Verdict**: Acceptable imprecision. Not worth optimizing.

### 6.2 `--with-deps` on `ubuntu-latest` — **Novel, Negligible Severity**

GitHub Actions `ubuntu-latest` has most Chromium dependencies pre-installed but may lack libraries required for WebKit (if added later). `--with-deps` handles this by running `apt-get install` for Playwright's full dependency list. On cache hits, `playwright install` is a no-op; `--with-deps` adds ~5-10 seconds for the `apt-get` check. This is harmless and provides forward-compatibility.

**Verdict**: `--with-deps` is the correct defensive choice.

### 6.3 Velite Staleness Between Install and Build — **Novel, Non-Issue**

In CI: `pnpm install` runs `postinstall` → `velite build`. Content files don't change between install and build (clean checkout). `.velite/` is always fresh.

Locally: the dev workflow uses `pnpm dev` (which runs `velite dev`), not `pnpm build`. A local `pnpm build` after content changes without re-running Velite is an edge case easily resolved by running `pnpm install` first.

**Verdict**: Non-issue in all realistic scenarios.

---

## Closing Deliverables

### Top 5 Risks/Gaps — Ranked by Severity × Likelihood

1. **New shadcn/ui tokens not caught by Playwright test (1.2)**: When downstream specs add components consuming tokens beyond the original set (e.g., `--chart-*`, `--sidebar-*`), the playground base stylesheet lacks them. `all: initial` prevents inheritance. Components render with browser defaults. The Playwright test doesn't dynamically discover new tokens. Failure scenario: a playground item uses a shadcn/ui Chart component. Chart colors are missing on the playground route. CI passes. Discovered visually weeks later.

2. **`concurrently` missing `--kill-others-on-fail` flag (2.1)**: If `velite dev` crashes during development, `next dev` continues running. Content changes stop updating silently. Failure scenario: developer introduces a Velite schema error, `velite dev` exits, `next dev` serves stale content. Developer spends 10+ minutes debugging why content changes aren't reflected.

3. **Post-navigation focus after mobile Sheet close (3.2)**: Keyboard/screen reader users who navigate via mobile Sheet have focus returned to the hamburger button after navigation, requiring Tab through the entire header to reach new content. Failure scenario: screen reader user navigates to Blog via mobile menu, must Tab ~8 times through header elements to reach blog content.

4. **HeroCard DOM structure unspecified (3.3)**: Without explicit structure guidance, an implementer could produce two tab stops per card or a non-keyboard-accessible card. Failure scenario: `onClick` on card div plus `Link` inside creates two tab stops or a div inaccessible to keyboard navigation.

5. **Token count underestimated at ~15 (1.3)**: Actual count is 19+ tokens. An implementer reading "~15" may stop short, leaving tokens like `--border`, `--input`, `--ring` undeclared. Components consuming missing tokens render with browser defaults inside the playground.

### Top 3 Conclusions to Challenge or Reverse

1. **"The Playwright E2E test is sufficient enforcement for playground token synchronization."** It catches drift in known tokens but is blind to new tokens. The design should either: (a) specify that the Playwright test dynamically extracts all custom properties from `:root` and `.playground-container` and compares the sets, or (b) add a build-time diff script, or (c) at minimum document this as a known limitation with a maintenance procedure (update the test assertion list whenever `tokens.css` changes). The current static assertion list creates a false sense of full coverage.

2. **"The `concurrently` dev script needs no configuration beyond the two commands."** `--kill-others-on-fail` and `--names` are not optional polish — they prevent a common, confusing failure mode (silently degraded dev environment). Two flags, no downside, meaningful DX improvement.

3. **"The HeroCard component interface is sufficiently specified."** The interface specifies props but not DOM structure. For a project targeting WCAG 2.1 AA, the single-link-per-card pattern must be explicit. One sentence prevents a common accessibility anti-pattern.

### What's Missing — Concrete Deliverables Before Implementation

1. **Add `--kill-others-on-fail --names velite,next` to the dev script** in the Package Scripts section. One-line change.

2. **Specify HeroCard DOM structure**: Add to the HeroCard component description: "The `Link` wraps the entire card content — a single focusable element per card. No `onClick` handler on the card container."

3. **Update token count from "~15" to "~20"**: Revise the Playground Token Synchronization section. Specify that the playground base stylesheet must re-declare the complete token set from `tokens.css`, not a guessed subset.

4. **Document post-navigation focus management**: Either specify a `usePathname()` effect that moves focus to `<main>` after client-side navigation (in the Nav or Site Layout component), or document this as a known limitation to be addressed in a downstream accessibility pass.

5. **Acknowledge Playwright token coverage limitation**: Add a note to the playground isolation test description stating that the assertion list must be updated when tokens are added to `tokens.css`, and that the test does not automatically detect new/missing tokens.
