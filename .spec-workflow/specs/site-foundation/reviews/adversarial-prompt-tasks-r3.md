# Adversarial Review Prompt: site-foundation Tasks (Round 3)

You are a senior build engineer and technical project manager with deep experience in Next.js, CI/CD pipelines, and breaking down implementation specs into executable task lists for AI agents. You have seen dozens of task breakdowns that looked clean on paper but collapsed during execution due to missing files, implicit assumptions, and ordering errors that only surface when an agent follows the instructions literally.

Your job is to tear apart the site-foundation task list. Find every gap, every implicit assumption, every instruction that will cause an agent to fail or produce incorrect output. Do not validate. Do not praise. If something is actually fine, say so in one sentence and move on.

Read the following files before beginning your analysis:

- `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/tasks.md` — the target document
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/requirements.md` — requirements this task list must satisfy
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/design.md` — design decisions tasks must implement
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md` — product vision and principles
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md` — technology decisions and constraints
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md` — project structure and conventions

## Prior Review Context

Two prior adversarial reviews (v1, v2) have been conducted on this task list. Here is what was found and addressed:

### Resolved Issues (do not re-discover these)
- **Cross-phase component availability**: v1 found the canary test depended on shadcn/ui Button before installation; v2 found the same pattern in spike fixtures (tasks 10-12). Both fixed — canary uses plain React component, task 9 now installs all needed shadcn/ui components before spike.
- **shadcn init side effects**: v1 flagged globals.css overwrite risk; v2 deepened to catalog all side effects. Resolved — task 8 now creates all files manually (no shadcn init).
- **Dev-vs-production Playwright comparison**: v2 found no implementation path. Resolved — downgraded to manual verification, CI runs production only.
- **Dark-mode isolation testing**: v2 found it missing from spike tests. Resolved — task 13 now includes dark-mode toggle assertion.
- **Spike outcome (c) contingency**: v2 found no cleanup instructions. Resolved — task 14 now documents artifacts to modify.
- **Task 4 AI executability**: v2 found Vercel setup unexecutable by AI. Resolved — flagged as [MANUAL].
- **Spike-summary.txt inter-task artifact**: v2 found task 14 had no way to read task 13 results. Resolved — task 13 writes spike-summary.txt.
- **Task 3 postinstall cross-reference**: v2 found wrong task number. Fixed.

### Partially Resolved (may warrant deeper examination)
- **WCAG contrast verification (R5 AC5)**: Task 15 now lists specific token pairs and suggests browser DevTools, but there is no CI gate and no mandatory tool. Improved from v1 but still vague on enforcement.

### Unresolved
- **ESLint config naming**: structure.md still lists `.eslintrc.json` while task 2 creates `eslint.config.mjs`. Task 2 is correct; structure doc is stale. Flagged in v1, re-flagged in v2 with explicit fix recommendation. Still not updated.

### Directive for This Review
Classify each finding as one of:
- **Novel**: Not identified in any prior review.
- **Compounding**: Builds on or deepens a prior finding with new evidence or consequences.
- **Recurring**: Same issue identified before but not yet resolved — severity should escalate.

Focus on novel issues. Do not re-discover resolved findings listed above.

## Analysis Dimensions

### 1. Route and Page Coverage Completeness

The task list creates pages for 6 placeholder sections (task 24: profile, projects, contributions, blog, resources, contact) and the landing page (task 23). The site has additional routes that appear in the sitemap (task 21), navigation, or footer but may lack creation tasks.

- Verify whether `/about`, `/colophon`, `/now`, `/slashes`, and `/sitemap` (the HTML sitemap at `/sitemap`, distinct from the XML sitemap.ts) have page.tsx creation tasks. These routes are listed in the sitemap (task 21 lists 13 routes) and some are linked from the footer (task 20 links to /slashes). If no task creates their page.tsx files, agents will produce a sitemap referencing routes that 404.
- Verify whether `/playground` (the playground index page) has a creation task. It appears in navItems and heroCards (task 19) and is a placeholder section, but task 24 does not list it. The playground layout is created in task 10, but the index page at `/playground` is a different concern.
- Verify whether the `/playground/spike` page created in tasks 11-12 is accessible from the playground index or if it's an orphaned route only reachable by direct URL.
- Challenge whether the CSP E2E test (task 29) navigating to `/playground/spike` is valid as a long-term regression test — spike fixtures may be removed by spec 8. What happens to this test when the spike page is deleted?

### 2. Inter-Task File Mutation and Overwrite Risks

Multiple tasks touch the same files across phases. When an AI agent executes a task, it reads the prompt and creates/modifies the listed files. If a later task also creates one of those files, the agent may overwrite the earlier version.

- Trace every task that touches `src/app/layout.tsx`: task 16 (font loading), task 17 (root layout with ThemeProvider). Task 16 says "File: src/app/layout.tsx" and task 17 also says "File: src/app/layout.tsx". Determine whether task 17 is expected to build on task 16's output or replace it entirely. If replace, task 16's font work is lost. If build on, the prompt must say "modify existing layout.tsx" not "create."
- Trace every task that touches `globals.css`: task 7 (placeholder), task 8 (layer + imports + tokens), task 15 (@theme block). Verify the prompts use additive language ("add to existing") rather than creation language.
- Trace every task that touches `next.config.ts`: task 1 (initialization), task 22 (CSP headers). Verify task 22 modifies rather than overwrites.
- Trace `src/app/(playground)/spike/page.tsx`: task 11 (create), task 12 (extend). Task 12 says "extend from task 11" — verify the prompt makes this clear to an agent that may not have task 11's context.
- Examine whether task 9's `shadcn add` batch install could modify any existing file (globals.css, tailwind config) despite the prompt's warning not to. What happens if a future shadcn CLI version changes this behavior?

### 3. Dependency Installation and Package Consistency

Task prompts instruct agents to use specific packages but may not always specify installation. An agent creating a file that imports a package not yet in node_modules will produce a working prompt but a failing build.

- Task 7 uses `concurrently` in the dev script — verify it's listed as a devDependency to install.
- Task 8 says "Install clsx and tailwind-merge as dependencies" — verify this is the only place these are mentioned and that no earlier task assumes they exist.
- Task 16 imports from `next/font/google` — this is part of Next.js, no separate install needed. Fine.
- Task 17 uses `next-themes` — verify which task installs it as a dependency.
- Task 18 uses `lucide-react` for Sun/Moon icons — verify which task installs it.
- Task 5 uses `@testing-library/react` and `@vitejs/plugin-react` — verify these are specified as installations.
- Task 6 uses `@playwright/test` — verify installation is specified.
- Audit whether any task prompt says "use X" without a corresponding "install X" anywhere in the task list.

### 4. Prompt Fidelity to Design Document Decisions

The design document makes specific architectural decisions. Task prompts must faithfully translate these into agent instructions without introducing drift.

- The design doc specifies `ThemeToggle` as a dropdown with 3 states (Light, Dark, System). Verify task 18's prompt matches this exactly — no toggle button cycling through states, no binary switch.
- The design doc specifies the playground layout does NOT render site header/nav/footer. Verify task 10's prompt explicitly excludes site chrome, and that the `(playground)` route group layout is independent of the `(site)` layout.
- The design doc specifies placeholder pages include `robots: { index: false }` in generateMetadata(). Verify task 24's prompt includes this.
- The design doc specifies the canary Vitest test lives at `src/components/ui/button.test.tsx`. Task 5 places it at `src/canary.test.tsx`. Determine whether this is an intentional change (since Button isn't used in the canary anymore) or an oversight that deviates from the design doc.
- The design doc specifies HeroCard accepts `{ title: string; description: string; href: string }`. Verify task 23's prompt matches this interface.
- The design doc specifies the footer includes "social links (GitHub, LinkedIn)". Verify task 20's prompt includes these.
- The design doc specifies `siteConfig` includes `url` and `ogImage` fields. Verify task 19's prompt creates these.

### 5. Agent Executability of Specific Prompt Instructions

Some task prompts contain instructions that may be difficult for an AI agent to execute faithfully in a single session.

- Task 8 instructs creating tokens.css with "all shadcn/ui default theme tokens using oklch values from the neutral theme (reference shadcn/ui themes documentation for exact values)." Challenge whether an AI agent can reliably produce the exact oklch values without access to the shadcn/ui themes page. If the agent hallucinates values, every downstream component renders with wrong colors. Assess whether the prompt should embed the exact values rather than referencing external documentation.
- Task 13 instructs writing spike-summary.txt with pass/fail per test case — but the agent writing the test file is not the agent running the tests. The agent can write the test code, but cannot write the summary until tests actually run. Evaluate whether this task conflates test authoring with test execution and result reporting.
- Task 21 says "Create a placeholder OG image at public/images/og-default.png (1200x630)." Challenge whether an AI code-generation agent can create a PNG image. Most agents produce code, not binary image files. This may need to be flagged as [MANUAL] similar to task 4.
- Task 14 instructs reading spike-summary.txt and writing spike-results.md. If task 13 wrote the tests but hasn't run them yet, spike-summary.txt doesn't exist. Verify the execution model — does the CI pipeline run between tasks 13 and 14, or is the agent expected to run tests locally?

### 6. Requirement Traceability and Acceptance Criteria Coverage

Each task lists `_Requirements: R# AC#_` annotations. Verify that every acceptance criterion from the requirements document maps to at least one task, and that no AC is claimed by a task that doesn't actually address it.

- R2 AC4 requires "CI pipeline SHALL run Velite build before type-checking." Task 3 relies on `pnpm install` triggering postinstall. Verify that the CI workflow step order guarantees Velite runs before `pnpm typecheck`.
- R3 AC3 requires "velite build SHALL succeed with empty content directories." Task 7 adds a placeholder file — verify whether this actually tests the empty-directory case or sidesteps it.
- R6 AC1 requires "personal introduction section with photo(s)." Task 23's prompt says "personal photo via Next.js Image (src from public/images/, path hardcoded in component)." Verify there is a task that places a photo file in public/images/, or whether the agent is expected to create one (same PNG creation problem as task 21).
- R4 AC6 requires the footer to include "links to slash pages or a link to /slashes." Task 20's prompt says "link to /slashes." Verify this satisfies the requirement — a single link to /slashes rather than individual slash page links.
- R12 AC3 requires tests to be "runnable both locally and in CI." Verify that the Playwright webServer config (reuseExistingServer when not CI) satisfies this, and that no test has a CI-only or local-only dependency.
- Check for any requirements AC that appears in zero tasks — an untested acceptance criterion.

## Deliverables

Conclude your analysis with:

1. **Top 5 risks or gaps**, ranked by severity. For each, describe the concrete failure scenario — what breaks, when, and what the agent sees. Not abstract risks.
2. **Top 3 conclusions to challenge or reverse**, with specific reasoning for why the current approach may be wrong.
3. **What's missing** — tasks to add, tasks to modify, and any steering document updates needed.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

Write your analysis to: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/reviews/adversarial-analysis-tasks-r3.md`
