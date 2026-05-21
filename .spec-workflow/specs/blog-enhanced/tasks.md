# Tasks Document

Tasks are ordered so dependencies flow naturally: pre-implementation spike → dependency pins → shared build-time modules (`derive-post-slug.mjs`, `KNOWN_FIXTURE_SLUGS`) → Velite schema/transform extensions → `src/lib/blog.ts` extensions (visibility filter, series, related, TOC) → taxonomy module split → presentational components (server, then client islands) → page integration (`[slug]/page.tsx`, `/blog`, sitemap, feed) → rehype copy-button plugin → search subsystem (orchestrator, verifiers, client component, failure-matrix) → CI topology extensions (workflow steps, kill-switch warn, token-verify) → mechanical verifiers (`verify-getPublishedPosts-callers`, `verify-pagefind-artifact`, `verify-deploy`) → Vitest + Playwright suites → Lighthouse extension → documentation → end-to-end smoke. Each task references the design section that pins its behavior and the requirements it satisfies.

## Revision history

- **v1 (initial derivation from design v4 and requirements v4)**: First-draft task decomposition derived mechanically from the v4 design's pinned modules/scripts/components and v4 requirements' acceptance criteria. Every task carries `Depends on:`, `_Requirements:`, `_Design refs:`, and `_Prompt:` footers; the Requirements Coverage Matrix and Dependency-graph sections at the foot give reviewers the inverse mapping for orphan-requirement detection.
- **v4 (post-r3 adversarial response, FINAL)**: Applied all six r3 adversarial findings against v3. (1) Split Task 17.5 into 17.5 (CSS slice carve + nine empty `@import`s + screenshot-diff visual-neutrality assertion) and 17.6 (preview-route infrastructure + per-component registry FILES — `src/app/(site)/blog/__component-preview/registry/<slice>.ts` per component, with a `registry/index.ts` aggregator); each 18.x sub-task now owns BOTH its slice file AND its per-component registry entry file (eliminates the v3 single-`registry.ts` merge-conflict factory r3 attack 1 surfaced). (2) Renamed Task `6.4.1` → Task `6.4.1` (per r3 attack 5 last bullet — `6.4.1` was a string-sort hack; `6.4.1` is the canonical hierarchical sub-ID). Added a new mechanical gate: extended Task 25 to add `scripts/verify-chosen-path.mjs` that reads Task 6.4's log file and asserts Task 6.4.1's diff aligns with the logged `CHOSEN_PATH` (closes the implementer-cognitive-judgment gap r3 attack 2 surfaced). (3) Added a meta-gate to Task 25's transitional-flag mechanism: if `BLOG_ENHANCED_CI_LITERALS_REQUIRED` is unset, the verifier emits a noisy warning naming the env var; if explicitly set to `=0` after Task 23.3 has landed, it FAILS with a "gate must remain enabled" diagnostic (closes the silent-gate-disabling vector r3 attack 3 fifth bullet surfaced). Fixed Task 23.1's missing `_Depends on: 35` (v3 revision-history claimed the edit but the artifact didn't reflect it — r3 attack 6 first bullet). Moved the DEPLOY_VIA_CI safety pin onto Task 23.2 (where the flag is first flipped) in addition to its existing Task 23.3 placement. (4) Replaced Task 5's tautological path-scoped grep with a positive invariant: `git grep "3013"` returns matches ONLY from the three pinned files plus an explicit allowlist (documented inline) of acceptable test/fixture occurrences. Added the cross-file port-duplication comment text + verification to Task 9's success criterion (was homeless — Task 5 deferred it, Task 9 didn't mention it). (5) Replaced Task 38's incorrect `git merge-base main HEAD` baseline-SHA computation with `git rev-parse origin/main` (matches the prose intent "the SHA Task 38 is implicitly evaluating against") and updated the prose description. Removed the destructive "rebase the spec branch onto S_baseline" remediation option — re-measurement is the only safe path. Acknowledged the median-of-3 per-category retry concern as deliberately out-of-scope (single-URL median dipping to 89 is preferred-fail over per-category retry hiding a real regression — recurring from r2 but explicitly accepted). (6) Pinned per-component Playwright test file paths in each 18.x sub-task's `Files:` line (`e2e/tests/component-preview/<slice>.test.ts`) so the test file is a declared deliverable. Pinned Task 35's Playwright config file as `playwright.config.ts` (removed the "(or… — pin during implementation)" hedge). Extended Task 17.6 to provide a "static-HTML stub" registry-entry shape that 18.7 and 18.9 use for their non-component smokes (closes the unpinned-stub-hosting mechanism r3 attack 6 fourth/fifth bullets surfaced). Added BLOG_INCLUDE_DRAFTS=1 env wiring to Task 35's Playwright-step edit so preview-route smokes resolve under the existing draft-leak guard. Pinned the YAML-parsing dependency for Task 25's step-group assertion as the existing `yaml` package (per blog-core devDeps). Some accepted-but-not-fixed: Task 25's transitional flag remains (atomic-PR-of-25+23.x was the more durable alternative per r3 reversal #2 but would lose v2's split-task discipline; v4 keeps the flag + adds the meta-gate as a balanced compromise documented here).
- **v3 (post-r2 adversarial response)**: Applied all six r2 adversarial findings against v2. (1) Split Task 6.4 into 6.4 (Velite-API investigation — deliverable is the implementation-log entry pinning the chosen path; NO velite.config.ts or script edit) and 6.4.1 (implementation of the chosen path — lands the Velite hook OR the post-build script); fixed Task 7's success criterion to not forward-reference 6.4.1's check (Task 7 verifies only schema-layer + fixture parsing); the script-path branch of 6.4.1 explicitly lists `package.json` in `Files:` and overrides Task 1's "do not touch existing dependency versions" with a narrow "may edit `scripts.build`" carve-out. (2) Added new Task 17.5 — refactor `src/styles/globals.css` to import per-blog-component CSS slices via `@import` so 18.1–18.8 edit distinct files (closes the v2 parallel-edit merge-conflict factory); fixed 18.7 `_Depends on:` to add 20; rewrote 18.9's success criterion to NOT forward-reference Task 19 (now tests `.pagefind-ui` against a static stub element in the preview route rather than the real search dialog); pinned the per-component Playwright test-file location as `e2e/tests/component-preview/*.test.ts` and extended Task 23.1's `_Depends on:` to include Task 35 (which extends the Playwright glob) so the per-component smokes are wired into the existing `pnpm test:e2e` step that ci.yml already runs. (3) Added a transitional-flag mechanism to Task 25 — the new step literals are gated behind `BLOG_ENHANCED_CI_LITERALS_REQUIRED=1` (read from env), default-off; Task 23.3 (last) flips the env var to required as its final step (so the verifier doesn't red-line the repo during the 23.1–23.2–23.3 landing window); also extended Task 25 to assert deploy steps live in the Build 2 step GROUP (not just the right ORDER); fixed Task 23.1's wrong `_Depends on: 26` (Task 26 is irrelevant to 23.1's Pagefind block — 23.2 inserts the verify-callers step). (4) Concretely pinned Task 5's `PROD_LIKE_PORT` triplication: drop the "package.json `_comments` key" hedge entirely (JSON doesn't support comments and the hack is worse than nothing); the cross-file comment lives in `lighthouserc.js` AND `scripts/run-pagefind-crawl.mjs` (two files), and a top-of-file comment in `package.json` is REJECTED (success criterion updated); `git grep "3013"` audit narrowed to "exactly three NON-TEST files exist that contain `3013` outside string-literal contexts" so unrelated test/fixture matches don't violate the invariant. (5) Fixed Task 38's `_Depends on:` to include 23.1, 23.2, 23.3; replaced step 7's "OR document the drift" baseline-SHA escape hatch with a mechanical-only gate (`LIGHTHOUSE_BASELINE_SHA.txt` must match `git rev-parse HEAD-of-baseline-branch` exactly, OR Task 36 re-runs and updates the file before Task 38 proceeds — no documentation-only path); extended Task 25 to also extend `scripts/verify-task-dependencies.mjs` (blog-core Task 28.5) for decimal task IDs (`6.1`, `18.7`, `23.1`, etc.) so the dependency-graph verifier can parse v2's split structure. (6) Closed v2's fresh coverage overclaims: extended Task 27 with a new "Velite-emitted slug parity" test asserting Velite's transform output matches `derivePostSlug(filePath, frontmatter)` for the same input (closes the silent-divergence vector between Tasks 6.3 and 11); extended Task 33 to additionally extract heading IDs from `s.markdown()` output (`bodyHtml`) and compare against the rendered DOM (closes Req 7.4 v4 `s.mdx()`-vs-`s.markdown()` parity); updated Req 12.2 matrix entry to include 23.1, 23.2, 23.3 (the workflow-side of the literals coverage); pinned Req 13.2 runbook location to `design.md` operator notes ONLY (drop the `(or README.md)` hedge in Task 37). The dependency-graph footer and Requirements Coverage Matrix are updated to reflect 6.4/6.4.1, 17.5, and the corrected dependency edges.
- **v2 (post-r1 adversarial response)**: Applied all six adversarial findings against v1. (1) Split Task 6 into 6.1 (schema fields + categories cap), 6.2 (h4 rejection + `BLOG_ALLOW_H4` escape hatch), 6.3 (fixture-slug audit call-site swap), 6.4 (series-order collision — first half-day is a Velite-API spike, then implementer picks `prepare`/`complete` hook OR standalone `scripts/verify-series-order.mjs`), 6.5 (`safeBodyHtml` regex extension); updated downstream `Depends on:` edges (Task 22 → 6.1 only; Task 7 → 6.1, 6.3; Task 29 → 6.4). (2) Split Task 18 into 18.1–18.9 — one sub-task per component plus a shared CSS slice (18.9 — `.pagefind-ui` token overrides) — each sub-task carries a per-component Playwright smoke assertion in light + dark themes (replacing v1's "verified visually" gate); pinned `<CopyButton />` hydrator mount site in 18.7 (mounted inside `<article>` on the post page only); updated Task 19's dependency to `18.9` only. (3) Demoted Task 0 — reclassified as "precondition — design-phase spike, included for traceability only," stripped its `_Requirements:` footer, removed from the coverage matrix, replaced the grep-able pass-string with a mechanical re-run-and-checksum mechanism in Task 1, pinned the spike's pagefind version to be committed verbatim in Task 1, added a working-tree-clean assertion at the top of Task 1. (4) Reversed Task 23 ↔ Task 25 ordering — Task 25 (verifier extension) lands FIRST with the new step literals registered; Task 23 then produces a ci.yml that mechanically passes the verifier; split Task 23 into 23.1 (Pagefind crawl + verify-index + manifest-upload), 23.2 (Vercel build + verify-artifact + deploy), 23.3 (Warn-when-Pagefind-disabled + PR comment); Task 23 now depends on Task 26 (the `verify-getPublishedPosts-callers` step it inserts); each sub-task's success criterion includes draft-PR workflow-run evidence; extended Task 37 with the GitHub UI runbook documenting `PAGEFIND_ENABLED` / `DEPLOY_VIA_CI` repo-variable setup. (5) Fixed coverage matrix gaps with new tasks: Task 39 mounts `<SeriesBadge />` on `/blog/tags/[tag]/page.tsx` and `/blog/categories/[category]/page.tsx` (Req 2.7), Task 40 extends Playwright with a 44×44 bounding-box assertion for share-bar buttons (Req 6.6), Task 41 extends Playwright with `prefers-reduced-motion: reduce` emulation + animation-property assertion (Req 5.5); extended Task 31 to enumerate all four `/`-shortcut suppression branches (input, textarea, contenteditable, modifier-held); dropped the Req 10.6 mechanical-Pagefind-exclusion overclaim by reframing it as a one-shot manual check. (6) Pinned the Lighthouse methodology — Task 36 records the blog-core baseline commit SHA to `LIGHTHOUSE_BASELINE_SHA.txt` at repo root, Task 38 verifies the SHA hasn't drifted (or re-runs Task 36's measurement); Task 38 step 7 pins Lighthouse to **median of 3 runs per URL** via `--numberOfRuns=3`.

---

## `_Requirements:` footer semantics

Each task carries a `_Requirements:` footer listing requirement IDs from `requirements.md`. The semantics are **"this task contributes to satisfying these requirements"** (in whole or in part) — *not* "this task transitively depends on these requirements." A requirement may be covered by multiple tasks; the Requirements Coverage Matrix at the document foot makes this inverse mapping explicit so orphan requirements are visible at review time.

**Task 0 carries NO `_Requirements:` footer** (v2 reclassification — Task 0 is a precondition gate, not a requirement-satisfying task; see Task 0 body).

---

- [ ] 0. (Precondition — design-phase spike, included for traceability only) Pre-implementation pipeline spike — `Implementation Logs/task-0-spike.md`
  - **v2 reclassification**: This task is NOT a production-implementation task. It is a DESIGN-PHASE gate whose failure invalidates the v4 design and returns it to v5. It is numbered Task 0 only so the existing dependency-graph references remain valid. It carries NO `_Requirements:` footer and does NOT appear in the Requirements Coverage Matrix.
  - File: .spec-workflow/specs/blog-enhanced/Implementation Logs/task-0-spike.md
  - File: scripts/__spike/pagefind-double-build-check.mjs (re-runnable spike script — committed so Task 1 can re-run it)
  - Run the 13-step shell-script spike from design §"Pre-implementation pipeline spike (v4 — Task 0, REWRITTEN per r3 P0 #3)" on a throwaway branch off `main`.
  - **Pinned Pagefind version mechanism (v2)**: Spike runs `pnpm dlx pagefind@<LATEST-STABLE-AT-SPIKE-TIME>` and **records the exact version used** in the spike output (`task-0-spike.md`). Task 1 MUST commit that EXACT version to `package.json` — no drift permitted. If Task 1 commits a different version, the spike is re-run from Task 1.
  - **Re-runnable spike script (v2)**: The spike is packaged as `scripts/__spike/pagefind-double-build-check.mjs` so Task 1 can re-run it and verify the checksum. The script writes its output checksum to stdout in a parseable form (e.g. `SPIKE-CHECKSUM=<sha256>`). The script itself IS committed; the `public/__spike/` artifacts created during execution are NOT committed (script cleans them up).
  - **Outcome artifact**: `.spec-workflow/specs/blog-enhanced/Implementation Logs/task-0-spike.md` containing the full command transcript, the pagefind version used, the spike-output checksum, and a record of all six spike acceptance criteria passing.
  - Purpose: Validate the v3+v4 crawl mechanism (`--input-file` for unlinked pages, `--adjust-extension` for extensionless URLs, master timeout) against real infrastructure BEFORE committing any tasks. Failure returns the design to v5.
  - _Leverage: existing blog-core `pnpm build`; existing localhost:3013 dev port_
  - _Depends on: (none — root precondition gate; design-level)_
  - _Design refs: "Pre-implementation pipeline spike (v4 — Task 0, REWRITTEN per r3 P0 #3)" + v4 changelog item 4_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Build pipeline engineer with wget + Pagefind expertise | Task: Package the 13-step spike as a re-runnable script at `scripts/__spike/pagefind-double-build-check.mjs`. Run it on a throwaway branch. Record (a) the pagefind version used, (b) the spike-output checksum (sha256), and (c) the full transcript in the implementation log. Commit the spike script itself; do NOT commit `public/__spike/`. Mark in-progress; log-implementation when done. | Restrictions: Use `pnpm dlx pagefind@<LATEST-STABLE-AT-SPIKE-TIME>` and record the version. All six spike acceptance criteria MUST pass; any failure returns the design to v5 rather than proceeding to Task 1. | _Leverage: blog-core build; localhost:3013 | Success: Implementation log records the pinned pagefind version, the spike-output checksum, the full transcript, and all six acceptance-criteria passes; throwaway branch deleted; `scripts/__spike/pagefind-double-build-check.mjs` IS committed but `public/__spike/` is NOT._

- [ ] 1. Add new dependencies to package.json with exact pins
  - File: package.json
  - **v2 working-tree-clean assertion (precondition)**: at task start, `git status --porcelain public/__spike/` MUST be empty (no untracked spike artifacts). `git ls-files scripts/__spike/pagefind-double-build-check.mjs` MUST list the committed spike script. If either check fails, this task FAILS with a directive to return to Task 0.
  - **v2 spike re-run (replaces v1 grep-able pass-string)**: re-run `node scripts/__spike/pagefind-double-build-check.mjs` and capture its `SPIKE-CHECKSUM=<sha256>` output. Record the resulting checksum in this task's implementation log. The checksum MUST match the one recorded in Task 0's implementation log. If it doesn't, this task FAILS and returns to Task 0.
  - Add devDependencies: `vercel` (exact-pinned, no caret/tilde — Design pins the exact stable version at implementation time), `pagefind` (exact-pinned — **MUST be the exact version recorded in Task 0's implementation log**), `@pagefind/default-ui` (exact-pinned), `hast-util-to-text` (used by `rehypeCopyButton`), `gray-matter` (used by `verify-pagefind-no-drafts.mjs` to parse fixture frontmatter — verify whether it is already a transitive dep before adding).
  - Do NOT bump existing dependency versions.
  - Add `"build:search": "node scripts/run-pagefind-crawl.mjs"` to `scripts`.
  - Run `pnpm install` to update the lockfile.
  - Purpose: Provide the Vercel CLI, Pagefind runtime/UI, HAST text-extraction, and frontmatter parser the design depends on. Wire the local `pnpm build:search` indirection. Mechanically gate on Task 0's spike validity.
  - _Leverage: existing package.json structure; blog-core Task 1 pin discipline; scripts/__spike/pagefind-double-build-check.mjs (Task 0)_
  - _Requirements: 0.2, 1.1, 9.1_
  - _Depends on: 0_
  - _Design refs: "package.json: gains `vercel`, `pagefind`, `@pagefind/default-ui` (exact-pinned)" in Integration Points; "Pagefind UI choice (v2)"; "Dependabot routing"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Build/DevOps engineer with deep pnpm + Vercel CLI familiarity | Task: (1) Assert working tree is clean of `public/__spike/`. (2) Re-run `scripts/__spike/pagefind-double-build-check.mjs` and record `SPIKE-CHECKSUM`; FAIL if it doesn't match Task 0's. (3) Add the listed devDependencies, all exact-pinned; `pagefind` MUST be the exact version from Task 0's log. (4) Add the `build:search` script. (5) Run `pnpm install`. Mark in-progress; log-implementation when done. | Restrictions: All three exact-pinned packages (`vercel`, `pagefind`, `@pagefind/default-ui`) MUST be pinned without caret/tilde. `pagefind` version MUST match Task 0's recorded version. Do NOT bump existing dependency versions. Do NOT change `packageManager` or `engines.node`. | _Leverage: existing package.json; blog-core pin discipline | _Requirements: 0.2, 1.1, 9.1 | Success: Working-tree assertion passes; spike re-run checksum matches Task 0's; `pnpm install` succeeds; lockfile updated; exact pins verified by grep; `pnpm build:search` resolves to a runnable script. Then mark complete after logging._

- [ ] 2. Add `.github/dependabot.yml` (or extend existing) to route `vercel` + `pagefind` separately
  - File: .github/dependabot.yml
  - Add (or extend) `updates:` block routing `vercel` and `pagefind` (and `@pagefind/default-ui`) into a SEPARATE category (e.g. group `pagefind-and-vercel-cli`) that is NOT auto-merged.
  - Manual review is required for minor-version bumps because they can change `--prebuilt` semantics or index format.
  - Purpose: Honor the spec's exact-pin policy with a maintainer-visible bump cadence.
  - _Leverage: existing dependabot config (if present) OR create new file_
  - _Requirements: 0.2_
  - _Depends on: 1_
  - _Design refs: "Dependabot: a new `.github/dependabot.yml` (or existing config extended)"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps engineer with Dependabot configuration expertise | Task: Add or extend `.github/dependabot.yml` to group `vercel`, `pagefind`, and `@pagefind/default-ui` into a non-auto-merged category. Mark in-progress; log-implementation when done. | Restrictions: Existing dependency groupings remain untouched. The new category MUST NOT be configured for auto-merge. | _Leverage: existing dependabot config if present | _Requirements: 0.2 | Success: PR-author opens a `vercel` minor bump and Dependabot routes it to the dedicated category requiring manual approval. Then mark complete after logging._

- [ ] 3. Add `public/pagefind/` and `./out` to `.gitignore`
  - File: .gitignore
  - Append `public/pagefind/` and `out/` (the wget mirror transient directory).
  - Purpose: Keep the Pagefind build artifact and the wget mirror out of git.
  - _Leverage: existing .gitignore_
  - _Requirements: 1.2_
  - _Depends on: (none — independent edit)_
  - _Design refs: "`.gitignore`: gains `public/pagefind/`"; "`./out` is a transient build directory added to `.gitignore`"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Git engineer | Task: Append the two patterns to `.gitignore`. Mark in-progress; log-implementation when done. | Restrictions: Do not remove or reorder existing entries. | _Leverage: existing .gitignore | _Requirements: 1.2 | Success: A `pnpm build:search` run leaves no tracked changes under `public/pagefind/` or `out/`. Then mark complete after logging._

- [ ] 4. Create `src/lib/build/derive-post-slug.mjs` — shared slug helper + `KNOWN_FIXTURE_SLUGS` roster
  - File: src/lib/build/derive-post-slug.mjs
  - Pure JavaScript (`.mjs`, NOT `.ts`) with JSDoc types for IDE/typecheck affordance. Per v4 design P0 #4: `.mjs` scripts cannot import a `.ts` source via a `.js` path.
  - Named exports:
    - `KNOWN_FIXTURE_SLUGS: Set<string>` — exactly the ten roster slugs from design §"Fixture-slug audit": `fixture-draft`, `fixture-code`, `fixture-reading-time`, `fixture-toc`, `fixture-footnotes`, `fixture-related-a`, `fixture-related-b`, `fixture-series-1`, `fixture-series-2`, `fixture-search`.
    - `derivePostSlug(filePath: string, frontmatter: { slug?: string }): string` — returns `frontmatter.slug` if set, otherwise `path.basename(filePath, ".mdx")`.
  - Purpose: Single source of truth for slug derivation AND the fixture roster, consumed by `velite.config.ts` (Task 6) AND by `scripts/verify-pagefind-no-drafts.mjs` (Task 11) AND by `scripts/run-pagefind-crawl.mjs` (Task 9). Closes the duplicated-logic drift vector from blog-core.
  - _Leverage: Node built-in `node:path`_
  - _Requirements: 1.12_
  - _Depends on: 1_
  - _Design refs: "`derivePostSlug` (`src/lib/build/derive-post-slug.mjs` — v4 file extension)"; v4 changelog item 3_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Build-pipeline engineer | Task: Create the `.mjs` module with the two named exports per the design's pinned signatures. Mark in-progress; log-implementation when done. | Restrictions: Pure JavaScript (`.mjs`) NOT TypeScript. JSDoc types only. The fixture roster MUST contain exactly the ten slugs listed — no additions, no removals. No mutable module state. | _Leverage: node:path | _Requirements: 1.12 | Success: `import { derivePostSlug, KNOWN_FIXTURE_SLUGS } from "./src/lib/build/derive-post-slug.mjs"` works from both `velite.config.ts` (TS) and `.mjs` scripts. Then mark complete after logging._

- [ ] 4.1. Create `src/lib/build/derive-post-slug.test.mjs` — five-case unit suite
  - File: src/lib/build/derive-post-slug.test.mjs
  - Vitest cases per design §"Unit tests (Pinned in `derive-post-slug.test.mjs`)":
    - (a) no override → basename (`derivePostSlug("posts/foo.mdx", {})` → `"foo"`).
    - (b) explicit override → override.
    - (c) override containing kebab → preserved.
    - (d) subdirectory path (`posts/sub/foo.mdx`) → basename ignores subdir → `"foo"`.
    - (e) `.md` extension → returns full basename `foo.md` (because helper strips `.mdx` only).
  - Verify `vitest.config.*` `include` pattern covers `src/lib/build/*.test.mjs`. If not, update the config in this task before writing the test.
  - _Leverage: vitest_
  - _Requirements: 1.12_
  - _Depends on: 4_
  - _Design refs: "Unit tests (Pinned in `derive-post-slug.test.mjs`)"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA/Vitest engineer | Task: Write the five test cases per the design. Verify the vitest include pattern covers `.test.mjs` files. Mark in-progress; log-implementation when done. | Restrictions: Five SEPARATE `test()` cases. No reliance on filesystem state — helper is pure. | _Leverage: vitest | _Requirements: 1.12 | Success: All five cases pass; injecting an off-by-one in the helper (e.g. stripping `.md` only) fails case (a). Then mark complete after logging._

- [ ] 5. Define `PROD_LIKE_PORT` literal in three places (deliberate non-centralization)
  - Files: package.json (`start` + `dev` scripts — VERIFY EXISTING, no comment added), lighthouserc.js, scripts/run-pagefind-crawl.mjs
  - Per design §"Port duplication (v2 — REVERSES v1 centralization)": the literal `3013` lives in THREE files. **No** wrapper script, **no** `src/config/site.ts` constant, **no** verifier.
  - **`package.json` `start` script**: `next start --port 3013` (already present per blog-core — verify and leave unchanged). **v3 — package.json carries NO comment** (JSON does not support comments natively; the `_comments` key hack is REJECTED — it pollutes the package.json schema and tools may strip it). The cross-file audit lives in the TWO source files below, not in package.json.
  - **`lighthouserc.js`**: `process.env.LHCI_PREVIEW_URL || "http://localhost:3013"` — already present; add a JS comment immediately above this line: `// Port duplicated in package.json (start script) and scripts/run-pagefind-crawl.mjs — keep in sync.`
  - **`scripts/run-pagefind-crawl.mjs`**: `const PORT = 3013;` near the top (this file is created in Task 9; the comment lands then). **v4 — exact comment text pinned here so Task 9 implements it verbatim**: `// Port duplicated in package.json (start script) and lighthouserc.js — keep in sync.`
  - Purpose: Honor CLAUDE.md's "DO NOT over-engineer" directive while keeping the audit grep-able where comments are legal (JS source files).
  - _Leverage: existing package.json scripts; existing lighthouserc.js_
  - _Requirements: 1.2_
  - _Depends on: 1_
  - _Design refs: "Port duplication (v2 — REVERSES v1 centralization)"; r1 review reversal_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Config maintainer | Task: Add the cross-file comment to lighthouserc.js. The `scripts/run-pagefind-crawl.mjs` constant + comment is added in Task 9. Mark in-progress; log-implementation when done. | Restrictions: Do NOT create a wrapper script, constant module, or verifier. Do NOT add a comment or `_comments` key to package.json (JSON-comment hack REJECTED). The literal `3013` MUST appear in the three files (package.json, lighthouserc.js, scripts/run-pagefind-crawl.mjs). | _Leverage: blog-core start script | _Requirements: 1.2 | Success: (v4 — positive invariant per r3 attack 4) `git grep "3013"` returns matches ONLY from `package.json` (existing `start` script line), `lighthouserc.js` (existing baseURL line), `scripts/run-pagefind-crawl.mjs` (added in Task 9), AND an explicit allowlist of acceptable test/fixture occurrences documented inline in this task's implementation log (e.g. blog-core test fixtures that happen to contain `3013`). Any NEW occurrence outside the three pinned files + the allowlist FAILS this task (catches the v1-centralization-regression vector — e.g. a future contributor adding `3013` to `src/config/site.ts`). Then mark complete after logging._

- [ ] 6.1. Velite `posts` schema additions only — `hiddenFromLists`, `excludeFromSearch`, `categories.max(3)` cap
  - File: velite.config.ts
  - **Schema additions only** (per design §"Velite `posts` collection extensions"):
    - `hiddenFromLists: s.boolean().optional()` — default `undefined` (treated as `false`).
    - `excludeFromSearch: s.boolean().optional()` — default `undefined` (treated as `false`).
    - Modify `categories: s.array(s.string()).max(3).default([])` — adds the v4 cap (Req 4.1 v4).
  - **No transform changes in this task**. The schema landing alone unblocks Task 22 (which reads `hiddenFromLists` from `.velite/index.js`). 6.2–6.5 follow.
  - Purpose: Land the minimum schema surface that Task 22 depends on without entangling the transform extensions in the same checkbox.
  - _Leverage: existing velite.config.ts_
  - _Requirements: 4.1, 11.1_
  - _Depends on: 4_
  - _Design refs: "Velite `posts` collection extensions"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Velite/Zod engineer | Task: Add only the three schema fields. Do NOT touch the transform body in this task. Mark in-progress; log-implementation when done. | Restrictions: Existing posts (blog-core fixtures) must continue to pass the schema. The `categories.max(3)` cap applies on top of the existing `.array(s.string())`. | _Leverage: existing velite.config.ts | _Requirements: 4.1, 11.1 | Success: `pnpm velite build` accepts blog-core posts; a synthetic post with 4 categories is rejected. Then mark complete after logging._

- [ ] 6.2. Velite `posts.transform` — h4 rejection + `BLOG_ALLOW_H4` escape hatch
  - File: velite.config.ts (transform body)
  - **h4+ rejection clause** (Req 7.10 v4): inside the existing MDAST visitor at velite.config.ts:132-169, add a `node.type === "heading"` clause — if `node.depth >= 4`: throw the named error from the design's verbatim wording, UNLESS `process.env.BLOG_ALLOW_H4 === "1"`, in which case emit the stderr warning instead. Read the env var at transform time (NOT module load) so build-vs-build behavior differs deterministically.
  - Purpose: Enforce the post-author headings depth constraint with a documented escape hatch for the spec owner.
  - _Leverage: existing posts.transform MDAST visitor at velite.config.ts:132-169_
  - _Requirements: 7.10_
  - _Depends on: 6.1_
  - _Design refs: "Velite `posts` collection extensions" — h4 rejection clause_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: remark/MDAST engineer | Task: Add the h4 rejection clause + escape hatch. Mark in-progress; log-implementation when done. | Restrictions: Verbatim error string per design. `process.env.BLOG_ALLOW_H4` is read at transform time. No effect on existing blog-core fixtures (none of which contain h4). | _Leverage: existing visitor | _Requirements: 7.10 | Success: Synthetic post with h4 fails build; same post with `BLOG_ALLOW_H4=1` passes with stderr warning. Then mark complete after logging._

- [ ] 6.3. Velite `posts.transform` — fixture-slug audit + `derivePostSlug` call-site swap
  - File: velite.config.ts (transform body)
  - **Fixture-slug audit** (per design §"Fixture-slug audit (v2 — narrowed scope per r1 review)"): import `KNOWN_FIXTURE_SLUGS` from `./src/lib/build/derive-post-slug.mjs`. If `KNOWN_FIXTURE_SLUGS.has(data.slug) && !data.draft && data.hiddenFromLists !== true`: throw the named error verbatim.
  - **Slug-derivation call-site update**: replace the existing inline `data.slug.replace(/^posts\//, "")` at `velite.config.ts:108` (and any sibling site at `velite.config.ts:197`) with a call to `derivePostSlug(meta.path, data)`.
  - Purpose: Prevent the fixture-roster invariant from drifting at the schema layer + consolidate slug derivation behind the single shared helper.
  - _Leverage: src/lib/build/derive-post-slug.mjs (Task 4); existing inline slug replacements_
  - _Requirements: 1.12, 11.4_
  - _Depends on: 4, 6.1_
  - _Design refs: "Fixture-slug audit (v2)"; "`derivePostSlug` call-site update"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Velite engineer | Task: Add the fixture-slug audit clause and swap both inline slug-derivation call sites for `derivePostSlug(meta.path, data)`. Mark in-progress; log-implementation when done. | Restrictions: Audit checks the exact `KNOWN_FIXTURE_SLUGS.has(...)` — NOT a regex prefix. Both call sites must be swapped; reviewer rejects PRs that leave one inline. | _Leverage: derive-post-slug.mjs | _Requirements: 1.12, 11.4 | Success: Renaming `fixture-search.mdx` to a non-roster slug while keeping `draft: false, hiddenFromLists: undefined` is rejected; `git grep "data.slug.replace"` returns no matches in velite.config.ts. Then mark complete after logging._

- [ ] 6.4. Series-order collision — Velite-API investigation (LOG-ONLY task; no code change)
  - File: .spec-workflow/specs/blog-enhanced/Implementation Logs/task-6.4-velite-api-spike.md (NEW)
  - **No velite.config.ts or script edit in this task**. Deliverable is the implementation-log entry recording: (a) does Velite expose a `prepare` / `complete` / post-collection hook that fires AFTER all per-post transforms complete? (b) if yes, the hook's exact API signature (cite Velite source or docs); (c) the chosen path for Task 6.4.1 — `HOOK` or `SCRIPT` — pinned as a single word at the top of the log.
  - Investigation steps: read Velite's published API; if unclear, read Velite's source for the collection lifecycle. Reproduce the answer with a one-line throwaway probe (e.g. add `console.log("hook fired")` in a temporary hook key and run `pnpm velite build`).
  - Purpose: Isolate the unresolved API-surface unknown so it doesn't pollute the implementation task. Convert "implementer cognitive judgment" into a recorded, reviewable decision.
  - _Leverage: existing Velite collection API; Velite docs + source_
  - _Requirements: 2.3 (investigation prerequisite — does NOT itself satisfy the AC)_
  - _Depends on: 6.1_
  - _Design refs: "Series-order collision" Error Scenario 11_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Velite-internals engineer | Task: Investigate Velite's post-list hook surface; record findings + the chosen path (`HOOK` or `SCRIPT`) in the implementation log. Mark in-progress; log-implementation when done. | Restrictions: NO velite.config.ts edit, NO new script files. Log file is the only artifact. The first line of the log MUST be `CHOSEN_PATH: HOOK` or `CHOSEN_PATH: SCRIPT` so Task 6.4.1 reads it mechanically. | _Leverage: Velite docs + source | _Requirements: 2.3 | Success: Implementation log exists with `CHOSEN_PATH:` first line; Task 6.4.1 can mechanically branch on its content. Then mark complete after logging._

- [ ] 6.4.1. Series-order collision — implementation (Velite hook OR post-build script)
  - Files (branch on Task 6.4's `CHOSEN_PATH`):
    - **HOOK branch**: velite.config.ts (extend with the post-collection hook).
    - **SCRIPT branch**: scripts/verify-series-order.mjs (new); package.json (`scripts.build` line ONLY — narrow carve-out from Task 1's "do not bump existing dependencies" restriction; this task is explicitly authorized to modify `scripts.build`).
  - **HOOK implementation**: inside Velite's `prepare`/`complete` hook (whichever 6.4 pinned), group all posts by `series`, assert uniqueness of `seriesOrder` within each group, throw `[velite/posts] series '{series}' has colliding seriesOrder values: {file-a} and {file-b}` on collision.
  - **SCRIPT implementation**: `scripts/verify-series-order.mjs` reads `.velite/index.js`, performs the same grouping + uniqueness check, exits non-zero with the verbatim error on collision. Wire as `"build": "next build && node scripts/verify-series-order.mjs"`.
  - **Error-surface timing note**: the HOOK branch fails at `pnpm velite` (early — same surface as h4 rejection in Task 6.2). The SCRIPT branch fails after `next build` (late — but still inside `pnpm build`, so CI catches it). Both are acceptable; document the chosen timing in the implementation log.
  - **v4 — `verify-chosen-path.mjs` gate (per r3 attack 2 third bullet)**: this task's success criterion REQUIRES running `node scripts/verify-chosen-path.mjs` (the new verifier added to Task 25). The script reads Task 6.4's log file's `CHOSEN_PATH:` and asserts this PR's diff matches. The implementer cannot land 6.4.1 with a HOOK diff against a SCRIPT log (or vice versa) — the mechanical gate fails.
  - Purpose: Implement the collision check via the path 6.4 chose.
  - _Leverage: 6.4 log; existing Velite collection API; `.velite/index.js` output; scripts/verify-chosen-path.mjs (Task 25)_
  - _Requirements: 2.3_
  - _Depends on: 6.4, 25_
  - _Design refs: "Series-order collision" Error Scenario 11; Task 6.4's `CHOSEN_PATH` decision_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Velite engineer | Task: Read `Implementation Logs/task-6.4-velite-api-spike.md`'s `CHOSEN_PATH:` line; implement via that branch. Mark in-progress; log-implementation when done. | Restrictions: Verbatim error string per design. If SCRIPT branch, the only allowed package.json edit is the `scripts.build` line. | _Leverage: 6.4 findings; `.velite/index.js` | _Requirements: 2.3 | Success: Two posts colliding on `seriesOrder` in the same series fail `pnpm build` with the verbatim error. Then mark complete after logging._

- [ ] 6.5. `safeBodyHtml` extension — `data-copy-source` RSS strip
  - File: velite.config.ts (the `safeBodyHtml` post-processor at velite.config.ts:188-191)
  - Extend the existing `safeBodyHtml` post-processor with one additional `.replace(/\sdata-copy-source="[^"]*"/g, "")` pass BEFORE the `]]>` substitution.
  - Purpose: Strip the copy-button data-attribute from RSS-bound body HTML so feed consumers don't see the hydration marker.
  - _Leverage: existing `safeBodyHtml` at velite.config.ts:188-191_
  - _Requirements: 9.10, 11.4_
  - _Depends on: 6.1_
  - _Design refs: "`data-copy-source` RSS strip (v2)"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Velite/regex engineer | Task: Add the regex strip pass. Mark in-progress; log-implementation when done. | Restrictions: The `.replace(...)` MUST come BEFORE the `]]>` substitution. The pattern includes the leading whitespace (`\s`) so adjacent attributes aren't fused. | _Leverage: existing safeBodyHtml | _Requirements: 9.10, 11.4 | Success: A post body containing `<pre data-copy-source="..."><code>...</code></pre>` emits a `bodyHtml` with the attribute stripped. Verified in Task 29's RSS-strip test. Then mark complete after logging._

- [ ] 7. Create the seven blog-enhanced fixture posts + extend `fixture-code.mdx`
  - Files: content/posts/fixture-toc.mdx, content/posts/fixture-footnotes.mdx, content/posts/fixture-related-a.mdx, content/posts/fixture-related-b.mdx, content/posts/fixture-series-1.mdx, content/posts/fixture-series-2.mdx, content/posts/fixture-search.mdx, content/posts/fixture-code.mdx (extended)
  - **Content per design Fixture Roster v2/v3/v4**:
    - `fixture-toc.mdx`: `draft: true`, tags `[fixture, toc-test]`, categories `[fixture]`. Body: ≥6 h2 headings, ≥3 h3 headings under various h2s, at least one duplicate heading (`## Setup` appears twice — exercises the github-slugger collision suffix). Body prose is INDEPENDENT of `fixture-reading-time` (no shared text per v2 cross-coupling fix).
    - `fixture-footnotes.mdx`: `draft: true`, tags `[fixture, footnotes-test]`, categories `[fixture]`. Body contains at least three `text[^N]` references with three matching `[^N]: ...` definitions.
    - `fixture-related-a.mdx`: `draft: true`, tags `[related-test]`, categories `[related-fixture]`. Body: minimal prose. ISOLATES from other fixtures via dedicated tag + category (so the related-rail test is uncontaminated).
    - `fixture-related-b.mdx`: `draft: true`, tags `[related-test]`, categories `[related-fixture]`. Pairs with `fixture-related-a` — same tag + category → score 4 under 3:1 weighting.
    - `fixture-series-1.mdx`: `draft: true`, tags `[fixture, series-test]`, categories `[fixture]`, `series: "Fixture Series"`, `seriesOrder: 1`.
    - `fixture-series-2.mdx`: `draft: true`, tags `[fixture, series-test]`, categories `[fixture]`, `series: "Fixture Series"`, `seriesOrder: 2`.
    - `fixture-search.mdx`: **`draft: false` (PUBLISHED)**, `hiddenFromLists: true`, tags `[search-test]`, categories `[search-fixture]`. Body contains the unique high-signal phrase `MATTHEWFIELD-SEARCH-SMOKE`, **plus at least two h2/h3 headings** (per Req 7.4 v4 — needed for the Build-2 TOC parity check). Opens with a one-line visible note explaining its fixture status (e.g. "This page is a permanent fixture used by the site's search smoke test").
  - **Extension to `fixture-code.mdx`**: append two `## Setup` headings (rendered as `setup` / `setup-1` IDs after `rehype-slug`) — exercises the collision-suffix coverage for Req 7.4. Existing content of `fixture-code.mdx` remains.
  - **All MDX fixtures start with** the FIXTURE-NOTE HTML comment header per blog-core convention.
  - Purpose: Stable test substrate for every Vitest + Playwright assertion downstream.
  - _Leverage: blog-core fixture conventions; existing content/posts/fixture-*.mdx style_
  - _Requirements: 1.13, 2.1, 4.1, 7.4, 8.7, 10.1, 10.3_
  - _Depends on: 6.1, 6.3_
  - _Design refs: "Fixture Roster v2"; r3 Section D first bullet (Build-2 TOC parity target)_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical writer with MDX + Velite familiarity | Task: Author the seven new fixture files per the Fixture Roster v2 + v4 pins. Extend `fixture-code.mdx` with the two `## Setup` headings for collision coverage. Mark in-progress; log-implementation when done. | Restrictions: `fixture-search.mdx` MUST have `draft: false` AND `hiddenFromLists: true` AND contain the literal phrase `MATTHEWFIELD-SEARCH-SMOKE`. `fixture-related-a/b` MUST use the dedicated `related-test`/`related-fixture` tag+category (NOT the catch-all `fixture` category) to isolate the related-rail test. All fixtures MUST start with the FIXTURE-NOTE comment header per blog-core Task 4.2's HTML-comment carve-out. | _Leverage: existing content/posts/ fixtures | _Requirements: 1.13, 2.1, 4.1, 7.4, 8.7, 10.1, 10.3 | Success: `pnpm velite build` accepts all seven new fixtures under the Task 6.1/6.3 schema; the fixture-slug audit does NOT throw on `fixture-search.mdx`. (v3 — series-order collision check is verified by Task 6.4.1's own success criterion, not here — Task 7 does not forward-reference 6.4.1.) Then mark complete after logging._

- [ ] 8. Extend `src/lib/blog.ts` — visibility filter, series, related, TOC, JSDoc warning
  - File: src/lib/blog.ts
  - **New named exports per design §"`src/lib/blog.ts` extensions"**:
    - `getVisiblePublishedPosts(): Post[]` — equivalent to `getPublishedPosts().filter(p => !isHiddenFromLists(p))`.
    - `isHiddenFromLists(post: Post): boolean` — returns `true` iff `post.hiddenFromLists === true` OR `KNOWN_FIXTURE_SLUGS.has(post.slug)`. Pure.
    - `getSeriesGroups(): Map<string, Post[]>` — groups visible posts by `series`; values sorted by `seriesOrder` asc then `date` desc then `slug` asc. Map iteration order = first-encounter order in the visible-posts list.
    - `getRelatedPosts(slug: string, limit?: number): RelatedPostMeta[]` — implements the 3:1 weighted-overlap algorithm per Req 4.1 v3 + cross-series exclusion per Req 4.2 v2. Sources candidates from `getVisiblePublishedPosts()`. Excludes same-series members when the series-of-2+ navigator will render. `score = 3 * |Q.tags ∩ P.tags| + 1 * |Q.categories ∩ P.categories|`. Filter `score === 0`. Sort by score desc, date desc, slug asc. Slice to `limit` (default 3). Returns `[]` for unknown slug.
    - `extractToc(post: Post): TocEntry[]` — uses `node-html-parser` to parse `post.bodyHtml`; collects `<h2 id>` and `<h3 id>` elements in document order; ignores h4+; returns flat `TocEntry[]` of shape `{ id, text, depth }`. Returns `[]` for posts with fewer than 2 entries (the component decides whether to render).
    - Type: `export type RelatedPostMeta = PostMeta & Pick<Post, "description" | "date">;`
    - Type: `export type TocEntry = { id: string; text: string; depth: 2 | 3 };`
  - **JSDoc warning on existing `getPublishedPosts()`** (per Req v4 Fixture Filter): add the warning comment block above the existing function: `For LIST contexts, prefer getVisiblePublishedPosts() — this function does NOT exclude posts with hiddenFromLists: true or the fixture-* slug prefix.`
  - **Series-cycle / self-reference handling** (Req 2.4): `getSeriesGroups()` treats `series == slug` like any other string; if no other posts join, count is 1 and Req 2.6 suppresses the navigator at the component layer. No special-case code path.
  - **`KNOWN_FIXTURE_SLUGS` source**: import from `@/lib/build/derive-post-slug.mjs` (the same source the Velite audit uses — single roster).
  - Purpose: Single query-layer chokepoint for the new visibility filter, series grouping, related-posts scoring, TOC extraction.
  - _Leverage: existing src/lib/blog.ts; `#site/content`; `node-html-parser` (already in devDependencies per blog-core Task 1); src/lib/build/derive-post-slug.mjs (Task 4)_
  - _Requirements: 2.1, 2.5, 2.6, 2.7, 2.8, 3.1, 4.1, 4.2, 4.3, 4.4, 7.2, 7.3, 7.5_
  - _Depends on: 4, 6_
  - _Design refs: "`src/lib/blog.ts` extensions"; "Series-cycle / self-reference handling"; API conventions section_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Senior TypeScript developer | Task: Add the new helpers + types + JSDoc warning per the design's pinned signatures. Mark in-progress; log-implementation when done. | Restrictions: `getPublishedPosts()` is NOT modified — only the JSDoc above it. `getVisiblePublishedPosts()` MUST go through `getPublishedPosts()` (composition, not duplication). The 3:1 weight ratio is HARDCODED — NOT a config constant. `extractToc` MUST use `node-html-parser` (already pinned in blog-core). All exports are NAMED — no default exports. | _Leverage: existing blog.ts; node-html-parser; #site/content | _Requirements: 2.1, 2.5, 2.6, 2.7, 2.8, 3.1, 4.1, 4.2, 4.3, 4.4, 7.2, 7.3, 7.5 | Success: Typecheck passes; all six exports present; JSDoc visible above `getPublishedPosts()` in IDE hover. Then mark complete after logging._

- [ ] 8.1. Carve taxonomy helpers into `src/lib/blog-taxonomy.ts`
  - Files: src/lib/blog-taxonomy.ts (new), src/app/(site)/blog/tags/[tag]/page.tsx (import path update), src/app/(site)/blog/categories/[category]/page.tsx (import path update), src/app/sitemap.ts (import path update), src/lib/blog.ts (remove the moved exports)
  - **Move** `getAllTags`, `getAllCategories`, `getPostsByTag`, `getPostsByCategory` from `src/lib/blog.ts` to a new file `src/lib/blog-taxonomy.ts`.
  - **The four moved helpers MUST source from `getVisiblePublishedPosts()`** (NOT `getPublishedPosts()`) — closes the file-level-allow-list loophole the v2 reviewer identified.
  - **Update import paths** at the three call sites (taxonomy routes + sitemap) to import from `@/lib/blog-taxonomy`.
  - **Update Vitest tests** — move the taxonomy section of `src/lib/blog.test.ts` to a new `src/lib/blog-taxonomy.test.ts`.
  - Purpose: Force taxonomy helpers through the visibility filter — Tags like `search-test` (carried by `fixture-search`) MUST NOT produce a `/blog/tags/search-test` static page.
  - _Leverage: existing src/lib/blog.ts taxonomy helpers; existing tests_
  - _Requirements: 7.5, 12.1_
  - _Depends on: 8_
  - _Design refs: "Taxonomy helpers MOVED to `src/lib/blog-taxonomy.ts`"; "the new file is NOT in `ALLOWED_CALLERS`"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript refactor engineer | Task: Carve the four taxonomy helpers into `src/lib/blog-taxonomy.ts`, update the three call-site imports, move the taxonomy tests. Mark in-progress; log-implementation when done. | Restrictions: The new file MUST NOT call `getPublishedPosts()` directly — only `getVisiblePublishedPosts()`. The four helper signatures MUST be preserved (no behavior change for callers). | _Leverage: existing tests; existing taxonomy helpers | _Requirements: 7.5, 12.1 | Success: Typecheck passes; `pnpm test` passes; taxonomy routes still render for legitimate tags; `/blog/tags/search-test` is NOT generated. Then mark complete after logging._

- [ ] 9. Implement `scripts/run-pagefind-crawl.mjs` — crawl orchestrator with master timeout
  - File: scripts/run-pagefind-crawl.mjs
  - Implementation per design §"Crawl orchestration (v2 — Pinned, no `verify during implementation` hedge)" and v4 updates:
    - `const PORT = 3013;` near top with the cross-file comment (per Task 5). **v4 — verbatim comment text pinned**: `// Port duplicated in package.json (start script) and lighthouserc.js — keep in sync.` (immediately above the `const PORT` line).
    - `READINESS_TIMEOUT_MS = 180_000`, `POLL_INTERVAL_MS = 500`.
    - Port-conflict guard via `net.Server.listen(PORT)` test (fail-fast diagnostic).
    - Clean prior crawl output (`./out`, `public/pagefind/`).
    - Spawn `node_modules/.bin/next` `["start", "--port", "3013"]` with `stdio: "inherit"`. SIGTERM → SIGKILL escalation on 5s.
    - Poll readiness via HEAD `http://localhost:3013/` with last-status reporting on timeout.
    - **Build `extraSlugs` URL list** by importing `./.velite/index.js`: filter `p.hiddenFromLists === true && !p.draft && p.excludeFromSearch !== true` (per v4 changelog #6).
    - **Write urls-extra file to `os.tmpdir()`** (per v4 changelog #7): `path.join(os.tmpdir(), `pagefind-urls-${process.pid}.txt`)`. Unlink on success AND failure.
    - **wget invocation per v4 design**: `--quiet --mirror --adjust-extension --no-host-directories --directory-prefix=./out --input-file=<tmppath> --reject="*.css,*.js,*.png,*.jpg,*.jpeg,*.svg,*.ico,*.webp,*.wasm" --exclude-directories=/_next,/static --timeout=30 --tries=2 http://localhost:3013/`. **NO `--no-parent`** (per v4 P0 #5 — conflicts with `--input-file`).
    - Run pagefind: `node_modules/.bin/pagefind --site ./out --output-path public/pagefind`.
    - Cleanup: kill next, rm `./out`.
    - **Master timeout** via `Promise.race` against `MASTER_TIMEOUT_MS = Number(process.env.PAGEFIND_TIMEOUT_MS ?? 600_000)`.
  - Purpose: Single-command local + CI Pagefind index regeneration with timeout safety.
  - _Leverage: blog-core scripts/run-e2e.mjs spawn pattern; Node built-ins (`child_process`, `fs`, `net`, `timers/promises`)_
  - _Requirements: 1.2, 1.3, 12.4, 12.5_
  - _Depends on: 1, 3, 4, 5_
  - _Design refs: "`scripts/run-pagefind-crawl.mjs` (new)"; v4 changelog items 5-7 (no-parent removal, extraSlugs narrowing, tmpdir path)_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CI scripting engineer with wget + Pagefind expertise | Task: Implement the orchestrator per the design's pinned shell-out shape. Mark in-progress; log-implementation when done. | Restrictions: NO `--no-parent` flag. Urls-extra file writes to `os.tmpdir()`, NOT the repo root. `extraSlugs` filter MUST exclude `draft: true` AND `excludeFromSearch: true`. Master timeout MUST wrap the whole pipeline via `Promise.race`. Port literal `3013` carries the cross-file comment. | _Leverage: run-e2e.mjs pattern | _Requirements: 1.2, 1.3, 12.4, 12.5 | Success: `pnpm build:search` against the local Build-2 output produces a populated `public/pagefind/` directory; killing the script mid-run produces a clean shutdown of `next start`; setting `PAGEFIND_TIMEOUT_MS=5000` against a hung server causes a non-zero exit within ~5s. Then mark complete after logging._

- [ ] 10. Implement `scripts/verify-pagefind-artifact.mjs` — recursive-checksum artifact preservation check
  - File: scripts/verify-pagefind-artifact.mjs
  - Per design §"`scripts/verify-pagefind-artifact.mjs`" (Req 0.2 v4 directory-recursive):
    - Reads `public/pagefind/` and `.vercel/output/static/pagefind/`.
    - Computes `(cd $DIR && find . -type f | sort | xargs sha256sum) | sha256sum` for each.
    - Asserts equality; on mismatch, prints a per-file `diff` of the two file lists and exits non-zero.
  - Shebang, sync fs, `process.exit(non-zero)` on failure.
  - Purpose: Catch partial-copy regressions where `vercel build`'s public-copy step fails for a subset of pagefind files.
  - _Leverage: scripts/run-e2e.mjs convention; Node built-in `child_process`_
  - _Requirements: 0.2_
  - _Depends on: 9_
  - _Design refs: "`scripts/verify-pagefind-artifact.mjs` (new — Req 0.2 v4 directory-recursive)"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CI scripting engineer | Task: Implement the script per the design's exact checksum-shell-out shape. Mark in-progress; log-implementation when done. | Restrictions: Use the exact `find | sort | xargs sha256sum` shape — do NOT substitute `tar` or a different hashing strategy. On mismatch, print the file-list diff (not just the hash mismatch). | _Leverage: scripts dir | _Requirements: 0.2 | Success: Manual run against two identical local directories exits 0; planted divergence (remove one file from `.vercel/output/static/pagefind/`) fails with the diff. Then mark complete after logging._

- [ ] 11. Implement `scripts/verify-pagefind-no-drafts.mjs` — draft-leak + non-empty-index smoke check
  - File: scripts/verify-pagefind-no-drafts.mjs
  - Per design §"`scripts/verify-pagefind-no-drafts.mjs`":
    - Read `public/pagefind/pagefind-entry.json` (or whichever manifest Pagefind 1.x emits — pin during implementation).
    - For each `content/posts/*.mdx` with `frontmatter.draft === true`, compute the expected slug via `derivePostSlug(filePath, frontmatter)` (parsed via `gray-matter`).
    - Assert NO draft slug appears in the manifest. On violation, print a clear diagnostic naming the leaking slug(s).
    - **Non-empty index assertion** (v3 — Req 1.12): assert the manifest contains AT LEAST `getVisiblePublishedPosts().length + 1` entries (the +1 covers `fixture-search`). On violation, print a count diagnostic with the expected slug list.
  - Shebang, sync fs, `process.exit(non-zero)` on failure.
  - Purpose: Catch (a) accidental draft leak into the production search index, AND (b) the silent-empty-index failure where wget ran but Pagefind indexed nothing.
  - _Leverage: scripts/run-e2e.mjs convention; gray-matter (Task 1); src/lib/build/derive-post-slug.mjs (Task 4)_
  - _Requirements: 1.3, 1.12_
  - _Depends on: 4, 9_
  - _Design refs: "`scripts/verify-pagefind-no-drafts.mjs` (new — v3 also asserts non-empty)"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CI scripting engineer | Task: Implement the script per the design. Mark in-progress; log-implementation when done. | Restrictions: Use `derivePostSlug` from the shared module (NOT a reimplementation). Both assertions (no-drafts AND non-empty) MUST run and report independently. | _Leverage: gray-matter; derivePostSlug | _Requirements: 1.3, 1.12 | Success: Against a local Build-2 manifest with `fixture-search` present, exit 0. Plant a draft slug into the manifest by hand → fail with named diagnostic. Replace manifest with `{}` → fail the non-empty assertion. Then mark complete after logging._

- [ ] 12. Implement `scripts/verify-deploy.mjs` — Req 0.3 v4 verification gate
  - File: scripts/verify-deploy.mjs
  - Per design §"`scripts/verify-deploy.mjs` (new — Req 0.3 v4 verification gate)":
    - Usage: `node scripts/verify-deploy.mjs https://my-deploy.vercel.app`.
    - Checks: (a) `${deployUrl}/` returns 200; (b) `${deployUrl}/pagefind/pagefind-entry.json` returns 200 with valid JSON; (c) `${deployUrl}/blog/fixture-search` returns 200.
    - On any failure, exit non-zero with a clear diagnostic naming the failing URL + status.
  - The MATTHEWFIELD-SEARCH-SMOKE phrase check via the search UI is a manual step (per design — operator opens dialog and types).
  - Purpose: Operator-side verification gate before flipping the Vercel dashboard auto-deploy toggle off (Req 0.3 v4 Step 3).
  - _Leverage: scripts dir; built-in fetch_
  - _Requirements: 0.3_
  - _Depends on: 1_
  - _Design refs: "`scripts/verify-deploy.mjs` (new — Req 0.3 v4 verification gate)"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CI scripting engineer | Task: Implement the verifier per the design's pinned three-check shape. Mark in-progress; log-implementation when done. | Restrictions: Three checks run in parallel via `Promise.all`. Diagnostic names the URL AND status code on failure. | _Leverage: built-in fetch | _Requirements: 0.3 | Success: Against a working deploy URL, exit 0. Against a deploy missing `/pagefind/pagefind-entry.json`, fail with named diagnostic. Then mark complete after logging._

- [ ] 13. Implement `scripts/check-vercel-auto-deploy.mjs` — migration grace-period gate
  - File: scripts/check-vercel-auto-deploy.mjs
  - Per design §"`scripts/check-vercel-auto-deploy.mjs` behavior":
    - Reads env vars `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `MIGRATION_DEADLINE`.
    - Calls `GET https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID` with Bearer token.
    - Inspects the auto-deploy toggle (Design pins exact JSON field at implementation time against the current Vercel API v9 response shape).
    - Behavior:
      - If `MIGRATION_DEADLINE` is unset → exit non-zero with the "deadline not set" diagnostic.
      - If `Date.now() <= Date.parse(MIGRATION_DEADLINE)` AND auto-deploys still enabled → print `::warning::` annotation, exit 0.
      - If `Date.now() > Date.parse(MIGRATION_DEADLINE)` AND auto-deploys enabled → exit non-zero with the "grace period expired" diagnostic.
  - Purpose: Mechanical defense against dual-deploy race-reintroduction after the migration window.
  - _Leverage: built-in fetch_
  - _Requirements: 0.3_
  - _Depends on: 1_
  - _Design refs: "`scripts/check-vercel-auto-deploy.mjs` behavior"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CI scripting engineer with Vercel API familiarity | Task: Implement the script per the design's pinned three-state behavior. Mark in-progress; log-implementation when done. | Restrictions: Pin the exact JSON field name at implementation time by inspecting an actual v9 project response — do NOT guess. Diagnostics MUST name the missing/expired variable and the remediation. | _Leverage: built-in fetch; VERCEL_TOKEN | _Requirements: 0.3 | Success: With MIGRATION_DEADLINE unset → exit 1; with deadline in the future + auto-deploys enabled → exit 0 with warning; with deadline expired + auto-deploys enabled → exit 1. Then mark complete after logging._

- [ ] 14. Implement `scripts/warn-no-pagefind.mjs` — kill-switch warning + persistent issue
  - File: scripts/warn-no-pagefind.mjs
  - Per design §"`scripts/warn-no-pagefind.mjs` (new — Req 1.4 v4 + Req 12.1 v4 warning)":
    - Reads env vars `EVENT_NAME`, `PR_NUMBER`, `REF`, `DEPLOY_URL`, `GH_TOKEN`.
    - Emits the `::warning::` annotation with the documented copy from Req 12.1 v4 ("Deploy completed WITHOUT Pagefind index — site search will show 'unavailable' state. PAGEFIND_ENABLED variable is currently 'false'. To restore search, set PAGEFIND_ENABLED=true (or unset) in repo Settings → Variables.").
    - If `EVENT_NAME === "pull_request"`: posts the same message as a PR comment via `gh pr comment $PR_NUMBER --body ...`.
    - If `REF === "refs/heads/main"`: ensures an open issue titled `[blog-enhanced] Pagefind currently disabled in production` exists (creates if absent, updates body if present) via `gh issue list --label pagefind-disabled --state open` + `gh issue create/edit`.
  - Companion: a `scripts/clear-pagefind-disabled-issue.mjs` that closes any open `pagefind-disabled` labeled issue on a future `PAGEFIND_ENABLED != 'false'` deploy. Wired into the `"Pagefind crawl (Build 2)"` step's post-success block in the CI workflow (Task 19).
  - Purpose: Mandatory loud surfacing for the `PAGEFIND_ENABLED=false` deploy state (closes r3 Top Risk #1 silent-persistent failure).
  - _Leverage: `gh` CLI; built-in fetch_
  - _Requirements: 1.4_
  - _Depends on: 1_
  - _Design refs: "`scripts/warn-no-pagefind.mjs`"; Req 12.1 v4 `"Warn: deploying without Pagefind"` step_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CI scripting engineer with `gh` CLI familiarity | Task: Implement the warning script and the companion clear-issue script. Mark in-progress; log-implementation when done. | Restrictions: Use a dedicated label `pagefind-disabled` (NOT title-substring search). The warning copy MUST match the Req 12.1 v4 verbatim string. | _Leverage: gh CLI | _Requirements: 1.4 | Success: Simulated run with `EVENT_NAME=pull_request PR_NUMBER=123` calls the right `gh pr comment` command (verify via dry-run flag); simulated run with `REF=refs/heads/main` opens the issue (real or stubbed `gh`). Then mark complete after logging._

- [ ] 15. Implement `src/lib/build/rehype-copy-button.ts` — copy-button injection plugin
  - File: src/lib/build/rehype-copy-button.ts
  - Per design §"`rehypeCopyButton` plugin (`src/lib/build/rehype-copy-button.ts`)":
    - Factory `rehypeCopyButton()` returning a HAST visitor that walks `<pre>` elements.
    - For each `<pre>` with a `<code>` child: extract source via `hast-util-to-text(codeChild, { whitespace: "pre" })` (NOT after `rehype-pretty-code` runs — so the visitor sees plain text).
    - Encode source as base64 UTF-8: `Buffer.from(source, "utf-8").toString("base64")`.
    - Wrap the `<pre>` in `<div class="code-block-wrapper" data-code-block="">` and append a `<button type="button" data-copy-button data-copy-source="${b64}" data-pagefind-ignore="all" aria-label="Copy code to clipboard" />` child.
    - **No `data-code-language` attribute on the wrapper** (per v3 — `rehype-pretty-code`'s `data-language` on `<code>` is the SOLE language source).
    - Visitor is STATELESS — no closure variables, no module-level state.
  - Purpose: Build-time injection of the copy-button DOM marker for both `<MDXContent />`-rendered body AND RSS bodyHtml (where the button is a harmless no-op).
  - _Leverage: `unist-util-visit` (existing blog-core dep); `hast-util-to-text` (Task 1)_
  - _Requirements: 9.2, 9.3, 11.1, 11.3_
  - _Depends on: 1_
  - _Design refs: "`rehypeCopyButton` plugin"; v2 plugin-order reordering pin_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: unified/rehype engineer | Task: Implement the plugin per the design's pinned implementation outline. Mark in-progress; log-implementation when done. | Restrictions: Plugin MUST be stateless — no closure variables across visits. NO `data-code-language` attribute on the wrapper (v3 fix). Inline `<code>` (not inside `<pre>`) MUST be left untouched. | _Leverage: unist-util-visit; hast-util-to-text | _Requirements: 9.2, 9.3, 11.1, 11.3 | Success: A fixture `<pre><code>console.log("hi")</code></pre>` produces the wrapper + button with the correct base64 source. Inline `<code>foo</code>` in a paragraph is untouched. Then mark complete after logging._

- [ ] 15.1. Implement `src/lib/build/rehype-copy-button.test.ts` — plugin unit suite (incl. non-ASCII + RSS-strip)
  - File: src/lib/build/rehype-copy-button.test.ts
  - Vitest cases per design §"Unit Testing - rehype-copy-button.test.ts":
    - (a) Non-ASCII source (emoji `console.log("✨")`, accented identifiers `const año = 1`, CJK strings) round-trips correctly through `Buffer → atob → TextDecoder`.
    - (b) Tab-indented source preserved.
    - (c) Trailing newlines preserved.
    - (d) The wrapper does NOT carry a `data-code-language` attribute.
    - (e) Inline `<code>` (not inside `<pre>`) is untouched (no wrapper).
    - (f) Plugin is stateless: invoking the factory twice and walking the same HAST produces identical output.
  - Purpose: Plugin contract enforcement at unit-test time.
  - _Leverage: vitest; rehype/HAST utilities_
  - _Requirements: 9.2, 9.3, 11.3_
  - _Depends on: 15_
  - _Design refs: "`rehype-copy-button.test.ts` (NEW)" + v3 additional cases_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA/Vitest engineer with HAST experience | Task: Implement the six test cases. Mark in-progress; log-implementation when done. | Restrictions: Each case is a separate `test()`. Non-ASCII case decodes via the same TextDecoder pattern the client uses — NOT plain atob (which would corrupt UTF-8). | _Leverage: vitest | _Requirements: 9.2, 9.3, 11.3 | Success: All six cases pass; removing the UTF-8 decoder fails case (a); adding `data-code-language` to the wrapper fails case (d). Then mark complete after logging._

- [ ] 16. Wire `rehypeCopyButton` into `sharedRehypePlugins` (BEFORE `rehype-pretty-code`)
  - File: velite.config.ts
  - Per design §"Updated plugin order (v2)":
    ```
    sharedRehypePlugins = [
      rehypeSlug,
      rehypeCopyButton(),                          // v2 — BEFORE pretty-code
      [rehypePrettyCode, prettyCodeOptions],
      rehypeAbsolutizeUrls({ baseUrl: siteConfig.url }),
    ];
    ```
  - Critical: `rehypeCopyButton` MUST be BEFORE `rehypePrettyCode` so it reads plain `<code>` text (Shiki-highlighted spans would break text extraction).
  - Purpose: Register the new plugin in the single shared array — both `mdx.rehypePlugins` and `markdown.rehypePlugins` inherit it.
  - _Leverage: existing sharedRehypePlugins in velite.config.ts_
  - _Requirements: 9.3, 11.1, 11.3_
  - _Depends on: 6.5, 15_
  - _Design refs: "Plugin order pinning — single source of truth"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Velite/build-pipeline engineer | Task: Add `rehypeCopyButton()` to `sharedRehypePlugins` BEFORE `rehypePrettyCode`. Mark in-progress; log-implementation when done. | Restrictions: Order is non-negotiable — placing it AFTER pretty-code is a contract violation. Both `mdx.rehypePlugins` and `markdown.rehypePlugins` MUST reference the SAME shared array. | _Leverage: existing velite.config.ts shared array | _Requirements: 9.3, 11.1, 11.3 | Success: `pnpm velite build` produces bodyHtml with `<div class="code-block-wrapper">` + button DOM marker around each `<pre>`. Then mark complete after logging._

- [ ] 17. Implement `src/components/blog/clipboard.ts` — UTF-8-safe decode + status announce helper
  - File: src/components/blog/clipboard.ts
  - Per design §"Source extraction (Req 9.4) — v2 UTF-8-safe decode" + §"`<CopyButton />` v4 fix (REVERSES v3 React-context provider; direct DOM update)":
    - `decodeUtf8B64(b64: string): string` — `new TextDecoder("utf-8").decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)))`.
    - `announceCopyStatus(status: string): void` — updates `document.getElementById("copy-status").textContent`; clears after 2s timeout. Module-local `clearTimer` ref.
    - `copyToClipboard(text: string): Promise<boolean>` — tries `navigator.clipboard.writeText`; on failure or absence, falls back to `document.execCommand('copy')` via a temporary off-screen `<textarea>`. Returns `true` on success.
  - Purpose: Shared client-side primitives consumed by `<CopyButton />` AND `<CopyURLButton />`.
  - _Leverage: browser TextDecoder API; document.execCommand fallback_
  - _Requirements: 9.4, 9.5, 9.6_
  - _Depends on: (none — independent client helper)_
  - _Design refs: "Source extraction (Req 9.4) — v2 UTF-8-safe decode"; "A11y (Req 9.6) — v4 fix"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Browser-API engineer | Task: Implement the three helpers per the design. Mark in-progress; log-implementation when done. | Restrictions: `decodeUtf8B64` MUST use the TextDecoder pattern — NOT plain atob (corrupts UTF-8). `announceCopyStatus` MUST be a direct DOM update to `#copy-status` (no React context). | _Leverage: browser APIs | _Requirements: 9.4, 9.5, 9.6 | Success: A Vitest test on `decodeUtf8B64` round-trips emoji, accented identifiers, CJK without corruption. `copyToClipboard` falls back cleanly when `navigator.clipboard` is undefined. Then mark complete after logging._

- [ ] 17.1. Implement `src/components/blog/clipboard.test.ts` — UTF-8 round-trip suite
  - File: src/components/blog/clipboard.test.ts
  - Vitest cases per design §"A Vitest unit test on `decodeUtf8B64`":
    - (a) ASCII.
    - (b) UTF-8 with emoji (`"console.log(\"✨\")"`).
    - (c) Accented identifiers (`const año = 1`).
    - (d) CJK strings.
    - (e) Tab-indented source.
    - (f) Trailing newlines preserved.
  - _Leverage: vitest_
  - _Requirements: 9.4_
  - _Depends on: 17_
  - _Design refs: "A Vitest unit test on `decodeUtf8B64`"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA engineer | Task: Implement the six round-trip cases. Mark in-progress; log-implementation when done. | Restrictions: Each case asserts the decoded string equals the original. | _Leverage: vitest | _Requirements: 9.4 | Success: All six cases pass; replacing `TextDecoder` with `atob` alone fails the emoji + accented + CJK cases. Then mark complete after logging._

- [ ] 17.5. Carve `src/styles/globals.css` into per-component CSS slice files via `@import` + visual-neutrality assertion (v3; v4 — split out preview-route infrastructure to Task 17.6)
  - Files: src/styles/globals.css (edit — replace any inline blog-component tokens with `@import` directives); src/styles/blog/ (new directory with empty slice files: `series-badge.css`, `series-navigator.css`, `related-posts.css`, `share-bar.css`, `reading-progress.css`, `table-of-contents.css`, `copy-button.css`, `footnotes.css`, `pagefind-ui.css`)
  - Move ANY existing blog-component CSS in globals.css into the corresponding slice file (likely empty starting state — blog-core's globals.css has theme tokens at the top level, not per-component slices). The slice files start empty (each 18.x sub-task fills its own).
  - Add nine `@import "./blog/<slice>.css";` lines to globals.css. Order documented (alphabetical) so re-orderings are obvious in diff.
  - **v4 — Visual-neutrality assertion (per r3 attack 1 fourth bullet)**: before-and-after Playwright screenshot diff of `/blog` and `/blog/<one published fixture>` in both light + dark themes. If any pixel-level diff exceeds a small noise threshold (Playwright `toMatchSnapshot` default tolerance), this task FAILS — the carve was not visually neutral and blog-core inline component CSS was lost in the migration. Record the screenshots in the implementation log.
  - Purpose: Decouple the nine 18.x sub-tasks at the CSS file-system level so they can land in parallel without globals.css merge conflicts.
  - _Leverage: existing globals.css; Playwright `toMatchSnapshot`_
  - _Requirements: 10.2 (theme parity verification infrastructure)_
  - _Depends on: 1_
  - _Design refs: r2 review attack 2 (parallel-edit conflict)_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CSS infrastructure engineer | Task: Carve globals.css into per-component slice imports; assert visual neutrality via Playwright screenshots. Mark in-progress; log-implementation when done. | Restrictions: Slice files start empty; the @import order is alphabetical. NO new components or routes — that is Task 17.6. | _Leverage: globals.css; Playwright | _Requirements: 10.2 | Success: `pnpm dev` renders globals.css unchanged in light + dark (visual diff under tolerance); the nine slice files exist and are empty. Then mark complete after logging._

- [ ] 17.6. Preview-route infrastructure + per-component registry FILES (v4 — carved out of v3's monolithic 17.5; per-component registry closes the registry.ts merge-conflict factory r3 attack 1 surfaced)
  - Files: src/app/(site)/blog/__component-preview/[name]/page.tsx (new — dynamic route); src/app/(site)/blog/__component-preview/registry/index.ts (new — aggregator that re-exports per-component entries); `src/app/(site)/blog/__component-preview/registry/<slice>.ts` (NINE new per-component entry files, one per 18.x sub-task — each STARTS with a placeholder server component that 18.x swaps to the real component)
  - **Preview-route infrastructure**: implement `src/app/(site)/blog/__component-preview/[name]/page.tsx` as a Next.js dynamic route. Behavior: gated behind `BLOG_INCLUDE_DRAFTS=1` (NEVER deployed to production — exits 404 otherwise via the existing draft-leak guard pattern from blog-core Req 7.12). The route reads the registry from `./registry/index.ts` (a barrel that re-exports each `./registry/<slice>.ts` module's default export) and renders the matching component. **Each 18.x sub-task owns its own `registry/<slice>.ts` file** — the registry/index.ts aggregator only needs ONE serialized edit (during 17.6) and never again. This is the same per-file decoupling discipline 17.5 applies to globals.css.
  - **Static-HTML stub support (v4 — for 18.7 and 18.9 non-component smokes)**: a registry entry MAY export a default value of type `{ kind: "html", html: string }` (instead of `{ kind: "component", component: ServerComponent }`). The preview-route renders the raw HTML inside an `<article>` wrapper when `kind === "html"`. This lets 18.7 host a static `<pre data-copy-source="...">` element and 18.9 host a static `.pagefind-ui` stub element without inventing throwaway components.
  - Initial placeholder content: each of the nine `<slice>.ts` files exports `{ kind: "component", component: () => <p>Component not yet implemented</p> }` until 18.x swaps it.
  - Purpose: Provide the shared preview-route infrastructure that 18.1–18.8's per-component Playwright smokes depend on, with per-file ownership that eliminates the v3 single-`registry.ts` merge-conflict factory.
  - _Leverage: existing draft-leak guard pattern from blog-core Req 7.12_
  - _Requirements: 10.2 (theme parity verification infrastructure)_
  - _Depends on: 17.5_
  - _Design refs: r3 attack 1 (registry.ts as new merge-conflict factory); blog-core draft-leak guard pattern_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Next.js infrastructure engineer | Task: Create the preview-route + per-component registry files (nine of them + an aggregator). Mark in-progress; log-implementation when done. | Restrictions: NINE registry files (one per slice), NOT a single registry.ts. Preview route is BLOG_INCLUDE_DRAFTS=1-gated. Static-HTML stub kind supported. | _Leverage: draft-leak guard | _Requirements: 10.2 | Success: Navigating to `/blog/__component-preview/series-badge` under `BLOG_INCLUDE_DRAFTS=1` shows the placeholder stub; without the env var returns 404; navigating to `/blog/__component-preview/copy-button` with the registry entry temporarily set to `{ kind: "html", html: "<pre data-copy-source='test'>x</pre>" }` renders the raw HTML inside an `<article>`. Then mark complete after logging._

### Task 18 split into 18.1–18.9 (v2; v3 — wired into Task 17.5's slice + preview-route infrastructure)

The original Task 18 bundled eight components + a sweeping globals.css edit + 21 ACs under one checkbox with "verified visually" as the only success gate. v2 splits this into nine independently-revertable sub-tasks. Each presentational sub-task creates its component file and its CSS slice (in the per-component slice file from Task 17.5), and each carries a **per-component Playwright smoke** assertion in BOTH light and dark themes via `page.emulateMedia({ colorScheme })` — replacing the v1 "verified visually" gate. Theme parity is mechanically verified, not eyeballed.

**v3 — Preview route + Playwright test location pin**: 17.5 provides the preview-route infrastructure at `src/app/(site)/blog/__component-preview/[name]/page.tsx`. Each 18.x sub-task swaps its registry entry from placeholder to its real component. Per-component Playwright tests live at `e2e/tests/component-preview/<slice>.test.ts` (one file per 18.x sub-task). Task 35 extends the Playwright project glob to include `e2e/tests/component-preview/**/*.test.ts` (so `pnpm test:e2e` in ci.yml's existing Playwright step picks them up — no new CI step required).

**Each 18.x sub-task's `Files:` line lists the per-component slice file from Task 17.5** (e.g. `src/styles/blog/series-badge.css`), NOT `src/styles/globals.css`. This eliminates the v2 parallel-edit conflict.

- [ ] 18.1. `<SeriesBadge />` (server component) + its CSS slice
  - Files: src/components/blog/series-badge.tsx; src/styles/blog/series-badge.css (slice from Task 17.5); src/app/(site)/blog/__component-preview/registry/series-badge.ts (registry entry from Task 17.6 — swap placeholder for real component); e2e/tests/component-preview/series-badge.test.ts (per-component Playwright smoke — picked up by Task 35's glob)
  - Renders `{series} · Part {order} of {total}` or `{series}` only when `order`/`total` are absent. CSS slice: badge styling tokens (light + dark).
  - Per-component Playwright smoke: mount in the preview route; assert text contents in both `colorScheme: "light"` and `colorScheme: "dark"`; computed `color` differs between themes (basic theme-parity proof).
  - _Leverage: existing blog-core component conventions_
  - _Requirements: 2.1, 2.5_
  - _Depends on: 8, 17.5, 17.6_
  - _Design refs: "`<SeriesBadge />`" Components section_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React engineer | Task: Implement `<SeriesBadge />` and its CSS slice; add the per-component Playwright smoke in both themes. Mark in-progress; log-implementation when done. | Restrictions: Server component — no `"use client"`. Visual style MUST differ from `<TagChip />` (Req 2.1). | _Leverage: blog-core conventions | _Requirements: 2.1, 2.5 | Success: Playwright assertions pass in light + dark; computed-style color differs. Then mark complete after logging._

- [ ] 18.2. `<SeriesNavigator />` (server component) + its CSS slice
  - Files: src/components/blog/series-navigator.tsx; src/styles/blog/series-navigator.css (slice from Task 17.5); src/app/(site)/blog/__component-preview/registry/series-navigator.ts (registry entry from Task 17.6); e2e/tests/component-preview/series-navigator.test.ts (Playwright smoke)
  - `<nav aria-label="Series navigation">` with `<ol>` sorted by `seriesOrder`; current post `aria-current="page"`; renders only when `posts.length >= 2`.
  - Per-component Playwright smoke: mount with 3 sample series posts (current = middle); assert `aria-current="page"` on middle item; assert other two items are `<a>` links; theme-parity check.
  - _Leverage: existing blog-core component conventions_
  - _Requirements: 2.5_
  - _Depends on: 8, 17.5, 17.6_
  - _Design refs: "`<SeriesNavigator />`" Components section_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React engineer | Task: Implement `<SeriesNavigator />` and its CSS slice; add the per-component Playwright smoke. Mark in-progress; log-implementation when done. | Restrictions: Server component. MUST render null/nothing when `posts.length < 2`. | _Leverage: blog-core conventions | _Requirements: 2.5 | Success: aria-current present on current; links present on others; renders nothing for single-post series. Then mark complete after logging._

- [ ] 18.3. `<RelatedPosts />` (server component) + its CSS slice
  - Files: src/components/blog/related-posts.tsx; src/styles/blog/related-posts.css (slice from Task 17.5); src/app/(site)/blog/__component-preview/registry/related-posts.ts (registry entry from Task 17.6); e2e/tests/component-preview/related-posts.test.ts (Playwright smoke)
  - `<aside aria-labelledby="related-heading" data-pagefind-ignore="all">`; renders nothing when `posts.length === 0`. Internal `<RelatedCard />` (title + description + date — no tag chips, no series badge per Req 4.7).
  - Per-component Playwright smoke: mount with 3 sample related posts; assert `<aside>` + `data-pagefind-ignore="all"` present; theme-parity check.
  - _Leverage: existing blog-core component conventions_
  - _Requirements: 4.5_
  - _Depends on: 8, 17.5, 17.6_
  - _Design refs: "`<RelatedPosts />`" Components section_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React engineer | Task: Implement `<RelatedPosts />` and its CSS slice; add the per-component Playwright smoke. Mark in-progress; log-implementation when done. | Restrictions: Server component. `<RelatedCard />` MUST NOT render tag chips or series badges (Req 4.7). | _Leverage: blog-core conventions | _Requirements: 4.5 | Success: aside renders with 3 cards; renders nothing when input is empty. Then mark complete after logging._

- [ ] 18.4. `<ShareBar />` + `<CopyURLButton />` (server + client island) + its CSS slice
  - Files: src/components/blog/share-bar.tsx; src/components/blog/copy-url-button.tsx; src/styles/blog/share-bar.css (slice from Task 17.5); src/app/(site)/blog/__component-preview/registry/share-bar.ts (registry entry from Task 17.6); e2e/tests/component-preview/share-bar.test.ts (Playwright smoke)
  - Server-rendered X + LinkedIn + mailto anchors with `target="_blank" rel="noopener nofollow"`, plus the `<CopyURLButton url={url} />` client island. Touch targets `h-11 w-11`. `data-pagefind-ignore="all"` on the section. `<CopyURLButton />` calls `copyToClipboard` + `announceCopyStatus` from `src/components/blog/clipboard.ts`; state machine idle → copying → copied (2s) → idle; failed → "Copy failed" → idle (5s).
  - Per-component Playwright smoke: mount; assert four anchors + button render; assert button bounding box ≥ 44×44 (this same assertion is referenced by Task 40 for Req 6.6 coverage); theme-parity check.
  - _Leverage: existing blog-core components; lucide-react icons; src/components/blog/clipboard.ts (Task 17)_
  - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6_
  - _Depends on: 17, 17.5, 17.6_
  - _Design refs: "`<ShareBar />`" + "`<CopyURLButton />`" Components sections_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React engineer | Task: Implement both components and CSS slice; add the per-component Playwright smoke including the 44×44 bounding-box assertion. Mark in-progress; log-implementation when done. | Restrictions: Anchors use `rel="noopener nofollow"`. CopyURLButton is the only `"use client"` here. Server component (`<ShareBar />`) renders the anchors directly. | _Leverage: blog-core components | _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6 | Success: Four anchors render server-side; button box ≥ 44×44 in both themes. Then mark complete after logging._

- [ ] 18.5. `<ReadingProgress />` (client component) + reading-progress CSS tokens
  - Files: src/components/blog/reading-progress.tsx; src/styles/blog/reading-progress.css (slice — `--reading-progress-fill` light + dark; from Task 17.5); src/app/(site)/blog/__component-preview/registry/reading-progress.ts (registry entry from Task 17.6); e2e/tests/component-preview/reading-progress.test.ts (Playwright smoke)
  - Vanilla-DOM `requestAnimationFrame`-throttled scroll listener; queries `document.querySelector("article")`; computes `progress = clamp((viewportBottom - articleTop) / articleHeight, 0, 1)`; respects `prefers-reduced-motion`; `role="presentation"`.
  - Per-component Playwright smoke: mount on a long-article fixture; scroll halfway; assert width `>0` and `<100%`; assert `role="presentation"`; theme-parity check (the Task 41 reduced-motion test is a separate piece of coverage).
  - _Leverage: existing blog-core components_
  - _Requirements: 5.1, 5.4, 5.5, 5.6, 5.7_
  - _Depends on: 8, 17.5, 17.6_
  - _Design refs: "`<ReadingProgress />`" Components section_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React engineer | Task: Implement `<ReadingProgress />` and CSS tokens; add the per-component Playwright smoke. Mark in-progress; log-implementation when done. | Restrictions: RAF — NOT IntersectionObserver. `role="presentation"` (not "progressbar" — Req 5.7). | _Leverage: blog-core conventions | _Requirements: 5.1, 5.4, 5.5, 5.6, 5.7 | Success: Bar grows on scroll; role correct; theme parity. Then mark complete after logging._

- [ ] 18.6. `<TableOfContents />` (server component) + indentation CSS slice
  - Files: src/components/blog/table-of-contents.tsx; src/styles/blog/table-of-contents.css (TOC indentation slice from Task 17.5); src/app/(site)/blog/__component-preview/registry/table-of-contents.ts (registry entry from Task 17.6); e2e/tests/component-preview/table-of-contents.test.ts (Playwright smoke)
  - `<nav aria-label="On this page" data-pagefind-ignore="all">` with `<ol>`; entries with `depth: 3` get `className="ml-4"`; renders `null` when `entries.length < 2`.
  - Per-component Playwright smoke: mount with 5 sample entries (mixed depth 2 and 3); assert nav renders; assert depth-3 entries are indented; assert renders nothing with 1 entry; theme-parity check.
  - _Leverage: existing blog-core components_
  - _Requirements: 7.1, 7.6, 7.9_
  - _Depends on: 8, 17.5, 17.6_
  - _Design refs: "`<TableOfContents />`" Components section_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React engineer | Task: Implement `<TableOfContents />` and CSS slice; add the per-component Playwright smoke. Mark in-progress; log-implementation when done. | Restrictions: Flat `<ol>` (entries carry `depth` field — Req 7.5 v4). Indentation is CSS-only. Renders null below 2 entries. | _Leverage: blog-core conventions | _Requirements: 7.1, 7.6, 7.9 | Success: Renders with 5 entries; depth-3 indented; renders null with 1. Then mark complete after logging._

- [ ] 18.7. `<CopyButton />` (client hydrator) + code-block-wrapper CSS slice
  - Files: src/components/blog/copy-button.tsx; src/styles/blog/copy-button.css (slice from Task 17.5); src/app/(site)/blog/__component-preview/registry/copy-button.ts (registry entry from Task 17.6 — uses the `{ kind: "html", html: "<pre data-copy-source='...'>x</pre>" }` static-stub shape); e2e/tests/component-preview/copy-button.test.ts (Playwright smoke)
  - **DOM-marker hydrator**: `useEffect` runs `document.querySelectorAll('[data-copy-button]')` and attaches click handlers that decode `data-copy-source` via `decodeUtf8B64` and copy + announce. NOT instantiated via JSX per-block.
  - **Mount site (v2 pin)**: mount ONCE inside `<article>` on the post page only (`src/app/(site)/blog/[slug]/page.tsx`). Do NOT mount in the layout (copy buttons are post-only). The Task 20 page-integration step picks up this mount.
  - **v3 — preview-route smoke** (does NOT depend on the post-page mount): in the preview route, mount a static `<pre data-copy-source="..."><code>...</code></pre>` element + `<CopyButton />` hydrator; click the button; assert clipboard contains the expected decoded source; assert status announcement; theme-parity check. The full-page integration test (real fixture-code post) is verified by Task 33's TOC parity suite + Task 27's Vitest extensions.
  - _Leverage: existing blog-core components; src/components/blog/clipboard.ts (Task 17); preview route (Task 17.5)_
  - _Requirements: 9.1, 9.5_
  - _Depends on: 17, 17.5, 17.6_
  - _Design refs: "`<CopyButton />`" Components section; "DOM-marker hydration pattern"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React engineer | Task: Implement `<CopyButton />` and its CSS slice; pin mount site as inside `<article>` on post page. Mark in-progress; log-implementation when done. | Restrictions: useEffect hydration only — NOT per-MDX-block JSX. Touch target `h-11 w-11`. | _Leverage: clipboard.ts | _Requirements: 9.1, 9.5 | Success: Button hydrates on every pre; click copies decoded source; theme parity. Then mark complete after logging._

- [ ] 18.8. Footnote section styling (CSS-only slice)
  - Files: src/styles/blog/footnotes.css (slice from Task 17.5); src/app/(site)/blog/__component-preview/registry/footnotes.ts (registry entry from Task 17.6 — uses the static-HTML stub shape with a sample footnotes section); e2e/tests/component-preview/footnotes.test.ts (Playwright smoke)
  - Style the GFM-emitted `<section data-footnotes>` block: visible separator, numbered list typography, back-reference link styling, both themes.
  - Per-component Playwright smoke: navigate to `fixture-footnotes`; assert separator visible; assert back-reference links navigate; theme-parity check.
  - _Leverage: existing globals.css; existing remark-gfm footnote output_
  - _Requirements: 9.6, 9.7, 9.8, 9.9_
  - _Depends on: 8, 17.5, 17.6_
  - _Design refs: "Footnote section styling"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CSS engineer | Task: Add the footnote-section CSS slice; add the Playwright smoke. Mark in-progress; log-implementation when done. | Restrictions: CSS-only; no JS. Both themes. | _Leverage: globals.css | _Requirements: 9.6, 9.7, 9.8, 9.9 | Success: Footnote section visible + styled in both themes. Then mark complete after logging._

- [ ] 18.9. Shared theme-parity tokens + `.pagefind-ui` overrides (CSS-only slice)
  - Files: src/styles/blog/pagefind-ui.css (slice from Task 17.5); src/app/(site)/blog/__component-preview/registry/pagefind-ui.ts (registry entry from Task 17.6 — uses the static-HTML stub shape with a `.pagefind-ui` sample element); e2e/tests/component-preview/pagefind-ui.test.ts (Playwright smoke)
  - The shared `.pagefind-ui` token overrides for theme parity (per design Tailwind/CSS overrides section). Decoupled from the eight presentational components so Task 19 (which depends ONLY on this slice) is not blocked by them.
  - **v3 — preview-route smoke** (does NOT forward-reference Task 19): in the preview route, render a static stub element `<div class="pagefind-ui"><div class="pagefind-ui__result-link">Sample result</div></div>` and assert its computed background/text colors match the theme tokens in both light and dark. The real-dialog theme check is exercised by Task 31's blog-search Playwright suite — it's not Task 18.9's concern.
  - _Leverage: src/styles/blog/pagefind-ui.css (Task 17.5); @pagefind/default-ui CSS class names_
  - _Requirements: 1.9, 10.2_
  - _Depends on: 1, 17.5, 17.6_
  - _Design refs: "`.pagefind-ui` Tailwind/CSS overrides"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CSS engineer | Task: Add the `.pagefind-ui` token overrides for theme parity. Mark in-progress; log-implementation when done. | Restrictions: CSS-only. Theme parity verified via Playwright. | _Leverage: globals.css; @pagefind/default-ui defaults | _Requirements: 1.9, 10.2 | Success: Search dialog theme matches site theme in both modes. Then mark complete after logging._

- [ ] 19. Implement `<SiteSearch />` client component + `<noscript>` hide CSS
  - File: src/components/blog/site-search.tsx; src/components/layout/site-header.tsx (extend to mount the trigger)
  - Per design §"`<SiteSearch />` (`src/components/blog/site-search.tsx`) — client":
    - State machine: closed → opening → ready → unavailable (failure modes a/b/d).
    - Trigger: `<button type="button">` (NEVER `<a href="#">`); rightmost in header before theme toggle; icon-only on `<sm`, label + `⌘K` badge on `≥sm`; `min-h-11 min-w-11`.
    - On first dialog open: parallel dynamic imports `import('/pagefind/pagefind.js')` AND `import('@pagefind/default-ui')`; both rejections → `state = unavailable`. Loading state shows `"Loading search…"`.
    - Constructs `new PagefindUI({ element, bundlePath: '/pagefind/', showImages: false, excerptLength: 30, processResult: r => (r.url.startsWith('/blog/') && r.url !== '/blog/') ? r : null })`.
    - Keyboard: `/` opens dialog unless in input/textarea/contenteditable or modifier held or dialog open; `Cmd/Ctrl+K` always opens.
    - Dialog uses Radix `<Dialog>` (focus trap + Escape close + aria-modal). On result click → `setOpen(false)` (via click delegation on `<a href>` inside dialog body).
    - **Failure-mode-graceful empty state** per Req 1.9a v4: any failure renders the "Search is temporarily unavailable" body with `<a href="/blog">blog index</a>` link AND `<div aria-live="polite">Search index could not be loaded.</div>`.
    - **`<noscript>` hide CSS** (per design §"Search trigger pinned policy"): inject a `<style>` block inside `<noscript>` setting `[data-search-trigger]{display:none}`. Trigger button carries `data-search-trigger`.
  - **CSS overrides** for `@pagefind/default-ui` theme parity land in `globals.css` (per Task 18's CSS additions list).
  - Purpose: The search subsystem's client surface.
  - _Leverage: Radix UI (already in deps); lucide-react Search icon; @pagefind/default-ui (Task 1)_
  - _Requirements: 1.9, 1.9a, 1.10, 1.11, 1.13, 1.14, 1.15, 10.7_
  - _Depends on: 1, 18.9_
  - _Design refs: "`<SiteSearch />` (`src/components/blog/site-search.tsx`) — client"; v3 trigger-as-button pin_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React + Radix engineer with Pagefind UI familiarity | Task: Implement the component, mount the trigger in the site header, wire the `<noscript>` hide rule. Mark in-progress; log-implementation when done. | Restrictions: Trigger MUST be `<button type="button">` — NEVER `<a href="#">`. Pagefind imports are LAZY on first dialog open. `/` shortcut MUST be scoped per Req 1.10. Failure modes (a)/(b)/(d) ALL resolve to the same observable unavailable state. | _Leverage: Radix Dialog; @pagefind/default-ui | _Requirements: 1.9, 1.9a, 1.10, 1.11, 1.13, 1.14, 1.15, 10.7 | Success: Local `pnpm build:search && pnpm start` shows the search trigger; clicking opens the dialog; typing `MATTHEWFIELD-SEARCH-SMOKE` returns `fixture-search`; `Escape` closes + restores focus to trigger; `404` on `/pagefind/pagefind.js` (simulated via route handler) renders the unavailable state. Then mark complete after logging._

- [ ] 20. Integrate new components into `src/app/(site)/blog/[slug]/page.tsx`
  - File: src/app/(site)/blog/[slug]/page.tsx
  - Per design §"Integration Points - `src/app/(site)/blog/[slug]/page.tsx`":
    - Mount `<SeriesNavigator />` above the prose body when the post belongs to a series with 2+ visible published members.
    - Mount `<TableOfContents entries={extractToc(post)} />` above the prose body.
    - Mount `<ShareBar title={post.title} description={post.description} slug={post.slug} />` BELOW the prose, ABOVE prev/next nav.
    - Mount `<RelatedPosts posts={getRelatedPosts(post.slug)} />` BELOW prev/next nav.
    - Mount `<ReadingProgress />` at the page level.
    - **`<article>` `data-pagefind-body` attribute** (per v4 pinned JSX): `<article {...(post.excludeFromSearch ? {} : { "data-pagefind-body": "" })}>`.
    - Add hidden `<span class="sr-only" data-pagefind-meta="description">{post.description}</span>` inside `<article>` before `<MDXContent />`.
    - Add `data-pagefind-meta` attributes on `<article>` for tags + categories: `data-pagefind-meta={`tags:${post.tags.join(",")},categories:${post.categories.join(",")}`}`.
    - Add `data-pagefind-ignore="all"` on the tag chip `<ul>`, `<DraftBanner />`, `<PrevNextNav />`, `<ShareBar />` section, `<RelatedPosts />` aside, `<TableOfContents />` nav (these last three already have it from their components — verify).
    - Render the static `<div id="copy-status" role="status" aria-live="polite" aria-atomic="true" className="sr-only" />` AFTER `<article>` (per v4 `<CopyButton />` fix).
    - **`generateMetadata()` extension** (Req v4 hidden-post noindex): when `post.hiddenFromLists === true`, set `Metadata.robots = { index: false, follow: false }`.
  - Purpose: Integrate all new presentational surfaces with their data sources.
  - _Leverage: existing src/app/(site)/blog/[slug]/page.tsx; src/lib/blog.ts extensions (Task 8); the eight new components (Task 18); SiteSearch (Task 19 is layout-level, not page-level)_
  - _Requirements: 1.6, 1.7, 1.8, 2.5, 4.5, 5.3, 6.1, 7.1, 9.6_
  - _Depends on: 8, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 19_
  - _Design refs: "Integration Points - `src/app/(site)/blog/[slug]/page.tsx`"; v4 JSX spread pin for `data-pagefind-body`_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Next.js + React engineer | Task: Wire the new components into the post page per the design's pinned integration shape. Mark in-progress; log-implementation when done. | Restrictions: `data-pagefind-body` MUST use the JSX spread pattern (conditionally present or absent — NEVER `=""` when `excludeFromSearch === true`). Existing prev/next nav + draft banner remain untouched. The `#copy-status` div is server-rendered HTML — NOT a client component. | _Leverage: existing post page; new components | _Requirements: 1.6, 1.7, 1.8, 2.5, 4.5, 5.3, 6.1, 7.1, 9.6 | Success: `/blog/fixture-series-1` shows the series navigator with both members; `/blog/fixture-related-a` shows the related rail with `fixture-related-b`; `/blog/fixture-toc` shows the in-flow TOC; `/blog/fixture-search` renders WITHOUT `data-pagefind-body` if `excludeFromSearch: true` were set (it isn't — fixture-search keeps `data-pagefind-body`). Then mark complete after logging._

- [ ] 21. Flip list-context callers to `getVisiblePublishedPosts()`
  - Files: src/app/(site)/blog/page.tsx, src/app/feed.xml/route.ts, src/app/sitemap.ts
  - **One-line change per file**: replace `getPublishedPosts()` with `getVisiblePublishedPosts()`.
  - Add `<SeriesBadge />` rendering on the blog index page's `<PostCard />` entries when `post.series` is set (per Req 2.1) — this is a small `[slug]`-style integration on the index route.
  - Purpose: Hide `fixture-search` (and any future `hiddenFromLists: true` post) from the public list surfaces while keeping it reachable for Pagefind.
  - _Leverage: src/lib/blog.ts extensions (Task 8); existing list routes_
  - _Requirements: 1.6, 2.1, 7.2, 11.1, 12.1_
  - _Depends on: 8, 18.1, 20_
  - _Design refs: "Integration Points" — `/blog`, `/feed.xml`, `/sitemap.xml` one-line changes_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Next.js engineer | Task: Update the three list-context callers AND mount `<SeriesBadge />` on the blog index. Mark in-progress; log-implementation when done. | Restrictions: ONE-LINE changes per route (plus the SeriesBadge mount on /blog). Do NOT touch `getPostBySlug` or `getPostNeighbors` callers. | _Leverage: src/lib/blog.ts | _Requirements: 1.6, 2.1, 7.2, 11.1, 12.1 | Success: `/blog` does NOT show `fixture-search`; `/feed.xml` does NOT contain `fixture-search`; `/sitemap.xml` does NOT contain `fixture-search`; `/blog/fixture-search` still renders normally for direct-URL visitors. Then mark complete after logging._

- [ ] 22. Extend `next.config.ts` with defensive Velite import + `X-Robots-Tag` header for hidden posts
  - File: next.config.ts
  - Per design §"`next.config.ts` `headers()` callback (v4 — defensive load addressing r3 P0 #1)":
    - Inside the existing `headers()` callback, attempt `await import("./.velite/index.js")` wrapped in try/catch with `let hiddenRoutes = [];` fallback.
    - On success: filter `posts.filter(p => p.hiddenFromLists === true && !p.draft).map(p => `/blog/${p.slug}`)`.
    - Push route-specific header rules emitting `X-Robots-Tag: noindex, nofollow` for each hidden route.
    - **Policy statement comment**: applies to `hiddenFromLists === true` posts ONLY, regardless of `excludeFromSearch` (per v4 §1 fourth bullet).
  - Existing CSP + preview-robots blocks remain untouched.
  - Purpose: Defense-in-depth alongside the `<meta name="robots">` tag — bots parsing only headers still get noindex.
  - _Leverage: existing next.config.ts headers() callback_
  - _Requirements: 7.4, 7.11_
  - _Depends on: 6.1_
  - _Design refs: "`next.config.ts` `headers()` callback (v4 — defensive load)"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Next.js config engineer | Task: Extend `headers()` with the defensive Velite import and the hidden-route `X-Robots-Tag` rules. Mark in-progress; log-implementation when done. | Restrictions: The import MUST be inside a try/catch — missing `.velite/index.js` MUST NOT break `next build`. The policy applies to `hiddenFromLists === true` ONLY (NOT `excludeFromSearch`). Existing CSP block + preview headers untouched. | _Leverage: existing headers() callback | _Requirements: 7.4, 7.11 | Success: `curl -I https://deploy/blog/fixture-search` returns `X-Robots-Tag: noindex, nofollow`; `curl -I https://deploy/blog/fixture-code` does NOT include the header; deleting `.velite/index.js` and re-running `next build` succeeds (the catch fires; site builds without the hidden-route headers). Then mark complete after logging._

### Task 23 split into 23.1–23.3 + ordering reversal vs. Task 25 (v2)

The original Task 23 packed eight new ci.yml steps + a `Verify getPublishedPosts callers` insertion under one checkbox, with Task 25 (verifier extension) depending on Task 23. v2 reverses this: **Task 25 lands FIRST** with the new step literals registered in the verifier; Task 23.1–23.3 then produce a ci.yml that mechanically passes the verifier. Each sub-task's success criterion includes opening a draft PR with the workflow change and pasting the workflow-run URL into the implementation log so the gate behavior is verified in a real CI environment, not just by static review.

- [ ] 23.1. ci.yml — Pagefind crawl + verify-index + manifest-upload steps
  - File: .github/workflows/ci.yml (Build 2 step group, first batch)
  - Insert these THREE new steps after the existing `"Verify production build (Build 2)"` (in this exact order):
    1. `Pagefind crawl (Build 2)` — `if: vars.PAGEFIND_ENABLED != 'false'`; runs `pnpm build:search`.
    2. `Verify Pagefind index (Build 2)` — `if: vars.PAGEFIND_ENABLED != 'false'`; runs `node scripts/verify-pagefind-no-drafts.mjs`.
    3. `Upload Pagefind manifest` — `if: always() && vars.PAGEFIND_ENABLED != 'false'`; uses `actions/upload-artifact@v4`.
  - Step name literals MUST match Task 25's pinned registry verbatim.
  - **Draft-PR verification**: open a draft PR after merging this sub-task; screenshot the workflow run and paste the URL into the implementation log. Demonstrate `vars.PAGEFIND_ENABLED != 'false'` is the default-on behavior.
  - Purpose: Pagefind crawl + verify + manifest-upload block (the indexer-side ci.yml extension).
  - _Leverage: existing ci.yml; scripts from Tasks 9, 11_
  - _Requirements: 1.4, 12.1_
  - _Depends on: 9, 11, 25, 35_ (v3 — removed bogus dep on 26; Task 26 is wired into 23.2's `Verify getPublishedPosts callers` insertion, not 23.1's Pagefind block; v4 — added missing dep on 35 per r3 attack 6 first bullet so the Playwright glob extension is in place before 23.1's draft-PR verification runs `pnpm test:e2e`)
  - _Design refs: "`.github/workflows/ci.yml` Build 2 step sequence (Pinned)" — Pagefind block_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: GitHub Actions engineer | Task: Insert the three Pagefind steps in order; verify `scripts/verify-ci-topology.mjs` passes; open a draft PR and record the run URL. Mark in-progress; log-implementation when done. | Restrictions: Step name literals MUST match Task 25's pinned registry. NEVER set `PAGEFIND_ENABLED` in env — it's a repo VARIABLE. | _Leverage: existing ci.yml | _Requirements: 1.4, 12.1 | Success: Topology verifier exits 0 against the updated ci.yml; draft PR run URL recorded; setting `PAGEFIND_ENABLED=false` in repo Settings skips all three steps. Then mark complete after logging._

- [ ] 23.2. ci.yml — Vercel build + verify-artifact + deploy steps + `Verify getPublishedPosts callers` insertion
  - File: .github/workflows/ci.yml (Build 2 step group, second batch + Typecheck-area insertion)
  - Insert these FOUR new steps after Task 23.1's Pagefind block (in this exact order):
    1. `Check Vercel auto-deploy status` — `if: vars.DEPLOY_VIA_CI == 'true'`; runs `node scripts/check-vercel-auto-deploy.mjs`.
    2. `Vercel build` — `if: vars.DEPLOY_VIA_CI == 'true'`; runs `pnpm exec vercel build`.
    3. `Verify Pagefind artifact in .vercel/output` — `if: vars.PAGEFIND_ENABLED != 'false' && vars.DEPLOY_VIA_CI == 'true'`; runs `node scripts/verify-pagefind-artifact.mjs`.
    4. `Vercel deploy (Build 2)` — `if: vars.DEPLOY_VIA_CI == 'true'`; runs `vercel deploy --prebuilt` with id `vercel_deploy`.
  - **Insert `Verify getPublishedPosts callers` step IMMEDIATELY AFTER `"Typecheck"` and BEFORE `"Unit tests"`** (calls the script from Task 26).
  - **Env wiring**: VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_ORG_ID, MIGRATION_DEADLINE, GH_TOKEN, EVENT_NAME, PR_NUMBER, REF, DEPLOY_URL per the design YAML block.
  - **Draft-PR verification**: extend the Task 23.1 draft PR (or open a fresh one); record the workflow-run URL demonstrating that `DEPLOY_VIA_CI` unset SKIPS the deploy steps and setting `=true` runs them.
  - **v4 — DEPLOY_VIA_CI safety pin at the point of the first flip (per r3 attack 3 fourth bullet)**: this task is the FIRST place where setting `DEPLOY_VIA_CI=true` causes a real `vercel deploy --prebuilt` to fire. The draft-PR verification MUST be performed in a controlled environment — either (a) AFTER the Req 0.3 migration cutover (Vercel auto-deploys disabled per Step 4 in requirements.md), OR (b) against a separate Vercel project (e.g. a `*-staging` project) configured for the spec's draft-PR verification. Do NOT flip `DEPLOY_VIA_CI=true` against the production Vercel project before the migration is complete — that would reintroduce the dual-deploy race that Req 0.3's verification gate exists to prevent.
  - Purpose: Vercel deploy block + the typecheck-area static-check insertion.
  - _Leverage: existing ci.yml; scripts from Tasks 10, 12, 13, 26_
  - _Requirements: 0.2, 0.3, 0.6, 12.1_
  - _Depends on: 10, 12, 13, 23.1, 25, 26_
  - _Design refs: "`.github/workflows/ci.yml` Build 2 step sequence (Pinned)" — Vercel block; `Verify getPublishedPosts callers` insertion_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: GitHub Actions engineer | Task: Insert the four Vercel-block steps after 23.1's block AND insert the `Verify getPublishedPosts callers` step after Typecheck. Verify the topology verifier passes; record the draft-PR run URL. Mark in-progress; log-implementation when done. | Restrictions: Step name literals verbatim. NEVER set `DEPLOY_VIA_CI` in env. | _Leverage: ci.yml | _Requirements: 0.2, 0.3, 0.6, 12.1 | Success: Topology verifier exits 0; draft PR run URL recorded; `DEPLOY_VIA_CI=true` runs deploy steps, unset skips them. Then mark complete after logging._

- [ ] 23.3. ci.yml — `Warn deploying without Pagefind` step + PR-comment escalation + flip Task 25's transitional flag to required
  - File: .github/workflows/ci.yml (Build 2 step group, third batch)
  - Insert this final step after Task 23.2's Vercel deploy step:
    - `Warn deploying without Pagefind` — `if: always() && vars.PAGEFIND_ENABLED == 'false' && vars.DEPLOY_VIA_CI == 'true'`; runs `node scripts/warn-no-pagefind.mjs` (the kill-switch warning + persistent issue script from Task 14, which posts a PR comment when `PR_NUMBER` is set).
  - **v3 — Flip Task 25's transitional flag to required (closes the CI-red-line risk)**: in the existing `Verify CI topology` step's `env:` block, add `BLOG_ENHANCED_CI_LITERALS_REQUIRED: "1"`. From this commit forward, the topology verifier enforces the new step-name literals. Because 23.1 and 23.2 already landed before 23.3 (per the sub-task ordering), the literals ARE present in ci.yml by the time the flag flips. **No CI-red-line interval at any point.**
  - **Draft-PR verification**: temporarily flip `PAGEFIND_ENABLED=false` AND keep `DEPLOY_VIA_CI=true`; assert the warn step fires AND a PR comment is created. Restore `PAGEFIND_ENABLED=true` after the test. Record both run URLs (with and without the flag flipped) in the implementation log.
  - **DEPLOY_VIA_CI safety pin (v3, per r2 attack 3 fourth bullet)**: the draft-PR verification MUST be performed in a controlled environment — either (a) AFTER the Req 0.3 migration cutover (Vercel auto-deploys disabled per Step 4), OR (b) against a separate Vercel project (e.g. a `*-staging` project) configured for the spec's draft-PR verification. Do NOT flip `DEPLOY_VIA_CI=true` against the production Vercel project before the migration is complete — that would reintroduce the dual-deploy race that Req 0.3's verification gate exists to prevent.
  - Purpose: High-visibility CI warning for the silent-persistent-failure mode Req 1.4 v4 closes; flip the topology verifier's transitional flag now that all new literals are present.
  - _Leverage: existing ci.yml; scripts/warn-no-pagefind.mjs (Task 14)_
  - _Requirements: 1.4, 12.2_
  - _Depends on: 14, 23.2, 25_
  - _Design refs: "`.github/workflows/ci.yml` Build 2 step sequence (Pinned)" — Warn step; Req 0.3 v4 migration safety_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: GitHub Actions engineer | Task: Insert the warn step; flip `BLOG_ENHANCED_CI_LITERALS_REQUIRED=1` in the `Verify CI topology` step's env; verify topology verifier passes against the now-fully-extended ci.yml; record both draft-PR runs (warn fires + warn-not-fires) in the implementation log. Mark in-progress; log-implementation when done. | Restrictions: Step uses `if: always() && ...` so it fires even on prior failures. Step name literal verbatim. Draft-PR verification respects the Req 0.3 v4 safety pin (no dual-deploy against prod). | _Leverage: warn-no-pagefind.mjs; Task 25 verifier flag | _Requirements: 1.4, 12.2 | Success: With `PAGEFIND_ENABLED=false` AND `DEPLOY_VIA_CI=true`, the warn step runs AND a PR comment lands; with `PAGEFIND_ENABLED=true`, the warn step skips; topology verifier with `BLOG_ENHANCED_CI_LITERALS_REQUIRED=1` exits 0. Both draft-PR runs recorded. Then mark complete after logging._

- [ ] 24. Create `.github/workflows/verify-vercel-token.yml` — weekly token auth check
  - File: .github/workflows/verify-vercel-token.yml
  - Per design §"`.github/workflows/verify-vercel-token.yml` (new)":
    - `on: schedule: - cron: "0 12 * * 1"` (Monday 12:00 UTC) + `workflow_dispatch`.
    - Steps: checkout → setup pnpm + Node → `pnpm install --frozen-lockfile` → `pnpm exec vercel whoami --token=${{ secrets.VERCEL_TOKEN }}` → on failure, `gh issue create --label "ops,vercel-token-rotation" --title "[blog-enhanced] VERCEL_TOKEN auth check failed — rotation needed"` → on success, close all open issues with the `vercel-token-rotation` label.
  - Purpose: Scheduled mechanical check that the Vercel deploy token still works; surfaces near-expiry via a GitHub issue (no calendar-only monitoring per Req 0.8 v4).
  - _Leverage: existing .github/workflows structure; gh CLI; pnpm action-setup_
  - _Requirements: 0.8_
  - _Depends on: 1_
  - _Design refs: "`.github/workflows/verify-vercel-token.yml` (new)"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: GitHub Actions engineer | Task: Create the scheduled workflow per the design's verbatim YAML. Mark in-progress; log-implementation when done. | Restrictions: Use the label `vercel-token-rotation` (NOT title-substring) for open/close issue tracking. Close ALL matching issues on success (not just `.[0]`). | _Leverage: gh CLI | _Requirements: 0.8 | Success: `gh workflow run "Verify Vercel token"` with a valid token exits 0 + closes any prior failure issue; with an invalid token, fails + opens an issue. Then mark complete after logging._

- [ ] 25. Extend `scripts/verify-ci-topology.mjs` + `scripts/verify-task-dependencies.mjs` for v2/v3 sub-IDs and transitional-flag gating
  - Files: scripts/verify-ci-topology.mjs (extend); scripts/__fixtures__/ci-topology/ (extend with new bad-*.yml fixtures); scripts/verify-task-dependencies.mjs (extend for decimal IDs)
  - **`verify-ci-topology.mjs` extension** — add nine new step literals to the ordered-step list:
    - `Verify getPublishedPosts callers` (after Typecheck, before Unit tests).
    - `Pagefind crawl (Build 2)`.
    - `Verify Pagefind index (Build 2)`.
    - `Upload Pagefind manifest`.
    - `Check Vercel auto-deploy status`.
    - `Vercel build`.
    - `Verify Pagefind artifact in .vercel/output`.
    - `Vercel deploy (Build 2)`.
    - `Warn deploying without Pagefind`.
  - **v3 — Transitional-flag gating (per r2 attack 3, closes CI-red-line interval); v4 meta-gate (per r3 attack 3 fifth bullet)**: the new step-literal assertions are gated behind an environment variable read at script-start: `if (process.env.BLOG_ENHANCED_CI_LITERALS_REQUIRED !== "1") { skip the new literal checks }`. Default-off means the verifier passes against the pre-23.x ci.yml. When Task 23.3 (the LAST sub-task in 23.x) lands, it ALSO sets `BLOG_ENHANCED_CI_LITERALS_REQUIRED=1` in the `Verify CI topology` step's env, flipping the gate to required. **No CI-red-line interval.** **v4 meta-gate**: in addition to reading the env var, the verifier maintains a small persistent marker `scripts/__ci-topology-state.txt` (committed) containing one of: `PHASE_PRE_23` (default) or `PHASE_POST_23.3` (set when Task 23.3 lands). When the marker is `PHASE_POST_23.3`, the verifier REQUIRES `BLOG_ENHANCED_CI_LITERALS_REQUIRED=1` and FAILS with `[verify-ci-topology] meta-gate: env var BLOG_ENHANCED_CI_LITERALS_REQUIRED is required at PHASE_POST_23.3 but is unset or =0` if absent. This prevents a future PR from silently removing the env line without also updating the marker — both must change together, which makes the regression visible in PR review.
  - **v3 — Step-GROUP assertion (per r2 attack 6, Req 0.4 mechanical coverage)**: additionally assert that the new Vercel deploy step lives in the Build 2 step GROUP (not Build 1) — parse the YAML's job structure and verify the deploy step's job-name matches the existing Build 2 job-name literal that blog-core's verifier already asserts.
  - **Missing-step is fatal** (already enforced by blog-core's verifier — preserved) — except when gated off by the transitional flag.
  - **Self-test fixtures**: add at least three new bad-*.yml fixtures covering (a) missing Pagefind crawl step (assert fails ONLY with the flag set), (b) wrong-order Verify Pagefind artifact / Vercel deploy, (c) Vercel deploy step in the wrong step-GROUP (Build 1 instead of Build 2). v2's fixture (c) "missing Warn step when other gates active" — DROPPED (per r2 attack 3 fifth bullet, "Warn step active" is a runtime predicate the verifier can't evaluate statically).
  - **v3/v4 — `verify-task-dependencies.mjs` decimal-ID extension** (per r2 attack 5 last bullet + r3 attack 5 last bullet): extend blog-core's existing dependency-graph verifier to parse decimal task IDs (`6.1`, `6.4`, `6.4.1`, `8.1`, `15.1`, `17.1`, `17.5`, `17.6`, `18.1–18.9`, `23.1–23.3`, `39`, `40`, `41`). **v4 regex handles three-level decimal `6.4.1`**: `/^- \[[ x]\] (\d+(?:\.\d+)+)\. /` — captures one-or-more decimal segments. Add unit test fixtures exercising `6.4`, `6.4.1`, and `17.6`.
  - **v4 — `verify-chosen-path.mjs` (per r3 attack 2 third bullet)**: new script that reads `.spec-workflow/specs/blog-enhanced/Implementation Logs/task-6.4-velite-api-spike.md`'s `CHOSEN_PATH:` first line, then asserts the current working tree's diff aligns with the logged path: if `CHOSEN_PATH: HOOK`, the diff MUST modify `velite.config.ts` AND MUST NOT add `scripts/verify-series-order.mjs` OR modify `package.json` `scripts.build`; if `CHOSEN_PATH: SCRIPT`, the diff MUST add `scripts/verify-series-order.mjs` AND modify `package.json` `scripts.build` AND MUST NOT add the collision-check clause to `velite.config.ts`. The verifier runs as part of Task 6.4.1's own success criterion (mechanically gates the implementer-cognitive-judgment risk r3 attack 2 surfaced). Add a self-test fixture: a fake git diff representing each branch's compliant + non-compliant variants.
  - **v4 — YAML-parsing dependency pin (per r3 attack 3 fifth bullet last paragraph)**: the step-GROUP assertion requires YAML AST parsing (existing `verify-ci-topology.mjs` parses step names via regex). Use the existing `yaml` package already in blog-core devDeps — no new dependency.
  - Purpose: Mechanical defense against accidental ci.yml restructure; close the CI-red-line risk introduced by the v2 verifier-first ordering; extend the dependency-graph verifier to parse the v2/v3 split structure.
  - **Ordering pin**: this task lands BEFORE Tasks 23.1/23.2/23.3. Because the new literal assertions are gated off by default, landing 25 first does NOT red-line the repo. Task 23.3 flips the gate as its final step.
  - _Leverage: existing scripts/verify-ci-topology.mjs; existing scripts/verify-task-dependencies.mjs (blog-core Task 28.5); existing fixtures dir_
  - _Requirements: 0.4, 12.2_
  - _Depends on: 1_
  - _Design refs: "`scripts/verify-ci-topology.mjs`: extended to match the seven new step name literals"; blog-core Task 28.5 verifier_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: CI tooling engineer | Task: Extend both verifiers per the v3 spec — topology verifier gets the transitional flag + step-group check; task-dependencies verifier gets the decimal-ID regex. Add three new bad-*.yml fixtures. Mark in-progress; log-implementation when done. | Restrictions: Topology assertions are FLAG-GATED — default off; topology flag flip lives in Task 23.3's step env. Decimal-ID regex is exactly the captured form. Missing-step is fatal when flag is on. | _Leverage: blog-core verifier patterns | _Requirements: 0.4, 12.2 | Success: Topology verifier exits 0 against the real (pre-23.x) ci.yml WITHOUT the flag set; exits non-zero with the flag set against each bad-*.yml fixture; task-dependencies verifier parses all v2/v3 sub-IDs without error. Then mark complete after logging._

- [ ] 26. Implement `scripts/verify-getPublishedPosts-callers.mjs` + companion Vitest test
  - Files: scripts/verify-getPublishedPosts-callers.mjs, scripts/verify-getPublishedPosts-callers.test.mjs
  - Per design §"`scripts/verify-getPublishedPosts-callers.mjs` (new — v2, addresses r1 fixture-search drift concern)":
    - `ALLOWED_CALLERS = new Set(["src/lib/blog.ts", "src/lib/blog.test.ts", "src/app/(site)/blog/[slug]/page.tsx"])` — NOT including `src/lib/blog-taxonomy.ts` (intentional).
    - `git grep -nE "\\bgetPublishedPosts\\(\\)" -- 'src/**/*.ts' 'src/**/*.tsx'`.
    - Per-line scan: split each line at `//` (per v4 changelog #12 — inline comment strip), skip JSDoc / full-line comment lines, re-assert the function name still appears in the code portion.
    - Skip backtick-quoted documentation strings.
    - On violation: print the diagnostic naming each violating file + the remediation hint.
  - **Vitest test** (`scripts/verify-getPublishedPosts-callers.test.mjs`) — v4 second enforcement layer: runs the verifier via `execSync` against the current codebase; asserts (a) exit code 0; (b) stdout matches "OK"; (c) `src/lib/blog-taxonomy.ts` does NOT appear in the violations list.
  - Wired into CI between `Typecheck` and `Unit tests` (per Task 23).
  - Purpose: Mechanical defense against future contributors using `getPublishedPosts()` in list contexts.
  - _Leverage: git grep; Node built-ins; vitest_
  - _Requirements: 7.5_
  - _Depends on: 8, 8.1_
  - _Design refs: "`scripts/verify-getPublishedPosts-callers.mjs`"; v4 changelog items 12 + 13_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Static-source-audit engineer | Task: Implement the verifier with the v4 inline-comment-strip + the companion Vitest test. Mark in-progress; log-implementation when done. | Restrictions: ALLOWED_CALLERS MUST NOT include `src/lib/blog-taxonomy.ts` — the file-level allow-list loophole closure is the whole point. Inline-comment strip uses `line.split("//")[0]` then re-asserts the regex match. | _Leverage: git grep; vitest | _Requirements: 7.5 | Success: Verifier exits 0 against the current codebase; planting a `getPublishedPosts()` call in `src/lib/blog-taxonomy.ts` fails with a named diagnostic. The companion Vitest test also passes. Then mark complete after logging._

- [ ] 27. Extend `src/lib/blog.test.ts` for visibility filter, series, related, TOC
  - File: src/lib/blog.test.ts
  - Add Vitest cases per design §"Unit Testing":
    - `getVisiblePublishedPosts()` — filters `fixture-search` (because slug in KNOWN_FIXTURE_SLUGS); filters posts with `hiddenFromLists: true`; includes normal published posts.
    - `isHiddenFromLists()` — true for `hiddenFromLists: true`; true for `fixture-*` slug; false for normal posts.
    - `getSeriesGroups()` — groups by series; sorts by `seriesOrder` asc + date desc + slug asc; honors visibility filter (hidden posts not in groups).
    - `getRelatedPosts()` algorithm:
      - tag-heavy beats category-heavy at 3:1 (one shared tag → score 3; three shared categories → score 3; tie broken by date desc).
      - same-series exclusion when series ≥2 published members.
      - same-series inclusion when series of 1 (Req 4.2 v2 dead-zone closure).
      - recency tiebreak.
      - deterministic slug-final-tiebreak.
      - `score=0` filtered.
      - `limit` honored.
      - Returns `[]` for unknown slug.
    - `extractToc()`:
      - Parses h2 + h3 from `bodyHtml`.
      - Ignores h4+ (BLOG_ALLOW_H4 path).
      - Preserves document order.
      - Handles duplicate headings (collision-suffix surfaced from `rehype-slug`).
      - Returns `[]` for posts with fewer than 2 headings.
    - **v3 — Velite-emitted slug parity test (per r2 attack 6 first bullet)**: for each post in `#site/content`, assert `post.slug === derivePostSlug(POST_FILE_PATH, post)` — where `POST_FILE_PATH` is reconstructed by reading `content/posts/${post.slug}.mdx` from disk. Tests that Velite's transform-emitted slug (Task 6.3 via the shared helper) matches the helper's standalone output for the same input. If the two diverge (e.g. a future Velite version changes slug derivation under the hood), this test fails. Closes the silent-divergence vector between Task 6.3 (Velite-side use) and Task 11 (smoke-check-side use) of `derivePostSlug`.
  - Purpose: Unit-test coverage for the four new helpers + Velite-slug parity.
  - _Leverage: existing src/lib/blog.test.ts; existing fixtures (Task 7); src/lib/build/derive-post-slug.mjs (Task 4)_
  - _Requirements: 1.12, 2.5, 2.7, 4.1, 4.2, 4.3, 7.2, 7.3, 7.5_
  - _Depends on: 4, 6.3, 7, 8_
  - _Design refs: "Unit Testing - `blog.test.ts` (extended)"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA/Vitest engineer | Task: Add all listed test cases. Mark in-progress; log-implementation when done. | Restrictions: Use the actual fixtures from Task 7 — do NOT mock posts in-line for the algorithm tests. Series-of-1 dead-zone closure MUST be explicitly tested. | _Leverage: vitest; #site/content fixtures | _Requirements: 2.5, 2.7, 4.1, 4.2, 4.3, 7.2, 7.3, 7.5 | Success: `pnpm test src/lib/blog.test.ts` passes all cases; removing the 3:1 weight (changing to 2:1) fails the tag-vs-category dominance case; removing the series-of-1 inclusion fails the dead-zone case. Then mark complete after logging._

- [ ] 28. Implement `src/lib/visibility-truth-table.test.ts` — four-row matrix
  - File: src/lib/visibility-truth-table.test.ts
  - Per design §"`visibility-truth-table.test.ts` (NEW — v4, addresses r3 §3 third bullet)":
    - Construct four `Post` objects covering the four `(hiddenFromLists, excludeFromSearch)` rows.
    - For each row, assert:
      - `isHiddenFromLists(post)` returns expected.
      - `getVisiblePublishedPosts()` includes/excludes the post correctly.
      - `<article data-pagefind-body>` rendered (or omitted) per the JSX-rendered HTML snapshot — verify via a render test against the page component or a small wrapper.
      - `generateMetadata()` returns `robots: { index: false, follow: false }` when `hiddenFromLists === true`.
      - `extraSlugs` filter (the one in `run-pagefind-crawl.mjs`) includes/excludes the post correctly.
  - **Four rows**:
    - Row 1 `(false, false)` — normal published.
    - Row 2 `(true, false)` — `fixture-search` config (hidden from lists, still searchable).
    - Row 3 `(true, true)` — hidden everywhere.
    - Row 4 `(false, true)` — visible in lists but not searched.
  - Purpose: Truth-table coverage of the four-axis policy across layers.
  - _Leverage: vitest; existing Velite output; src/lib/blog.ts_
  - _Requirements: 7.4, 7.11_
  - _Depends on: 8, 20, 22_
  - _Design refs: "`visibility-truth-table.test.ts` (NEW — v4)"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA engineer with policy-matrix testing experience | Task: Implement the four-row matrix per the design. Mark in-progress; log-implementation when done. | Restrictions: All four rows MUST verify all five assertions. Use the actual rendering paths (page component + Next.js Metadata API) — do NOT just assert helper return values. | _Leverage: vitest; rendering helpers | _Requirements: 7.4, 7.11 | Success: All four rows pass; flipping the JSX spread pattern (e.g. always emitting `data-pagefind-body=""`) fails Rows 3 + 4. Then mark complete after logging._

- [ ] 29. Implement `velite-safe-body-html.test.ts` — `data-copy-source` RSS strip
  - File: velite-safe-body-html.test.ts (place at repo root or `src/__tests__/` per existing test layout — pin during implementation)
  - Per design §"`velite-safe-body-html.test.ts` (NEW — v3)":
    - Test fixture: a post with a non-ASCII code block (e.g. `console.log("✨")`).
    - Run the post through the Velite pipeline (via `pnpm velite build` or in-process invocation).
    - Assert (a) `bodyHtml` does NOT contain the substring `data-copy-source=`; (b) `body` (MDX output) DOES contain `data-copy-source=`; (c) RSS-render produced by `validate-feed.mjs` for this fixture has NO `data-copy-source` in its `<content:encoded>` block.
  - Purpose: Catch silent regression in the `safeBodyHtml` regex strip (e.g. a future contributor changes the encoding and the regex loses fidelity).
  - _Leverage: existing fixtures (Task 7); Velite build_
  - _Requirements: 9.10, 11.1, 11.4_
  - _Depends on: 6.5, 7, 15, 16_
  - _Design refs: "`velite-safe-body-html.test.ts` (NEW — v3, addresses r2 §5 first bullet)"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA engineer with Velite familiarity | Task: Implement the three-assertion test per the design. Mark in-progress; log-implementation when done. | Restrictions: Use a real Velite build (or its programmatic API) — do NOT regex-mock the output. The non-ASCII fixture ensures regex breakage with a Unicode-specific edit would be caught. | _Leverage: Velite; fixtures | _Requirements: 9.10, 11.1, 11.4 | Success: Test passes against the current setup; removing the `safeBodyHtml` strip line fails assertion (a) + (c). Then mark complete after logging._

- [ ] 30. Implement Vitest integration tests for the three new verifier scripts
  - File: scripts/__tests__/verifiers.test.mjs (or follow existing scripts test layout — pin during implementation)
  - Per design §"Integration Testing (Vitest + Playwright)":
    - `verify-pagefind-no-drafts.mjs` — run against a fixture `pagefind-entry.json` containing a draft slug; assert non-zero exit + diagnostic. Then run against an empty manifest; assert non-empty-index failure.
    - `verify-pagefind-artifact.mjs` — set up two temp directories with matching/diverging contents; assert equality detection + diff diagnostic.
    - `verify-deploy.mjs` — mock `fetch` and verify the three required checks (home 200, pagefind-entry 200 + valid JSON, fixture-search 200).
  - Purpose: Catch regressions in the three new verifier scripts.
  - _Leverage: vitest; child_process; tmpdir_
  - _Requirements: 0.2, 0.3, 1.12_
  - _Depends on: 10, 11, 12_
  - _Design refs: "Integration Testing"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA engineer | Task: Implement the three integration suites. Mark in-progress; log-implementation when done. | Restrictions: Use real tmpdir setups — NOT in-memory fs mocks. Each suite tests both pass and fail paths. | _Leverage: vitest; built-in fs/child_process | _Requirements: 0.2, 0.3, 1.12 | Success: All three suites pass; planting a draft slug in the manifest fixture fails the smoke check; planted directory divergence fails the artifact check; mocked 404 on `/pagefind/pagefind-entry.json` fails verify-deploy. Then mark complete after logging._

- [ ] 31. Implement Playwright `blog-search.test.ts` — Build 2 keyboard + mobile suite
  - File: e2e/tests/blog-search.test.ts
  - Per design §"`blog-search.test.ts` (NEW, runs in Build 2)":
    - Cmd/Ctrl+K opens dialog from `/blog`.
    - `/` opens dialog from `/blog`.
    - **`/`-shortcut suppression matrix (v2 — per r1 attack 5, all four Req 1.10 branches)**:
      - `/` does NOT open dialog when focus is in `<input>`.
      - `/` does NOT open dialog when focus is in `<textarea>` (the test page mounts a temporary textarea for this case).
      - `/` does NOT open dialog when focus is in `[contenteditable="true"]` (the test page mounts a temporary contenteditable div for this case).
      - `Cmd+/` (modifier-held) does NOT open dialog (use OS-aware modifier — Meta on Mac, Control on Linux/Win).
    - Typing `MATTHEWFIELD-SEARCH-SMOKE` returns `fixture-search` as a result.
    - ArrowDown moves focus, Enter navigates, Escape closes + restores focus to trigger.
    - Mobile breakpoint (375px) renders icon-only trigger; dialog opens at full width.
  - **Test runs against CI Build 2** (Pagefind index only exists there; `fixture-search` is published).
  - _Leverage: Playwright; @pagefind/default-ui_
  - _Requirements: 1.9, 1.10, 1.14, 10.3_
  - _Depends on: 19, 21, 23_
  - _Design refs: "`blog-search.test.ts` (NEW, runs in Build 2)"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA/Playwright engineer | Task: Implement the six keyboard + mobile cases per the design. Mark in-progress; log-implementation when done. | Restrictions: Tests run in Build 2 ONLY (gate via test.skip if Build 1). Use OS-aware modifier dispatch (Meta on Mac, Control on Linux/Win). | _Leverage: existing Playwright config | _Requirements: 1.9, 1.10, 1.14, 10.3 | Success: All six cases pass in a local `pnpm build:search && pnpm start` + Playwright run. Then mark complete after logging._

- [ ] 32. Implement Playwright `blog-pagefind-failure-matrix.test.ts` — three failure modes
  - File: e2e/tests/blog-pagefind-failure-matrix.test.ts
  - Per design §"`blog-pagefind-failure-matrix.test.ts` (NEW, Build 2)":
    - (a) `route.fulfill({ status: 404 })` on `/pagefind/pagefind.js` → assert dialog renders unavailable state with "Search is temporarily unavailable" + `/blog` link + aria-live message.
    - (b) `route.fulfill({ status: 404 })` on `/pagefind/pagefind-entry.json` → same assertion.
    - (d) `addInitScript` injects a `<meta http-equiv="Content-Security-Policy" content="script-src 'self'">` (or stricter) → same assertion.
  - **Tests run in Build 2**.
  - Purpose: Proves the Req 1.4 v3 rollback is visibly safe across the realistic failure modes.
  - _Leverage: Playwright route handlers + addInitScript_
  - _Requirements: 1.9a_
  - _Depends on: 19, 23_
  - _Design refs: "`blog-pagefind-failure-matrix.test.ts` (NEW, Build 2)"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA/Playwright engineer | Task: Implement the three failure-mode tests. Mark in-progress; log-implementation when done. | Restrictions: Each test resolves to the SAME unavailable-state assertion. NO partial-rendered states. NO uncaught errors. | _Leverage: Playwright | _Requirements: 1.9a | Success: All three cases assert the unavailable state; the dialog NEVER throws an uncaught error in the page's console. Then mark complete after logging._

- [ ] 33. Implement Playwright `blog-toc.test.ts` — two-axis parity (Build 1 + Build 2)
  - File: e2e/tests/blog-toc.test.ts
  - Per design §"`blog-toc.test.ts` (NEW)":
    - Build 1 axis: against `/blog/fixture-toc` (draft, reachable in Build 1):
      - Source rendered DOM heading IDs via `page.locator("article h2[id], article h3[id]").all()`.
      - Source `extractToc(post)` output via in-test Node import of `@/lib/blog`.
      - **v3 — `s.markdown()` heading-ID source** (per r2 attack 6 third bullet): also parse `post.bodyHtml` (the `s.markdown()` output) using `node-html-parser` (already a devDep per blog-core Task 1) and extract its `<h2 id="...">` / `<h3 id="...">` IDs. Assert equality with the rendered-DOM IDs AND with `extractToc(post)`.
      - Assert all THREE sources are equal (same IDs, same order) — closes the `s.mdx()` vs `s.markdown()` parity gap for Req 7.4 v4.
    - Build 2 axis: against `/blog/fixture-search` (published, reachable in Build 2):
      - Same THREE sources, same equality assertion.
    - Each axis: include the duplicate-heading case (`fixture-code`'s two `## Setup` → `setup` / `setup-1` collision-suffix coverage).
  - Purpose: Cross-pipeline parity test — would FAIL if `s.mdx()` and `s.markdown()` diverge in heading-ID emission. RSS feed body integrity follows.
  - _Leverage: Playwright; @/lib/blog; `node-html-parser`; existing Build 1 + Build 2 CI gates_
  - _Requirements: 7.3, 7.4_
  - _Depends on: 7, 8, 23.1, 23.2_
  - _Design refs: "`blog-toc.test.ts` (NEW)"; r3 Section D first bullet_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA/Playwright engineer | Task: Implement both axes per the design. Mark in-progress; log-implementation when done. | Restrictions: Two SEPARATE test contexts — one per axis. Use the actual `extractToc` helper from `@/lib/blog`, NOT a reimplementation. | _Leverage: Playwright; @/lib/blog | _Requirements: 7.3, 7.4 | Success: Both axes assert equality; deliberately dropping `rehype-slug` from one of the two pipelines fails the matching axis. Then mark complete after logging._

- [ ] 34. Implement Playwright `blog-share.test.ts`, `blog-related.test.ts`, `blog-series.test.ts`
  - Files: e2e/tests/blog-share.test.ts, e2e/tests/blog-related.test.ts, e2e/tests/blog-series.test.ts
  - **`blog-share.test.ts`** (Build 1, on `/blog/fixture-code`):
    - Assert presence of X, LinkedIn, mailto anchors with correct `target="_blank"`, `rel="noopener nofollow"`, `aria-label` values.
    - Assert the Copy URL button exists. Click → grant `clipboard-read` permission → assert clipboard content matches the post's absolute URL.
  - **`blog-related.test.ts`** (Build 1, on `/blog/fixture-related-a`):
    - Assert the related rail renders with `fixture-related-b` as the top related card.
  - **`blog-series.test.ts`** (Build 1, on `/blog/fixture-series-1`):
    - Assert the series navigator renders with both members; current marked `aria-current="page"`.
  - _Leverage: Playwright_
  - _Requirements: 2.5, 4.5, 6.1, 6.2, 6.4, 6.5_
  - _Depends on: 7, 18.2, 18.3, 18.4, 20_
  - _Design refs: "`blog-share.test.ts`", "`blog-related.test.ts`", "`blog-series.test.ts`"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA/Playwright engineer | Task: Implement the three Build-1 fixture suites. Mark in-progress; log-implementation when done. | Restrictions: Each test targets the pinned fixture URL. Copy URL test uses Playwright's clipboard permission API. | _Leverage: Playwright | _Requirements: 2.5, 4.5, 6.1, 6.2, 6.4, 6.5 | Success: All three pass under Build 1. Then mark complete after logging._

- [ ] 35. Extend Playwright `blog-no-js.test.ts` + `blog-axe.test.ts` for new surfaces
  - Files: e2e/tests/blog-no-js.test.ts (extend), e2e/tests/blog-axe.test.ts (extend)
  - **`blog-no-js.test.ts`** (extend per design):
    - On `/blog/fixture-toc` and `/blog/fixture-code`, under `javaScriptEnabled: false`:
      - TOC renders; anchor clicks navigate to `#hash`.
      - Footnotes render; `[^1]` reference navigates to footnote def.
      - Share-bar anchors (X, LinkedIn, mailto) present with correct hrefs.
      - Copy URL button present but inert (no clipboard write).
      - Reading progress bar absent OR shown empty.
      - Search trigger button is NOT visible (the `<noscript>` CSS hides it).
  - **`blog-axe.test.ts`** (extend per design):
    - Add passes for `/blog/fixture-toc`, `/blog/fixture-footnotes`, `/blog/fixture-related-a`, `/blog/fixture-series-1`, AND search-dialog-open on `/blog`.
    - Each new pass runs in BOTH light + dark themes.
    - Search-dialog-open: `page.keyboard.press("Meta+K")` (OS-aware) → axe pass with dialog visible.
  - **`blog-shiki-theme.test.ts`** (slight extension per design): assert code-block-wrapper renders in both themes; copy button visible; wrapper has `data-code-block` (NOT `data-code-language` per v3).
  - **v3/v4 — Playwright project glob extension (per r2 attack 2 third bullet + r3 attack 6 second/third bullets)**: extend the `testMatch` field in the existing `playwright.config.ts` (v4 — explicitly pinned, no `(or the project's test-match glob — pin during implementation)` hedge) to include `"e2e/tests/component-preview/**/*.test.ts"` so the per-component Playwright smokes from Tasks 18.1–18.8 are picked up by the existing `pnpm test:e2e` step in ci.yml. The glob extension is REQUIRED — without it, the 18.x success criteria do not actually run in CI. **v4 — BLOG_INCLUDE_DRAFTS=1 env wiring (per r3 attack 1 third bullet)**: also add `BLOG_INCLUDE_DRAFTS: "1"` to the Playwright project's `env:` field (or `webServer.env` if using Playwright's webServer) — without this, the preview routes return 404 under the draft-leak guard and all nine per-component smokes fail. Verify both edits by running `pnpm test:e2e --list` and confirming the nine new test files appear; then run one of them (e.g. `pnpm test:e2e e2e/tests/component-preview/series-badge.test.ts`) against a local dev server and confirm the route resolves (not 404).
  - _Leverage: existing blog-core no-js + axe tests; playwright.config.ts_
  - _Requirements: 6.2, 6.4, 7.8, 8.6, 10.1, 10.2, 10.4, 10.7, 10.8_
  - _Depends on: 7, 17.5, 19, 20, 21_
  - _Design refs: "`blog-no-js.test.ts` (extended)", "`blog-axe.test.ts` (extended)", "`blog-shiki-theme.test.ts` (existing, slightly extended)"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA/Playwright engineer | Task: Extend the three test files per the design. Mark in-progress; log-implementation when done. | Restrictions: Existing blog-core cases remain. New cases follow the two-theme pattern (light + dark per surface). | _Leverage: existing test suites | _Requirements: 6.2, 6.4, 7.8, 8.6, 10.1, 10.2, 10.4, 10.7, 10.8 | Success: All new cases pass under Build 1; dark+light combos verified. Then mark complete after logging._

- [ ] 36. Extend `lighthouserc.js` — `/blog/fixture-toc` URL + `total-byte-weight` assertMatrix
  - File: lighthouserc.js
  - Per design §"Lighthouse":
    - Add `/blog/fixture-toc` to the URL list.
    - **Threshold methodology**: this task runs Lighthouse against blog-core's `main` to record baseline `B[url]` per URL, implements the spec, re-runs Lighthouse to record `M[url]`, then pins per-URL `total-byte-weight` `maxNumericValue` thresholds via `assertMatrix` (per-URL thresholds) using the formula `B[url] + 100_000 + 0.10 * B[url]`. Document the baseline + threshold values in `Implementation Logs/task-36-lighthouse-baseline.md`.
    - **Baseline commit SHA pinned (v2 — per r1 attack 6)**: at measurement time, capture `git rev-parse HEAD` of the blog-core branch used for the baseline run and write it to `LIGHTHOUSE_BASELINE_SHA.txt` at repo root. Commit this file. Task 38 reads it to verify the SHA hasn't drifted (or re-runs the baseline measurement if it has).
    - **Pagefind exclusion**: NO programmatic dialog open in Lighthouse config (no `userFlow`); verify the byte-weight report's resource list does NOT contain `pagefind/*` entries. **v2 caveat (per r1 attack 5)**: this is a ONE-SHOT manual check at implementation time, NOT an automated regression assertion — if a future change moves the Pagefind dialog into an always-rendered surface, Lighthouse will not auto-flag it. The coverage matrix carries this caveat for Req 10.6.
  - Purpose: Enforce the Req 10.6 client-JS budget; pin the baseline SHA so Task 38 can verify validity rather than inheriting a measurement that may have drifted under blog-core's `main`.
  - _Leverage: existing lighthouserc.js_
  - _Requirements: 10.5, 10.6_
  - _Depends on: 7, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 20, 21_
  - _Design refs: "Lighthouse" — threshold methodology + Pagefind UI byte-weight exclusion_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Lighthouse + CI engineer | Task: Extend the config per the design's measurement methodology; capture the blog-core baseline commit SHA into `LIGHTHOUSE_BASELINE_SHA.txt` at repo root and commit it. Mark in-progress; log-implementation when done. | Restrictions: Thresholds are MEASURED, not guessed. Document the measurement transcript + SHA in the implementation log. NO `userFlow` (Pagefind must NOT be in the byte-weight audit). | _Leverage: existing lighthouserc.js | _Requirements: 10.5, 10.6 | Success: lhci run against all six URLs passes the threshold matrix; resource-list inspection confirms Pagefind is absent; `LIGHTHOUSE_BASELINE_SHA.txt` exists and matches the SHA used for measurement. Then mark complete after logging._

- [ ] 37. Documentation: extend `design.md` operator notes + update `README.md`
  - Files: `.spec-workflow/specs/blog-enhanced/design.md` (operator notes already present — verify), README.md
  - **`design.md` operator notes**: design v4 already pins these sections (Vercel deploy migration runbook, Pagefind operator notes, VERCEL_TOKEN rotation, VERCEL_PROJECT_ID/ORG_ID, Repository variables table) — verify they are accurate post-implementation. Update any pinned values that drifted during implementation (e.g. exact `vercel` version chosen, exact Vercel API field name pinned in Task 13).
  - **v2/v3 — GitHub UI repo-variable runbook (per r1 attack 4 second bullet; r2 attack 6 fourth bullet pins location)**: add a section to `design.md` operator notes ONLY (v3 — `README.md` placement REJECTED; design.md is the canonical operator-notes home) titled **"Setting `PAGEFIND_ENABLED` and `DEPLOY_VIA_CI` repo variables"** that walks the operator through: (1) GitHub repo Settings → Secrets and variables → Actions → Variables tab; (2) `New repository variable`; (3) name + value (`PAGEFIND_ENABLED=true` default; `DEPLOY_VIA_CI` left UNSET until the migration cutover per Req 0.3 v4); (4) screenshot or text-diagram of the resulting UI state. This is the operator step that Tasks 23.1–23.3 + Task 14's warn step depend on; previously undocumented in the task list.
  - **`README.md`**: add a one-line mention of the search affordance and the keyboard shortcuts (`Cmd/Ctrl+K`, `/`). Per Req 13.3 — one line, not a full Search section.
  - Purpose: User + operator discoverability of the new features; closes the v1 documentation gap for repo-variable setup.
  - _Leverage: existing design.md operator notes section; existing README.md (if present)_
  - _Requirements: 13.1, 13.2, 13.3_
  - _Depends on: 23.1, 23.2, 23.3, 24_
  - _Design refs: "Operator notes (Req 13)"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical writer | Task: Verify the design.md operator notes are accurate; update any drift; add the README one-line search mention. Mark in-progress; log-implementation when done. | Restrictions: README addition is ONE line. Do NOT create a full Search section. Do not invent operator procedures — only document what the implementation actually does. | _Leverage: design.md; README.md | _Requirements: 13.1, 13.2, 13.3 | Success: README contains the search affordance one-liner; design.md operator notes match implementation reality. Then mark complete after logging._

- [ ] 38. End-to-end smoke — local dual-build + Pagefind crawl + all verifiers + Playwright re-runs
  - File: (no new file — verification step; document outcome in `Implementation Logs/task-38-final-smoke.md`)
  - Run locally:
    1. `BLOG_INCLUDE_DRAFTS=1 pnpm build` (Build 1) → `pnpm test:e2e` → `node scripts/validate-feed.mjs` → all green.
    2. `rm -rf .velite .next public/pagefind` → `pnpm build` (Build 2, no env) → `pnpm build:search` → `node scripts/verify-pagefind-no-drafts.mjs` → `node scripts/verify-production-build.mjs` → all green.
    3. (Optional, if a local Vercel CLI is configured) `pnpm exec vercel build` → `node scripts/verify-pagefind-artifact.mjs` → green.
    4. Run all mechanical verifiers: `scripts/verify-ci-topology.mjs`, `scripts/verify-getPublishedPosts-callers.mjs`, `scripts/verify-requirements-coverage.mjs`, `scripts/verify-task-dependencies.mjs` — all exit 0.
    5. Run Playwright suites against Build 1: `pnpm test:e2e --reporter=json` — paste the relevant JSON `results` fragments into the implementation log (per blog-core's citation convention).
    6. Run Playwright `blog-search.test.ts` + `blog-pagefind-failure-matrix.test.ts` against Build 2 (with `public/pagefind/` populated by step 2).
    7. **Baseline-SHA verification gate (v3 — MECHANICAL ONLY, no escape hatch per r2 attack 5; v4 — corrected SHA source per r3 attack 5)**: read `LIGHTHOUSE_BASELINE_SHA.txt` at repo root; record the SHA it pins (call it `S_baseline`). Compute `S_current = git rev-parse origin/main` (the tip of `origin/main` — the upstream baseline Task 38 is implicitly evaluating against; v3's `git merge-base main HEAD` was WRONG — merge-base is the divergence point, not the upstream tip, so a spec branch that has merged 30 main commits since divergence would pass the gate silently). Assert `S_baseline == S_current`. **If they differ, this task FAILS** and the implementer MUST re-run Task 36's baseline measurement against `S_current`, update `LIGHTHOUSE_BASELINE_SHA.txt`, commit the change, and re-run Task 38 step 7 from the top. (v4 — the v3 "rebase the spec branch onto S_baseline" remediation is REMOVED because it would discard any main commits the spec branch has merged in — destructive remediations are not equivalent alternatives.) **Documentation-only acceptance of drift is REJECTED** — the previous v2 "OR document the drift" escape hatch is removed because it made the baseline gate optional. **Run Lighthouse via `lhci autorun --collect.numberOfRuns=3 --upload.numberOfRuns=3`** — median-of-3 methodology pins the per-URL score so a single-run 89 doesn't fail the gate. All six URLs MUST pass ≥90 across performance/a11y/best-practices/SEO (median across 3 runs) AND pass the per-URL `total-byte-weight` matrix (median).
  - **Implementation log MUST cite** (per blog-core convention): Playwright JSON `results` array fragments (not "tests passed"), the verifier scripts' exit codes + summary outputs, the Lighthouse JSON report summary INCLUDING the per-URL median + raw 3-run array, the baseline-SHA verification outcome, and any deferred manual checks (e.g. the Vercel-side `verify-deploy.mjs` once the spec PR is merged to a deployable branch).
  - Purpose: Final integration gate before merging the spec PR.
  - _Leverage: tasks 1–37_
  - _Requirements: All (integration verification)_
  - _Depends on: 23.1, 23.2, 23.3, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41_ (v3 — added 23.1/23.2/23.3 per r2 attack 5; Build 2 only exists because of Task 23.1's Pagefind crawl)
  - _Design refs: design.md "Testing Strategy"; blog-core Task 28 citation convention_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Senior engineer | Task: Run the seven-step local smoke and document outcomes in `Implementation Logs/task-38-final-smoke.md`. Mark in-progress; log-implementation when done. | Restrictions: Cite Playwright runs via JSON `results` fragments — NOT "tests passed." All four mechanical verifiers MUST exit 0. Lighthouse MUST show ≥90 + total-byte-weight passing per the Task 36 matrix (median of 3 runs). | _Leverage: all preceding tasks | _Requirements: All | Success: Both builds pass; all four verifier scripts exit 0; Playwright JSON fragments cited in the log; Lighthouse passes the threshold matrix (median across 3 runs per URL); baseline-SHA verification gate passes; the implementation log records the full transcript. Then mark complete after logging._

- [ ] 39. Mount `<SeriesBadge />` on taxonomy pages (Req 2.7 coverage — v2)
  - Files: src/app/(site)/blog/tags/[tag]/page.tsx, src/app/(site)/blog/categories/[category]/page.tsx
  - Mount `<SeriesBadge />` on each `<PostCard />` rendered on the tag and category index routes — same component, same prop shape used on the `/blog` index in Task 21.
  - Purpose: Close the Req 2.7 ("series badge on taxonomy pages via same component") coverage gap that the v1 matrix overclaimed.
  - _Leverage: existing tag/category routes; `<SeriesBadge />` (Task 18.1)_
  - _Requirements: 2.7_
  - _Depends on: 18.1, 21_
  - _Design refs: Req 2.7 in requirements.md; "series badge on taxonomy pages via same component"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Next.js engineer | Task: Mount `<SeriesBadge />` on both taxonomy routes the same way Task 21 mounts it on `/blog`. Mark in-progress; log-implementation when done. | Restrictions: Same component; same prop shape; same computed total per series. Pure rendering change. | _Leverage: existing taxonomy routes; Task 21 mount pattern | _Requirements: 2.7 | Success: `/blog/tags/<series-tag>` and `/blog/categories/<series-category>` show series badges on relevant cards. Then mark complete after logging._

- [ ] 40. Playwright bounding-box assertion for share-bar 44×44 touch targets (Req 6.6 coverage — v2)
  - File: e2e/tests/blog-share.test.ts (extend Task 34's suite)
  - Add an explicit bounding-box assertion: for each of the four share-bar buttons (X, LinkedIn, mailto, copy-URL), `expect(box.width).toBeGreaterThanOrEqual(44)` and `expect(box.height).toBeGreaterThanOrEqual(44)`. Tests run against the same `fixture-related-a` (or similar) post that Task 34 already navigates to.
  - Purpose: Close the Req 6.6 coverage gap that v1's matrix claimed Task 35 covered — axe-core does NOT validate touch-target sizes by default; this explicit Playwright assertion does.
  - _Leverage: Playwright; Task 34's share suite_
  - _Requirements: 6.6_
  - _Depends on: 18.4, 34_
  - _Design refs: Req 6.6; "44×44 touch target"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA/Playwright engineer | Task: Extend `blog-share.test.ts` with four bounding-box assertions. Mark in-progress; log-implementation when done. | Restrictions: Assertion uses Playwright's `locator.boundingBox()` and `.toBeGreaterThanOrEqual(44)`. Cover all four share buttons (not just one). | _Leverage: Task 34 suite | _Requirements: 6.6 | Success: All four buttons pass; shrinking any button to `h-10 w-10` causes the assertion to fail (verified by a temporary CSS regression). Then mark complete after logging._

- [ ] 41. Playwright `prefers-reduced-motion: reduce` emulation for reading-progress bar (Req 5.5 coverage — v2)
  - File: e2e/tests/blog-reading-progress.test.ts (new) OR extend blog-axe.test.ts (per implementer's choice — pin in the implementation log)
  - Run a Playwright test with `page.emulateMedia({ reducedMotion: 'reduce' })`; navigate to a long-article fixture (`fixture-toc` or `fixture-code`); scroll halfway; query the reading-progress bar's computed `transition` and `animation` properties; assert both evaluate to `none` or `0s` duration.
  - Also run the same test WITHOUT the emulation; assert the transition/animation is non-zero (so the test catches "always-zero" regressions, not just "honors-reduced-motion").
  - Purpose: Close the Req 5.5 coverage gap that the v1 matrix overclaimed via Task 18 alone (which made the claim but didn't mechanically verify it).
  - _Leverage: Playwright; `<ReadingProgress />` (Task 18.5)_
  - _Requirements: 5.5_
  - _Depends on: 18.5, 20_
  - _Design refs: Req 5.5; "respect `prefers-reduced-motion`"_
  - _Prompt: Implement the task for spec blog-enhanced, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA/Playwright engineer | Task: Implement the two-case test (with + without emulation). Mark in-progress; log-implementation when done. | Restrictions: Use `page.emulateMedia({ reducedMotion: 'reduce' })`. Assert on computed CSS, not on inline styles. | _Leverage: Playwright; ReadingProgress component | _Requirements: 5.5 | Success: With emulation, computed `transition` + `animation` are zero-duration; without emulation, at least one is non-zero. Then mark complete after logging._

---

## Requirements Coverage Matrix

Inverse mapping from `requirements.md` IDs → covering task(s). Closes orphan-requirement detection at review time. Format: `Req X.Y — short tag — covered by: Task N(s)`.

### Req 0 (deployment topology)
- 0.1 — option (a) CI-driven deploy decision — **23, 24**
- 0.2 — `vercel deploy --prebuilt`, Vercel CLI exact-pin, artifact-preservation directory-recursive check — **1, 2, 10, 23, 30**
- 0.3 — `DEPLOY_VIA_CI` feature flag, four-step migration with verification gate, MIGRATION_DEADLINE grace period — **12, 13, 23, 30, 37**
- 0.4 — preview deploy = Build 2 only, Build 1 does not deploy — **23.1, 23.2**
- 0.5 — `vercel.json` unchanged — **23.2** (verify during implementation)
- 0.6 — CI deploy failure fails build loudly — **23.2**
- 0.7 — local development unaffected — **5, 9**
- 0.8 — VERCEL_TOKEN ownership/rotation/monitoring via scheduled workflow — **24, 37**

**Note on Task 0**: Task 0 (precondition spike) does NOT appear in this matrix — it is not a requirement-satisfying task per v2 reclassification.

### Req 1 (Pagefind site search)
- 1.1 — `pagefind` + `@pagefind/default-ui` devDeps — **1**
- 1.2 — crawl pipeline + PROD_LIKE_PORT three-place literal — **5, 9**
- 1.3 — production-mode-only index (Build 2) — **9, 11, 23.1**
- 1.4 — BLOCKING from day 1 + PAGEFIND_ENABLED kill-switch + warn step — **14, 23.1, 23.3, 37**
- 1.5 — promotion mechanism DROPPED (vacuous) — (no task — non-requirement)
- 1.6 — `data-pagefind-body` + `data-pagefind-ignore` boundaries — **18.3, 18.4, 18.6, 20**
- 1.7 — tag/category meta on `<article>` — **20**
- 1.8 — description meta sr-only span — **20**
- 1.9 — `<SiteSearch />` component + lazy WASM + keyboard shortcuts — **18.9, 19**
- 1.9a — failure-mode-graceful empty state + Playwright matrix (a/b/d) — **19, 32**
- 1.10 — `/` shortcut scoping (all four branches: input, textarea, contenteditable, modifier-held) — **19, 31**
- 1.11 — result-click behavior — **19**
- 1.12 — draft-leak smoke check + shared `derivePostSlug` helper + tests + Velite-emit parity — **4, 4.1, 6.3, 11, 27, 30** (v3 — added Task 27's Velite-emit parity test)
- 1.13 — blog-posts-only filter via `processResult` — **19**
- 1.14 — mobile rendering — **19, 31**
- 1.15 — empty-state when no posts — **19**

### Req 2 (series UI)
- 2.1 — series badge on index — **18.1, 21**
- 2.2 — `series` set, `seriesOrder` unset → name only — **18.1**
- 2.3 — seriesOrder collision = build failure — **6.4, 6.4.1** (v3 — split: 6.4 is investigation, 6.4.1 is implementation)
- 2.4 — series-cycle / self-reference defense — **8**
- 2.5 — series navigator on post page — **18.1, 18.2, 20, 27, 34**
- 2.6 — single-member series → no navigator — **18.2**
- 2.7 — taxonomy pages render series badge via same component — **39** (v2 — closes v1 coverage gap)
- 2.8 — `getSeriesGroups()` helper — **8**
- 2.9 — no series-only landing page (out of scope) — (no task)

### Req 3 (series-name normalization)
- 3.1 — human-readable series field; no kebab-case constraint — **8** (schema preserves string-as-string)
- 3.2 — exact byte equality — **8**
- 3.3 — no soft warning for near-dups — (no task — explicit non-requirement)
- 3.4 — forward-compat for `/blog/series/[series]` — **37** (documented in design)

### Req 4 (related posts)
- 4.1 — 3:1 weighted overlap + categories.max(3) — **6.1, 8, 27**
- 4.2 — cross-series exclusion conditional on navigator-renders — **8, 27**
- 4.3 — build-time computation — **8, 20**
- 4.4 — `RelatedPostMeta` type via composition; `getRelatedPosts` — **8**
- 4.5 — rail UI under prev/next — **18.3, 20, 34**
- 4.6 — empty state = no rail; re-eval threshold metric — **18.3, 27**
- 4.7 — no series badge inside related cards — **18.3**

### Req 5 (reading progress bar)
- 5.1 — `<ReadingProgress />` client component — **18.5**
- 5.2 — scroll target = `<article>` — **18.5**
- 5.3 — bar only on post pages — **20**
- 5.4 — RAF-throttled scroll listener — **18.5**
- 5.5 — reduced-motion respect — **18.5, 41** (v2 — Task 41 mechanically verifies via `page.emulateMedia`)
- 5.6 — light + dark contrast — **18.5**
- 5.7 — `role="presentation"` — **18.5**

### Req 6 (share bar)
- 6.1 — `<ShareBar />` server component — **18.4, 20**
- 6.2 — X + LinkedIn + Mailto + Copy URL — **18.4, 34, 35**
- 6.3 — Mastodon/Bluesky out of scope — (no task)
- 6.4 — `rel="noopener nofollow"` + `target="_blank"` — **18.4, 34, 35**
- 6.5 — lucide-react icons + `aria-label` — **18.4**
- 6.6 — 44×44 touch target — **18.4, 40** (v2 — Task 40's bounding-box assertion is the mechanical gate; axe-core does NOT enforce 2.5.5 AAA by default)
- 6.7 — no client-side tracking — (no task — non-requirement)
- 6.8 — CSP unchanged — (no task — non-requirement)

### Req 7 (TOC)
- 7.1 — `<TableOfContents />` server component — **18.6, 20**
- 7.2 — server-side extraction via `extractToc` — **8, 27**
- 7.3 — slug-derivation parity via HAST of bodyHtml — **8, 33**
- 7.4 — Build 1 + Build 2 parity Playwright test + `s.markdown()` heading-ID parity — **7, 33** (v3 — Task 33 extended to compare `s.markdown()` bodyHtml IDs alongside rendered DOM + extractToc)
- 7.5 — empty-TOC + orphan-h3 + flat `TocEntry[]` — **8, 18.6, 27**
- 7.6 — in-flow placement only — **18.6**
- 7.7 — scroll-spy DROPPED — (no task)
- 7.8 — no-JS readability — **18.6, 35**
- 7.9 — TOC `data-pagefind-ignore` — **18.6**
- 7.10 — h4 rejection with `BLOG_ALLOW_H4=1` escape hatch — **6.2**

**Note on Req 0.4 (Build 1 no-deploy)**: v3 — Task 25's step-group assertion (per r2 attack 6 second bullet) mechanically verifies the new Vercel deploy step lives in the Build 2 job/step-group, not Build 1.

### Req 8 (footnotes)
- 8.1 — remark-gfm parses (already wired) — (existing blog-core)
- 8.2 — footnote section styling — **18.8** (globals.css slice)
- 8.3 — in-prose reference styling — **18.8**
- 8.4 — back-reference symbol preserved — (existing remark-gfm behavior)
- 8.5 — Tufte-style sidenotes out of scope — (no task)
- 8.6 — accessibility preserved — **35**
- 8.7 — `fixture-footnotes.mdx` — **7**

### Req 9 (copy-to-clipboard)
- 9.1 — `<CopyButton />` client component — **18.7**
- 9.2 — `rehypeCopyButton` rehype plugin + plugin order — **15, 15.1, 16**
- 9.3 — `sharedRehypePlugins` single source of truth — **16**
- 9.4 — UTF-8-safe source extraction + decode — **15, 17, 17.1**
- 9.5 — `navigator.clipboard.writeText` + fallback — **17, 18.7**
- 9.6 — `aria-live` copy-status announcement (direct DOM, no React context) — **17, 18.7, 20**
- 9.7 — visual state on success/failure — **18.7**
- 9.8 — copy buttons `data-pagefind-ignore` — **15**
- 9.9 — no copy button on inline code — **15, 15.1**
- 9.10 — RSS parity (`data-copy-source` stripped from bodyHtml) — **6.5, 29**

### Req 10 (a11y, theme, performance)
- 10.1 — axe-core extension to five new surfaces — **35**
- 10.2 — two-theme axe pass — **18.9, 35**
- 10.3 — search dialog keyboard nav Playwright — **31**
- 10.4 — touch target verification — **18.4, 35, 40**
- 10.5 — `/blog/fixture-toc` added to Lighthouse — **36**
- 10.6 — `total-byte-weight` assertMatrix + Pagefind exclusion — **36** (**v2 caveat**: Pagefind absence is a ONE-SHOT manual check at Task 36 implementation time, NOT an automated regression assertion — see Task 36 body)
- 10.7 — no-JS degradation matrix — **35**
- 10.8 — reduced-motion on copy-button success — **18.7**
- 10.9 — Pagefind manifest uploaded as CI artifact — **23.1**

### Req 11 (plugin pipeline)
- 11.1 — `sharedRehypePlugins` sole registration site — **16**
- 11.2 — no new remark plugins — (no task — non-requirement)
- 11.3 — stateless plugin instance constraint — **15, 15.1**
- 11.4 — RSS parity assertion extended — **29**
- 11.5 — Velite output type stability (no new computed fields) — **6.1, 8**

### Req 12 (CI topology)
- 12.1 — eight new Build 2 steps + warn step — **14, 23.1, 23.2, 23.3**
- 12.2 — `verify-ci-topology.mjs` extension + step name literals + workflow-side literals — **23.1, 23.2, 23.3, 25** (v3 — added 23.x for the workflow-side literals; 25 covers the verifier-side)
- 12.3 — Build 1 unchanged — **23.1**
- 12.4 — `pnpm build:search` reproducibility + 90s readiness timeout — **9**
- 12.5 — port-conflict guard — **9**

### Req 13 (documentation)
- 13.1 — Vercel deploy migration runbook in design.md — **37**
- 13.2 — Pagefind operator notes + GitHub UI repo-variable runbook (v2) — **37** (v3 — runbook lives in `design.md` ONLY; README placement REJECTED)
- 13.3 — README one-line search mention — **37**

### Coverage audit note

This matrix is best-effort against the IDs present in `requirements.md`. Per the blog-core convention, the mechanical verifier `scripts/verify-requirements-coverage.mjs` SHOULD be extended (Task 25-adjacent extension during implementation) to enumerate the new blog-enhanced AC IDs and fail CI when an ID is not cited above. The verifier was added in blog-core Task 28.5; extending it to read the blog-enhanced requirements file is a one-line file-path addition done during Task 25 or as a small follow-up to Task 38's smoke.

**v2 coverage-gap closures**: Req 2.7 → Task 39; Req 6.6 mechanical → Task 40; Req 5.5 mechanical → Task 41; Req 1.10 all four branches → Task 31 extension.

**v3 coverage-gap closures (per r2 attack 6)**: Req 1.12 Velite-emit parity → Task 27; Req 7.4 v4 `s.markdown()` heading-ID parity → Task 33 extension; Req 0.4 Build-1-no-deploy mechanical → Task 25 step-group assertion; Req 12.2 workflow-side literals → 23.1/23.2/23.3.

---

## Dependency graph (informal)

Topological order (read left-to-right per row; rows may run in parallel where dependencies are independent):

```
0 (spike — precondition gate, not in coverage matrix)
→ 1 (deps; spike re-run + checksum match) → 2 (dependabot) → 3 (.gitignore — independent)
→ 4 (derive-post-slug.mjs) → 4.1 (tests)
→ 5 (port literal placement)
→ 6.1 (Velite schema fields) → 6.2 (h4 + escape hatch) → 6.3 (fixture-slug audit + derivePostSlug call-sites) → 6.4 (Velite-API investigation log) → 6.4.1 (collision check impl per 6.4's CHOSEN_PATH, gated by verify-chosen-path.mjs from Task 25) → 6.5 (safeBodyHtml extension)
→ 7 (fixtures; depends on 6.1, 6.3)
→ 8 (blog.ts extensions) → 8.1 (taxonomy carve-out)
→ 9 (run-pagefind-crawl) → 10 (verify-artifact) → 11 (verify-no-drafts) → 12 (verify-deploy) → 13 (check-auto-deploy) → 14 (warn-no-pagefind)
→ 15 (rehype-copy-button) → 15.1 (tests) → 16 (wire into sharedRehypePlugins)
→ 17 (clipboard.ts) → 17.1 (tests)
→ 17.5 (globals.css → per-component slice carve + visual-neutrality assertion) → 17.6 (preview-route + per-component registry FILES; v4 split for parallelism)
→ 18.1 (SeriesBadge) ∥ 18.2 (SeriesNavigator) ∥ 18.3 (RelatedPosts) ∥ 18.4 (ShareBar+CopyURLButton) ∥ 18.5 (ReadingProgress) ∥ 18.6 (TableOfContents) ∥ 18.7 (CopyButton hydrator) ∥ 18.8 (footnotes CSS slice) ∥ 18.9 (.pagefind-ui overrides slice)
→ 19 (SiteSearch — depends on 18.9 ONLY) → 20 ([slug]/page.tsx integration — depends on 18.1–18.8 + 19) → 21 (list-context flips + SeriesBadge on /blog) → 22 (next.config.ts X-Robots-Tag — depends on 6.1 only)
→ 25 (verify-ci-topology extension WITH transitional flag default-off + verify-task-dependencies decimal-ID extension + step-group assertion — **lands BEFORE 23.x; default-off flag means NO CI red-line**)
→ 23.1 (ci.yml Pagefind block) → 23.2 (ci.yml Vercel block + getPublishedPosts insertion) → 23.3 (ci.yml warn step + flip Task 25's flag to required) → 24 (verify-vercel-token.yml) → 26 (verify-getPublishedPosts-callers)
→ 27 (blog.test.ts extensions) → 28 (visibility-truth-table) → 29 (velite-safe-body-html) → 30 (verifier integration tests)
→ 31 (blog-search.test — extended for all four /-shortcut branches) → 32 (blog-pagefind-failure-matrix) → 33 (blog-toc) → 34 (blog-share + related + series) → 35 (no-js + axe + shiki-theme extensions)
→ 36 (lighthouserc.js + total-byte-weight + LIGHTHOUSE_BASELINE_SHA.txt)
→ 37 (docs + GitHub UI repo-variable runbook)
→ 39 (SeriesBadge on taxonomy pages) ∥ 40 (Playwright touch-target box) ∥ 41 (Playwright reduced-motion)
→ 38 (final smoke — depends on baseline-SHA gate + median-of-3 Lighthouse)
```

**v2/v3 ordering note**: Task 25 (verifier extension) lands BEFORE Tasks 23.1–23.3. **v3 — the new literal assertions are GATED OFF by default** (`BLOG_ENHANCED_CI_LITERALS_REQUIRED=1` is the opt-in env var). Task 23.3 (the LAST 23.x sub-task) sets the env var to `1` in the `Verify CI topology` step. This preserves blog-core's "verifier-first, edit-after" discipline while eliminating the v2 risk of a CI-red-line interval — at no point is the verifier active without the workflow matching.

**v3 sub-task ordering pin for 6.4 → 6.4.1**: 6.4 is a LOG-ONLY task; its deliverable is `.spec-workflow/specs/blog-enhanced/Implementation Logs/task-6.4-velite-api-spike.md` with `CHOSEN_PATH: HOOK` or `CHOSEN_PATH: SCRIPT` as its first line. 6.4.1 reads that line mechanically and branches accordingly. This converts v2's "implementer cognitive judgment" into a recorded, reviewable design decision.

Key cross-cutting dependency edges:
- Task 6 (Velite schema) blocks Tasks 7 (fixtures), 8 (blog.ts uses `hiddenFromLists` + `excludeFromSearch`), 22 (next.config.ts reads `hiddenFromLists`), 29 (RSS parity tests).
- Task 8 (blog.ts) blocks Tasks 8.1 (taxonomy carve), 18 (components consume `getRelatedPosts`/`extractToc`/`getSeriesGroups`), 20 (page integration), 21 (list-flip), 26 (caller verifier), 27 (unit tests).
- Task 9 (crawl orchestrator) blocks Tasks 11 (smoke-check operates on its output), 19 (search-component dev verification uses `pnpm build:search`).
- Task 16 (rehypeCopyButton wired into `sharedRehypePlugins`) blocks Task 29 (RSS parity test for `data-copy-source` strip needs the plugin emitting).
- Task 23 (ci.yml) blocks Tasks 25 (verifier extension matches the new step names), 31 + 32 (Playwright tests need the CI Build 2 with Pagefind populated).
- Task 38 (final smoke) depends on every test + verifier task — it's the integration gate.

The mechanical verifier `scripts/verify-task-dependencies.mjs` (blog-core Task 28.5) parses every `Depends on:` footer above and asserts the graph is acyclic + every referenced task ID exists. Task 38's success criterion includes a passing run of that verifier against this document.
