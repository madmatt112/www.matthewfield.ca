# Adversarial Review (Round 3) — contributions-and-resources / tasks.md (v3)

You are a principal engineer and release manager with deep experience shipping Next.js + Velite static sites and decomposing designs into atomic, correctly-ordered tasks. This `tasks.md` is at v3 — it survived two prior adversarial rounds. Your job is to **find any remaining defect in v3, with emphasis on the v3 deltas** (the least-reviewed surface). Two rounds have already closed the obvious gaps; assume what remains is subtle. **This is also a convergence check: if the document has genuinely converged, say so plainly — do NOT manufacture findings to fill a quota.** A crisp "converged; here are the only residuals" is a valid, valuable outcome. If something is fine, say so in one line.

Read first, in full:
- Target: `.spec-workflow/specs/contributions-and-resources/tasks.md`
- Design: `.spec-workflow/specs/contributions-and-resources/design.md`
- Requirements: `.spec-workflow/specs/contributions-and-resources/requirements.md`
- Cumulative review memory: `.spec-workflow/specs/contributions-and-resources/reviews/adversarial-memory-tasks.md` (read this — it lists everything r1/r2 already closed; do not re-raise those)

Ground every finding against the live repo (`vitest.config.ts`, `vitest.global-setup.ts`, `src/canary.test.tsx`, `src/lib/projects.empty.test.ts`, `src/app/sitemap.ts`, `eslint.config.mjs`, `velite.config.ts`, `tsconfig.json`, `.github/workflows/ci.yml`, `src/app/(site)/projects/page.tsx`, `package.json`).

## Prior Review Context (r1 + r2, all CLOSED — do not re-raise)

r1 (six risks) and r2 (five risks) were fully accepted. The memory file has the details. v3 made these specific changes — **these are your primary attack surface**:
1. **Dropped jest-dom from Tasks 15/16**; assertions are now deterministic DOM checks: `getByRole("group").getAttribute("aria-labelledby") === "contrib-"+index` and `container.querySelector("#contrib-"+index)?.textContent === title`. Rationale: `vitest.config.ts` has no `setupFiles`, so jest-dom matchers are unregistered (the existing `src/canary.test.tsx` proves the pattern).
2. **Task 20 → dedicated `src/app/sitemap.empty.test.ts`** with a file-scope `vi.mock("#site/content", () => ({ contributions: [], resources: [], posts: [], projects: [], pages: [], profile: [] }))` calling the real `sitemap()` and asserting `not.toThrow()` + both URLs with `now` fallback.
3. **Single-sourced description constants** — `CONTRIBUTIONS_DESCRIPTION`/`RESOURCES_DESCRIPTION` exported from `src/lib/contributions.ts`/`resources.ts`, imported by the page, asserted (exported) in the lib test; "re-declare" escape removed.
4. **Task 3(e)** `ZodPipeline` row relabeled defensive/synthetic (unreachable by real data); Task 3 Success now requires seven named `describe` blocks (a)–(g).
5. **Task 23** seed value pinned to the actual launch count (0 when `[]`).

Classify each finding **Novel / Compounding / Recurring**. A Recurring finding (something r1 or r2 raised that v3 still hasn't truly fixed) is the most important class — escalate it.

## Analysis Dimensions

### 1. The v3 deterministic render assertions (Tasks 15/16) — are they actually expressible without jest-dom?
- `getByRole("group")` comes from DOM Testing Library (bundled with `@testing-library/react`) and does NOT need jest-dom — confirm. But `getByRole` applies the ARIA role algorithm; verify a bare `<div role="group">` (or whatever wrapper the design specifies) is actually queryable by `getByRole("group")` in jsdom, and that there isn't a "multiple elements / accessible-name-required" gotcha. If risky, is `querySelector('[role="group"]')` the safer pin?
- Confirm `.getAttribute(...)`, `.querySelector(...)`, `.textContent`, and core `expect().toBe()` need no setup file. If correct, state it and move on.
- Does Task 16's test need the component to be import-renderable in isolation (no Next.js/server-only imports leaking in)? `ContributionCard` imports `formatContributionDate` from `src/lib` and the rail — verify nothing pulls a server-only module that breaks jsdom render.

### 2. The v3 `sitemap.empty.test.ts` mock completeness
- Trace EVERY symbol `src/app/sitemap.ts` imports from `#site/content` (directly or via `src/lib/*` helpers like `getVisiblePublishedPosts`, `getAllTags`, `getAllCategories`, `getPublishedProjects`, plus the new `getAllContributions`/`getAllResources`). The v3 mock lists `{contributions, resources, posts, projects, pages, profile}`. Is that the complete set the transitive imports require, or will a missing symbol cause the real `#site/content` to load (defeating the test, or erroring)? Note `sitemap.ts` imports helpers, not raw collections — does mocking `#site/content` actually intercept what those helpers read?
- Does the global setup (`vitest.global-setup.ts` runs `velite build`) interact with the file-scope `vi.mock` correctly, or could the real built `.velite` shadow the mock?

### 3. Single-sourced description constants — new edges?
- The constant now lives in `src/lib/contributions.ts`, which imports `contributions` from `#site/content`. The page imports the constant from that module. Does importing the page-level description force the page to transitively pull `#site/content` (through the lib module), and does that matter for the `force-static` page or the chokepoint lint rule? (The page importing from `src/lib` is allowed; but confirm no surprise.)
- Ordering: Task 17 (page) `_Depends on: 12`; Task 12 now owns the exported constant. Is the dependency still right, and does Task 19↔13 mirror it? Any place still saying the constant "lives in the page"?

### 4. Residual coverage / matrix integrity after three rounds
- Re-walk the matrix for any AC whose only listed task does not actually deliver it after the v3 edits. Pay attention to Reqs 2.8/5.8 (now single-sourced — does the matrix reflect Tasks 12/13 as the V?), 2.6/3.7 (deterministic test), 6.2 (sitemap empty test).
- Any orphan AC with no task at all? Any task with no requirement?

### 5. Anything genuinely new the prior rounds missed
- Look once at the tasks r1/r2 examined least: Task 1 `httpUrl()`/`isoDate()` edge cases, Task 6 data-file/schema ordering, Task 22 (`check-authoring-docs` heading-exactness vs the canonical headings actually written in Task 21), Task 24 topology-verifier interaction, Task 26 malformed-class completeness.
- If these are all fine, say so in one line each and do not pad.

## Deliverables
- **Top risks/gaps** (as many as are real — could be fewer than 5 if converged), ranked, each with a concrete failure scenario and a Novel/Compounding/Recurring tag.
- **Top conclusions to challenge or reverse** (or "none — converged").
- **What's missing** — concrete pre-implementation additions, or an explicit statement that the document is implementation-ready.

Be specific and concrete. Cite task numbers, requirement IDs, and real file paths/lines. Cite failure scenarios, not abstract risks. Do not invent issues; if v3 has converged, say so.

Write your complete analysis to: `.spec-workflow/specs/contributions-and-resources/reviews/adversarial-analysis-tasks-r3.md`
