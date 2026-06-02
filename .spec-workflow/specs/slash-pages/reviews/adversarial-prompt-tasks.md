# Adversarial Review — slash-pages `tasks.md` (v1)

You are a **principal engineer and release manager** brought in cold to tear apart an implementation task breakdown before it is handed to a fresh-context implementer. You have no stake in this plan and no collaborative history with its author. Your job is to find every way this task list will fail to produce a correct, complete, build-green implementation — not to validate it. Be ruthless, specific, and concrete: cite the exact task number, file, and the failure scenario that results. If something is genuinely fine, say so in one line and move on.

## What you are reviewing

The target document is the **tasks** phase of the `slash-pages` spec — the atomic implementation breakdown that an implementer will execute task-by-task. Read it in full:

- Target: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/tasks.md`

Ground every attack in the actual project. Read these first and verify claims against **live code**, not against the document's own assertions:

- `.spec-workflow/specs/slash-pages/requirements.md` (the acceptance criteria the tasks must cover)
- `.spec-workflow/specs/slash-pages/design.md` (the approved v4 design — post-three-adversarial-rounds — that the tasks decompose)
- `.spec-workflow/steering/tech.md`, `.spec-workflow/steering/structure.md` (conventions the tasks must honor)
- The live code the tasks name: `velite.config.ts`, `src/lib/format-date.ts` (+ `.test.ts`), `src/config/site.ts`, `src/app/(site)/{about,now,colophon,sitemap,slashes}/page.tsx`, `src/app/sitemap.ts`, `src/components/layout/footer.tsx`, `scripts/check-authoring-docs.mjs` (+ `.test.mjs`), `content/pages/about.mdx`, `docs/contributions-and-resources-authoring.md`, `e2e/tests/blog-axe.test.ts`, `playwright.config.ts`, `vitest.config.ts`.

The author claims this is the **smallest** recent spec with no new build-time machinery. Treat that claim as a hypothesis to falsify: a "small" plan can still have ordering bugs, coverage gaps, and tasks whose `Success:` criteria don't actually prove the requirement.

## Analysis dimensions

Attack each of the following. For every finding, rate it **blocking / significant / minor** and state the concrete failure it causes.

### 1. Atomicity and task sizing
- Challenge whether any task bundles independent units that should be separate (e.g. Task 6 authors **three** MDX files at once — is the seed-sentinel/`updated` coverage still attributable per file? does a single failure block all three?). Conversely, flag tasks so thin they are noise.
- Challenge Task 5: it edits both the script and its self-test against a "literal diff spec" living in the design. Is the task self-contained enough for a fresh implementer, or does it smuggle load-bearing detail by reference? Can a partial completion still pass `Success:`?
- Verify the file lists in each task match what the work actually touches (e.g. does Task 2's test edit belong with the source edit; does Task 3 correctly create a new test file; do Tasks 14/15 name concrete file paths or hand-wave "e.g.").

### 2. Dependency ordering and the red-by-construction risk
- The design's central correctness concern is that gates go **red-by-construction** until content lands. Stress-test the DAG: trace whether following the task numbers in order ever produces an intermediate state where `next build`, `pnpm test`, or `pnpm check:authoring-docs` is red on a tree the implementer is told is "done." Name the exact task boundary where it breaks.
- Challenge the `_Depends on:` edges. Are any missing? (e.g. does Task 5's self-test depend only on Task 4, or also on the production `AUTHORING_DOCS` doc existing? does Task 16 truly depend on all five routes + footer? do Tasks 14/15 need Task 1's schema, not just Task 6?) Are any edges wrong or over-stated?
- The DAG shows Task 12 (XML sitemap) with no dependents and no dependencies. Confirm that is actually safe given Task 16's `/sitemap` link-resolution assertions and the `sitemap.xml` vs `/sitemap` page distinction.

### 3. Coverage — tasks ↔ requirements ↔ design
- Audit the Requirements Coverage Matrix against `requirements.md`. Find any acceptance criterion that is (a) marked covered but whose covering task's `Success:` does not actually prove it, or (b) silently dropped. Pay attention to verify-existing ACs (1.1, 1.2, 8.1) — is "verify" an actual task action or a no-op checkbox?
- Cross-check the design's load-bearing decisions against the tasks: the central UTC fix and its blast radius (six consumers), the `getNowPage()` dual-throw, the `!/T/` gate, the per-doc zero-byte count, the `/sitemap` not-importing-`sitemap.ts` restriction, the same-tab colophon `rel` convention. Is any design decision un-tasked or under-specified in its task?
- Challenge whether NFRs parked as "M" (manual at launch) — Lighthouse, OG inheritance, canonical, not-found, WCAG — are legitimately manual or are quietly untested gaps.

### 4. `Success:` criteria rigor (mechanical vs. manual)
- For each task, ask: does `Success:` describe a **mechanical gate** (a command that passes/fails) or a soft "renders correctly" claim that only a human can check? Flag every task whose completion criterion cannot fail in CI (e.g. Task 7's "renders the authored body", Task 9, Task 11).
- Challenge the test tasks (2, 3, 14, 15, 16): do the named assertions actually catch the regression they target, or are they satisfiable by trivial/empty implementations? Verify the colocated-test placement against `vitest.config.ts`'s `include`, and the E2E patterns against `blog-axe.test.ts` (do `setupTheme`/`assertTheme`/`THEME_STORAGE_KEY` actually exist and work as cited?).

### 5. Conformance to live code and conventions
- Verify every file path and symbol the tasks name exists where claimed (route dirs, `getAboutPage`, `getVisiblePublishedPosts`, `getPublishedProjects`, the footer nav, the `routes` array line numbers in `src/app/sitemap.ts`, the placeholder strings in `about.mdx`). Flag any citation that is stale or wrong.
- Challenge structure.md/tech.md conformance: colocated tests under `src/**`, `siteConfig` as a leaf, no barrel files, server components / zero added client JS, `dynamic = "force-static"`. Does any task instruct something that violates a steering rule?
- Probe the frontmatter-parse assumption in Tasks 14/15 (raw `.mdx` read, frontmatter strip): is the needed parser (gray-matter or a `---` split) actually available in the repo, and will the strip handle the real file shape?

## Deliverables

Conclude your analysis with:

1. **Top 5 risks/gaps**, ordered by severity, each with the task number, the concrete failure scenario, and a specific fix.
2. **Top 3 conclusions to challenge or reverse**, with reasoning grounded in live code.
3. **What's missing** — any task, dependency edge, or `Success:` gate that must be added before this document is implementation-ready.

For each finding, rate **blocking / significant / minor**. Be specific and concrete — cite failure scenarios, not abstract risks. If a part of the plan is actually sound, say so briefly and move on. Do not manufacture objections to hit a count; if the document is genuinely converged on some dimension, say so plainly.

Write your complete analysis to:

`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-analysis-tasks.md`
