# Adversarial Review Prompt — site-foundation Tasks (Round 2)

You are a senior full-stack engineer and CI/CD architect with deep experience in Next.js App Router, Tailwind CSS v4, build pipelines, and incremental project bootstrapping. You have built and shipped multiple production sites using these exact tools.

Your job is to tear apart the task breakdown for the site-foundation spec. Find every gap, ordering violation, missing dependency, vague prompt, and unverifiable completion criterion. Do not validate or praise. If something is actually fine, say so in one sentence and move on.

Read the following files before beginning your analysis:

- `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/tasks.md` — the target document
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/requirements.md` — requirements this task list must cover
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/design.md` — design decisions the tasks must implement
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md` — technology constraints
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md` — project structure conventions
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md` — product vision and principles

---

## Prior Review Context

A v1 adversarial review was conducted. Most findings were addressed in the current version of tasks.md. Here is a summary:

**Addressed (do not re-discover these):**
- Canary test (now task 5) no longer depends on shadcn/ui Button — changed to plain React component
- Vercel preview deploys now covered by task 4 (non-code platform configuration task)
- tokens.css dependency resolved — task 8 creates tokens.css in Phase 2 before spike tasks
- shadcn init overwrite risk — task 14 now warns against running `shadcn init` and instructs preservation of existing globals.css
- generateMetadata() now specified on landing page (task 22)
- Site config type structure now explicitly nested (task 18)
- Nav component now explicitly marked as "use client" (task 19)

**Partially addressed (dig deeper):**
- R5 AC5 WCAG contrast verification: task 14 mentions it but the approach is vague — no specific tool, no CI gate, no defined pass/fail threshold beyond the WCAG ratios themselves

**Not addressed:**
- ESLint config naming inconsistency between structure doc (.eslintrc.json) and task 2 (eslint.config.mjs)

**Pattern from v1:** Cross-phase dependency violations — tasks referencing artifacts that don't exist until a later phase. The v1 review found this for the canary test (Button) and tokens.css. Check whether the same pattern persists elsewhere.

Classify each finding in your analysis as one of:
- **Novel**: Not identified in any prior review.
- **Compounding**: Builds on or deepens a prior finding.
- **Recurring**: Same issue identified before but not yet resolved — escalate severity.

---

## Analysis Dimensions

### 1. shadcn/ui Component Availability in Phase 2 Spike Fixtures

Task 8 runs `npx shadcn@latest init --defaults` to generate token values. This creates `components.json` and the shadcn CLI configuration, but does NOT install any components.

- Examine task 10 (spike test fixtures): it renders "a shadcn/ui Button inside playground container." Determine whether Button is available at this point. Task 14 (Phase 3) says "Install shadcn/ui Button component via CLI" — implying Button is not installed before task 14. If Button doesn't exist when task 10 runs, this is the exact same class of cross-phase dependency that v1 caught for the canary test.
- Examine task 11 (Radix overlay verification): it renders "shadcn/ui Dialog inside playground container." Dialog requires both the Dialog component and its Radix dependencies. Determine whether these are available in Phase 2.
- If components are unavailable, assess whether each spike fixture prompt should explicitly install the required components, or whether a component installation task should be inserted between tasks 8 and 10.
- Evaluate the downstream impact: if components are installed during the spike (Phase 2), does that conflict with task 14's instructions ("Do not run shadcn init")?

### 2. Task 8's shadcn init Side Effects and State Management

Task 8 instructs: "run npx shadcn@latest init --defaults to generate values, then extract token declarations into tokens.css." This is a generator command with broad side effects.

- Catalog every artifact `shadcn init --defaults` creates: globals.css, components.json, tailwind.config (if any for v4), lib/utils.ts, and potentially a src/styles directory. Determine which of these are wanted at this point and which create conflicts with later tasks.
- Challenge whether running full `shadcn init` in task 8 is appropriate when the purpose is only to extract token values. An alternative is to reference the shadcn/ui source or documentation for default oklch values without running the init command.
- Assess what happens to the globals.css created by task 7 (Velite pipeline creates a placeholder) when shadcn init runs in task 8. Task 8 says "If shadcn init generates a globals.css, extract the token values and restructure" — evaluate whether this instruction is clear enough to prevent data loss.
- Determine whether `components.json` created by task 8's init persists correctly through to task 14, or whether task 14's explicit "Do not run shadcn init" creates a clean-enough state for `shadcn add button`.

### 3. The Two-Touch Pattern on globals.css

globals.css is touched by multiple tasks across phases:
- Task 7: Creates placeholder globals.css
- Task 8: Restructures globals.css with `@layer playground`, `@import "tailwindcss"`, unlayered `@import "./tokens.css"`
- Task 9: References globals.css (imports playground.css which uses @layer playground declared in globals.css)
- Task 14: Adds `@theme` block mapping Tailwind utilities to CSS custom properties

- Stress-test the handoff between task 8 and task 14. Task 8 establishes the import structure. Task 14 adds the `@theme` block. Verify the prompts are consistent about what globals.css should contain after each task.
- Identify whether any intermediate task could inadvertently modify globals.css (e.g., installing shadcn/ui components between tasks 8 and 14).
- Evaluate whether the `@layer playground` declaration order relative to Tailwind's internal layers is verified at the right point. Task 8 creates the declaration; task 12 (Playwright tests) verifies it. But tasks 9-11 depend on correct layer ordering to function. If ordering is wrong, tasks 9-11 produce invalid results that aren't caught until task 12.
- Challenge whether splitting globals.css setup across two phases (8 and 14) is justified, or whether consolidating all globals.css work into one task would reduce inter-task coupling.

### 4. Task 4 (Vercel Setup) Executability and Verification

Task 4 is a non-code platform configuration task. It instructs: "Link GitHub repo to Vercel project. Configure automatic production deploys on push to main. Verify preview deploys are enabled for pull requests. Open a test PR to confirm a preview deployment is created."

- Challenge whether an AI agent can execute this task meaningfully. Vercel project setup requires web UI interaction or `vercel` CLI authentication, neither of which is available in a standard code-generation session.
- Evaluate whether the task should be flagged as a manual human task rather than an agent-executable task, and what that means for task tracking and ordering.
- Assess what happens to CI (task 3) if Vercel integration is not configured when code is first pushed. Does the CI workflow depend on Vercel in any way, or is it fully independent?
- Determine whether task 4's position (after task 3, before tasks 5-6) creates a blocking dependency. If tasks 5-6 cannot proceed until Vercel is configured, the entire pipeline stalls on a manual step.

### 5. Prompt Completeness for Phase 2 Spike Tasks (9-13)

The spike is the most architecturally significant work in the task list. Its outcome determines playground architecture for all downstream specs.

- Examine task 9 (container and layer setup): The prompt specifies CSS properties but does not mention what happens if `@layer playground` ordering doesn't work as hypothesized. The design doc says outcome (c) means "same-page isolation not viable." Does task 9's prompt account for this failure mode, or does it assume success?
- Examine task 12 (Playwright verification): The prompt says "Compare computed values between dev (Turbopack) and production (Webpack) builds." Determine how this comparison is operationalized. Does the agent run two separate builds? Does Playwright config support switching? Is there a task dependency on having both a dev server and a production build available simultaneously?
- Examine task 13 (document outcome): The prompt says to "create spike-results.md documenting graduated outcome." Challenge whether task 13 has enough information to produce the outcome. It depends on task 12's test results, but how are those results communicated? Does the agent read Playwright output? Is there a structured format?
- Evaluate whether the spike tasks (9-13) adequately cover the scenario where the spike fails (outcome c). What cleanup is required? Does the playground layout (task 9) need to be rolled back or simplified? Is there a contingency path in the task list?

### 6. Requirement Coverage Gaps and Traceability Drift

The task list was restructured since v1. Requirements may have drifted.

- Re-verify R2 AC4: "Velite build before type-checking in CI." Task 3 creates the CI workflow. Velite is configured in task 7. Verify that the CI workflow created in task 3 includes `pnpm install` (which triggers postinstall → velite build) before the typecheck step. But at task 3 time, there is no postinstall script — it's added in task 7. Assess whether the CI workflow is resilient to running before Velite exists.
- Re-verify R11 AC5: "verified in both light and dark themes, and in both dev and production builds." Task 12 covers dev vs production comparison. But do any spike fixture tasks test dark theme behavior inside the playground container? The playground container uses light-mode tokens only per design doc. Clarify what "verified in both themes" means when the playground itself doesn't theme-switch.
- Check whether task 20 (sitemap) covers all routes listed in the design doc. The design doc lists 12 routes. Count the routes in task 20's prompt and verify none are missing.
- Verify that task 19's nav links match the R4 AC2 section-to-path mapping table exactly. The table lists 6 sections. Task 19's prompt references `siteConfig.navItems` — verify the config (task 18) defines all 6.

---

## Deliverables

Conclude your analysis with:

1. **Top 5 risks or gaps** — ranked by severity. For each, describe the specific failure scenario and propose a fix.
2. **Top 3 conclusions to challenge or reverse** — specific decisions in the task list that should be reconsidered, with reasoning for an alternative approach.
3. **What's missing** — tasks to add, split, reorder, or modify before implementation begins.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

Write your complete analysis to: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/reviews/adversarial-analysis-tasks-r2.md`
