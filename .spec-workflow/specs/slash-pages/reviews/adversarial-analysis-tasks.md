# Adversarial Review — slash-pages `tasks.md` (v1)

**Reviewer stance:** principal engineer / release manager, brought in cold to break this plan before a fresh-context implementer executes it. Every claim below was checked against live code, not against the document's own assertions.

**Verdict up front:** This is a genuinely converged, well-decomposed task list. The author's "smallest recent spec, no new build-time machinery" claim survives falsification: I verified every cited file, symbol, line range, and convention, and the load-bearing mechanisms (Velite `pages` not `.strict()`; the `#site/content` eslint rule restricting only `posts`/`contributions`/`resources`, not `pages`; `gray-matter@4.0.3` present; the `fs.readFileSync(process.cwd()…)` raw-doc test idiom under `src/**`; the footer `/slashes` link; the XML `routes` array) all hold. The findings below are real but **none is blocking**; they are precision gaps a careful implementer could trip over, plus one DAG edge worth tightening. I did not manufacture objections to hit a count.

---

## Live-code verification log (what I confirmed)

| Claim in tasks | Verified? | Evidence |
|---|---|---|
| `pages` schema not `.strict()` (Task 1) | ✅ | `velite.config.ts:50-57` — plain `.object().transform()`; only `posts` (`:110`) and `projects` (`:312`) are `.strict()` |
| `posts` has `updated: s.isodate().optional()` to clone (Task 1) | ✅ | `velite.config.ts:100` |
| `formatContentDate` is one TZ-naive `Intl.DateTimeFormat` (Task 2) | ✅ | `src/lib/format-date.ts:1-9`, no `timeZone` |
| existing loose-regex date-only test stays green (Task 2) | ✅ | `format-date.test.ts:18-23` is `/^[A-Z][a-z]+ \d{1,2}, \d{4}$/` — unaffected by UTC |
| `getAboutPage()` evaluated at module load (Tasks 7,8,9) | ✅ | `about/page.tsx:19` `const aboutPage = getAboutPage()` |
| `/about` currently `robots: { index: false }` (Task 7) | ✅ | `about/page.tsx:25` |
| `{ pages }` import is NOT chokepoint-restricted (Tasks 8,9) | ✅ | `eslint.config.mjs` `importNames: ["posts","contributions","resources"]` — `pages` absent |
| XML `routes` lists `/sitemap`, `/slashes` (Task 12) | ✅ | `src/app/sitemap.ts:19-20`; `/about`=15, `/colophon`=17, `/now`=18 |
| footer renders `/slashes` in `<nav aria-label="Footer">` with `hover:text-foreground` (Task 13) | ✅ | `footer.tsx:8-11` |
| `check-authoring-docs.mjs` hardcodes single doc + `checkHeadings(docText)` one-arg (Task 5) | ✅ | script `:32,54,63-81` |
| self-test spawns script against tmp dir with only contributions doc; hardcodes `=== CANONICAL_HEADINGS.length` (Task 5) | ✅ | `check-authoring-docs.test.mjs:33-36,104` |
| `gray-matter` available for frontmatter parse (Task 15) | ✅ | `package.json:55` `"gray-matter": "4.0.3"` (devDependency) |
| raw-file `fs`+`process.cwd()` doc test idiom exists under `src/**` (Tasks 14,15) | ✅ | `src/__tests__/docs-projects-authoring.test.ts:1-3,34-35` |
| vitest `include` is `src/**/*.test.{ts,tsx,mjs}` (Tasks 3,14,15) | ✅ | `vitest.config.ts:15` |
| `blog-axe.test.ts` exports `setupTheme`/`assertTheme` over `THEME_STORAGE_KEY`, `["light","dark"]` (Task 16) | ✅ | `blog-axe.test.ts:4,23,26-49` |
| E2E runs against prod `pnpm start`, `baseURL` from PORT, testMatch `**/*.test.ts` (Task 16) | ✅ | `e2e/playwright.config.ts:13,28-29` |
| `getVisiblePublishedPosts`/`getPublishedProjects` exist, `[]`-safe (Task 10) | ✅ | `blog.ts:102`, `projects.ts:37` |
| seed files + authoring doc absent (red-by-construction premise) | ✅ | `content/pages/` holds only 168-byte `about.mdx`; no `now.mdx`/`colophon.mdx`/`docs/slash-pages-authoring.md` |
| CI runs both gates (Task 5) | ✅ | `ci.yml:49` `pnpm check:authoring-docs`; `:98` `node --test … .test.mjs` |
| placeholder strings to remove (Tasks 6,14) | ✅ | `about.mdx:6` `Placeholder content. Replaced in a downstream spec.` |

Every citation in the document checks out. The author did the homework.

---

## 1. Atomicity and task sizing

**Task 6 bundles three MDX files — acceptable, but per-file attribution is real and the Success gate is weak.** *(minor)*
The three files (`about.mdx` rewrite, new `now.mdx`, new `colophon.mdx`) are independent units, but bundling them is defensible: they are the single "content prerequisites" deliverable that flips the whole spec from red-by-construction to green, and the seed-sentinel test (Task 14) reads all three together anyway. A partial completion *is* detectable per-file: Task 14 fails if any body still has a sentinel, Task 15 fails if `now.mdx` lacks date-only `updated`, and `next build` (via `getNowPage`/`getColophonPage`) fails per missing entry. The weakness is that Task 6's own `Success:` ("`pnpm velite` validates all three entries; about.mdx body no longer contains the placeholder strings; now.mdx carries a date-only `updated`") does **not** itself assert `colophon.mdx` has a non-placeholder body or that the stack items (Next.js/Tailwind/shadcn/Velite/Vercel/GitHub Actions) are present — it leans on Task 14 to catch colophon emptiness. That's fine for the sentinel, but colophon could ship a one-word body and Task 6's gate passes. Not blocking (the requirement is "real seed", which is editorial), but worth noting the Success line under-covers its own colophon deliverable.

**Task 5 smuggles load-bearing detail by reference to the design's "literal diff spec" — borderline for a fresh-context implementer.** *(significant)*
Task 5 is the heaviest task and the one most likely to break a currently-green test. Its body and `_Prompt` repeatedly say "per the design's literal diff spec" and "per the four-item checklist" rather than restating the four concrete edits inline. A fresh-context implementer who reads only `tasks.md` does not have: (1) the exact three pure-core call-site rewrites (`checkHeadings(ALL_PRESENT, CANONICAL_HEADINGS)` etc.), (2) the `writeDocs` helper body that derives each doc's dir via `path.dirname`, (3) the explicit "report-all, no early `process.exit`" control-flow correction, or (4) the precise zero-byte assertion change from `=== CANONICAL_HEADINGS.length` to `=== <subjectDoc>.headings.length`. All four ARE in `design.md` §"CI authoring-doc check", and the `_Prompt` does instruct running spec-workflow-guide first — but the task is *only* self-contained if the implementer actually opens the design. **Partial-completion risk is concrete:** if the implementer parameterizes `main()` but forgets edit (1), the three pure-core tests throw `headings.filter is not a function` (because `headings` becomes `undefined`) — and Task 5's `Success:` ("`node --test … .test.mjs` passes") *would* catch that. So the Success gate is mechanically sound; the risk is implementer thrash, not a silently-passing wrong state. Recommend inlining the four-item checklist verbatim into Task 5's body so it doesn't depend on a cross-document read.

**File lists are accurate.** Task 2 correctly pairs `format-date.ts` + `.test.ts`; Task 3 correctly creates a new `site.test.ts`; Tasks 14/15 name concrete-ish paths (`e.g. src/content/seed-content.test.ts`). The "e.g." hand-wave on Tasks 14/15 paths is fine — vitest `include` is `src/**/*.test.{ts,tsx,mjs}`, so any `src/**` location works; the exact filename is genuinely free choice. No mismatch found.

---

## 2. Dependency ordering and red-by-construction

**The DAG is sound and the sequencing rule prevents an all-green-but-broken intermediate — with one caveat.** *(minor)*
Tracing the topological order: Tasks 1–6 (schema, formatter, config, doc, script, content) land the prerequisites; Task 6 makes every module-load throw and sentinel/`!/T/` test go green; Tasks 7–13 rewire routes/footer; Task 16 is the E2E capstone depending on 7,8,9,10,11,13. There is **no task boundary where the document tells the implementer "done" on a tree where `next build`/`pnpm test`/`pnpm check:authoring-docs` is red**, *provided the implementer respects the stated topological order and does not mark a task complete mid-DAG against an empty `content/pages/`*. The header text and v4 design both stress this. Good.

**Caveat — Task 5 depends on Task 4 only, but its production `AUTHORING_DOCS` also contains the contributions entry, which already exists.** *(not a bug)* Verified `docs/contributions-and-resources-authoring.md` exists (14 KB). So Task 5's `_Depends on: 4` is correct and sufficient — the contributions doc is pre-existing, not a new dependency. The edge is right.

**Task 12 (XML sitemap) genuinely has no dependents/dependencies — confirmed safe.** *(sound)*
The `/sitemap` *page* (Task 10) does not import `src/app/sitemap.ts`, and Task 16's link-resolution asserts `page.request.get(href).ok()` for the **HTML page's** rendered hrefs (Home + navItems + slashPages), which are unrelated to whether `/sitemap`/`/slashes` appear in the *XML* `routes`. Removing the two strings from XML cannot affect any other task's success. The `sitemap.xml` (metadata route) vs `/sitemap` (page route) distinction holds — they don't collide. Task 12's isolation is correct.

**One dependency edge is arguably over-stated, one is arguably missing — both minor.**
- *(minor, over-stated)* Task 8 declares `_Depends on: 1, 2, 6`. Dependency on Task 2 (the UTC formatter fix) is **not** a correctness prerequisite for `/now` to build or render — `/now` would render with the *old* off-by-one date if Task 2 hadn't run; nothing in Task 8 fails without Task 2. The edge encodes "render the *correct* date" intent, which is reasonable, but strictly Task 8's build/render doesn't *depend* on Task 2. Harmless.
- *(minor, missing-ish)* Task 16's `_Depends on: 7,8,9,10,11,13` omits **Task 12**, **Task 3**, and **Task 6**. Task 3/6 are transitively pulled in via 10/11 and 7/8/9, so that's fine. Task 12 is correctly *not* a dependency (E2E doesn't assert XML). No real gap. The edges are honest.

---

## 3. Coverage — tasks ↔ requirements ↔ design

**The Requirements Coverage Matrix is complete and accurate against `requirements.md`** — I walked all 10 requirements and every NFR. No acceptance criterion is silently dropped. Specific checks:

**Verify-existing ACs (1.1, 1.2, 8.1) are "verify" only — not mechanical, but honestly labelled.** *(minor)*
- AC 1.1 (renders MDX) → Tasks 7, 16. Task 7's action is "Verify-existing (no edit needed)"; the *actual* proof is Task 16's E2E (200 + visible h1 + body). So 1.1 has a mechanical gate via 16. ✅
- AC 1.2 (build-time guard preserved) → Task 7 only, as a "verify" no-op checkbox. **There is no mechanical gate that the `getAboutPage()` throw still fires.** If a future careless edit removed the guard, no task/test catches it. This is a pre-existing gap inherited from the codebase (the guard was never unit-tested), and the design explicitly says a missing-entry test is OPTIONAL "as it would require destabilizing the shared `pages` collection." Acceptable given the design's stated trade, but it *is* a "verify is a no-op" instance — flag it as a known soft spot, not a defect introduced here.
- AC 8.1 (`/slashes` footer link preserved) → Task 13, verify-existing; Task 16 asserts footer renders `/about`,`/now`,`/slashes`. Mechanically gated by 16. ✅

**Central UTC fix and its six-consumer blast radius:** Task 2 tasks the fix; the matrix maps 2.2/10.4 → Task 2. The "six consumers" blast radius is design-narrative, not a per-consumer task — correctly so, since the single central edit covers all six and the one UTC assertion proves it "by construction." Not under-tasked.

**`getNowPage()` dual-throw, `!/T/` gate, per-doc zero-byte count, `/sitemap` not-importing-`sitemap.ts`, same-tab colophon `rel`** — all are explicitly pinned in the tasks (8, 15, 5, 10, 6/16 respectively) with matching restrictions in the `_Prompt` blocks. No load-bearing design decision is un-tasked.

**NFRs parked as "M" (manual at launch) are legitimately manual.** *(sound)*
Lighthouse 90+, OG inheritance (7.4), canonical (7.5, "not used"), not-found (10.7), and WCAG (partly 16, partly M) are the cross-spec manual-at-launch conventions consistent with prior specs. WCAG is the only one with a mechanical component (axe is *not* in this E2E suite — Task 16 does render/title/link/console, not an `AxeBuilder` pass like `blog-axe.test.ts`). **That is a coverage choice worth surfacing:** `blog-axe.test.ts` runs axe per page per theme, but Task 16 does NOT add an axe pass for the five slash pages — accessibility is left to manual ("M") plus the console-error check. Given the pages are flat semantic link-lists and a single `<h1>`, manual WCAG is defensible, but if the project's bar is "every new page gets an axe E2E like blog/contact/projects," Task 16 is **quietly thinner than the established pattern.** See *What's missing*.

---

## 4. `Success:` criteria rigor

**Most Success lines are mechanical gates.** Tasks 1,2,3,5,12,14,15 end in a command that passes/fails (`pnpm test`, `pnpm typecheck`, `node --test`, build). Good.

**Soft "renders correctly" Success lines that cannot fail in CI on their own:** *(minor)*
- **Task 7** Success: "/about renders the authored body and reports `index: true`". The *body* render is proven by Task 16; "reports `index: true`" is not asserted by any test (no test reads the `robots` meta). Mechanically, Task 7 alone only proves `pnpm typecheck`/build clean — the index flip is unverified by automation. Pre-existing convention; minor.
- **Task 9** Success: "/colophon renders the authored stack body; a missing colophon.mdx fails the build with a named error". The "renders the stack body" half is human/E2E (Task 16 covers 200+h1, not "stack content present"); the "missing → named error" half is genuinely mechanical only if someone deletes the file (no negative test exists). Soft.
- **Task 11** Success: "/slashes lists all six slash pages with title/description/working link". "working link" is proven by Task 16's `request.get().ok()`; the "all six" is proven by Task 3's invariant test feeding the list. So Task 11's claim is actually backstopped — but by *other* tasks, not by Task 11 itself.

None of these is a defect: the spec's design deliberately concentrates the mechanical proofs in Tasks 2/3/5/14/15/16 and treats the route tasks (7–11) as wiring whose proof lives in the E2E capstone. The honest read: **several route-task `Success:` lines are not self-contained mechanical gates; they are proven transitively by Task 16.** If Task 16 were ever cut or descoped, those tasks would become unverifiable. Acceptable as written, but the coupling should be conscious.

**Test tasks (2,3,14,15,16) — do the assertions catch the regression they target?** *(mostly yes; one trivial-satisfiability note)*
- Task 2: `formatContentDate("2026-05-29T00:00:00.000Z").display === "May 29, 2026"` — catches the off-by-one and is TZ-independent by construction (verified the formatter math). Solid. **Not** satisfiable by a trivial impl (a no-UTC formatter renders "May 28" in the dev's likely America/Toronto TZ — but in a UTC CI runner it would *pass even without the fix*). This is the one real subtlety: **the assertion only fails pre-fix when the runner's TZ is west of UTC.** In a UTC-default CI box, `new Date("2026-05-29T00:00:00.000Z")` formats to "May 29" *with or without* `timeZone: "UTC"`, so the test is **green on both the broken and fixed formatter.** The test documents intent but does not *guard* the regression in a UTC CI environment. *(significant — see Top 5.)*
- Task 3: exact-six-hrefs + non-empty title/description + leading-slash href — catches drift; not trivially satisfiable. ✅
- Task 14: literal-sentinel match on raw `.mdx` (frontmatter stripped) — catches re-shipped placeholder; correctly narrow. ✅
- Task 15: `updated` present AND `!/T/.test(updated)` — catches dateless and time-bearing; `gray-matter` available. ✅
- Task 16: theme helpers, title anchor, `<time>`, link-resolution, console-error filter — all cited primitives exist (`setupTheme`/`assertTheme`/`THEME_STORAGE_KEY` verified in `blog-axe.test.ts`). The colocated-vs-E2E placement is correct (E2E lives in `e2e/tests/`, not `src/**`, so it's outside vitest `include` — matches `playwright.config.ts` testMatch). ✅

---

## 5. Conformance to live code and conventions

**Every file path, symbol, and line range I checked is correct** (see verification log). Notably the often-wrong line citations are right this time: XML `routes` `/sitemap`=19, `/slashes`=20, `/about`=15, `/now`=18 — all confirmed. The footer `className="hover:text-foreground"` is verbatim. `getVisiblePublishedPosts`/`getPublishedProjects` exist and are `[]`-safe.

**Steering conformance is honored:** colocated tests under `src/**` (Tasks 3,14,15); `siteConfig` leaf (Task 3 restriction "import nothing from app/ or components/"); no barrel files; server components / `dynamic = "force-static"` (Tasks 10,11); no client JS. No task instructs a steering violation.

**Frontmatter-parse assumption in Tasks 14/15 is safe.** *(sound)* `gray-matter@4.0.3` is a devDependency, and Task 15 explicitly allows "gray-matter or a `---`-block split." The real `about.mdx` shape is `---\ntitle:…\ndescription:…\n---\n\n<body>` — a trivial split or gray-matter both handle it. Task 14's "strip the leading `---…---`" works on this shape. Verified against the actual file.

**One under-specified file-path in Task 14** *(minor):* "File: src/config or src/lib test (e.g. src/content/seed-content.test.ts)" lists `src/config or src/lib` in the File: line but then exemplifies `src/content/`. Cosmetic inconsistency; vitest picks up any `src/**`, so harmless, but the File: line is self-contradictory.

---

## Deliverables

### Top 5 risks/gaps (severity-ordered)

1. **Task 2 — the UTC unit test does not fail on the broken formatter in a UTC CI runner.** *(significant)*
   `formatContentDate("2026-05-29T00:00:00.000Z").display === "May 29, 2026"` is TZ-independent *by construction* only *after* the fix. Before the fix (no `timeZone: "UTC"`), the result depends on the runner's ambient TZ: in America/Toronto it's "May 28" (test red, good), but in a **UTC-default CI box it's "May 29" (test green even though the bug is unfixed).** So the assertion proves correctness post-fix but does **not reliably guard the regression** — a future revert of the `timeZone` option could pass CI silently if CI runs in UTC. **Fix:** add a second assertion that pins a *non-midnight* boundary that diverges under TZ, OR run the assertion under a forced east-and-west TZ (e.g. wrap with `process.env.TZ`), OR — simplest and matching the design's "by construction" intent — assert a value where UTC vs system-local *must* differ regardless of CI zone (e.g. also assert the date-only `"2026-05-29"` → `"May 29, 2026"`, since `new Date("2026-05-29")` parses as UTC-midnight and a non-UTC formatter in *any* west-of-UTC zone yields May 28). At minimum, document that the regression-guard property assumes a non-UTC test TZ, or pin `TZ` in the test.

2. **Task 16 omits an axe/WCAG E2E pass that every sibling page-type has.** *(significant)*
   `blog-axe.test.ts`, `contact-axe.test.ts`, and `projects-*` all run `AxeBuilder` per page per theme. Task 16 does render/title/`<time>`/link/console but **no axe analysis** for the five new indexable/visible pages — WCAG is left to manual ("M"). The matrix even maps "NFR Accessibility → 16, M". For five brand-new pages (three of them indexable real content), dropping the automated axe gate is **quietly thinner than the project's established accessibility convention.** **Fix:** either add an `AxeBuilder().withTags(AXE_TAGS).analyze()` assertion to Task 16 (reusing the `blog-axe.test.ts` pattern, ~5 lines), or explicitly justify in the task why these pages are axe-exempt. Right now it's silently absent, not consciously waived.

3. **Task 5 depends on a cross-document "literal diff spec" for its hardest edits.** *(significant)*
   The four precise edits (pure-core call-site args, `writeDocs` per-doc helper body, report-all control flow, `=== <subjectDoc>.headings.length` zero-byte assertion) live in `design.md`, not in `tasks.md`. A fresh-context implementer reading only the task will under-specify the self-test rewrite. Its `Success:` (`node --test … passes`) *does* mechanically catch a wrong implementation, so this is thrash-risk not silent-failure-risk — but it violates the "atomic, self-contained task" goal. **Fix:** inline the four-item checklist verbatim into Task 5's body.

4. **Task 6's `Success:` under-covers its own colophon deliverable.** *(minor)*
   The Success line asserts about-placeholder-removed and now-`updated`-present but says nothing about `colophon.mdx` having a real body or the six required stack items. Colophon emptiness is only caught transitively by Task 14's sentinel (which colophon's seed wouldn't contain anyway). **Fix:** add to Task 6 Success: "colophon.mdx body documents the stack (Next.js/Tailwind/shadcn/Velite/Vercel/GitHub Actions) and contains no placeholder sentinel," and have Task 14 read colophon too (it already does).

5. **Several route-task `Success:` lines are not self-contained — they're proven only by Task 16.** *(minor)*
   Tasks 7 (`index: true` reported), 9 (stack body renders), 11 (six pages listed) have soft halves backstopped solely by the E2E capstone or by sibling unit tests. If Task 16 is ever descoped, those become unverifiable. **Fix:** none required if Task 16 stays; just note the coupling so no one cuts the E2E thinking the route tasks are independently gated.

### Top 3 conclusions to challenge or reverse

1. **"This single UTC assertion proves the off-by-one is fixed … by construction" (Tasks 2/15, design Decision #5).** Reverse the strength claim: it proves it *post-fix* but does not *guard against regression in a UTC CI runner*. The "by construction, no TZ harness needed" framing is true for *correctness verification* but false for *regression protection* — those are different jobs. Tighten per Finding 1.

2. **"Verify-existing" treatment of AC 1.2 (the `getAboutPage()` guard) as covered by Task 7.** Challenge: Task 7's coverage of 1.2 is a no-op checkbox with no mechanical gate; the guard's continued existence is unprotected. The design consciously declines a missing-entry test (to avoid destabilizing the shared collection), which is a reasonable trade — but the matrix should mark 1.2 as "verify-only, no automated guard (accepted)" rather than implying Task 7 enforces it.

3. **Task 16 as sufficient accessibility coverage.** Challenge the implicit conclusion that render + console-error cleanliness substitutes for axe. The codebase's own precedent (three existing `*-axe.test.ts` suites) sets a higher bar. Either adopt it or document the exemption (Finding 2).

### What's missing (must add / consider before implementation-ready)

- **A regression-proof TZ assertion in Task 2** (or a pinned `TZ`), so the off-by-one fix is guarded, not merely demonstrated. *(should-add)*
- **An axe pass in Task 16**, or an explicit written exemption for the five pages. *(should-add — convention gap)*
- **Inline the Task 5 self-test checklist** so the task is self-contained without opening `design.md`. *(should-add — atomicity)*
- **Strengthen Task 6's Success** to cover colophon body content and route Task 14 over colophon. *(nice-to-have)*
- **Fix Task 14's self-contradictory File: line** (`src/config or src/lib` vs the `src/content/` example). *(cosmetic)*

No missing *task* and no missing *dependency edge* of consequence — the DAG is complete and the topological order genuinely prevents a red-by-construction "done" state. The gaps are all in `Success:`-gate rigor and one convention (axe) shortfall, not in structure.

---

**Bottom line:** The plan is implementation-ready *modulo* Findings 1–3 (the UTC-CI regression-guard hole, the absent axe pass, and Task 5's cross-document dependency). Findings 4–5 are polish. The author's "smallest, no-new-machinery, converged" claim is substantially true and the live-code grounding is unusually accurate — I found no stale citation, no fabricated symbol, and no ordering bug that lands the tree red-while-"done."
