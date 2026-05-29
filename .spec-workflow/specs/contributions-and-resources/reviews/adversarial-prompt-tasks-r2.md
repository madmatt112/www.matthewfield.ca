# Adversarial Review (Round 2) — contributions-and-resources / tasks.md (v2)

You are a principal engineer and release manager with deep experience shipping Next.js + Velite static sites and decomposing complex designs into atomic, correctly-ordered implementation tasks. This `tasks.md` is now at v2 — it was revised after a first adversarial round. Your job is to **tear apart the v2 document**, with emphasis on **the changes v2 introduced** (they are the least-reviewed part). Do not re-discover or re-litigate already-closed issues. Assume the revision introduced new, subtler defects while closing the obvious ones. If something is genuinely fine, say so in one line and move on.

Read these first, in full:
- Target: `.spec-workflow/specs/contributions-and-resources/tasks.md`
- Design: `.spec-workflow/specs/contributions-and-resources/design.md`
- Requirements: `.spec-workflow/specs/contributions-and-resources/requirements.md`

Ground your findings against the live repo — verify file/line/symbol claims (`eslint.config.mjs`, `velite.config.ts`, `tsconfig.json`, `src/app/sitemap.ts`, `src/lib/build/check-projects-chokepoint.ts`, `src/lib/projects.test.ts`, `package.json` test tooling + vitest config, `vitest.config.*`, `.github/workflows/ci.yml`, `src/app/(site)/projects/page.tsx`, `src/components/projects/*`).

## Prior Review Context (read before attacking)

The v1 review found six risks + three conclusions; **all were accepted and addressed in v2**. The cumulative record is at `.spec-workflow/specs/contributions-and-resources/reviews/adversarial-memory-tasks.md` (read it). In brief, v2:
1. Added colocated render tests to Tasks 15 & 16 (the a11y `aria-labelledby`↔`id` wiring is now asserted via `getByRole("group")` + accessible-name).
2. Added a Task 5 restriction forbidding `strict:true` in `defineConfig`.
3. Added a `maxOr` empty-array guard + empty-collection test to Task 20.
4. Pinned Task 9's three-exemption "ONE commit" atomicity.
5. Converted Task 3's monolith into 7 tracked sub-deliverables (a–g), each requiring a unit test.
6. Added the scanner test file to Task 8's allowlist + a Task 10 "fs-only read" restriction.
7. Declared the eslint shared-edit coupling (Tasks 7/9), added a Task 21 loader-forward-coupling author-doc bullet, added a matrix note (durable V for 1.4/4.4/10.1 is Task 4's tests), marked Task 25 non-blocking, renumbered 6.5→6.

**Do NOT re-raise these as if new.** For every finding you report, classify it as:
- **Novel** — not identified in r1.
- **Compounding** — builds on/deepens an r1 finding or reveals the v2 fix is incomplete.
- **Recurring** — an r1 issue that v2 failed to actually resolve (escalate severity).

## Analysis Dimensions (focus on the v2 deltas)

### 1. The new render tests (Tasks 15, 16) — do they actually work and actually catch the bug they claim?
- `ContributionCard`/`ContributionLinkRail` are server components. Challenge whether `@testing-library/react`'s `render()` can synchronously render them in jsdom, and whether the repo's vitest config actually sets a jsdom environment for `.test.tsx` (check `vitest.config.*` and any existing `.test.tsx`). If the env is node, these tests fail to run at all.
- Stress-test the accessible-name assertion: does `getByRole("group")` + `toHaveAccessibleName(h2text)` reliably resolve an `aria-labelledby` pointing at a sibling/ancestor `<h2>` in jsdom? jsdom's accessible-name computation is incomplete — verify this assertion is not a false-confidence test that passes regardless.
- Task 15 has no `_Depends on` change but its test needs the `ContributionLink` type from Task 12. Is the dependency still correct now that a test file was added?

### 2. Task 3's checklist conversion — relabel or real?
- The 7 sub-deliverables (a–g) are non-checkbox bullets in one task body, one file, one checkbox. Challenge whether this actually makes partial completion detectable, or whether it's the same monolith with nicer formatting — the task is still marked `[x]` atomically.
- The (e) sub-deliverable asserts a `ZodPipeline` traversal "to pin the `_def.out`/`_def.in` branch choice." The r1 review itself noted no real field combination exercises the in-vs-out ambiguity (the `unrecognized_keys` never fires on a string field). Is the v2 (e) test therefore testing a path that can't occur in practice — a vanity test — or is there a genuine case? If genuine, name it; if not, flag the test as untriggerable.

### 3. Task 20's empty-collection test — does it test the right layer?
- Does the test exercise the actual `sitemap()` default-export build path, or only a `maxOr` helper in isolation (which would NOT prove the sitemap itself survives `[]`)? The crash risk r1 flagged is in `sitemap()` calling `maxOr` — verify the test closes THAT, not a unit-isolated helper.

### 4. Newly-introduced couplings and ordering hazards from v2
- v2 added `.test.tsx` files and a sitemap test. Does any new test import the real `#site/content` (violating the chokepoint / needing an allowlist entry), or do they all `vi.mock`? Trace each new test file.
- Did adding the scanner test file to Task 8's allowlist create any inconsistency with Task 10 (which owns that file) or Task 11 (which tracks the canary↔test pair)? Is the allowlist-vs-paired-merge-tracking now self-consistent?
- The renumber 6.5→6: verify NO dangling reference remains (DAG node, `_Depends on`, matrix, prose) and that Task 6's position in the DAG is still correct.

### 5. Tasks r1 under-examined (fresh attack surface)
- **Task 1 primitives:** `httpUrl()` — does the design's two-stage check reject `http://` with userinfo, IDN/punycode, or `https:` with no host? `isoDate()` — is the year range bounded (does `0000-01-01` or `9999-12-31` pass, and does that matter for `Date.parse`/sort)? Are these edge cases owned anywhere?
- **Task 6 (data files):** if seeded with real entries, who verifies they pass the schema before commit — is the green-build check in the task, and does Task 6's ordering (after Task 5) guarantee the schema exists to validate against?
- **Tasks 17/19 (pages):** force-static + the shared description constant feeding both meta and both branches — is the 50–160 char bound actually tested (Task 12/13 claim it, but the constant lives in the page file per the design; can the test import it)? Is there a circular/ownership problem between the page-owned constant and the lib-owned length test?
- **Tasks 22/23/24 (CI):** the cadence script reads `.velite/*.json` after Build 2 — is the step ordering in Task 24 pinned correctly relative to where those files exist? Does Task 23's runs-log seeding interact with the `matches.at(-1)` last-entry parser in a way that could fire on day one?

### 6. Completion-criteria integrity after v2
- Re-scan every `Success:` line changed or added in v2. Are the new ones mechanically checkable, or did any introduce a new "looks right" criterion? Specifically the render-test Success lines and Task 3's "ALL seven sub-deliverable tests pass."

## Deliverables
- **Top 5 risks/gaps**, ranked, each with a concrete failure scenario and a Novel/Compounding/Recurring tag.
- **Top 3 conclusions to challenge or reverse**, with reasoning.
- **What's missing** — concrete additions before implementation.

Be specific and concrete. Cite task numbers, design sections, requirement IDs, and real file paths/lines. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

Write your complete analysis to: `.spec-workflow/specs/contributions-and-resources/reviews/adversarial-analysis-tasks-r2.md`
