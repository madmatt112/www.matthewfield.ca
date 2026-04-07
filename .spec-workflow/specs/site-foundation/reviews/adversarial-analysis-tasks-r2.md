# Adversarial Analysis: site-foundation Tasks — Round 2

## Dimension 1: shadcn/ui Component Availability in Phase 2 Spike Fixtures

**Finding 1.1 — Task 10 renders Button before it exists** | **Recurring (escalated)**

Task 10 (Phase 2) renders "a shadcn/ui Button inside playground container." Task 14 (Phase 3) says "Install shadcn/ui Button component via CLI." Task 8 runs `shadcn init --defaults` which creates `components.json` and scaffolding but does **not** install any components. Button does not exist when task 10 runs.

This is the exact same class of cross-phase dependency that v1 caught for the canary test. The v1 fix changed the canary test to use a plain React component — but the spike fixtures were not given the same treatment. The recurrence across review rounds and across tasks in the same document indicates a systemic blind spot: prompts reference components without verifying their existence at execution time.

**Failure scenario**: Task 10 imports `@/components/ui/button` — the module doesn't exist. TypeScript compilation fails. The agent either installs Button ad hoc (creating undocumented state that conflicts with task 14's "Install shadcn/ui Button component via CLI") or substitutes a plain component (deviating from the prompt and undermining the spike's purpose of verifying shadcn/ui component rendering inside the isolation container, which is R11 AC3).

**Finding 1.2 — Task 11 renders Dialog and overlay components that don't exist anywhere in the task list** | **Novel**

Task 11 instructs: "render shadcn/ui Dialog inside playground container" and "Document which shadcn/ui overlay components (Dialog, DropdownMenu, Popover, Tooltip, Select) support container prop containment."

Dialog requires both `src/components/ui/dialog.tsx` and `@radix-ui/react-dialog` as a dependency. Neither exists in Phase 2. More critically, Dialog is never explicitly installed in **any** task — task 14 installs Button only, task 17 installs DropdownMenu only. Dialog is a phantom dependency.

The overlay containment matrix also requires testing Popover, Tooltip, and Select — none of which are installed anywhere in the task list. The matrix is a key spike deliverable informing spec 8's per-item `iframeIsolated` decision.

**Failure scenario**: Task 11 cannot compile. The overlay containment matrix — which directly informs whether spec 8 playground items can use same-page rendering — is not produced. Spec 8 proceeds without data.

**Finding 1.3 — Downstream conflict assessment if components are installed during Phase 2** | **Novel**

If components are installed between tasks 8 and 10, `shadcn add <component>` reads `components.json` (created by task 8's `shadcn init`) and generates component files. This does NOT conflict with task 14's "Do not run shadcn init" instruction because `shadcn add` ≠ `shadcn init`.

However, task 14 says "Install shadcn/ui Button component via CLI" — this becomes redundant if Button was installed in Phase 2. Running `shadcn add button` when `button.tsx` already exists may overwrite customizations (none expected at this point, but the instruction is misleading).

**Recommended fix**: Insert an explicit component installation step between tasks 8 and 9. Install Button, Dialog, Card, and the overlay components needed for the containment matrix (Popover, Tooltip, Select, DropdownMenu). Update task 14 to "Verify Button renders correctly with the new @theme block" instead of "Install Button." Update task 17 to account for DropdownMenu already existing.

---

## Dimension 2: Task 8's shadcn init Side Effects and State Management

**Finding 2.1 — Uncatalogued artifacts from shadcn init** | **Novel**

`npx shadcn@latest init --defaults` creates at minimum:

| Artifact | Wanted at task 8? | Conflict risk |
|---|---|---|
| `components.json` | Yes — needed for `shadcn add` | None |
| `src/lib/utils.ts` (`cn()` helper) | Yes — used by all shadcn components | Not listed in task 8's file list; agent may not commit it |
| `src/styles/globals.css` | **No** — overwrites task 7's placeholder | **High** — task 8 acknowledges but handles vaguely |
| Tailwind config modifications | Unknown | Depends on shadcn CLI version + Tailwind v4 detection |

Task 8's file list says `src/styles/tokens.css, src/styles/globals.css` but omits `src/lib/utils.ts` and `components.json`. An agent following the file list may not realize these additional files were created and need to be tracked.

**Failure scenario**: `lib/utils.ts` is created silently and not committed. A later `shadcn add button` expects `lib/utils.ts` to exist (it's imported by every shadcn component). If the working directory was cleaned between sessions, the file is missing and component installation fails with an unhelpful import error.

**Finding 2.2 — Running full shadcn init to extract token values is heavy-handed** | **Novel**

Task 8's purpose is to establish CSS custom property values. The shadcn/ui default oklch values are published, deterministic, and stable for a given theme (the "neutral" default). Running a generator command with broad side effects to obtain reference data is using a sledgehammer as a measuring tape.

**Alternative**: Reference the shadcn/ui source or themes page for default oklch values and write `tokens.css` manually. Manually create `components.json` (it's a simple JSON config specifying project paths and style preferences). Create `src/lib/utils.ts` with `cn()` manually (it's 4 lines of code: import clsx/tailwind-merge, export cn function). This approach:
- Eliminates globals.css overwrite risk entirely
- Makes task 8 a pure file-creation task with deterministic output
- Removes unknown Tailwind config side effects
- Reduces the number of findings in this review by 2

**Finding 2.3 — globals.css overwrite handling is underspecified** | **Compounding** (builds on v1 finding about shadcn init overwrite risk)

Task 8's prompt says: "If shadcn init generates a globals.css, extract the token values and restructure into the tokens.css + globals.css pattern described in the design doc." Problems:

1. The condition "if" is misleading — `shadcn init` **will** generate globals.css. This is not conditional.
2. "Restructure into the pattern described in the design doc" requires the agent to read the design doc during execution, find the correct CSS structure, and reconstruct it. The prompt should contain the target structure directly.
3. No mention of preserving or restoring the `@layer playground;` declaration that will be needed — though at task 8 time, this is being created for the first time, so there's nothing to "preserve" from task 7's placeholder.

**Recommended fix**: Either (a) adopt Finding 2.2's alternative and skip `shadcn init` entirely, or (b) make the prompt explicit: "After running shadcn init, replace the generated globals.css with the following exact content: `@layer playground;\n@import 'tailwindcss';\n@import './tokens.css';`. Extract the oklch values from the generated globals.css into tokens.css before discarding it."

---

## Dimension 3: The Two-Touch Pattern on globals.css

**Finding 3.1 — Tasks 9-11 depend on layer ordering that isn't verified until task 12** | **Novel**

The dependency chain:
- Task 8 creates `@layer playground;` before `@import "tailwindcss"` — the hypothesis under test
- Task 9 creates `playground.css` with `@layer playground { ... }` rules
- Task 10 renders components styled by playground-layer CSS
- Task 11 renders overlay components in the playground context
- Task 12 programmatically verifies layer ordering via Playwright

If the ordering hypothesis is wrong (Tailwind v4's import expansion doesn't respect pre-declared layers in a particular bundler version), tasks 9-11 produce artifacts built on a false premise. The agent working on tasks 9-11 may observe visual anomalies but has no automated way to diagnose them as layer ordering issues — they could be attributed to any number of CSS problems.

**Assessment**: This is acceptable for a spike — the entire point is to test a hypothesis, and tasks 9-11 are the experimental setup. However, task 9's prompt should acknowledge the possibility of failure: "If during development you observe that playground-container styles are being overridden by Tailwind utilities despite the layer declaration, this may indicate the layer ordering hypothesis is invalid. Note the observation and continue — formal verification is in task 12."

**Finding 3.2 — Component installation between tasks 8 and 14 could modify globals.css** | **Novel**

Per the Dimension 1 fix, components would be installed in Phase 2 via `shadcn add`. The `shadcn add` command typically only creates component files and updates `components.json` — it does not modify globals.css. However, some shadcn CLI versions check for expected CSS structure in globals.css and may warn, modify, or fail if the structure doesn't match expectations.

**Risk level**: Low. Current shadcn CLI versions separate init (config/globals) from add (components). But the prompt should guard against it.

**Recommended fix**: Component installation prompts should include: "If the shadcn CLI warns about globals.css configuration, proceed with component file creation only. Do not allow the CLI to modify globals.css."

**Finding 3.3 — Consolidation of globals.css work across phases** | **Novel**

Could all globals.css work be consolidated into one task? Examining what each touch adds:
- Task 8: `@layer playground;`, `@import "tailwindcss"`, `@import "./tokens.css"` — needed for the Phase 2 spike
- Task 14: `@theme` block mapping Tailwind utilities to CSS custom properties — needed for Phase 3 styling

The spike (Phase 2) needs the import structure but not the `@theme` block. The `@theme` block enables Tailwind utility classes like `bg-primary` to resolve to CSS variables — this is a styling concern, not a spike concern. The spike tests computed styles directly, not via Tailwind utilities.

**Verdict**: The split is justified. Consolidating would either delay the spike or prematurely add `@theme` mapping before the design system is complete. The coupling is real but manageable with the guard from Finding 3.2.

---

## Dimension 4: Task 4 (Vercel Setup) Executability and Verification

**Finding 4.1 — Task 4 is not executable by an AI agent** | **Novel**

Task 4 requires:
1. Linking GitHub repo to Vercel project (Vercel dashboard or `vercel link` with authentication)
2. Configuring deploy settings (Vercel dashboard or API with auth token)
3. Opening a test PR and verifying preview deployment (requires GitHub-Vercel integration to be active)

None of these can be performed by a code-generation AI agent in a standard session. The `vercel` CLI requires either interactive login or a `VERCEL_TOKEN` environment variable, neither of which is standard in an agent context.

**Failure scenario**: Agent assigned task 4 either fails (reporting inability to access Vercel) or hallucinates completion (marking the task done without actually configuring anything). Either way, preview deploys don't work until a human intervenes.

**Finding 4.2 — Task 4 does not create blocking dependencies** | Fine as-is

CI (task 3) is fully independent of Vercel — no deploy step, no Vercel CLI. Tasks 5-6 (Vitest/Playwright setup) have zero Vercel dependency. The spike tasks (7-13) run locally. Phase 3 and 4 tasks are code-only.

The only task that indirectly benefits from Vercel being configured is the spike's dev-vs-production comparison (task 12), where preview deploys could serve as an additional verification mechanism — but this is not a dependency.

**Recommended fix**: Flag task 4 as `[MANUAL]` in the task list. Add a note: "This task requires Vercel dashboard or authenticated CLI access. It does not block any subsequent task and can be completed at any point before the first production deployment." Move to end of Phase 1 or a separate section.

---

## Dimension 5: Prompt Completeness for Phase 2 Spike Tasks (9-13)

**Finding 5.1 — Task 9 assumes layer ordering success** | **Novel**

Task 9's prompt creates the playground layout and playground.css with `@layer playground { ... }` rules. It says "The @layer playground declaration already exists in globals.css from task 8" and proceeds with full confidence that the ordering works.

The design doc (CSS Isolation Spike Design section) states: "This ordering behavior is the primary thing the spike must verify" and "If layer ordering fails... the spike produces outcome (c)." R11 AC1 explicitly includes: "IF @layer playground cannot be ordered predictably relative to Tailwind v4's internal layers, THEN the spike SHALL document the alternative approach."

Task 9's prompt has no instruction for detecting or handling the failure case. If the layer ordering is wrong, the playground container renders but styles behave unexpectedly. The agent may spend significant time debugging what appears to be a CSS error when it's actually the expected negative outcome of the spike.

**Recommended fix**: Add to task 9's prompt: "After implementing the layout, start the dev server and verify in browser DevTools that @layer playground has lower cascade priority than Tailwind's utilities layer. If this cannot be confirmed, note the observation — the spike may produce outcome (c). Continue with remaining spike tasks regardless, as task 12's Playwright tests provide the formal verification."

**Finding 5.2 — Task 12 dev-vs-production comparison is not operationalized** | **Novel**

Task 12 instructs: "Compare computed values between dev (Turbopack) and production (Webpack) builds." The prompt doesn't specify how both builds are available to Playwright simultaneously.

The Playwright config from task 6 uses `webServer: { command: "pnpm start", port: 3000 }` — production build only. To compare against dev, the agent needs to either:
1. Define two Playwright projects with different `webServer` configurations (different ports, different commands)
2. Run the test suite twice with parameterized configuration
3. Use a Playwright global setup that starts both servers

None of these approaches are mentioned. The dev server also requires special handling: `pnpm dev` runs both Velite and Next.js via `concurrently`, which has different startup timing than `pnpm start`.

**Recommended fix**: Specify the mechanism explicitly. Recommended approach: "Configure Playwright with two projects: `{ name: 'production', use: { baseURL: 'http://localhost:3000' }, webServer: { command: 'pnpm start', port: 3000 } }` and `{ name: 'dev', use: { baseURL: 'http://localhost:3001' }, webServer: { command: 'next dev --turbopack --port 3001', port: 3001 } }`. Note: the dev project uses `next dev` directly (not the concurrently dev script) to avoid Velite startup interference."

Alternatively, if dual-project comparison is deemed too complex for CI: "Production Playwright tests in CI are the primary verification. Dev comparison is a manual verification step performed once during development. Document expected computed values so future developers can spot-check."

**Finding 5.3 — Task 13 has no specified mechanism for reading task 12 results** | **Novel**

Task 13 instructs: "After running spike tests, create spike-results.md documenting graduated outcome." The agent needs task 12's test results. If the same agent runs tasks 12 and 13 sequentially in one session, it retains context. If separate sessions are used, the agent executing task 13 has no access to Playwright output.

Playwright generates reports in `playwright-report/` by default, but the format (HTML report) is not easily parseable by an agent. Test pass/fail status and assertion details are in the terminal output.

**Recommended fix**: Task 12 should include: "Write a brief summary of test results as comments at the top of the test file, or output results to `e2e/spike-summary.txt` with pass/fail per test case and key computed values." Task 13 should reference this artifact: "Read test results from task 12's output (e2e/spike-summary.txt or Playwright terminal output) to determine the graduated outcome."

**Finding 5.4 — No cleanup or contingency path if spike produces outcome (c)** | **Novel**

If the spike fails, the task list has no instructions for what changes in tasks 14-28. The design doc section "Playground Layout Under Spike Outcome (c)" describes simplifications:
- No `all: initial` style-reset container
- No `@layer playground` or playground base stylesheet
- Minimal wrapper layout rendering children directly

But tasks 8 (globals.css with `@layer playground;`), 9 (playground.css, isolation container), 10-11 (spike fixtures) have created artifacts that don't match outcome (c).

**Assessment**: Full cleanup is a spec 8 concern, not a site-foundation concern. The spike fixtures under `(playground)/spike/` are test artifacts. However, the `@layer playground;` declaration in globals.css (task 8) persists into production if not removed — it's dead CSS that could confuse future developers.

**Recommended fix**: Add to task 13's prompt: "If outcome is (c), document which artifacts from tasks 8-12 should be modified or removed by spec 8. At minimum: the @layer playground declaration in globals.css, the playground.css stylesheet, and the isolation container in (playground)/layout.tsx. Spike fixture code in (playground)/spike/ can remain as a test artifact or be removed at spec 8's discretion."

---

## Dimension 6: Requirement Coverage Gaps and Traceability Drift

**Finding 6.1 — ESLint config naming inconsistency persists** | **Recurring (escalated)**

Structure doc (line 107) lists `.eslintrc.json`. Task 2 creates `eslint.config.mjs` (flat config format). This was identified in the v1 review as "Not addressed." It remains unresolved in v2.

Task 2 is correct — ESLint flat config (`eslint.config.mjs`) is the modern standard and is required by recent Next.js ESLint configurations. The structure doc is stale.

**Fix**: Update `structure.md` line 107 from `.eslintrc.json` to `eslint.config.mjs`.

**Finding 6.2 — Task 3 prompt references wrong task number for postinstall** | **Novel**

Task 3's prompt says: "Note: postinstall script (velite build) is added in task 6 — CI should tolerate its absence until then." The postinstall script is added in task **7** (Velite pipeline configuration), not task 6 (Playwright setup).

The CI workflow design is correct — `pnpm install` tolerates missing postinstall scripts. This is a minor copy error that could confuse an agent reading its context.

**Fix**: Change "task 6" to "task 7" in task 3's prompt.

**Finding 6.3 — R11 AC5 dark theme verification missing from spike tests** | **Compounding** (deepens the partially-addressed v1 finding about WCAG/theme verification)

R11 AC5 requires: "verified in both light and dark themes, and in both dev and production builds." Task 12 addresses dev vs. production comparison but does not include dark theme testing.

The playground container uses light-mode tokens only and applies `all: initial` to prevent CSS property inheritance. The meaningful test is: when the site is in dark mode (class `dark` on `<html>`), do the playground container's computed styles remain unchanged? If `all: initial` properly resets custom property inheritance, the answer is yes. If it doesn't (or if `.dark` selector specificity overrides the isolation), dark-mode values leak in.

Task 12 tests computed styles but never toggles the site theme. This is a gap — the dark-mode isolation is untested.

**Fix**: Add to task 12's prompt: "Add a test case that toggles the site to dark mode via `page.evaluate(() => document.documentElement.classList.add('dark'))`, then asserts that playground container computed styles for --background, --foreground, and color still match light-mode token values from tokens.css :root."

**Finding 6.4 — Task 20 sitemap route coverage** | Fine as-is

Task 20 lists 13 routes: /, /profile, /projects, /contributions, /blog, /resources, /playground, /about, /contact, /colophon, /now, /sitemap, /slashes. Design doc sitemap section (line 522) lists the same 13 routes. Exact match. No gap.

**Finding 6.5 — Task 18/19 nav items match R4 AC2** | Fine as-is

R4 AC2 defines 6 sections. Task 18's prompt lists all 6 in navItems (Professional Profile→/profile, Projects→/projects, Contributions→/contributions, Blog→/blog, Resources→/resources, Playground→/playground). Task 19 renders `siteConfig.navItems`. Complete coverage.

**Finding 6.6 — R5 AC5 WCAG contrast verification remains vague** | **Compounding** (deepens partially-addressed v1 finding)

Task 14 instructs: "Verify WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large text) on foreground/background pairs in both light and dark modes using an automated contrast checker or manual oklch-to-contrast calculation."

Improvements since v1: the specific ratios are now stated, and both light and dark modes are mentioned. Still lacking:
- **No specific tool** — "automated contrast checker or manual oklch-to-contrast calculation" is vague. An agent needs a concrete tool to execute this.
- **No defined pass/fail gate** — is this a blocking check or advisory observation?
- **No specific token pairs** — "foreground/background pairs" doesn't enumerate which of the ~15 token pairs to check.

For shadcn/ui defaults, the values are known to meet AA ratios — this is verification, not design. The risk of actual failure is low. But without specificity, the agent may either skip the check or do a superficial spot-check.

**Recommended enhancement**: "Check contrast ratios for at minimum: foreground/background, primary/primary-foreground, secondary/secondary-foreground, muted/muted-foreground, destructive/destructive-foreground in both :root and .dark modes. Use browser DevTools Accessibility panel contrast checker, or compute from oklch values using an online contrast ratio calculator. shadcn/ui defaults are known to pass — this step verifies the extracted values are correct."

---

## Deliverables

### Top 5 Risks or Gaps (Ranked by Severity)

**1. shadcn/ui components unavailable for Phase 2 spike fixtures (tasks 10, 11)** — Recurring/escalated

**Failure scenario**: Agent runs task 10, gets "Cannot find module '@/components/ui/button'" — TypeScript compilation fails. Spike cannot verify R11 AC3 (shadcn/ui component rendering in isolation container). Task 11 similarly fails for Dialog. The overlay containment matrix — key input to spec 8's architecture decision — is not produced. The spike is incomplete, and its graduated outcome is unreliable.

**Fix**: Insert a component installation task between tasks 8 and 9: "Install shadcn/ui Button, Dialog, Card, Popover, Tooltip, Select, and DropdownMenu via `npx shadcn@latest add button dialog card popover tooltip select dropdown-menu`. The `components.json` from task 8 provides CLI configuration. Do not run `shadcn init`." Update task 14 to say "Verify Button renders correctly with the @theme block" instead of "Install Button." Update task 17 to reference existing DropdownMenu.

**2. Task 8's shadcn init creates uncontrolled side effects including globals.css overwrite** — Compounding

**Failure scenario**: `shadcn init` overwrites globals.css from task 7, creates `lib/utils.ts` not listed in task 8's file manifest, and may modify Tailwind configuration in ways that depend on shadcn CLI version. The agent must reverse-engineer what happened and reconstruct the correct globals.css structure. If the `@layer playground;` declaration is lost, the entire spike (tasks 9-12) operates on incorrect CSS.

**Fix**: Don't run `shadcn init`. Write `tokens.css` manually from shadcn/ui documented default oklch values. Create `components.json` manually as a simple JSON file. Create `src/lib/utils.ts` manually (4 lines: import clsx + twMerge, export cn). This eliminates all side effects and makes task 8 fully deterministic.

**3. Task 12 dev-vs-production comparison has no implementation path** — Novel

**Failure scenario**: Agent doesn't know how to run Playwright against both dev (Turbopack) and production (Webpack) servers. The most likely outcome: tests run against production only, and the dev/production divergence — the primary risk the spike exists to detect per the tech doc — goes untested.

**Fix**: Either (a) specify a dual-project Playwright configuration with separate ports and webServer commands, or (b) downgrade the dev comparison to a documented manual verification step: "Run the spike tests manually against the dev server during development. Document expected computed values so divergence can be detected by visual inspection. CI runs against production only." Option (b) is pragmatic and aligns with the tech doc's own mitigation: "verify via Vercel preview deploys."

**4. R11 AC5 dark theme verification missing from task 12** — Compounding

**Failure scenario**: `all: initial` is assumed to prevent dark-mode token inheritance into the playground container, but this is never tested. If CSS custom property inheritance behaves differently than expected (e.g., `all: initial` resets properties to initial values but `.dark` selectors re-apply them via specificity), the playground renders with dark-mode colors when the site is in dark mode. This breaks the design intent and goes undetected until spec 8 implementation.

**Fix**: Add to task 12: "Toggle site to dark mode via `page.evaluate(() => document.documentElement.classList.add('dark'))`, then assert playground container computed styles remain unchanged (light-mode values)."

**5. No contingency instructions if spike produces outcome (c)** — Novel

**Failure scenario**: Spike fails (outcome c). Tasks 14-28 proceed with globals.css containing a dead `@layer playground;` declaration and no guidance on what to simplify. Spec 8 begins without clear instructions on which site-foundation artifacts to modify or remove.

**Fix**: Add to task 13: "If outcome is (c), document which site-foundation artifacts must be modified by spec 8: the @layer playground declaration in globals.css, playground.css, and the isolation container in (playground)/layout.tsx."

### Top 3 Conclusions to Challenge or Reverse

**1. Running `shadcn init` in task 8 to extract token values**

The task uses a generator command with broad, version-dependent side effects when the actual need is a set of published CSS custom property values. The oklch values are deterministic for the neutral theme and are documented in shadcn/ui source. Manually creating tokens.css, components.json, and lib/utils.ts eliminates the globals.css overwrite risk, the unlisted artifact problem, and the unknown Tailwind config side effects. The manual approach takes the same agent effort since the current approach requires restructuring init output anyway.

**2. Deferring all component installation to Phase 3 when the Phase 2 spike needs components**

The spike's purpose is to verify CSS isolation with real shadcn/ui components (R11 AC3, R11 AC6). Without the components, the spike cannot fulfill its own acceptance criteria. The separation was logical when designed (Phase 2 = spike, Phase 3 = design system), but the spike's scope expanded to include component rendering and portal behavior verification. Component installation should follow the scope — if Phase 2 tests components, Phase 2 installs components. This doesn't compromise Phase 3 work; task 14 shifts from "install components" to "verify components work with the completed @theme block."

**3. Requiring automated dev-vs-production Playwright comparison in CI**

The tech doc warns about Turbopack/Webpack divergence for CSS @layer ordering, and the design doc makes this comparison a core spike deliverable. However, operationalizing it in CI requires dual Playwright projects with different web servers, port management, and doubled test runtime. The pragmatic alternative: production Playwright tests in CI catch the important regressions. Dev divergence is caught during development by the developer running tests locally against the dev server, and by Vercel preview deploys (which build with Webpack, matching production). This aligns with the tech doc's stated mitigation: "playground style isolation should be verified via Vercel preview deploys before merging."

### What's Missing

**Tasks to add:**

1. **Component installation task (between tasks 8 and 9)**: Install Button, Dialog, Card, and overlay components (Popover, Tooltip, Select, DropdownMenu) needed for spike fixtures and the overlay containment matrix. Uses `shadcn add` against the `components.json` from task 8.

**Tasks to modify:**

1. **Task 3**: Fix postinstall reference from "task 6" to "task 7."
2. **Task 8**: Replace `shadcn init` with manual creation of tokens.css (from documented oklch values), components.json, and lib/utils.ts. Update file list to include all created files.
3. **Task 9**: Add failure-mode guidance — acknowledge that layer ordering may not work and instruct the agent to note observations rather than debug.
4. **Task 10**: Reference Button from the new installation task instead of implying it exists implicitly.
5. **Task 11**: Reference Dialog and overlay components from the new installation task.
6. **Task 12**: (a) Specify the dev-vs-production comparison mechanism or downgrade to manual. (b) Add dark-mode isolation verification test.
7. **Task 13**: (a) Specify how to read task 12 results. (b) Add contingency documentation if outcome is (c).
8. **Task 14**: Change "Install shadcn/ui Button component via CLI" to "Verify Button (installed in Phase 2) renders correctly with the @theme block."
9. **Task 4**: Flag as `[MANUAL]`. Move to end of Phase 1 or a separate manual-tasks section.

**Steering document to update:**

1. **structure.md**: Change `.eslintrc.json` to `eslint.config.mjs` (recurring from v1, still unresolved).
