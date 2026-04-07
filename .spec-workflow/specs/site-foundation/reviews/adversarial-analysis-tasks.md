# Adversarial Analysis — site-foundation Tasks

## 1. Requirement Traceability

### Cross-reference: Requirements to Tasks

| Requirement | AC | Covered By | Assessment |
|---|---|---|---|
| R1 AC1 | Next.js App Router + TS strict | Task 1 | Covered |
| R1 AC2 | .nvmrc + packageManager | Task 1 | Covered |
| R1 AC3 | ESLint + Prettier | Task 2 | Covered |
| R1 AC4 | pnpm install exits 0 | Task 1 | Covered |
| R2 AC1 | CI runs lint/typecheck/test/build | Task 3 | Covered |
| R2 AC2 | Deploy to Vercel on main | Task 3 (claimed) | **Partial** — Task 3 claims AC2 but the prompt says "Vercel handles deployment via its own GitHub integration — no deploy step in this workflow." AC2 says "the system SHALL deploy to Vercel automatically." This is covered by Vercel's GitHub integration, not by the CI workflow itself. The task correctly documents this, but the claimed coverage is indirect — there is no task that verifies Vercel integration is configured. |
| R2 AC3 | Preview deploys per PR | **NOT COVERED** | No task sets up or verifies Vercel preview deploys. AC3 says "Vercel SHALL create a preview deployment accessible via a unique URL." This is entirely a Vercel configuration concern, but no task documents or verifies it. |
| R2 AC4 | Velite build before typecheck in CI | Task 3 | Covered (postinstall triggers velite build before typecheck step) |
| R2 AC5 | Playwright in CI | Task 3 | Covered |
| R2 AC6 | Foundation for downstream extension | Task 3 | Covered (by convention) |
| R3 AC1-AC5 | Velite pipeline | Task 6 | Covered |
| R4 AC1-AC6 | Site layout and navigation | Task 17 | Covered |
| R5 AC1 | System preference on first load | Task 14 | Covered |
| R5 AC2-AC3 | Theme toggle + persistence | Task 15 | Covered |
| R5 AC4 | No FOUC | Task 14 | Covered |
| R5 AC5 | WCAG contrast | **NOT COVERED** | No task verifies WCAG 2.1 AA color contrast ratios. R5 AC5 says values "SHALL meet WCAG 2.1 AA color contrast ratios... verified via automated tooling or manual check during R9 implementation." Task 12 (R9) does not mention contrast verification anywhere in its prompt. The requirements doc softens this ("when theme values are finalized"), but the AC is still present and no task addresses it. |
| R6 AC1-AC6 | Landing page | Task 20 | Covered |
| R7 AC1-AC3 | Placeholder pages | Task 21 | Covered |
| R8 AC1-AC2 | Custom 404 | Task 22 | Covered |
| R9 AC1-AC3 | Global styles | Task 12 | Covered |
| R10 AC1 | Title template | Task 14 | Covered |
| R10 AC2 | Default OG image | Task 18 | Covered |
| R10 AC3 | generateMetadata convention | Task 18, 21 | **Partial** — Task 21 creates placeholder pages with generateMetadata(). Task 20 (landing page) does not mention generateMetadata(). The landing page uses the root layout's default metadata, which is arguably correct — but R10 AC3 says "WHEN a page component is created THEN it SHALL export a generateMetadata() function." The landing page is a page component. Task 22 (404) also does not mention generateMetadata(), though Next.js not-found.tsx does not support generateMetadata() (it inherits parent layout metadata), so this is a requirements issue, not a task gap. |
| R10 AC4 | XML sitemap | Task 18 | Covered |
| R11 AC1-AC7 | CSS isolation spike | Tasks 7-11 | Covered |
| R12 AC1-AC4 | Testing infrastructure | Tasks 4, 5 | Covered |
| R13 AC1-AC3 | CSP headers | Task 19 | Covered |
| R14 AC1-AC3 | Font loading | Task 13 | Covered |

### Reverse check: Tasks to Requirements

All 26 tasks map to at least one requirement. No phantom tasks found.

### Gaps identified

1. **R2 AC3 (preview deploys)** — No task covers Vercel preview deploy configuration or verification.
2. **R5 AC5 (WCAG contrast)** — No task verifies contrast ratios on shadcn/ui default theme values.
3. **R10 AC3 (generateMetadata on all pages)** — Landing page (task 20) and 404 page (task 22) do not export generateMetadata(). For the landing page, the root layout's default metadata may suffice, but the AC is absolute. For the 404 page, Next.js not-found.tsx does not support generateMetadata() (it uses the parent layout's metadata), so this is a requirements issue, not a task issue.

---

## 2. Task Atomicity, Size, and Completion Criteria

### Tasks that are too large

**Task 17 (site layout with header, nav, footer)** — Produces 4 files: `(site)/layout.tsx`, `header.tsx`, `nav.tsx`, `footer.tsx`. The nav component alone involves responsive behavior (Sheet for mobile), active link state via `usePathname()` (requiring a client component boundary decision), `aria-*` attributes, and import of `navItems` from config. The header integrates nav + theme toggle. This is realistically 200-300 lines of component code across 4 files plus potential shadcn/ui component installation (Sheet). **Recommendation**: This is borderline but probably executable in one session if the agent stays focused. The risk is the nav's client/server boundary — the prompt says "requires 'use client' for nav or usePathname hook" but doesn't commit to an approach. An agent could produce a fully client-side nav (wasteful) or try to split the active indicator into a client sub-component (more complex). The prompt should specify the approach.

**Task 6 (Velite pipeline)** — Schema definition, postinstall script, dev script with concurrently, path alias, placeholder content, and documentation comments. This is a lot of surface area but each piece is small. Acceptable size.

### Tasks that are too small

No tasks are clearly too small. Even the simplest tasks (task 11 — document spike outcome, task 22 — 404 page) involve enough context-gathering and decision-making to justify a session.

### Vague completion criteria

- **Task 7**: "Playground layout renders without site chrome, container resets inherited styles, tokens are re-declared for shadcn/ui component use" — not objectively testable without running the dev server and inspecting computed styles. The programmatic verification is deferred to task 10. This is acceptable if task 7's success is understood as "code compiles and page renders without errors."
- **Task 17**: "Layout renders on all pages, navigation works at all breakpoints, mobile menu opens/closes, all links functional" — testable manually but not automated until tasks 23-24. Acceptable for a build task.
- **Task 12**: "Button renders correctly in both light and dark themes" — what does "correctly" mean? No computed style values specified. The task relies on visual inspection. This is fine for a setup task but is the weakest verification in the list.

### Missing file annotations

- **Task 14** (root layout with ThemeProvider): Does not list `src/styles/globals.css` in its File annotation, but the prompt says "import globals.css in root layout." The file already exists from tasks 6/7/12 — task 14 is adding an import, not creating it. Technically accurate but could surprise an agent expecting all touched files listed.
- **Task 17**: Does not list `src/config/site.ts` but depends on importing `navItems` from it.
- **Task 20**: Does not list `src/config/site.ts` but depends on importing `heroCards` from it.

---

## 3. Dependency Ordering and Implicit Dependencies

### Task 4 (Vitest canary) depends on shadcn/ui Button — REAL ISSUE

Task 4 is in Phase 1. It writes `src/components/ui/button.test.tsx` that "renders a shadcn/ui Button via @testing-library/react." But the Button component is not installed until task 12 (Phase 3, `npx shadcn@latest init` + Button installation). At the time task 4 runs, `src/components/ui/button.tsx` does not exist.

**Severity: HIGH.** The canary test will fail to compile. The agent would need to either install Button as part of task 4 (scope creep) or write a different canary test (deviates from prompt). The task breakdown has a real ordering violation.

**Fix**: Either move Button installation to task 4 (just install the component, not the full theme setup), or change the canary test to render a plain React component instead of a shadcn/ui Button.

### Task 7 (CSS isolation spike) references tokens.css — REAL ISSUE

Task 7's prompt says playground base stylesheet token values "must exactly match tokens.css :root declarations" and to "add comments pointing to tokens.css as reference source." But `tokens.css` is created in task 12 (Phase 3). Task 7 is in Phase 2.

**Severity: MEDIUM.** The agent will need to invent token values. The prompt does provide specific oklch values in the design doc section, so a competent agent could hardcode these. But the instruction to "match tokens.css" is impossible to follow because the file doesn't exist yet. When task 12 later creates `tokens.css` via `shadcn init`, the generated values may not match what the agent hardcoded in task 7.

**Fix**: Task 7 should use placeholder/documented oklch values from the design doc and explicitly state that task 12 will create the authoritative `tokens.css`, after which the playground stylesheet values must be synced.

### Task 3 (CI pipeline) mentions test:e2e — NOT AN ISSUE

Task 3's CI workflow includes `pnpm test:e2e` (Playwright). Playwright isn't configured until task 5. However, this is the CI workflow file being created, not executed. The workflow won't run until code is pushed, and by then tasks 4 and 5 will have been completed (all Phase 1). The CI file just needs to be syntactically valid YAML, which it will be. **Not a real issue** — the workflow is created before the tools it invokes, but they'll be in place before it runs.

### Task 3 mentions "postinstall: velite build" — TIMING ISSUE

Task 3's prompt says "pnpm install (triggers velite build via postinstall)." At the time task 3 is implemented, Velite is not configured (task 6, Phase 2). If CI runs after task 3 but before task 6, `postinstall` will fail. However, in practice, tasks are executed sequentially and CI won't run until all Phase 1 tasks are complete. The real risk is: if someone pushes after Phase 1 but before Phase 2, CI fails. **Low severity** — normal for incremental setup. The prompt should note this or the CI workflow should tolerate missing postinstall scripts.

### Task 6 creates globals.css, task 7 modifies it, task 12 further modifies it — CONFLICT RISK

- Task 6: Creates `src/styles/globals.css` as a "placeholder."
- Task 7: Adds `@layer playground;` before `@import "tailwindcss"` in `globals.css`.
- Task 12: Configures `globals.css` with `@import "tailwindcss"`, `@import "./tokens.css"`, `@theme` block, and also includes `@layer playground` declaration.

Task 12's prompt says to configure globals.css with the full setup including `@layer playground`. If task 7 has already added this declaration, task 12 may duplicate it or overwrite task 7's additions. More critically, `npx shadcn@latest init` generates its own globals.css. If the init command overwrites the file, task 7's playground layer setup is lost.

**Severity: MEDIUM.** Task 12 will likely produce a correct `globals.css` because its prompt is comprehensive, but the risk of `shadcn init` overwriting the file is real. The prompt should explicitly instruct the agent to merge or preserve existing content.

### Phase 5 E2E tests (tasks 23-26) — VERIFIED

All referenced components, routes, and behaviors exist by Phase 5:
- Theme toggle (task 15) exists for task 23
- Nav + placeholder pages (tasks 17, 21) exist for task 24
- Landing page + hero cards (task 20) exist for task 25
- CSP headers (task 19) + playground spike page (task 8) exist for task 26

No issues found.

---

## 4. Implementation Prompt Quality and Accuracy

### Task 3: "postinstall: velite build"

The prompt tells the agent the CI's `pnpm install` "triggers velite build via postinstall." At the time task 3 is implemented, Velite is not configured and no postinstall script exists. The comment is technically harmless (the CI YAML just calls `pnpm install`, which will work fine without a postinstall script), but the explanatory text is misleading. An agent reading this may try to verify that Velite runs during install and flag an apparent failure.

### Task 7: CSS property values

The prompt specifies exact CSS properties for the container reset: `all: initial`, `isolation: isolate`, `display: block`, `box-sizing: border-box`, `unicode-bidi: normal`. These match the design doc exactly (lines 258-265). The playground base stylesheet re-establishment values (font-family, font-size, line-height, color, etc.) also match the design doc. **Accurate.**

The prompt says "light-mode values matching tokens.css :root" — but tokens.css doesn't exist yet (see dependency issue above). The design doc provides literal oklch values, so an agent following the design doc closely could produce correct values. But the prompt's instruction to match a nonexistent file is misleading.

### Task 19: CSP regex

The regex `/((?!playground(/|$)).*)` — this is a Next.js `source` pattern for header matching. Verification:

- Matches `/` (root): `.*` matches empty string, negative lookahead passes because empty string doesn't start with `playground`. **Correct.**
- Matches `/profile`, `/blog/post`: Negative lookahead passes because these don't start with `playground`. **Correct.**
- Excludes `/playground`: Negative lookahead fails because the string is exactly `playground` followed by end-of-string (`$`). **Correct.**
- Excludes `/playground/spike`: Negative lookahead fails because string starts with `playground/`. **Correct.**
- Matches `/playground-tips`: Negative lookahead passes because `playground-tips` matches `playground` but followed by `-`, not `/` or `$`. **Correct** — this is the segment boundary behavior the prompt specifies.

The regex is syntactically correct and matches the design doc's intent. **No issues.**

### Task 12: "Run npx shadcn@latest init" — SAFETY CONCERN

If task 7 has already modified `globals.css`, `shadcn init` will either overwrite it or prompt about existing files. In a non-interactive agent context, behavior depends on CLI flags and version.

**Failure scenario**: `shadcn init` overwrites `globals.css` silently, destroying `@layer playground` and the Tailwind import structure from tasks 6-7. Or it prompts for confirmation and hangs in the agent's non-interactive shell.

The prompt should specify `--defaults` or `--force` flags if overwriting is intended, followed by explicit instructions to re-add the `@layer playground` declaration. Or acknowledge that `globals.css` already exists and instruct the agent to merge shadcn's output with the existing content.

### Task 12: components.json interaction

If shadcn CLI has been used at all before task 12 (e.g., to resolve the task 4 Button dependency), `components.json` may already exist. Running `shadcn init` on a project with an existing `components.json` has version-dependent behavior. Secondary concern but worth noting.

### File path consistency

All component paths match the structure doc: `src/components/layout/`, `src/components/shared/`, `src/components/ui/`. Route paths use correct route group syntax: `(site)/`, `(playground)/`. Test paths are in `e2e/tests/` as specified. Config at `src/config/site.ts` matches structure doc. **No inconsistencies found.**

---

## 5. Design Document Fidelity

### Task 16 types vs. design doc SiteConfig

The design doc's type definition (lines 182-201) nests `navItems` and `heroCards` inside `SiteConfig`:

```typescript
type SiteConfig = {
  name: string; description: string; url: string; ogImage: string;
  navItems: NavItem[]; heroCards: HeroCardConfig[];
}
```

But the design doc's Components section (lines 177-180) lists them as separate exports:

```
- siteConfig: Site name, description, URL, default OG image path
- navItems: Array of { label, href }
- heroCards: Array of { title, description, href }
```

Task 16's prompt follows the separate exports pattern: "exporting siteConfig (name, description, url, ogImage), navItems array... and heroCards array." But it also says "Define NavItem, HeroCardConfig, SiteConfig types" — where `SiteConfig` would not include navItems/heroCards if they're separate exports.

**This is a contradiction within the design doc itself.** The task inherits the ambiguity. The functional behavior is the same either way, but an agent could produce either structure.

**Severity: LOW.** The prompt should commit to one pattern. The design doc's type definition is the more authoritative source.

### Nav component client/server boundary

The design doc states "Server components by default. Only the theme toggle requires `'use client'" (line 100). But the Nav component uses `usePathname()` for active link state (line 130), which requires `"use client"`. Task 17's prompt correctly identifies this: "requires 'use client' for nav or usePathname hook."

**This is a contradiction in the design doc**, not a task issue. The task prompt handles it by presenting both options but not choosing. The standard resolution is either: (a) the entire nav is a client component, or (b) extract a `NavLink` client wrapper component for active state, keeping nav itself as a server component.

**Severity: LOW.** The task prompt should prescribe a specific approach rather than leaving it to the agent.

### tokens.css as separate file

The design doc clearly specifies `tokens.css` as a separate file imported by `globals.css` (lines 420-464). Tasks are consistent:
- Task 12 creates both `globals.css` and `tokens.css` as separate files.
- Task 7 references `tokens.css` values for the playground stylesheet.

**Consistent across tasks.**

### Graduated outcome documentation (task 11)

Task 11's prompt asks for documenting the graduated outcome (a/b/c). The design doc specifies what outcome (c) means for the playground layout (lines 757-766): simplified layout, no style-reset container, iframe-only for all items. Task 11's prompt says "recommendation for spec 8 playground architecture" which is sufficiently open-ended to capture the design doc's guidance. **Acceptable.**

---

## 6. Cross-Task Consistency and Convention Adherence

### No barrel files, kebab-case, named exports

All file paths in the task list use kebab-case: `hero-card.tsx`, `theme-toggle.tsx`, `theme-provider.tsx`, `placeholder-page.tsx`. No barrel files referenced. Named exports used (except route files which use default exports per Next.js convention). **Consistent.**

### 300-line file limit

Task 17 produces 4 files. The nav component with responsive behavior (Sheet, active links, mobile menu) is the highest risk. Estimate:
- `layout.tsx`: ~20 lines
- `header.tsx`: ~30-40 lines
- `nav.tsx`: ~80-120 lines (desktop links + Sheet with mobile links + usePathname)
- `footer.tsx`: ~30-40 lines

All likely under 300 lines. **Acceptable**, though the nav component is the one to watch.

### Task 21: generateMetadata() consistency

Task 21 creates 6 section page files (profile, projects, contributions, blog, resources, contact), each with `generateMetadata()` returning title and `robots: { index: false }`. **Consistent across all 6.** The "about" slash page is not in this list — it's content-driven via Velite, not a placeholder. This matches the requirements.

### ESLint config inconsistency

The structure doc's tree (line 107) shows `.eslintrc.json`. Task 2 creates `eslint.config.mjs` (flat config). The tech doc says "ESLint with Next.js config" without specifying file format. Next.js 15+ uses flat config by default.

**Task 2 is correct** to use `eslint.config.mjs`. The structure doc has a stale reference. This inconsistency exists in the steering documents, not in the tasks. The structure doc should be updated.

### "use client" usage

Tasks that specify `"use client"`:
- Task 9 (Dialog in spike) — correct, Dialog requires interaction
- Task 14 (ThemeProvider) — correct, wraps next-themes
- Task 15 (ThemeToggle) — correct, uses useTheme
- Task 17 (Nav) — correctly notes it's needed for usePathname

No task incorrectly adds `"use client"` to a server component. **Consistent**, with the nav client boundary being the only ambiguity (addressed in Section 5).

---

## Top 5 Risks or Gaps

### 1. Task 4 (Vitest canary) cannot render shadcn/ui Button — it doesn't exist yet

Task 4 (Phase 1) writes a test importing `src/components/ui/button.tsx`, which is not installed until task 12 (Phase 3). The canary test will fail to compile. This is a hard ordering violation that will block the task.

**Failure scenario**: Agent runs task 4, test fails with "Cannot find module '@/components/ui/button'", agent either installs Button prematurely (scope creep, no theme configured) or writes a non-Button test (deviates from spec).

**Fix**: Change the canary test to render a plain `<button>` element or a minimal custom component. Move Button installation to task 4 if shadcn/ui Button specifically must be tested.

### 2. Task 12 (shadcn init) may overwrite task 7's globals.css modifications

Task 7 adds `@layer playground` and `@import "tailwindcss"` to `globals.css`. Task 12 runs `npx shadcn@latest init`, which generates its own `globals.css`. If the init command overwrites the file, task 7's playground layer setup is lost.

**Failure scenario**: Agent runs `shadcn init`, it overwrites `globals.css`, the `@layer playground` declaration disappears, playground isolation tests (task 10) fail in a way that's difficult to diagnose.

**Fix**: Task 12's prompt should specify that `globals.css` already exists with playground layer setup, and instruct the agent to merge shadcn's output into the existing file rather than letting init overwrite it. Alternatively, use `--no` flag for globals.css during init and manually configure it.

### 3. Task 7 references tokens.css values that don't exist yet

Task 7 (Phase 2) must re-declare shadcn/ui CSS custom property values in the playground base stylesheet, matching `tokens.css`. But `tokens.css` is created in task 12 (Phase 3). The agent must invent values.

**Failure scenario**: Agent guesses oklch values for the playground stylesheet. Task 12 later generates different values via `shadcn init`. Playground components render with wrong colors. The mismatch may not be caught until task 10's Playwright tests, creating rework.

**Fix**: Either reorder task 12 before task 7 (requires restructuring phases), or have task 7 use explicit placeholder values from the design doc with a clear comment that they must be synced after task 12. The design doc does provide literal values, so the risk is mitigatable.

### 4. R5 AC5 (WCAG contrast verification) has no task

No task verifies that theme color values meet WCAG 2.1 AA contrast ratios (4.5:1 for normal text, 3:1 for large text). The requirements doc says this should be verified "during R9 implementation (when theme values are finalized)." Task 12 covers R9 but does not mention contrast verification.

**Failure scenario**: Site launches with shadcn/ui default theme values that may or may not meet AA contrast. shadcn/ui defaults generally do meet AA, but this is unverified. If a downstream design pass changes token values, there's no regression gate.

**Fix**: Add a step to task 12's prompt requiring contrast verification of foreground/background pairs using an automated tool (e.g., checking oklch values programmatically or using a contrast checker). Alternatively, add a dedicated task or acceptance note.

### 5. R2 AC3 (Vercel preview deploys) has no task

No task covers configuring or verifying Vercel preview deployments. This is a Vercel platform configuration concern (linking the GitHub repo to Vercel), not a code task. But the requirements list it as an acceptance criterion, and it won't happen by itself.

**Failure scenario**: PRs don't get preview deploys because Vercel integration was never set up. The team discovers this when the first PR is opened.

**Fix**: Add a non-code task or checklist item for Vercel project setup: link GitHub repo, configure preview deploys, verify with a test PR.

---

## Top 3 Conclusions to Challenge or Reverse

### 1. Phase ordering: CSS isolation spike (Phase 2) before theme setup (Phase 3)

The current ordering puts the CSS isolation spike in Phase 2 and theme/tokens setup in Phase 3. This creates the tokens.css dependency problem (risk #3 above). The rationale is "run the spike before CSS architecture is finalized so findings inform layout/theme decisions." But the spike needs token values to test shadcn/ui component rendering inside the playground container.

**Alternative**: Move task 12 (global styles + tokens.css) to Phase 2, before the spike. The spike's purpose is to test isolation, not to inform token values. Having real token values would make the spike more accurate and eliminate the synchronization problem. The spike can still inform layout decisions — it just uses real tokens instead of guessed ones.

**Why it might be better**: Eliminates a hard dependency gap, reduces rework risk, and makes spike test results more reliable.

### 2. Task 4's canary test rendering shadcn/ui Button

The decision to use a shadcn/ui Button as the canary test subject creates a dependency on Phase 3 from Phase 1. The purpose of the canary test is to prove "path aliases and JSX transforms work" — it does not need shadcn/ui for this.

**Alternative**: The canary test renders a plain React component (a `<div>` or custom `<button>`) with no external dependencies. The test proves the same things (path aliases, JSX transform, jsdom environment) without requiring shadcn/ui. Add a shadcn/ui-specific smoke test in Phase 3 after Button is installed, if component rendering verification is desired.

**Why it might be better**: Eliminates the Phase 1 → Phase 3 dependency entirely. The canary test serves its stated purpose without coupling to the component library.

### 3. Task 17 bundles all layout components into one task

Task 17 produces header, nav (with responsive behavior and client component boundary), footer, and the site layout — 4 files with distinct concerns. The nav alone involves Sheet installation, usePathname, aria attributes, and responsive breakpoint logic.

**Alternative**: Split into two tasks: (a) site layout + header + footer (server components, straightforward), (b) nav component with responsive behavior and active link state (client component, more complex). This gives each task a clearer scope and makes the nav's client/server boundary decision explicit.

**Why it might be better**: Reduces risk of a single task producing incorrect client/server boundaries. Allows the nav task to focus on the most complex piece of the layout. That said, the components are tightly coupled (header imports nav), so splitting introduces an integration concern. On balance, keeping them together is defensible if the prompt is more prescriptive about the client/server boundary.

---

## What's Missing

### Tasks to add

1. **Vercel project setup task** — A non-code checklist task for linking the GitHub repo to Vercel, configuring preview deploys, and verifying the integration works. Covers R2 AC2 and R2 AC3.

2. **WCAG contrast verification step** — Either a standalone task or an addition to task 12's prompt verifying that shadcn/ui default theme values meet AA contrast ratios.

### Tasks to split

- **Task 17** should be considered for splitting into (a) site layout + header + footer and (b) nav component with responsive/mobile behavior. This reduces per-session scope and isolates the client component boundary decision. However, the components are coupled enough that keeping them together is defensible if the prompt specifies the client/server approach.

### Tasks to reorder

- **Consider moving task 12 (or at least the tokens.css creation) before task 7.** This eliminates the tokens.css dependency gap. If full phase reordering is undesirable, a minimal "create tokens.css with shadcn defaults" sub-task could be inserted at the start of Phase 2.

### Tasks to modify

1. **Task 4** — Change canary test from shadcn/ui Button to a plain React component.
2. **Task 7** — Remove the instruction to "match tokens.css :root declarations" (file doesn't exist yet). Instead, specify literal oklch values from the design doc and add a comment noting that values must be synced with tokens.css after task 12.
3. **Task 12** — Add a warning that `globals.css` already exists with `@layer playground` setup from task 7. Specify that `shadcn init` should not overwrite it, or that the agent must merge the output. Add WCAG contrast verification step.
4. **Task 17** — Commit to a specific client/server boundary approach for the nav component (recommend: extract a `nav-link.tsx` client component for active state, keeping nav itself as a server component).
5. **Task 20** — Add `generateMetadata()` export to satisfy R10 AC3 strictly, even if it just returns `{ title: "Home" }`.

### Tasks to remove

None. All tasks are justified and trace to requirements.

### Steering document inconsistency to resolve

The structure doc shows `.eslintrc.json` but the tech doc and task 2 use `eslint.config.mjs` (flat config). The structure doc should be updated to reflect the flat config convention. This isn't a task issue but should be noted for the steering doc maintainer.
