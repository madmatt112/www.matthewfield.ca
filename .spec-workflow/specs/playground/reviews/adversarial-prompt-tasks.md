# Adversarial Review — Playground Tasks (v1)

You are a principal Next.js / React delivery engineer brought in to **tear apart** an implementation task breakdown before any code is written. Deep current (2026) expertise in the Next.js 16 App Router, the build/test toolchain in this repo (Vitest, Playwright, ESLint, `tsc`, Velite), CI sequencing, and — critically — **task decomposition discipline**: atomicity, dependency-edge correctness, completion-criteria testability, requirement coverage, and *red-by-construction* hazards (a task whose `Success:` cannot be true because a sibling hasn't landed). Your job is to find every weakness — **not** to validate. Assume the author is over-confident about ordering and coverage.

Target: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/playground/tasks.md`.
Approved upstream (treat as fixed; flag only where tasks *contradict* or *fail to implement* them): requirements `.spec-workflow/specs/playground/requirements.md` (v4) and design `.spec-workflow/specs/playground/design.md` (v4, converged through three adversarial rounds). Steering: `.spec-workflow/steering/{product,tech,structure}.md`. **Read the tasks doc, the design, the requirements, and the relevant live code before attacking.** The repo root is `/home/mcf/repo/matthew-field.ca` (Next 16.2.2, React 19.2.4, Vitest 4). Ground every finding in a `file:line`/task-number citation or a concrete failure scenario.

## Analysis dimensions

### 1. Dependency-graph correctness and the red-by-construction claim
- The doc's headline claim is that **Task 8 is the only breaking change** and the tree is green before and after every task. Stress-test this. Walk the DAG (Tasks 1–16) and find any *intermediate* state where a task's `Success:` is false. Specifically: after Task 6 (landing route renders `<PlaygroundFrame>`) but before Task 8 (group layout still wraps), the same-page route `/playground/scribble-pad` is wrapped by BOTH the group layout's `.playground-container` AND `<PlaygroundFrame>` → **double `all: initial` nesting**. Does anything (a test, the isolation suite, `next build`) fail or misbehave in that window? Is "no test points at it yet" actually true given Task 6's own `Success:` says `next build` prerenders it?
- Task 8 depends on {2, 3, 6}. Verify that's sufficient: does re-pointing `playground-isolation.test.ts` onto `/playground/scribble-pad` require the **gallery** (Task 9) or the **manifest routes** to be fully wired first? Can the isolation suite navigate to `/playground/scribble-pad` and read computed styles if Task 9 (gallery) hasn't landed? Trace whether the same-page route is reachable/buildable at the moment Task 8 runs.
- Find any **missing dependency edge**: e.g. does Task 10 (sitemap importing `#playground/manifest`) actually need Task 1 (alias) as a dep (it's only listed as 5, 6)? Does Task 13 (CSP test) need Task 8 (so the routes build cleanly) or only 6/7? Does Task 16 need Task 1's alias if it imports anything? Does Task 12 (leak guard CI) need a dep on the sample tasks for its *production* run to pass, and is that edge present?
- Challenge the claim that Task 5 (manifest) depending on {3, 4} is enough for `tsc`: does `() => import("./scribble-pad")` typecheck if `playground/scribble-pad/index.tsx` exists but has a type error, and is the ordering robust to that?

### 2. Atomicity and task sizing
- Task 8 bundles four edits across four files (layout, CSS, spike deletion, a ~413-line test rewrite). Is that genuinely atomic-necessary, or is it an over-stuffed task that a fresh-context agent will fumble? Could any of the four sub-edits be split without re-introducing a red state? Conversely, are any tasks **too granular** (e.g. 3 and 4 as separate sample tasks, 14 and 15 as separate doc/check tasks) such that they create artificial dependency churn?
- Task 16 (the E2E capstone) bundles render + sizing-ratio + 404 + embed-a11y + console-clean + **axe** across five page types in two themes. Is that one reviewable task or three? Does the axe pass belong here or is it scope the design/requirements didn't actually mandate (check whether the requirements make axe blocking, or whether the task is importing a sibling convention the spec didn't ask for)?
- Each task claims "1–3 files." Verify. Does Task 12 (script + self-test + `package.json` + a CI workflow edit) actually touch a CI YAML the task doesn't name? Where is the CI step added, and is that file identified?

### 3. Completion-criteria testability ("Success:" lines)
- Hunt for `Success:` criteria that cannot be mechanically verified or that smuggle in unstated work. E.g. Task 8's "confirm the live post-M1 container `color` serializes to `rgb(10,10,10)` and pin the exact value if the toolchain differs" — is that a *completion* criterion or an open research question deferred into the task? If the value differs, what does the implementer do, and does that ripple to the test?
- Task 6's `Success:` asserts `next build` "proving `next/dynamic` SSRs and the `_components` folder is router-ignored." Can a fresh agent actually run `next build` and observe these, and what's the failure signal if the `_components` folder IS picked up as a route?
- Task 11's `Success:` says the integrity test passing "proves the `#playground/manifest` subpath alias resolves under Vitest (if it does not, apply the fallback)." Is "apply the fallback" a hidden sub-task (editing `vitest.config.ts` again or installing `vite-tsconfig-paths`) that isn't budgeted? Should the alias-resolution risk be its own gating step before Task 11?
- Find any `Success:` that is really backstopped by a *later* task (the doc admits a "route ↔ E2E coupling"). Is that coupling honestly scoped, or does it let tasks 6/7/9 be marked complete with no actual proof until Task 16?

### 4. Coverage — requirements ↔ tasks ↔ design
- Audit the Requirements Coverage Matrix against the actual requirements doc. Find any acceptance criterion with **no task** or only an "M" (manual) where the requirements demand a mechanized gate. Probe specifically: Req 7.4 (no leakage asserted by data-testid) — is it really covered by 8+16? Req 9.1 (rely on existing CSP opt-out) — "verify-only / M" — is that honest? Req 1.2 (single source, no parallel list) — is there a task that would *catch* a future parallel list, or is it just asserted?
- Cross-check tasks against the **design**'s pinned mechanisms. Does any task contradict the design (e.g. wrong file path, wrong helper name, `expectLabClose` vs `expectRgbEqual`, sync vs async `params`, `ssr:false`)? Does any design deliverable have **no task** (e.g. the `loading.tsx`/`error.tsx` contents, the `<noscript>`, the gallery `ThemeToggle` import, the M2 authoring rule, the SSR-safety authoring note)?
- The design lists **four deferred verify-by-build items**. Confirm each is actually assigned to a task's `Success:` (alias-under-Vitest → Task 11; `_components`/`next/dynamic` → Task 6; `[10,10,10]` RGB → Task 8; Vercel-preview → Task 16). Find any that fell through.

### 5. `_Prompt` self-containment and fresh-context executability
- Each `_Prompt` is meant to be executable by a fresh agent with no other context. Find prompts that **require opening the design** to succeed (e.g. "per the design's *Gallery* block") without inlining enough to act — is that acceptable here (the design is an approved artifact the agent can read) or a self-containment violation like the one the sibling `slash-pages` tasks doc was dinged for?
- Find prompts whose `Restrictions:` or `Success:` contradict the task body, or that omit a load-bearing constraint the body states (e.g. the SSR-safety guard, the data-testid hooks, the atomic-commit requirement for Task 8).
- Task 8's prompt tells the agent to rewrite a 413-line test and "pin the exact value if the toolchain differs." Is that prompt executable in one pass, or does it hide a verify-then-edit loop?

### 6. Ordering vs. the spec-workflow execution model
- The spec-workflow implements tasks **one at a time with a review between each**, marking `[-]`→`[x]`. Given that, re-examine whether any task leaves the repo in a state where the *next* task's review (or CI) would fail. Is the "topological order, not serial" framing safe under strict one-at-a-time execution where each task must independently pass review?
- Does Task 2 (create `<PlaygroundFrame>`, unused) plus the still-wrapping group layout actually compile and pass typecheck/lint with an *unused export*? Does the repo's ESLint flag unused exports or unused files, failing Task 2's implicit "clean" bar?
- The deletion in Task 8 (`spike/` directory) — does anything else in the repo import from `spike/` (e.g. a test, a route, `csp.test.ts`)? If a stale import survives, Task 8 breaks the build. Verify against live code.

## Deliverables

- **Top 5 risks/gaps**, ranked, each with a concrete failure scenario and a `file:line`/task-number citation.
- **Top 3 conclusions to challenge or reverse**, with specific reasoning.
- **What's missing** — work that must be done before this task breakdown is execution-ready.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on. Verify claims against the live code in `/home/mcf/repo/matthew-field.ca` — do not take the task doc's word for any ordering or coverage claim.

Write your analysis to `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/playground/reviews/adversarial-analysis-tasks.md`.
