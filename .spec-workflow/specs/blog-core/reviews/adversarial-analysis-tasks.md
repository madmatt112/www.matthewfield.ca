# Adversarial Analysis — blog-core/tasks (v1)

Reviewer stance: senior delivery lead, looking for what will detonate when a contributor tries to actually execute these tasks in order. Citations are to the line numbers of `tasks.md`.

---

## Attack surface 1 — Task 5's FIXTURE-NOTE comment vs. Task 4's rejection visitor

Task 4 (line 46) commits the rejection visitor to throw on `type: 'html'` nodes during parse of every post body. Task 5 (line 63) then declares "Each file starts with a FIXTURE-NOTE HTML comment per the design's soft reviewer signal," and the prompt insists this "lives outside the rejection-visitor's mdast scope."

- Challenge the claim that HTML comments fall outside mdast. `remark-parse` represents `<!-- … -->` as a `node.type === 'html'` value node — it lives **inside** the tree, not outside it. There is no MDX/remark mode where a top-level HTML comment is invisible to a tree walk.
- Stress-test the ordering: Task 5 must be runnable to a successful `pnpm velite build` (its own Success criterion at line 68 — "rejection visitor does NOT throw on any fixture"). Under the visitor as currently scoped, the first character of each fixture will throw a `mdx-html-rejected` named error before the body is ever indexed.
- Reject the implicit dual-policy escape hatch. The rejection visitor cannot both reject every `html` node *and* whitelist exactly the FIXTURE-NOTE prefix without introducing a string-sniffing carve-out that the design pin in Task 4 does not authorize.
- Demand a coherent fix: either (a) move the fixture signal into frontmatter (e.g., `_fixture: true`), or (b) amend Task 4 to skip comment-shaped html nodes (`value.startsWith('<!--')`), and write *that* carve-out into the rejection-visitor spec rather than into the fixture task.
- Note that the Task 5 prompt's "lives outside the rejection-visitor's mdast scope" assertion is the single load-bearing falsehood that masks the bug — challenge anyone reading this doc who didn't open `mdast-util-from-markdown` to verify.

## Attack surface 2 — Task 13's launch-gate is self-contradictory

Task 13 (lines 154–163) says to parse the feed with `fast-xml-parser` and assert two things: (a) the `<content:encoded>` text contains the literal `<pre><code>` substring, and (b) "the raw XML for that element is CDATA-wrapped, not character-escaped."

- Challenge the claim that a single parsed-tree inspection can detect CDATA framing. `fast-xml-parser`'s default behavior is to unwrap `<![CDATA[ … ]]>` and present the inner text exactly the same as it would for an unescaped/decoded text node. Without configuring `cdataPropName` or similar, the parsed result is identical for CDATA vs. character-escaped output.
- Reject the framing that the test "MUST use a real XML parser, not a substring grep." If you want to gate on CDATA presence, you need a string-level inspection of the raw `rss2()` output. The two requirements demand *two* assertions over two different representations — but the task body conflates them as a single launch gate.
- Stress-test the failure mode: if the implementer takes the prompt at face value and uses only the parsed tree, a regression in `feed@>=4.3` that switches to character-escaped output (the exact failure this gate is meant to catch) will pass green.
- Demand that the task spell out both assertions explicitly: parsed-tree assertion (text equality), AND raw-string assertion (`output.includes('<![CDATA[<pre><code>')` or a CDATA-aware parser configuration that exposes the wrapper).
- Note that "use a real XML parser" is doing rhetorical work that does not match the technical requirement. Strike or qualify it.

## Attack surface 3 — Task 8's deferred consumer-variable name creates a circular dependency

Task 8 (line 96) explicitly says: "Add a consumer rule that wires Shiki's emitted color variables to `--shiki-active` (exact target-variable name confirmed at implementation time by inspecting a built fixture-code page; structure is invariant)." The prompt (line 101) reinforces: "defer if routes don't exist yet, leave a TODO and revisit after task 13."

- Challenge the ordering claim in the doc header ("dependencies flow naturally"). Task 8 sits at position 8 but cannot complete until Task 13 produces a built page — that is a 5-task forward dependency edge masquerading as "leave a TODO."
- Stress-test what "Success" means for Task 8 when its consumer rule is admittedly unwritten. The current Success criterion (line 101) — "Cascade renders correct theme on the rendered code block in both class-explicit and OS-only paths" — is unachievable at position 8.
- Reject the deferral pattern. Tasks 9, 10, 11, 12, 23, 25 all build on Task 8's *complete* cascade; Task 25's `blog-shiki-theme.test.ts` asserts color values that depend on the consumer rule being correct. If Task 8 is left half-written, those downstream tasks have no stable substrate to test against.
- Demand reordering: either (a) move the CSS cascade to after Task 13 (and accept that Tasks 9–12 build without theme verification), or (b) bake the consumer-rule discovery into a pre-flight spike that ships before Task 8 (read `rehype-pretty-code` source to determine the variable names, since "structure is invariant").
- Task 27 (line 304) admits this when it lists "update task 8's deferred consumer-rule variable name if needed" — the closing task retroactively patches Task 8. This is an explicit cycle; document it as such or break it.

## Attack surface 4 — Task 4 is too large to be a single atomic task

Task 4 (lines 41–55) bundles seven sub-features into one checkbox: collection schema with `.strict()`, kebab-slug regex with exact error message, slug derivation, the rejection visitor (5 node types + parse try/catch + named errors), the reading-time visitor (with a *separate* parser stack), `s.markdown()` bodyHtml emit, `s.mdx()` body emit, AND `]]>` substitution (mentioned only in the prompt at line 55, **missing from the body bullets**).

- Challenge the atomicity claim. A failure in the rejection visitor blocks reading-time. A failure in reading-time blocks bodyHtml emit. There is no way to mark partial progress, no way to ship a working Build 1 with one half complete.
- Stress-test the coverage gap: the `]]>` → `]]]]><![CDATA[>` substitution is referenced in the prompt restrictions (line 55) and is load-bearing for Req 11.10, but does not appear in the bulleted body. A contributor reading only the bullets will skip it; a reviewer comparing body to prompt will catch it only if they read both carefully.
- Reject the implicit "one PR for all of this" framing. Split into at minimum: (4a) schema + slug + strict-mode rejection; (4b) rejection visitor + try/catch; (4c) reading-time visitor; (4d) bodyHtml + `]]>` substitution.
- Demand that Req 11.10's substitution be promoted from prompt-only to a body bullet, since the body is what surfaces in dashboards and the implementation log.
- Note that the design refs only point at "Velite `posts` collection" as a single anchor — the design itself does not split this surface, so the tasks doc inherits the same monolith. Push back upstream.

## Attack surface 5 — Helpers at project root vs. Vitest import paths

Task 2 (line 21) places helpers at project root "next to `velite.config.ts` (no `src/lib/` slot — these are build-time helpers)." Task 21 (line 253) then says Vitest unit tests import `countWordsFromMdast` from those helpers.

- Challenge the assumption that the existing Vitest config sees project-root `.mjs` files. No task in this list updates `vitest.config.*`, `tsconfig.json`, or adds a path alias for `velite-helpers/`. Vitest's default include globs typically scope under `src/` and `tests/`; importing `../../velite-helpers/word-count.mjs` from `src/lib/blog.test.ts` works only if module resolution is configured.
- Stress-test ESM/TS interop. The bullet says ".mjs (or .ts)" — those have different resolution behavior under Vitest's transform pipeline. Picking `.mjs` means the test imports an untyped module; picking `.ts` means the build-time velite.config.ts (also TS) must transpile-import a TS sibling, which Velite's own build pipeline may or may not handle without extra setup.
- Reject the "build-time helpers don't belong in `src/lib/`" assertion as a hard rule. Velite *is* part of the build; nothing about co-location forbids `src/lib/build/word-count.ts`. The constraint was invented for aesthetic reasons, not technical ones.
- Demand a concrete decision: `.ts` or `.mjs`, project-root or `src/lib/`, plus an explicit task line for "verify Vitest can resolve the import and run the unit test that consumes it." If the answer is "no change needed," prove it before committing the placement.

## Attack surface 6 — CI topology and the sentinel theatre (Task 19)

Task 19 (lines 219–230) defines a single CI job with two builds separated by `rm -rf .velite .next`, gated on a `.velite/.build1-sentinel` file whose absence is asserted by Task 17.

- Challenge what the sentinel actually catches. Sentinel ABSENT in Build 2 means the cleanup ran. But the cleanup is unconditional (`if: always()`), so the sentinel is *always* absent in Build 2 whether or not the job topology is correct. The check is tautological under the stated workflow shape.
- Stress-test the genuine threat model: env-var leakage between builds (export `BLOG_INCLUDE_DRAFTS=1` at job level rather than step level). A single-job topology does not isolate env vars across builds; the sentinel says nothing about this.
- Reject the framing that the sentinel is a "topology guarantee." It is a guarantee that *one specific mis-edit* (skipping the `rm -rf`) gets caught; it has zero coverage on env-var scoping, on `actions/cache` between steps, on shell-state leakage. Reasonable but oversold.
- Demand that the env-var scoping be pinned: `BLOG_INCLUDE_DRAFTS=1` must be set *only* on Build 1's `pnpm build` step (and any e2e step that needs it), never at job level. Add an explicit task bullet to that effect.
- Stress-test the e2e step's relationship to drafts: Task 19 line 222 has `pnpm test:e2e` between `pnpm build` and `validate-feed.mjs`. How does e2e see the Build-1 output? Via `next start`? Via playwright webServer? Nothing in the task list pins this, and Tasks 23–25's fixture-based assertions only work if drafts are visible to the running e2e server.

---

## Top 5 risks/gaps

1. **HTML-comment trap (Task 4 + Task 5).** Fixtures will fail the rejection visitor on their first character. The task as written cannot pass its own Success criterion. Highest-priority bug, must be resolved before any implementation touches Velite.
2. **CDATA assertion under-specified (Task 13).** Launch gate will fail to detect the exact `feed@>=4.3` regression it's meant to catch. Reviewers will see a green build that proves nothing.
3. **Task 8 ordering cycle.** "Defer the consumer-variable name" is a hand-wave that creates a 5-task forward dependency and leaves Tasks 9–12 testable only retroactively. Either reorder or pre-spike.
4. **Task 4 monolith.** Seven sub-features in one task, plus a load-bearing substitution requirement that only appears in the prompt, not the body. Split it or surface the missing bullet.
5. **Vitest cannot find the helpers (Task 2 + Task 21).** No task updates vitest/tsconfig to make project-root build-time helpers visible to unit tests. Tests will fail at import resolution before they run a single assertion.

## Top 3 conclusions to challenge or reverse

1. **Reverse: "Co-locate helpers at project root, no `src/lib/` slot" (Task 2).** Move to `src/lib/build/` (or add a path alias and explicit Vitest config update task). Reasoning: the constraint is aesthetic, the cost is real import-resolution friction that will surface only at Task 21.
2. **Reverse: "Fixture files start with a FIXTURE-NOTE HTML comment" (Task 5).** Use a frontmatter flag instead (e.g., `_fixture: true` rejected by the strict schema unless added explicitly) or push the comment-skip carve-out into Task 4's rejection visitor as an authorized exception. Reasoning: the current pairing is internally inconsistent.
3. **Challenge: "Two sequential builds in a single CI job with sentinel" (Task 19).** Either split into two jobs (cleaner env-var isolation) and keep the sentinel as a defense-in-depth, or drop the sentinel (it's tautological under the current workflow shape) and document env-var scoping explicitly. Reasoning: the sentinel is solving a problem the topology already solves while leaving a different problem (env scoping) entirely uncovered.

## What's missing — work to do before acting on this document

- **Vitest/tsconfig task.** Add an explicit task (probably 2.5 or 21.0) to update `vitest.config.*` and `tsconfig.json` so project-root helpers and `#site/content` resolve from test files. Today's list assumes this works; it might not.
- **siteConfig audit.** Task 13 assumes `siteConfig` exposes RSS channel-metadata fields (`title`, `link`, `description`, `language`). No task verifies this; if `language` is missing, validate-feed.mjs (Task 18) will fail. Add a pre-flight read of `@/config/site` and, if needed, a task to extend it.
- **Static-asset audit.** Task 5 requires "one image with alt text using a static asset reference that exists." No task enumerates existing `/static/` assets or commits new ones. Either name the asset or add a task to commit a fixture image.
- **HTML-comment policy decision.** Resolve Attack-Surface-1 before Task 4 implementation begins. Either amend Task 4's rejection visitor to skip comment-shaped html nodes (with that carve-out written down), or amend Task 5 to use a frontmatter signal.
- **e2e server boot mechanism.** Document how `pnpm test:e2e` boots the Build-1 server in CI and how `BLOG_INCLUDE_DRAFTS=1` propagates into that process. Tasks 23–25 assume drafts are visible to the e2e server; nothing in Task 19 explicitly pipes the env var through.
- **CSS consumer-variable pre-spike.** Either move Task 8's deferred variable discovery into a pre-flight (read `rehype-pretty-code` source / sample its output offline) or reorder Task 8 after Task 13. Don't ship the current "leave a TODO" framing — TODOs in a tasks doc are unfinished tasks.
- **Task 26 dependency decision.** "fast-xml-parser or node-html-parser (already in fast-xml-parser graph?) — install minimal HTML parser if needed, or grep with cheerio if it's cheaper" is three undecided options. Pick one before the task starts; doing the dependency math at implementation time is exactly the kind of decision the design phase is supposed to absorb.
