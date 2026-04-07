# Adversarial Analysis: site-foundation Tasks — Round 3

## 1. Route and Page Coverage Completeness

### Finding 1.1 — Five slash-page routes in the sitemap have no page.tsx creation task | Novel

Task 21 creates `sitemap.ts` listing 13 routes. Task 24 creates placeholder pages for 6 main sections (profile, projects, contributions, blog, resources, contact). Task 23 creates the landing page. The remaining routes — `/about`, `/colophon`, `/now`, `/sitemap` (HTML), `/slashes` — have no task creating their `page.tsx` files.

- `/about` has a content MDX file created in task 7 (`content/pages/about.mdx`) but no route file at `src/app/(site)/about/page.tsx`.
- `/colophon`, `/now` — no content file, no route file.
- `/sitemap` (HTML) — distinct from the XML `sitemap.ts`, needs `src/app/(site)/sitemap/page.tsx`.
- `/slashes` — task 20 creates a footer link pointing to `/slashes`, but no task creates `src/app/(site)/slashes/page.tsx`.

**Failure scenario**: After all 29 tasks execute, a visitor clicks the footer's "/slashes" link and gets a 404. The XML sitemap at /sitemap.xml lists /about, /colophon, /now, /sitemap, /slashes — all five return 404. Search engines crawl the sitemap, discover broken URLs, and penalize the site.

**Fix**: Add these routes to task 24's placeholder list (or a new task 24b). All routes in the sitemap must resolve to pages.

### Finding 1.2 — /playground index page has no creation task | Novel

Task 10 creates the `(playground)/layout.tsx`. Task 11 creates the spike fixture at `(playground)/spike/page.tsx`. But no task creates the playground index page at `src/app/(playground)/playground/page.tsx` — shown in the structure doc (line 52) and linked from navItems and heroCards (task 19).

**Failure scenario**: Visitor clicks "Playground" in the nav or hero card grid and gets a 404. E2E navigation test (task 27) clicks nav links but only checks main section placeholders — the playground index gap isn't caught by tests.

**Fix**: Add a playground index placeholder page. It should be within the `(playground)` route group.

### Finding 1.3 — /playground/spike is an orphaned route | Novel

The spike page at `/playground/spike` is reachable only by direct URL. No link from any page. Acceptable for a test fixture. Low severity.

### Finding 1.4 — CSP E2E test depends on spike route that may be deleted | Novel

Task 29 navigates to `/playground/spike` to assert CSP headers are absent on playground routes. When spec 8 removes spike fixtures, this test either 404s (unclear whether 404 responses carry CSP headers) or gives a false positive.

**Fix**: Task 29 should use `/playground` as the primary playground test target (once the index page exists per 1.2). Add a maintenance note about the spike URL dependency.

---

## 2. Inter-Task File Mutation and Overwrite Risks

### Finding 2.1 — Tasks 16 and 17 both target src/app/layout.tsx with creation language | Novel

Task 16: "File: src/app/layout.tsx" — configures font loading (Geist imports, CSS variable classes on `<html>`). Task 17: "File: src/app/layout.tsx" — "Create src/app/layout.tsx as server component wrapping children in html (with font variable classes and suppressHydrationWarning)."

Task 17 runs after task 16. The word "Create" invites writing the file from scratch. Task 17's prompt mentions "font variable classes" in the JSX, suggesting awareness of fonts, but never says "preserve the font loading from task 16" and never mentions the `next/font/google` imports.

**Failure scenario**: Agent running task 17 writes a complete layout.tsx from scratch. It may apply font variable classes to `<html>` because the prompt says to, but won't import Geist/Geist_Mono from `next/font/google` because task 17's prompt doesn't mention those imports. The CSS variables `--font-sans` and `--font-mono` are referenced but never defined. Site renders in browser default fonts. No build error — this is a silent visual regression.

**Fix**: Merge tasks 16 and 17 into a single task. Both are root layout concerns in the same phase.

### Finding 2.2 — globals.css mutation chain (tasks 7 → 8 → 15) | Fine

Task 7 creates a placeholder, task 8 replaces it with full content, task 15 adds the `@theme` block. Task 8's creation language implicitly replaces task 7's placeholder (intended). Task 15 correctly uses additive language ("globals.css already exists from task 8"). No overwrite risk.

### Finding 2.3 — next.config.ts (tasks 1 → 22) | Fine

Task 22 says "In next.config.ts, add headers() config" — clear modification language.

### Finding 2.4 — spike/page.tsx (tasks 11 → 12) | Fine

Task 12 says "Add a shadcn/ui Dialog component... to the spike fixture page." Additive language. Clear.

### Finding 2.5 — Task 9's shadcn add CLI may modify globals.css despite warning | Novel, Low severity

Task 9's prompt warns against globals.css modifications. Current `shadcn@latest` separates `init` and `add` cleanly. The prompt's guard is the best available mitigation. Low risk because task 15 verifies the globals.css structure later.

---

## 3. Dependency Installation and Package Consistency

### Finding 3.1 — Three packages used but never explicitly installed | Novel

| Package | Used in task | Installation mentioned? |
|---|---|---|
| concurrently | 7 (dev script) | No — "dev script using concurrently" but never "install concurrently" |
| next-themes | 17 (ThemeProvider) | No — "wrapping next-themes ThemeProvider" but never "install next-themes" |
| lucide-react | 18 (Sun/Moon icons) | No — "use lucide-react for Sun/Moon icons" but never "install lucide-react" |

**Failure scenario**: `pnpm dev` fails after task 7 ("concurrently: command not found"). Task 17's ThemeProvider import fails at build time. Task 18's icon import fails at build time.

**Fix**: Add explicit install instructions to each task prompt.

### Finding 3.2 — tailwindcss itself may not be installed | Novel

`@import "tailwindcss"` appears in globals.css (task 8), but no task explicitly installs the `tailwindcss` package. Task 1 initializes Next.js but doesn't specify the `--tailwind` flag. If the agent runs `create-next-app` without `--tailwind`, tailwindcss is not installed.

**Failure scenario**: Agent initializes Next.js without `--tailwind`. Task 8 creates globals.css with `@import "tailwindcss"`. CSS parsers silently ignore unresolvable imports — no build error. Every Tailwind utility class becomes inert. The entire site renders unstyled. This is silent and catastrophic.

**Fix**: Task 1 should specify `--tailwind` flag, or task 8 should explicitly install `tailwindcss`.

### Finding 3.3 — Borderline cases (tasks 5, 6, 7) | Acceptable

Task 5 (Vitest setup) implicitly installs vitest, @vitejs/plugin-react, @testing-library/react, jsdom. Task 6 (Playwright setup) implicitly installs @playwright/test. Task 7 (Velite setup) implicitly installs velite. "Setting up X" inherently involves installing it. Borderline but acceptable for tool-setup tasks.

### Finding 3.4 — clsx and tailwind-merge correctly specified in task 8 | Fine

Task 8 explicitly says "Install clsx and tailwind-merge as dependencies." No earlier task assumes they exist.

### Finding 3.5 — Full audit summary

| Package | Used in | Installed in | Status |
|---|---|---|---|
| tailwindcss | Task 8 (import) | Nowhere explicit | **Missing** |
| concurrently | Task 7 | Nowhere | **Missing** |
| next-themes | Task 17 | Nowhere | **Missing** |
| lucide-react | Task 18 | Nowhere | **Missing** |
| clsx | Task 8 | Task 8 | OK |
| tailwind-merge | Task 8 | Task 8 | OK |
| velite | Task 7 | Implicit in setup | Borderline OK |
| vitest | Task 5 | Implicit in setup | OK |
| @playwright/test | Task 6 | Implicit in setup | OK |
| @testing-library/react | Task 5 | Implicit in setup | OK |

---

## 4. Prompt Fidelity to Design Document Decisions

### Finding 4.1 — ThemeToggle matches design doc | Fine

Task 18: "DropdownMenu with three items: Light, Dark, System." Matches the design doc's 3-state dropdown specification.

### Finding 4.2 — Playground layout correctly excludes site chrome | Fine

Task 10 creates a separate `(playground)/layout.tsx` wrapping children in the isolation container. No site chrome. Route group separation ensures independence from `(site)` layout.

### Finding 4.3 — Placeholder pages include noindex | Fine

Task 24: "Each page exports generateMetadata() returning title and robots with index: false." Matches design doc.

### Finding 4.4 — Canary test path deviates from design doc — intentional | Fine, doc update needed

Design doc says `src/components/ui/button.test.tsx`; task 5 uses `src/canary.test.tsx`. Intentional change from v1 (canary no longer uses shadcn/ui Button). Design doc should be updated to match but this is not a task-list issue.

### Finding 4.5 — HeroCard interface matches | Fine

Task 23: "accepting title, description, and href props." Design doc: `{ title: string; description: string; href: string }`. Exact match.

### Finding 4.6 — Footer social links mentioned but source unclear | Novel, Low severity

Design doc specifies "social links (GitHub, LinkedIn)" in the footer. Task 20 says "GitHub/LinkedIn social links." However, the `SiteConfig` type (design doc lines 182-201) has no `socialLinks` field. The agent will either hardcode URLs in footer.tsx or add a socialLinks field to siteConfig. Neither is wrong, but the prompt should specify the approach.

### Finding 4.7 — siteConfig url and ogImage fields correctly specified | Fine

Task 19 explicitly includes "url, ogImage" in the siteConfig object, matching the design doc type.

---

## 5. Agent Executability of Specific Prompt Instructions

### Finding 5.1 — Task 8 oklch values depend on agent training data | Compounding (deepens v2 finding about manual token creation)

Task 8's prompt: "all shadcn/ui default theme tokens using oklch values from the neutral theme (reference shadcn/ui themes documentation for exact values)." The agent cannot browse the web. It must produce ~40+ oklch values from training data.

The risk is moderated by the neutral theme's simplicity — most values are lightness variations with zero chroma and hue. But `--chart-1` through `--chart-5` and `--sidebar-*` tokens have more varied values that are more likely to be hallucinated.

**Fix**: Embed the exact oklch values in the task prompt or in the design doc. Do not reference external documentation the agent cannot access.

### Finding 5.2 — Task 13 conflates test authoring with test execution | Novel

Task 13's prompt: "Write Playwright tests... Write spike-summary.txt with pass/fail per test case." The agent writing tests is expected to also report results, but the prompt never says "run the tests." The agent may write both files without executing anything, producing a summary with assumed results.

**Fix**: Add to task 13: "After writing the test file, run `pnpm build && pnpm test:e2e` and write spike-summary.txt based on actual test results."

### Finding 5.3 — Task 21 asks an AI agent to create a PNG image | Novel

Task 21: "Create a placeholder OG image at public/images/og-default.png (1200x630)." AI code-generation agents cannot create binary image files.

**Failure scenario**: Agent skips OG image or creates an invalid file. openGraph metadata references `/images/og-default.png` which doesn't exist. Link previews on social media show broken images. No build error.

**Fix**: Flag as [MANUAL], like task 4.

### Finding 5.4 — Task 23 references a profile photo that no task creates | Novel

Task 23: "personal photo via Next.js Image (src from public/images/, path hardcoded in component)." No task creates or places a photo file. An AI agent cannot produce a photo of Matthew.

**Fix**: Add [MANUAL] note to task 23 for the photo. Use a placeholder path and document the manual dependency.

### Finding 5.5 — Task 14 depends on task 13 having run tests | Compounding

Task 14: "Read test results from e2e/spike-summary.txt (written by task 13)." If task 13 doesn't run tests (per finding 5.2), spike-summary.txt contains placeholders or guesses. Task 14 documents a spike outcome based on fiction.

**Fix**: Addressed by fixing task 13 (finding 5.2).

---

## 6. Requirement Traceability and Acceptance Criteria Coverage

### Finding 6.1 — R2 AC4 CI ordering | Fine

`pnpm install` triggers postinstall → velite build, then `pnpm typecheck`. Order correct once task 7 adds the postinstall script.

### Finding 6.2 — R3 AC3 empty directory case | Fine

Task 7 adds a placeholder MDX file. Requirements allow "placeholder content files" as a valid approach. AC satisfied.

### Finding 6.3 — R6 AC1 photo dependency | Already addressed in finding 5.4.

### Finding 6.4 — R4 AC6 footer /slashes link | Fine, but target 404s

Task 20 includes a link to `/slashes`, satisfying R4 AC6 ("links to slash pages or a link to /slashes"). However, no task creates the `/slashes` page — the link leads to a 404 (finding 1.1).

### Finding 6.5 — R12 AC3 local and CI executability | Fine

Playwright `reuseExistingServer: !process.env.CI`. Both environments supported. No CI-only or local-only dependency.

### Finding 6.6 — Full AC coverage audit | Novel

| Requirement | ACs | Task(s) | Covered? |
|---|---|---|---|
| R1 AC1-AC4 | 4 | Tasks 1, 2 | Yes |
| R2 AC1-AC6 | 6 | Tasks 3, 4 | Yes |
| R3 AC1-AC5 | 5 | Task 7 | Yes |
| R4 AC1-AC6 | 6 | Tasks 19, 20 | Yes |
| R5 AC1-AC4 | 4 | Tasks 17, 18 | Yes |
| R5 AC5 | 1 | Task 15 | Partial — token pairs listed, no CI gate (known, per "partially resolved") |
| R6 AC1-AC6 | 6 | Task 23 | Yes (photo is manual dependency — finding 5.4) |
| R7 AC1-AC3 | 3 | Task 24 | Yes |
| R8 AC1-AC2 | 2 | Task 25 | Yes |
| R9 AC1-AC3 | 3 | Tasks 8, 9, 15 | Yes |
| R10 AC1-AC4 | 4 | Tasks 17, 21, 23 | Yes |
| R11 AC1-AC7 | 7 | Tasks 10-14 | Yes |
| R12 AC1-AC4 | 4 | Tasks 5, 6 | Yes |
| R13 AC1-AC3 | 3 | Task 22 | Yes |
| R14 AC1-AC3 | 3 | Task 16 | Yes |

No unmapped ACs. All requirements trace to at least one task.

---

## Deliverables

### Top 5 Risks or Gaps (Ranked by Severity)

**1. Six routes in sitemap/nav/footer have no page.tsx — the site ships with broken links (Findings 1.1, 1.2)**

The XML sitemap lists 13 routes. Tasks create pages for 7. The remaining 6 — `/about`, `/colophon`, `/now`, `/sitemap` (HTML), `/slashes`, `/playground` — all 404. The footer links to `/slashes`. The nav and hero cards link to `/playground`. Search engines crawl the sitemap and find broken URLs.

*What breaks*: Visitors encounter 404s on linked routes. Footer "/slashes" link is dead. Playground nav link and hero card are dead. Sitemap advertises 6 broken URLs to search engines.

*When*: Immediately on deployment. Discovered by the first visitor or crawler.

*What the agent sees*: Nothing — no task tells it to create these pages, so it never encounters the gap.

**2. Four npm packages are used but never installed — tailwindcss, concurrently, next-themes, lucide-react (Findings 3.1, 3.2)**

Task 8 creates `@import "tailwindcss"` but no task installs `tailwindcss` (unless task 1's `create-next-app` includes `--tailwind`, which the prompt doesn't specify). Task 7 uses `concurrently` without installing it. Task 17 uses `next-themes` without installing it. Task 18 uses `lucide-react` without installing it.

*What breaks*: If tailwindcss isn't installed, every utility class is inert — the site renders completely unstyled with no build error (CSS silently ignores unresolvable imports). `pnpm dev` fails after task 7. Theme and icon imports fail at build time.

*When*: During task execution for concurrently/next-themes/lucide-react (immediate errors). Silently from task 8 onward for tailwindcss (no error, just unstyled output).

*What the agent sees*: Module-not-found errors for the three explicit packages. Nothing for tailwindcss — it's a CSS import, not a JS import.

**3. Tasks 16 and 17 both create src/app/layout.tsx — task 17 will overwrite task 16's font loading (Finding 2.1)**

Task 16 configures Geist fonts in layout.tsx. Task 17 "creates" layout.tsx with ThemeProvider and metadata. Task 17 mentions "font variable classes" but doesn't mention the `next/font/google` imports that define them.

*What breaks*: After task 17, Geist font imports are gone. `--font-sans` and `--font-mono` CSS variables are undefined. All text renders in browser default fonts. No build error.

*When*: After task 17 executes. Every page affected.

*What the agent sees*: Possibly notices wrong fonts during visual verification but attributes it to styling rather than missing imports.

**4. Task 8's oklch token values are produced from agent training data, not verified documentation (Finding 5.1)**

The prompt references "shadcn/ui themes documentation" but the agent has no browser access. Token values come from training data which may reflect an older shadcn/ui version. The neutral theme minimizes risk (simple lightness values), but chart and sidebar tokens are more varied and more likely wrong.

*What breaks*: Components render with incorrect colors. Subtle for main tokens (slightly wrong grays), potentially dramatic for chart tokens (completely wrong hues). No automated check for value correctness.

*When*: Silently from task 8. Noticed during visual review or not at all.

*What the agent sees*: Nothing — plausible-looking values with no validation feedback.

**5. Task 13 doesn't instruct the agent to run tests before writing spike-summary.txt (Findings 5.2, 5.5)**

The prompt says "Write Playwright tests" and "Write spike-summary.txt with pass/fail." The agent may write both files without executing the tests. Task 14 reads spike-summary.txt and documents the graduated outcome (a/b/c) based on assumed results rather than observed results.

*What breaks*: The spike outcome — the most consequential architectural decision in this spec — is based on fiction. Spec 8 makes its same-page vs. iframe decision from untested assumptions.

*When*: During task 14. Propagates to spec 8's architecture.

*What the agent sees*: No error — files are valid, results look plausible.

### Top 3 Conclusions to Challenge or Reverse

**1. Tasks 16 and 17 should be merged into a single task**

Both target `src/app/layout.tsx`. Both are in Phase 3. Task 16 adds fonts; task 17 adds ThemeProvider, metadata, globals.css import. Separation creates an overwrite risk with no upside — the combined task is ~30-40 lines of layout code. A single task eliminates the risk entirely and produces a coherent root layout in one pass.

**Why the current approach is wrong**: There is no technical or organizational reason to split root layout creation across two tasks. Font loading and ThemeProvider are both root layout concerns. The separation introduces a fragile dependency that only works if the second agent perfectly preserves the first agent's output — an assumption the prompt doesn't enforce.

**2. Slash page and playground index placeholders should be created in this spec**

The task list creates placeholders for 6 main sections but ignores 5 slash pages and the playground index — all of which are in the sitemap and linked from the footer or nav. Creating placeholder pages for linked-but-unbuilt routes is exactly what task 24 does for main sections. The slash pages deserve identical treatment.

**Why the current approach is wrong**: The site ships with broken links on day one. The footer has a dead link. The sitemap promises pages that don't exist. This directly undermines the "professional inbound funnel" business objective. A recruiter clicking around encounters 404s.

**3. Task 13 should explicitly require running tests, not just authoring them**

The spike's purpose is empirical validation — does CSS isolation actually work with this specific Tailwind version and bundler? Test authoring without execution is a thought experiment, not validation. The graduated outcome determines spec 8's architecture. Fiction in, fiction out.

**Why the current approach is wrong**: The prompt treats test writing and result reporting as the same step. They aren't. An agent that writes perfect test code but never runs it produces a spike-summary.txt full of assumptions. The entire spike phase (tasks 10-14) exists to answer an empirical question — if the answer comes from guessing instead of testing, the spike has failed its purpose.

### What's Missing

**Tasks to add:**

1. **Slash page and playground index placeholders** — Create `page.tsx` for `/about`, `/colophon`, `/now`, `/sitemap` (HTML), `/slashes`, and `/playground` as placeholder pages with `generateMetadata()` and `robots: { index: false }`. Can extend task 24 or be a new task 24b. The playground index should be under `(playground)` route group; the rest under `(site)`.

2. **[MANUAL] Image assets task** — Flag OG image (`public/images/og-default.png`) and profile photo as manual tasks, similar to task 4. Cannot be produced by an AI code-generation agent.

**Tasks to modify:**

1. **Merge tasks 16 and 17** — Single task creating the complete root layout with font loading, ThemeProvider, metadata, and globals.css import.
2. **Task 1** — Specify `--tailwind` flag during `create-next-app`, or add explicit `tailwindcss` installation to task 8.
3. **Task 7** — Add "Install velite and concurrently as devDependencies."
4. **Task 17** (if not merged with 16) — Add "Install next-themes as a dependency." Change "Create" to "Modify existing" for layout.tsx.
5. **Task 18** — Add "Install lucide-react as a dependency."
6. **Task 13** — Add: "After writing the test file, run `pnpm build && pnpm test:e2e` and write spike-summary.txt based on actual test results."
7. **Task 21** — Flag OG image creation as [MANUAL].
8. **Task 23** — Add [MANUAL] note for profile photo.
9. **Task 29** — Use `/playground` (stable route) instead of `/playground/spike` as primary playground CSP test target. Add maintenance note about spike URL dependency.

**Steering document updates:**

1. **structure.md** — Still lists `.eslintrc.json`; should be `eslint.config.mjs`. **Recurring** from v1 and v2 — still not updated. Severity escalated.
2. **design.md** — Update canary test path from `src/components/ui/button.test.tsx` to `src/canary.test.tsx` to reflect the v1-motivated change.
