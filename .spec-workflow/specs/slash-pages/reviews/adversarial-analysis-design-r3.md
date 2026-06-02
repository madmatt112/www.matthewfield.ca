# Adversarial Analysis — slash-pages/design (v3 / r3)

Staff-engineer teardown, round 3. Per the brief: r1 and r2 findings were all accepted; v3's
edits are concentrated in the seven r2 fixes. My job is (a) verify each v3 fix actually lands
against live code, and (b) reach ground the prior rounds did not — then be decisive about
convergence rather than manufacture nits.

**Net up front.** All seven r2 fixes land correctly against live code; I verified each at
`file:line`. The document has **substantively converged** on its self-attacked surfaces
(date guard, Pagefind carve-out, descriptions, zero-byte assertion, colophon selector,
`toHaveTitle` precedent, XML citations, focus-ring source). The architecture remains sound and
over-build-free for a third round. The one **real remaining blocker** is not a defect in the
design's reasoning — it is a **sequencing / authoring-prerequisite gap** the design never names
as a gated work item: the three seed `.mdx` files (`now.mdx`, `colophon.mdx`, plus real
`about.mdx` body) and the new authoring doc **do not exist yet**, and multiple gates the design
itself adds go RED until they are authored. Everything else below is convergence confirmation or
a low/cosmetic note. I am not inventing a fourth structural objection where none exists.

---

## A. Did the v3 fixes land? (verified against live code)

Each r2-unresolved item, checked against the current tree:

1. **`!/T/.test(updated)` date guard (r2 §1) — LANDS.** Design §"Time-of-day guard (v3)"
   (design.md:168) and Testing-Strategy Req 10.3 (design.md:488) both add the one-line
   `!/T/.test(updated)` assertion to the seed test that *already* parses `now.mdx` frontmatter.
   The refine-rejection rationale is re-scoped to a *pages-only, value-preserving* refine and
   the posts-wide strawman is explicitly withdrawn (design.md:168). **Verified the test can read
   `updated` as a raw string:** Req 10.3 reads the raw `.mdx` from disk and parses frontmatter
   (design.md:488), so it sees the author's literal YAML string — NOT the `s.isodate()`
   transform output. This is correct: `s.isodate()` only runs inside `velite build` → `#site/content`;
   a raw-file frontmatter parse never invokes it, so a time-bearing `2026-05-29T20:30:00-04:00`
   is visible verbatim and `/T/` matches. The guard is real.

2. **Pagefind carve-out removed (r2 §3a) — LANDS, and the re-cite is correct.** The carve-out is
   gone; the Console/CSP E2E section now cites `site-search.tsx:55-83` (design.md:506). **Verified
   against live `src/components/blog/site-search.tsx`:** the `/pagefind/pagefind-entry.json`
   `fetch` is inside the `useEffect` that early-returns when `!open` (the effect body at
   `site-search.tsx:55-86`; the `if (!open) { … return; }` guard at `:56-61`, the `fetch` at
   `:80`). The slash-pages suite never opens the dialog (no `keyboard.press`/`Cmd+K`), so the
   index-404 console error cannot fire on a plain load. The design's claim is now correct and the
   mis-cited axe comment is gone.

3. **Real `description` strings (r2 §4/§5) — LAND.** `/sitemap` description is a real sentence
   (design.md:237: "A human-readable index of every page, post, and project on matthewfield.ca.")
   and `/slashes` likewise (design.md:259). No literal `"…"` remains. **Note** the current live
   `now/page.tsx` and `colophon/page.tsx` set NO `description` at all (verified — they set only
   `title`+`robots`); the design's rewire adds frontmatter-sourced descriptions, which is the
   intended change.

4. **Zero-byte self-test assertion pinned to ONE form (r2 §2) — LANDS.** Design item 3 bullet 4
   (design.md:385) picks `warningCount === <subjectDoc>.headings.length` explicitly, names the
   coupling, and instructs *not* to keep the hardcoded `=== CANONICAL_HEADINGS.length`. The
   `writeDocs` body is now shown (design.md:370-377) deriving each doc's dir from `rel` via
   `path.dirname`. **Verified against live `check-authoring-docs.test.mjs`:** the current helper
   hardcodes `path.join(dir, "docs")` (`test.mjs:34`) and the zero-byte assertion is
   `=== CANONICAL_HEADINGS.length` (`test.mjs:104`), the three pure-core calls are one-arg
   (`test.mjs:41,48,54`), `ALL_PRESENT` at `test.mjs:23`. The diff spec maps cleanly onto all of
   these. Ambiguity resolved.

5. **Colophon `rel` selector is `http(s)`-only (r2 §3c) — LANDS.** E2E selects
   `a[href^="http"]` external (host ≠ site host) and the design states the `http(s)` filter
   excludes `mailto:`/hostless links (design.md:504). The NFR narrative is corrected: the page is
   NOT free of `target="_blank"` links — the footer chrome has them and carries `noreferrer`
   (design.md:504). **Verified against live `footer.tsx`:** GitHub/LinkedIn use
   `target="_blank" rel="noopener noreferrer"` (`footer.tsx:12-27`), rendered on every page
   including `/colophon`. The corrected narrative matches reality.

6. **`toHaveTitle` precedent reframed as genuinely-new (r2 §3b) — LANDS.** Design now states
   `smoke.test.ts:5` is an unanchored `/matthewfield\.ca/` against the **home** page (the
   `default` title, not the `%s | …` template) and reframes `/\| matthewfield\.ca$/` as new
   (design.md:39, :502). **Verified the resolution holds:** `(site)/layout.tsx` is a bare
   `SiteShell` with NO `metadata`/title override (read in full — 5 lines, no `metadata` export),
   and root `layout.tsx:19-22` is `template: "%s | matthewfield.ca"` with `default: siteConfig.name`.
   So the five pages' `title: "<X>"` resolve through the template; the anchored regex matches.
   Correct and honestly framed.

7. **XML citations `19-20` + focus-ring source (r2 §4/§5) — LAND.** Design cites
   `src/app/sitemap.ts:19-20` with `/about`=15, `/now`=18 staying (design.md:51, :293).
   **Verified against live `src/app/sitemap.ts`:** `/about`=line 15, `/contact`=16, `/colophon`=17,
   `/now`=18, `/sitemap`=19, `/slashes`=20. Citation is now exact. Focus-ring source: design
   states `globals.css` has NO custom global `:focus-visible` rule, so footer links use the
   browser-default outline (design.md:40, :304). **Verified:** `grep ":focus" globals.css`
   returns nothing (exit 1). The honest statement is correct.

**Cross-section consistency of the fixes (Revision notes vs Architecture vs Testing Strategy):**
I checked the date guard (design.md:34 ↔ :168 ↔ :488 — all say `!/T/` test, consistent), the
Pagefind removal (design.md:35 ↔ :506 — both "no carve-out needed", consistent), the colophon
`rel` (design.md:38 ↔ :227 ↔ :504 — consistent), and the zero-byte assertion (design.md:37 ↔
:385 ↔ :495 — all the `<subjectDoc>.headings.length` form). **No fix is claimed-but-inconsistent
across sections.** This is the cleanest the document has been across three rounds.

**Verdict on Part A: all seven fixes land, verified, and are internally consistent.** This is the
convergence signal the brief asked me to be decisive about. I will not re-litigate them.

---

## B. The one real remaining blocker: seed content + authoring doc do not exist, and the design's own gates depend on them (Novel — the highest-value remaining gap)

This is the ground prior rounds did not reach (r2's "Guidance for Next Review" flagged it as
likely-fertile, and it is). **Verified file state:** `content/pages/` contains ONLY `about.mdx`,
and that file's body is still the literal placeholder `Placeholder content. Replaced in a
downstream spec.` (read in full). `now.mdx` and `colophon.mdx` **do not exist**.
`docs/slash-pages-authoring.md` **does not exist** (only `contributions-and-resources-authoring.md`
and `projects-authoring.md` are present).

**Stress-test the consequences the design does not sequence.** Every one of the following gates —
all *added by this very spec* — goes RED the moment the code lands but before content is authored,
and the design never states that authoring the three MDX bodies + the doc is a **prerequisite
deliverable within this spec**, not a downstream assumption:

- **The build itself.** `const nowPage = getNowPage()` and `getColophonPage()` evaluate at
  module load (design.md:201, mirroring the verified `about/page.tsx:19` precedent). With no
  `now.mdx`/`colophon.mdx`, `pages.find(...)` returns `undefined` → the named `throw` fires during
  `next build` → **no production build is emitted.** The design correctly describes this as the
  intended fail-loud invariant (Error Scenario 1) but never says "therefore the MDX files MUST be
  authored in this spec before the route rewire can pass CI."
- **`getNowPage()`'s `updated` throw.** Even once `now.mdx` exists, a missing `updated`
  frontmatter throws (design.md:195). The seed `now.mdx` must ship a date-only `updated`.
- **The seed-sentinel test (Req 10.2).** Reads raw `about/now/colophon.mdx` and asserts the body
  does NOT contain `"Placeholder content."` / `"Replaced in a downstream spec."` (design.md:487).
  **`about.mdx` currently contains exactly that string**, and `now.mdx`/`colophon.mdx` don't
  exist (the `fs` read throws ENOENT). RED on all three until real bodies are authored.
- **The `!/T/` test (Req 10.3).** Cannot run until `now.mdx` exists with frontmatter.
- **The two-doc CI gate (Req 9.3).** **Verified CI invokes both** `pnpm check:authoring-docs`
  (`.github/workflows/ci.yml:49`) and `node --test scripts/check-authoring-docs.test.mjs`
  (`ci.yml:98`). Once `docs/slash-pages-authoring.md` is added to `AUTHORING_DOCS`, line 49 exits
  non-zero ("author doc not found") until the doc is authored with all four canonical headings.

**This is a genuine chicken-and-egg the design elides.** The Overview calls the bodies "authored
by Matthew" (design.md:17) and treats `/about` as "Mostly verify-existing" (design.md:9), but the
*placeholder body must be replaced* for Req 10.2 to pass — that is authoring work, not
verify-existing. **Directive: the design (or the task breakdown) must make explicit that authoring
`about.mdx` (real body), `now.mdx` (real body + date-only `updated`), `colophon.mdx` (real body +
stack links), and `docs/slash-pages-authoring.md` (four canonical headings) are in-spec
prerequisites that gate every test and the build** — and ideally sequence them *before or with*
the route/CI edits so the tree is never left red-by-construction. Today the design's
Error-Handling and Testing sections describe the red states as if they were regression guards,
not the *initial* state this spec must clear.

---

## C. The two-doc CI coupling — verified hermetic, low risk (convergence confirmation)

The brief asks whether the generalized `writeDocs` / `AUTHORING_DOCS` / `main(AUTHORING_DOCS)`
wiring introduces real coupling risk — e.g. could a change to `SLASH_PAGES_HEADINGS` turn a
contributions-focused test red, and is the `node --test` self-test still hermetic?

- **The self-test is hermetic.** Every CLI case runs the script in a fresh `mkdtempSync` tmp dir
  (`test.mjs:25-31`) and the new `writeDocs` writes *both* managed docs into that tmp dir from
  their own heading sets (design.md:370-377). It never reads the real `docs/`. So a real-tree
  change to `SLASH_PAGES_HEADINGS` does not affect the self-test's *contributions* assertions
  (each doc defaults to its OWN `headings.join`). **Hermetic — confirmed.**
- **The real coupling is intentional and benign.** `SLASH_PAGES_HEADINGS` and `CANONICAL_HEADINGS`
  share one `AUTHORING_DOCS` list, so `main()` now gates BOTH docs in one CI step. A regression in
  the slash doc's headings turns the *shared* `check:authoring-docs` step red — but that step is
  not "contributions-focused"; it is the doc-drift gate for all managed docs. No contributions
  *unit test* (Vitest under `src/**`) imports `SLASH_PAGES_HEADINGS`, so a slash-heading change
  cannot redden a contributions-domain test. **Acceptable; not a real coupling hazard.**
- **One latent over-coverage note (low):** `docs/projects-authoring.md` exists in the tree but is
  NOT in `AUTHORING_DOCS` (the list is contributions + slash only). That is pre-existing and out
  of scope — flagging only so the implementer doesn't "helpfully" add it and expand scope.

---

## D. Attack-dimension-4 probes (new ground) — all resolve in the design's favor

- **"Zero added client JS" vs the Next baseline (tech.md ~60-85KB).** The design says the five
  routes add "zero added client JS beyond the existing `(site)` shell" (design.md:59). This wording
  is **honest**: it scopes the claim to *added* JS and explicitly defers to the existing shell
  baseline. The five routes are server components; none adds a `"use client"` module. Not a
  dishonest claim. No action.
- **`MDXContent` `new Function(code)(runtime)` + CSP (the sharpest new probe).** Verified
  `src/components/shared/mdx-content.tsx:11` does `new Function(code)(runtime)`, and the CSP
  (`next.config.ts:69`) is `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'` — with an
  explicit comment that it "does not allow eval() in JavaScript." **At first glance this looks like
  a CSP-violation risk for the now-live `/now`/`/colophon` MDX bodies.** It is NOT, for a decisive
  reason: `MDXContent` has **no `"use client"` directive** — it is a server component, so
  `new Function` executes during SSR/build in Node, where browser CSP does not apply. The rendered
  HTML is shipped; the client never evals. **This is the identical path `/about` already ships in
  production today** (verified `about/page.tsx:34` renders `<MDXContent>`). So the eval path is not
  new, not client-side, and not CSP-gated. The E2E's console/CSP-error assertion would therefore
  see nothing to flag. **The design need not mention CSP at all — but it would be worth a one-line
  note that `MDXContent` is server-only, since the brief-level reader can't tell from the design
  whether the eval is client- or server-side.** (Cosmetic.)
- **`dynamic = "force-static"` on `/sitemap` reading `getVisiblePublishedPosts()` (draft-guard env
  at call time).** Verified `blog.ts:50` reads `process.env.BLOG_INCLUDE_DRAFTS` at call time
  inside `getPublishedPosts`. With `force-static`, that call happens at **build time** (static
  generation), which is exactly when the draft-guard env is meant to be evaluated — identical to
  the existing XML `src/app/sitemap.ts` and the `contributions`/`projects` static routes the design
  cites as precedent. **No new build-ordering or draft-leak risk.** The `force-static` choice is
  correct.

---

## Top 3 risks/gaps (short doc → 3)

1. **Seed content + authoring doc are unwritten, and the design's own build/tests/CI gates depend
   on them — not sequenced as an in-spec prerequisite (§B, Novel, the real remaining blocker).**
   `content/pages/` has only a placeholder `about.mdx`; `now.mdx`, `colophon.mdx`, and
   `docs/slash-pages-authoring.md` do not exist. The seed-sentinel test, the `!/T/` test, the
   module-load throws, the two-doc CI gate (`ci.yml:49`), and `next build` all go RED until they
   are authored. The design narrates these as regression guards rather than the *initial* state
   this spec must clear, and never states authoring is a gated deliverable here.

2. **`MDXContent` server-vs-client ambiguity for the new CSP-relevant readers (§D, Novel, low).**
   The `new Function(code)` eval under a no-`unsafe-eval` CSP *looks* alarming but is benign
   because `MDXContent` is server-only — the same path `/about` ships today. The design should add
   one line stating `MDXContent` runs at SSR/build so a reviewer doesn't (as I briefly did) suspect
   a client CSP violation on `/now`/`/colophon`.

3. **Convergence is real elsewhere — do not add work.** Parts A, C, and the rest of D confirm the
   seven fixes land, the self-test is hermetic, "zero added client JS" is honest, and
   `force-static` is correct. The only manufactured-nit temptation (the `projects-authoring.md`
   not in `AUTHORING_DOCS`) is pre-existing and out of scope. There is no third structural
   objection to invent.

## Top 3 conclusions to challenge or reverse

1. **"`/about` … Mostly verify-existing" (design.md:9) and "bodies authored by Matthew"
   (design.md:17).** Challenge the framing: `about.mdx`'s body is *still the placeholder* and Req
   10.2 fails against it, so replacing it is required authoring work inside this spec — not
   verify-existing, and not a downstream assumption. Reframe `/about` as "flip-to-indexable +
   author real body," and list the three MDX files and the authoring doc as in-spec prerequisites.

2. **The Error-Handling section implies the red states are regressions (design.md:451-477).**
   Reverse: scenarios 1, 2, 3, and 7 describe the *initial* state of this spec (no content, no
   doc), not regressions from a green baseline. The design should say so, and sequence content
   authoring with (or before) the route/CI edits so CI is never red-by-construction mid-spec.

3. **Nothing else.** I explicitly decline to reverse any Part-A fix or the architecture — they are
   verified sound for a third consecutive round. A third round that manufactured a fourth
   structural objection would be noise.

## What's missing before acting

- **Sequence the three seed `.mdx` files + `docs/slash-pages-authoring.md` as gated, in-spec
  deliverables** (real `about.mdx` body, `now.mdx` body + date-only `updated`, `colophon.mdx`
  body + stack links, authoring doc with the four canonical headings). State that the route
  rewire / CI-gate edits and the content authoring land together, so the tree is never left
  red-by-construction.
- **One line clarifying `MDXContent` is a server component** (SSR/build-time eval), so the
  `new Function` path is not mistaken for a client CSP violation on the now-live MDX routes.
- Nothing further. The seven r2 fixes are verified landed; the architecture is sound and
  over-build-free; the self-test is hermetic; `force-static` and the "zero added client JS"
  wording are correct.

**Net:** the document has converged. The seven r2 fixes all land against live code and are
internally consistent. The single remaining blocker is a sequencing/authoring-prerequisite gap
(the seed content and authoring doc don't exist and gate the design's own build and CI), plus one
cosmetic clarification about the server-side eval path. This is a real remaining item, not
cosmetic polish — but it is the *last* one, and I recommend acting on the design after it is
addressed rather than opening a fourth adversarial round.
