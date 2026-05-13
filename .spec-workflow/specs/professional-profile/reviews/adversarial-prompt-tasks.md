# Adversarial Review: professional-profile tasks.md

You are a senior staff engineer with deep experience decomposing specs into implementation plans and shipping them. You have led multiple migrations where the task breakdown — not the design — was what caused the project to stall, regress, or ship with silent gaps. Your reputation is built on catching the decomposition mistakes that look innocuous in markdown but explode in PR review or production.

Your job in this review is to **tear apart** the tasks document. Find every place the decomposition fails to map cleanly onto the requirements and design, every task that hides multiple responsibilities behind a single checkbox, every ordering trap, and every requirement that has no task pointing at it. Do not validate. Do not soften. If something is acceptable, name it briefly and move on.

Required reading (all in the same directory tree):

- `.spec-workflow/specs/professional-profile/tasks.md` (the target)
- `.spec-workflow/specs/professional-profile/requirements.md`
- `.spec-workflow/specs/professional-profile/design.md`
- `.spec-workflow/steering/product.md`
- `.spec-workflow/steering/tech.md`
- `.spec-workflow/steering/structure.md`

## Analysis Dimensions

Work through each dimension below. Each dimension expects concrete, file- and task-citation-level criticism. "Task N is too big" without citing which sub-responsibilities should split out is not useful.

### 1. Task atomicity — INVEST-S violations

Several tasks bundle multiple distinct responsibilities behind one checkbox. Identify the worst offenders and propose the split. At minimum, examine:

- **Task 8** (Velite `profile` collection + `content/profile.mdx`, same commit). The same-commit constraint (Req 1.14) is real, but does "schema definition + zod schema fields + git-log transform with `execFileSync` + `--follow` flag + named error contract + register in `defineConfig` + author full frontmatter MDX file" belong in one reviewable unit? Challenge the claim that Req 1.14's same-commit rule forces all of this into one task — could the schema land first as a draft (with a feature-flagged disabled collection) and content come second, or is there a cleaner same-commit split?
- **Task 11** (`/api/contact/route.ts`). Nine pipeline steps (size cap, Origin/Referer multi-host accepted-origin set, JSON parse, plain-object guard, honeypot, zod, source normalization, test-id forwarding, mail dispatch + error mapping). Each branch has its own failure mode and its own test case in task 12. Identify which sub-steps could be separate PRs and which legitimately must land together for the handler to compile.
- **Task 17** (`<ContactForm />`). Form-state machine (5 variants), `attemptId`-keyed effect, `aria-disabled` vs `disabled`, honeypot DOM positioning, 12s AbortController, three ARIA regions, reduced-motion-aware scrollIntoView, `window.__TEST_ID` hook, `contact_submit_success` CustomEvent, focus-management transitions for three outcomes. Identify which of these are atomic (can't ship without each other) and which are independent surfaces hiding in one task.
- **Task 23** (CSP + axe + reduced-motion in one E2E file). Three orthogonal test surfaces sharing a file. Challenge whether colocation is the right call or whether one surface failing should not block work on the others.

### 2. Requirement coverage — what's missing from tasks

Cross-check requirements.md and design.md against the 24-task list. Surface every requirement or design clause that has **no task** explicitly delivering it, or where the task that "covers" it is so vague the work could ship missing the requirement. At minimum, check:

- **Req NFR-Performance Lighthouse ≥ 90 via `@lhci/cli` non-blocking CI job**. The spec calls out a specific CI integration (`@lhci/cli` posting four-category scores as a PR comment). Is there any task that adds this CI job? Does task 24 cover it?
- **Req 3.6 DMARC posture** — SPF/DKIM/DMARC records (covered by task 2), but also the 14-day post-launch calendar reminder to review DMARC aggregate reports and tighten `p=none → p=quarantine → p=reject`. Is this in any task?
- **Req 4.4 server-error 429/504 cases**. Tasks 11 and 17 mention 503/502/network; do they explicitly cover 429 (platform throttle) and 504 (cold-start kill) error UI rendering with the LinkedIn CTA?
- **Req 4.11 44×44 tap targets on mobile** — Task 15 covers SocialLinks tap targets, task 16 covers ObfuscatedEmail. But does any task verify ContactForm's submit button and inputs meet 44px? The form is a touch-target surface too.
- **Req NFR-Usability mobile name/email side-by-side at `sm:` breakpoint, stacking below** — is this in any task or just absorbed into "task 17 implement the form"?
- **Req NFR-Performance no vertical layout shift** — explicitly called out for the contact section reserving vertical space. Any task addressing this?
- **Req 1.5 headshot responsive layout** — design defers stacking/side-by-side to design phase (already done), but does any task verify the responsive layout actually works at narrow + wide breakpoints?
- **Req 6.3 Playwright asserts `<link rel="canonical">` is an absolute URL starting with `https://matthewfield.ca/`**. Tasks 22/23 are the new E2E files. Does either include this assertion? If not, the requirement has no enforcement.
- **Req 4.10 axe `region` rule + `role="status"` mounted inside `<main>`** — task 17 mentions ARIA roles but does any task explicitly verify the status region is inside the `<main>` landmark (Req 4.1)?
- **Req NFR-Observability `contact_submit_success` CustomEvent** — task 17 fires it, but is there any task that verifies it fires in the E2E suite?
- **Req 3.10 logging discipline** — "no `console.*` with input fields, no error messages containing user input". The unit tests in tasks 10/12 should assert this. Do they?
- **axe-core/playwright is required by Req 4.10 and task 23 uses `new AxeBuilder`** — but is there a task to **install** `@axe-core/playwright`? Task 14 only adds shadcn primitives + react-obfuscate.
- **Req 5.6 `/contact` listed in `/slashes` index — out of scope** (acknowledged) — fine, but is `/contact` inclusion in `src/app/sitemap.ts` verified anywhere?

For each gap, name the requirement, name the task that *should* cover it (or "no task"), and state what minimum task addition would close it.

### 3. Ordering and dependency edges

The phases run 0 → 8 sequentially, but several inter-task dependencies cross phase boundaries. Identify ordering traps:

- **Task 13 (THEME_STORAGE_KEY export) sits in Phase 4** but its only consumer is task 23 (E2E axe test in Phase 7). Why is it in Phase 4 rather than colocated with the test that needs it? If it lands early and task 23 is deferred or dropped, task 13 becomes dead code.
- **Task 7 (structure.md update for `scripts/` and `vercel.json`) is in Phase 1** but the actual creation of `scripts/run-e2e.mjs` is task 21 in Phase 7. Documenting a directory that does not exist for 14 tasks is a structure.md lie window. Challenge whether task 7 should move to Phase 7.
- **Task 14 (install shadcn primitives + react-obfuscate)** runs in Phase 4, after Phase 3's mail/route work. But task 11 already requires `zod` in `package.json`. If task 11 lands first and the spec says "add zod here if not already present," does task 14 become redundant for `zod`? Who actually adds `zod` first — task 11 or task 14?
- **Tasks 1 and 2 (manual operator tasks)** declare hard ordering ("MUST complete before task X lands on `main`"). How is this enforced? There is no CI gate, no machine-checkable predicate. The success criterion is "operator confirms in dashboard" — what stops task 3 from being committed before task 1 is verified? Challenge the design's reliance on procedural ordering for security-critical prerequisites.
- **Task 8's same-commit constraint** for Velite schema + content. The task prompt restates the constraint, but is there any mechanism (pre-commit hook, CI check) that would catch a violation? If a future contributor splits them across commits during a refactor, the "constraint" is just a comment.
- **Task 21's webServer.env pin** — "verify `e2e/playwright.config.ts`'s webServer.env does not set a literal object." But task 21 only modifies `package.json` + creates `scripts/run-e2e.mjs`. If the playwright config IS misconfigured today, who fixes it? The task says "Verify... do not regress" — does the implementer audit and fix in the same task, or only verify and silently skip if broken?

### 4. Task-to-requirement traceability gaps

Each task has a `_Requirements:` field. Audit for:

- Tasks claiming requirements they don't actually deliver (over-claiming).
- Tasks with requirements that ARE delivered but cited weakly (e.g. task 18 cites "Req 1.1, 1.5–1.10, 1.13, Req 6.1–6.3" — does it actually deliver Req 1.12's "build fails on render-time exceptions during static generation"? Or is that incidental to `pnpm build` running?).
- Requirements that appear in zero `_Requirements:` fields. Cross-reference every requirement clause and report uncited ones.
- Tasks that exist but whose `_Requirements:` field cites only the design, not requirements (task 5, 7, 9, 10, 13). For each, identify the underlying requirement clause that should also be cited — if there isn't one, challenge whether the task is needed at all (work that maps to no requirement is scope creep).

### 5. Completion criteria — what does "done" mean?

For each task, the `Success:` line in the prompt and the bullets in the task body define done-ness. Identify tasks where:

- **"Success" is restating the task** (tautological). Example: task 5 says "Vercel preview build succeeds and the Velite profile transform emits a non-empty updatedAt." Without standing up a preview deploy in the task itself, how does the implementer verify this in their PR? Does this push verification onto code review or onto a follow-up?
- **"Success" is unverifiable locally**. Tasks 1, 2, 5 all require infrastructure verification (mail provider, DNS, Vercel preview) that a local `pnpm build` cannot prove. Is there a story for when these tasks block the implementation tasks downstream?
- **Tasks with no failing test if regression is introduced**. Task 4 (CSP `form-action 'self'`) — the design itself notes this directive is "defense-in-depth not regression-protection." Is there any task that would catch removal of this directive? If not, the task ships work that has no covering test.
- **Task 24 as the catch-all verification step**. Six commands chained with `&&`. Is "all pass" specific enough? What if `pnpm format:check` passes but the actual production build deploys with a transform error visible only on Vercel? Challenge the assumption that local-success implies production-success.

### 6. Manual tasks and operational surface

Tasks 1 and 2 are marked `[MANUAL]` and live in Phase 0. Challenge the implicit assumption that splitting "code tasks" from "operator tasks" works cleanly:

- Who is the operator? The spec uses "Matthew" as the operator and the implementer interchangeably (single-author project). For multi-contributor or future maintainer scenarios, is this clear?
- Task 1's verification is "test email lands in expected destination" — there is no automated way to assert this from CI. What if the filter is misconfigured silently (e.g., a typo means real recruiter mail is being filtered as spam)? Is there any monitoring task?
- Task 2 cuts production over to the verified domain. After this, a regression to the sandbox `from` value in production env would silently degrade deliverability (recruiters' inboxes mark `onboarding@resend.dev` as spam more aggressively). Is there a task that verifies production env stays on the verified domain after launch?
- The DMARC tightening procedure (Req 3.6, `p=none → p=quarantine → p=reject` over weeks) is not a task. Is this intentional (out of scope), or a gap?

## Closing Deliverables

Conclude with:

- **Top 5 risks/gaps**, ranked by severity. Each gap names the specific task(s) involved, the requirement(s) at risk, and the concrete failure scenario you predict.
- **Top 3 conclusions to challenge or reverse**, with specific reasoning. Examples of conclusion-shapes to consider: "Task 8's same-commit-bundle is correct → wrong, should split as X/Y"; "Task 23's three-surfaces-in-one-file is acceptable → wrong, separate test files because Z"; "Task 24 is sufficient end-to-end verification → wrong, missing W".
- **What's missing before this task list should be implemented**: list every task that should be added, with a one-line description and the requirement it would satisfy. Also list any task that should be removed or merged with another.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on. Cite tasks by number and requirements by their numbered clause (e.g. "Req 3.5b" not "the origin-check requirement").

## Write your analysis to:

`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/professional-profile/reviews/adversarial-analysis-tasks.md`
