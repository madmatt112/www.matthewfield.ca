# Adversarial Review — Playground Tasks (v2, round 2)

You are a principal Next.js / React delivery engineer doing the **second** adversarial pass on an implementation task breakdown before any code is written. Deep current (2026) expertise in the Next.js 16 App Router, this repo's build/test toolchain (Vitest 4, Playwright, ESLint, `tsc`, Velite, GitHub Actions), CI sequencing, and **task-decomposition discipline** (atomicity, dependency-edge correctness, completion-criteria testability, requirement coverage, red-by-construction hazards). Find every remaining weakness — **not** to validate. The author survived round 1 and will sound confident; assume the v2 *fixes* are where new bugs hide.

Target: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/playground/tasks.md`.
Approved upstream (fixed; flag only contradictions): requirements `.spec-workflow/specs/playground/requirements.md` (v4) and design `.spec-workflow/specs/playground/design.md` (v4). Steering: `.spec-workflow/steering/{product,tech,structure}.md`. Repo root `/home/mcf/repo/matthew-field.ca` (Next 16.2.2, Vitest 4). **Read the tasks doc, the design, the requirements, and the relevant live code before attacking.** Ground every finding in a `file:line`/task-number citation or a concrete failure scenario.

## Prior review context

Round 1 found **two execution-blockers** (R1: Task 12 silently needed a `ci.yml` edit; R2: the `data-testid` hook set was two short of the live 6-selector isolation suite) plus softer findings (R3 `applyDarkMode` literal `"theme"`; R4 the `[10,10,10]` verify-then-edit loop; R5 Req 1.2 matrix overclaim; missing alias-dep edges on Tasks 9/10). **All were accepted and folded into v2** (see the v2 entry in `## Revision history`). Before attacking:

1. **Read the rolling memory file** `.spec-workflow/specs/playground/reviews/adversarial-memory-tasks.md` (it exists — full accepted list, what r1 confirmed fine, and round-2 focus guidance).
2. **Read the r1 analysis** `.spec-workflow/specs/playground/reviews/adversarial-analysis-tasks.md`.
3. **Do not re-discover r1 findings** unless v2's fix is incomplete or wrong (then mark **Recurring** and escalate). Classify every finding **Novel** / **Compounding** / **Recurring**.
4. r1 confirmed sound (don't re-mine without new evidence): Task 8 atomicity + `/spike` deletion safety, the green-before/after claim, the axe scoping/leverage, the `check-authoring-docs` append, the Vitest include, the deferred-item folding.

Your highest-value target is **whether the v2 fixes are actually mechanized and correct, and whether the expanded scope (the six-fixture panel, the CI steps, the RGB-pin step) opened new seams.**

## Analysis dimensions

### 1. Did the v2 blocker-fixes land correctly and completely?
- **R2 six-fixture panel — match the ASSERTIONS, not just the selector names.** Read the live `playground-isolation.test.ts` (and the deleted-in-Task-8 `spike/page.tsx` for what each fixture set) and verify each of the six re-pointed hooks reproduces the *computed value the test asserts*, not merely the selector. Specifically: `spike-plain-div-target` asserts `color: rgb(255,0,0)` + `fontFamily: "serif"` from an **inline-styled** div — does Task 3's `sample-plain-div` ("inline `style`") set the same mechanism? `spike-tailwind-div-target` asserts `bg-blue-500`→a specific blue, `p-4`→16px, `text-lg`→18px/28px — does `sample-tailwind-div` (`className="bg-blue-500 p-4 text-lg"`) reproduce those exact values inside the container? `spike-token-access-target` vs `spike-button-token-target` assert *different* things (a raw `var()` element vs a shadcn `<Button>` with token bg) — do `sample-token-target` and `sample-button-token` preserve that distinction, or did v2 collapse them? If any sample fixture uses a CSS Module where the spike used inline `style` (or vice-versa), the computed-value assertion may differ. Find the mismatch or confirm 1:1.
- **R1 CI steps — verify against the real `ci.yml` job structure.** Read `.github/workflows/ci.yml`. Are the two new steps (run + self-test) landing in the *correct job* (the one already running `pnpm check:authoring-docs` + `node --test`)? Does that job already have the pnpm/node setup + `pnpm install` the new steps need? Is there an ordering constraint (must `playground/` exist / `pnpm install` first)? Confirm "mirror 48-49 and 97-98" produces working steps, not steps in a job without the toolchain.
- **R4 RGB-pin step 5 — runnable in isolation?** Step 5 says run `node scripts/run-e2e.mjs` to read the serialized `color`. That runs the WHOLE Playwright suite — which after Task 16 includes `playground.test.ts`, and at Task 8's point may not exist or may fail on unrelated suites. Can Task 8 run *just* the isolation spec against a prod build, and does the task specify how (a file/grep filter), or is "run the suite and read the value" underspecified? Read `run-e2e.mjs`/`playwright.config.ts` to see whether a single-file run is even ergonomic.

### 2. New seams opened by the v2 expansions
- **Task 3 is now bigger** (canvas toy + a six-fixture isolation panel, two files). Is it still one atomic, reviewable unit, or has the panel made it a two-concern task (a real toy AND a test-fixture harness) that should split? Does mixing six visible test fixtures into the shippable sample degrade the gallery/landing UX (a user opening `scribble-pad` sees six fixtures)? Acceptable per Req 7.2, or should the fixtures be visually-contained?
- **`sample-button-token` / `sample-font-target` need a shadcn `<Button>`** inside the SSR-prerendered same-page item. Does importing `@/components/ui/button` into the client item interact with the SSR-safety rule (Task 3) or the import-boundary rule (items may import `src/components/ui/` — confirm `button.tsx` is pure UI with no `(site)` coupling)? Any SSR hazard?
- Did adding the **1→9 / 1→10 dep edges** create inconsistency with the prose DAG or the topological order? Re-scan ALL 16 tasks: are there OTHER tasks importing `#playground/manifest` that still lack the Task 1 edge (Task 11? Task 16?)?

### 3. Completion-criteria and `_Prompt` executability (post-v2)
- Re-scan every `Success:` for criteria still not mechanically verifiable. Did the RGB-pin split actually remove the hidden loop or just relocate it? Is Task 8's `Success:` self-consistent with step-5?
- Task 8's `_Prompt` is now very long (six-selector mapping + THEME_STORAGE_KEY + RGB pin + four atomic edits + prod-build run). Is it executable in one pass by a fresh agent, or has it become a multi-phase script a single task-execution can't realistically complete + self-review? If too big, propose the minimal split that preserves the atomic-commit guarantee.
- Confirm Task 12's `_Prompt`/`Success`/`File`/intro now name `ci.yml` consistently and nothing else still says "1–3 files" in a way that contradicts the four-file reality.

### 4. Coverage and consistency after the edits
- Re-audit the Requirements Coverage Matrix against the v2 bodies. Did expanding Task 3 change which requirement it contributes to (should it cite 10.2 now that it hosts the isolation fixtures)? Is the Req 1.2 "by construction" note honest? Any requirement still orphaned or M-marked where a gate exists?
- Cross-check the six-fixture panel against the **design** (`design.md` hook table lists only three). The tasks now exceed the design's table — *contradiction* with the approved design, or a legitimate refinement (the design called its table illustrative/"equivalent hooks")? Decide and state which; if a contradiction, that's a finding (the design is approved and fixed).
- Confirm no v2 edit broke an existing-correct claim (green-before/after note, deferred-item folding, axe scope).

### 5. Anything r1 and the author both missed
- Hunt for a genuinely new structural problem: does Task 8 deleting `spike/` while Task 13 still references the spike comment create an ordering hazard if 13 runs before 8 (check dep edges)? Does Task 11's `fs.existsSync` run before the sample folders exist if attempted before 3/4? Does the gallery (Task 9) actually need ALL of Task 8 or only the wrapper-removal half (finer-grained dep)? Is there a task whose review fails because a prior task's `[x]` left a lint/typecheck error — e.g. Task 2's unused `PlaygroundFrame` export, or Task 5's manifest importing item folders that exist but whose `default export` type the manifest's `Promise<{ default: ComponentType }>` must match?

## Deliverables

- **Top risks/gaps** (as many as are real — likely fewer than r1), each ranked, with a concrete failure scenario and a `file:line`/task-number citation, tagged Novel/Compounding/Recurring.
- **Top conclusions to challenge or reverse** (or an explicit statement that none remain).
- **What's missing** before this breakdown is execution-ready — or an explicit "nothing blocking."

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is fine, say so briefly and move on. If v2 genuinely closed r1's findings and you cannot find substantive new issues, **say so plainly** rather than manufacturing weak objections — but verify the v2 fixes hard first (especially the six-fixture assertion-level match and the CI-step job placement).

After the analysis, **write the updated rolling memory file** to `.spec-workflow/specs/playground/reviews/adversarial-memory-tasks.md` (cumulative, round-2 dated), then write your analysis to `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/playground/reviews/adversarial-analysis-tasks-r2.md`.
