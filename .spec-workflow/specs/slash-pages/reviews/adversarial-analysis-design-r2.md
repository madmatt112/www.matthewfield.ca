# Adversarial Analysis — slash-pages/design (v2 / r2)

Staff-engineer teardown of the **v2 fixes**, verified against live code (`file:line`). r1's
findings were all accepted and folded into v2; per the brief I attack the *fixes*, not the
resolved originals. Each finding is classified **Novel / Compounding / Recurring**.

Net up front: v2 is genuinely tighter. But three of its new mitigations are weaker than the prose
claims — one is **over-mitigation guarding a path that cannot fire** (the Pagefind carve-out), one
mis-cites its own precedent, and the headline date mitigation remains a pure documentation rule
with a now-confirmed silent-failure path. The self-test diff spec is sound but has one residual
ambiguity. Several r1-untouched requirements (7.3, 8.4) are under-specified.

---

## 1. The date-only authoring rule as the SOLE mitigation — still a silent next-day bug (Compounding, escalate)

**Verified facts.**
- `s.isodate()` accepts a full datetime and re-serializes to UTC (confirmed r1; `velite/dist/index.js:140`).
- The `pages` schema is `.object({...}).transform(...)`, **not** `.strict()` (`velite.config.ts:50-57`). Only `posts` is `.strict()` (`velite.config.ts:110`). So unknown keys AND time-bearing `updated` values both pass silently.
- The new formatter pins `timeZone:"UTC"` (design `format-date.ts` AFTER, line 144). The existing `format-date.test.ts:8` already feeds a **time-bearing** value `"2026-05-25T12:00:00Z"` — noon UTC, which happens to stay "May 25" in Toronto, so the test is TZ-stable by luck, not by the date-only rule the design relies on.

**Stress-test.**
- **Challenge the claim that the authoring-doc rule is "the requirements-consistent mitigation" (design.md:23).** Confirm the concrete failure: an author pastes `updated: 2026-05-29T18:30:00-04:00` into `now.mdx`. `s.isodate()` accepts it → `2026-05-29T22:30:00.000Z` → UTC formatter renders **"May 29"** (correct here) — but `2026-05-29T20:30:00-04:00` → `2026-05-30T00:30:00.000Z` → **"May 30"**, the *next* day. **The build succeeds, every test stays green, and `/now` silently shows the wrong day.** No unit test, no E2E, no CI gate, and no schema check catches it. The only barrier is a sentence in a Markdown file. Decision #1 *already concedes* Matthew may forget to bump the date; relying on him to also never paste a timestamp from his editor/clipboard is the same fragility doubled.
- **Stress-test whether rejecting the refine was the right call.** The design says a refine "would deviate from Req 4.1's pinned 'field addition only'" (design.md:23). This is too literal. Req 4.1 forbids changing the *stored value* / the transform shape. A **non-mutating** `s.isodate().refine((v) => !/T/.test(v), "updated must be date-only YYYY-MM-DD")` adds a *validation* predicate — it does not add a field-merge, a `{meta}` arg, git, or a transform change, and it does not alter the stored ISO. It is arguably still "field addition only" (the field is `updated: <isodate with a refine>`). The design conflates "no transform change" with "no validation" and never tests the boundary. At minimum the design should *argue* why a value-preserving refine violates 4.1 rather than asserting it.
- **The cross-collection-scope objection is real but cuts the other way.** A refine on the `pages.updated` field alone is NOT cross-collection — it touches only `pages`. The design's stated reason for rejection ("impose a cross-collection behavior change outside this spec's scope", design.md:23) describes a *posts*-wide refine, not a pages-only one. So the rejection rationale is aimed at a strawman broader than what's needed.
- **Cheap catch the design dismisses without trying.** The Req 10.3 unit test *already* reads raw `now.mdx` and parses frontmatter to assert `updated` is present (design.md:455). Asserting `!/T/.test(updated)` in that same test is a **one-line addition to a test that already exists** — zero new machinery, no schema change, no scope creep. The design never considers strengthening the test it is already writing; it jumps straight to "documentation rule vs schema refine" and picks documentation. This is the cheapest possible guard and it is omitted.

**Verdict:** the date-only rule alone is insufficient and the refine-rejection rationale is
weakly argued. **Recommend: add `!/T/` assertion to the existing Req 10.3 seed test** (one line),
independent of the schema-refine debate. Escalate from r1's "scope honestly" to "the chosen
mitigation has a confirmed silent-failure path and a free fix was passed over."

---

## 2. The self-test literal diff spec — sound, with one residual ambiguity (Compounding)

I re-verified the v2 enumerated spec (design.md:340-356) against the **actual**
`check-authoring-docs.test.mjs` and `.mjs`.

**Verified facts (current code).**
- `checkHeadings(docText)` — one arg, closes over `CANONICAL_HEADINGS` (`.mjs:54-57`).
- Three pure-core tests call it with one arg (`test.mjs:41,48,54`).
- `main()` takes no args, `process.exit(1)` on missing doc (`.mjs:63-69`).
- The five CLI tests `writeDoc()` only the contributions doc (`test.mjs:33-36`); `ALL_PRESENT = CANONICAL_HEADINGS.join` (`test.mjs:23`).

**Stress-test of the v2 fixes.**
- **The three mandatory pure-core edits (design item 1, line 344): correct.** After the signature change `checkHeadings(text)` → `headings` is `undefined` → `headings.filter` throws. The spec names all three call sites and the exact replacement args. Maps cleanly onto `test.mjs:41,48,54`. **Holds.**
- **The `writeDocs` per-doc derivation (design item 2, line 346): correct and necessary.** It replaces the single `ALL_PRESENT`/`writeDoc` with a helper that defaults each managed doc to `doc.headings.join("\n\n")` from `AUTHORING_DOCS[i].headings`. This closes r1's trap (a) — writing the slash doc with contributions headings would permanently fail its four headings. **Holds.** This maps onto the existing `writeDoc(dir, content)` (`test.mjs:33`) by generalizing it to iterate `AUTHORING_DOCS` and `mkdirSync` each `path.dirname`. **One real gap:** the two managed docs are `docs/contributions-and-resources-authoring.md` and `docs/slash-pages-authoring.md` — both under `docs/`, so a single `mkdirSync(docs, {recursive})` suffices, but the design's `writeDocs` is never shown deriving the dir from `rel` (the current helper hardcodes `path.join(dir,"docs")`). If a future managed doc lives outside `docs/`, the helper as currently sketched breaks. Minor, but the "literal diff spec" stops short of showing the helper body.
- **The report-all `main()` + "doc missing → no annotation" assertion (design item 3 bullet 3, line 351): re-verified, holds.** With neither doc written, the new `main()` loops, hits `existsSync` false for **both**, writes two `author doc not found` stderr lines, `continue`s, emits no `::warning::`, exits 1. The current assertions are `match(stderr,/author doc not found/)` + `doesNotMatch(stdout,/::warning::/)` (`test.mjs:90-91`) — both survive two stderr lines (the regex is unanchored). **Holds.** v2 correctly retracted r1's "first missing doc" control-flow misstatement.
- **The zero-byte count "choose contributions as the subject so count stays 9" (design item 3 bullet 4, line 352): sound but fragile-by-design, and the design admits it.** With the contributions doc zero-byte and the slash doc full-present: 9 + 0 = 9 = `CANONICAL_HEADINGS.length`. **Holds** against the current assertion (`test.mjs:104`). But the design *also* says the test "is written to assert `warningCount === <subject doc>.headings.length` explicitly (not the hardcoded contributions length)". These are two **different** test bodies: (a) keep `=== CANONICAL_HEADINGS.length` and just pick contributions as subject, vs (b) rewrite to `=== <subject>.headings.length`. The design endorses both in the same bullet. An implementer cannot tell whether to change line 104 or not. **Residual ambiguity** — pick one. (b) is correct because it documents the coupling; (a) "secretly hardcodes a fragile coupling" exactly as the brief suspects.

**Verdict:** the diff spec is materially better than r1's prose and the two red-test traps are
closed. Two loose ends remain: the `writeDocs` body is not shown (dir-derivation), and the
zero-byte assertion is specified two contradictory ways. Neither is a blocker; both are
"implementer will pause and guess" hazards in a doc that claims to be a literal checklist.

---

## 3. The new E2E additions — one over-mitigation, one mis-cited precedent, one broader-than-described selector (Novel)

### 3a. The Pagefind carve-out is OVER-MITIGATION and mis-cites its precedent (Novel — significant)

This is the strongest new finding. The design (design.md:473, Revision notes §4) adds a carve-out:
"tolerate a missing Pagefind index … matching `blog-axe.test.ts:78-81` — the `(site)` chrome's
search trigger may request an index that is absent in the E2E build."

**Verified facts.**
- The `(site)` chrome mounts `<SiteSearch />` in the **Header** on every page (`header.tsx:3,17`), so it IS present on the five slash pages. Good so far.
- **But `SiteSearch` only fetches the Pagefind index *inside the `open` effect*.** `fetch("/pagefind/pagefind-entry.json")` lives in the `useEffect` that returns early when `!open` (`site-search.tsx:55-83`). On a plain page load the component mounts and registers a keydown listener — **it does not touch the network until the dialog is opened via Cmd/Ctrl+K or `/`.**
- The slash-pages E2E navigates and asserts no console errors but **never opens the search dialog** (design.md:473 lists no `keyboard.press`).

**Consequence.** The Pagefind-index-404 console error **cannot fire** on these page loads. The
carve-out guards a path the test never exercises — pure over-mitigation, exactly the
"over-mitigation guarding a non-existent risk" the brief asks me to check (attack dim 3).

**Worse — the cited precedent does not say what the design claims.** `blog-axe.test.ts:78-81` is
**not** a console-error carve-out. It is a comment block above an **axe a11y** test explaining that
the *dialog-open accessibility audit* "doesn't require the Pagefind index to be ready" — it never
attaches a `console`/`pageerror` listener and never filters a Pagefind error message
(`blog-axe.test.ts:77-107` runs `AxeBuilder`, not console capture). The design imports the
authority of a sibling suite that does not actually implement the carve-out it's being cited for.
The real console-error handling lives in `blog-pagefind-failure-matrix.test.ts` (which deliberately
*opens* the dialog against a broken index). **Fix:** either drop the carve-out (the index is never
fetched on these pages) or, if kept defensively, cite a suite that actually filters a console error,
not the axe comment.

### 3b. `toHaveTitle(/\| matthewfield\.ca$/)` — stricter than the verified precedent (Novel — low)

**Verified facts.** Root template is `` template: `%s | matthewfield.ca` `` with `default: siteConfig.name`
(`layout.tsx:19-22`). `(site)/layout.tsx` is a bare `SiteShell` with **no** metadata override, so
the template is inherited. The five pages set `title: "Sitemap"` / `nowPage.title` etc., so each
resolves to `"<X> | matthewfield.ca"`. The regex `/\| matthewfield\.ca$/` matches. **Holds for the
common case.**

**But the cited precedent is weaker than asserted.** The design says "`smoke.test.ts` already uses
`toHaveTitle` against this template" (design.md:469). `smoke.test.ts:5` actually asserts
`toHaveTitle(/matthewfield\.ca/)` — **unanchored, no `\|`** — against the *home* page, whose title
is the **`default` (`siteConfig.name`), which does NOT pass through the `%s | …` template** (default
titles are used verbatim, only `%s`-titles get the suffix). So the precedent proves the *suffix
string* appears somewhere, not that the anchored `| …` template resolves. The new assertion is a
genuinely new, stricter check — fine, but the design overstates that it's "already used." Low risk
because the resolution is structural; flag the mis-citation.

- **Title-mutation timing:** these are server components; the title is in the SSR'd `<head>`, not
  client-mutated (no `next-themes`-style title swap). `toHaveTitle` polls anyway. **No flake.**

### 3c. The colophon `rel` assertion catches the footer's links too — broader than described (Novel — low)

**Verified facts.** The colophon E2E asserts "every external `<a>` (host ≠ site host) has `rel`
containing `noopener`" (design.md:471). But the **Footer is rendered on every page**, and the
footer's GitHub/LinkedIn links use `target="_blank" rel="noopener noreferrer"`
(`footer.tsx:12-27`). So the host-based selector will collect the footer links in addition to
colophon's own.

- **Does it pass?** Yes — footer links have `rel` containing `noopener`. So no false failure.
- **But two design claims become imprecise:** (1) the assertion is described as testing colophon's
  *own* external links, when it actually tests every external link in the page including chrome; (2)
  the design's NFR reasoning "colophon links open same-tab so `noreferrer` is N/A" is now muddied —
  the page *does* contain `target="_blank"` external links (the footer's), and those carry
  `noreferrer` correctly, but the design's prose implies the colophon page has no `_blank` links at
  all. The assertion is robust; the *justification narrative* is wrong about the page's link set.
- **`mailto:`/protocol-relative edge (brief attack dim 3):** "host ≠ site host" — a `mailto:` link
  has no host, and `new URL("mailto:x@y").host` is `""`, which `!== siteHost`, so a `mailto` would be
  flagged as "external" and **fail the `rel`-contains-`noopener` assertion** (mailto links have no
  `rel`). The colophon seed is not specified to include a mailto, but `/contact`-style "get in touch"
  copy could tempt one. The selector needs an explicit `http(s):`-only filter, which the design does
  not state.

### 3d. `(site)` shell DOES mount search — so 3a is the only carve-out issue

I confirm against the brief's question "does the `(site)` shell actually mount a search trigger":
**yes** (`header.tsx:17`). So the carve-out is not guarding a non-existent *component* — it's
guarding a non-existent *network call on these page loads* (3a). The distinction matters: the
component is there, but it's inert until the dialog opens.

---

## 4. Internal consistency after v2 edits (Novel — mostly minor)

- **XML sitemap line citation drift.** Integration Points says "delete the two strings … (lines 20-21)" (design.md:78) and the XML-edit section says "lines 20,21" / "lines 11-21" (design.md:39,271). Actual: `/sitemap` is **line 19**, `/slashes` **line 20** (`src/app/sitemap.ts:19-20`). A design that markets itself as line-verified cites the wrong lines. Cosmetic, but undermines the "verified against live code" claim. Also confirm: `/about` (line 15) and `/now` (line 18) correctly **stay** (they're indexable).
- **Req 7.3 / metadata description left as a literal ellipsis.** `/sitemap` and `/slashes` `generateMetadata` show `description: "…"` (design.md:222,239) — a literal placeholder, not a real description. The brief (attack dim 4, Req 7.3) flags exactly this: is a real description specified or left as `"…"`? **It is left as `"…"`.** The current `colophon`/`now` pages don't even set a `description` (`colophon/page.tsx`, `now/page.tsx` set only `title`+`robots`). So the component-page descriptions are unspecified — an implementer ships the ellipsis verbatim or invents copy. Specify the strings.
- **No surviving contradiction between Revision-notes summary, Architecture body, and Error Handling.** I checked the blast-radius list (now consistently "all six consumers" / "four sections" across design.md:24,35,77,154,456), the `main()` control flow (now consistently "report-all" at design.md:25,314-330,342,462), and the colophon same-tab `rel` (consistent at design.md:27,213,471). The r1 "first missing doc" contradiction is **resolved**. The `export type SlashPage` typo is **fixed** (design.md:249). No new cross-section contradiction found beyond the ellipsis and line-number drift above.
- **Blast-radius arithmetic nit:** the design alternately says "six consumers" (call sites) and "four sections" (`/blog`,`/projects`,`/resources`,`/contributions`) plus `/now` plus the projects badge. Both are right (six call sites across five+ surfaces) but the prose switches between "six" and "four" without always saying which it's counting. Readable, slightly sloppy.

---

## 5. Requirement coverage r1 did not reach (Novel)

- **Req 8.4 footer focus states / both themes — asserted, not tested.** Design says "Focus states are inherited from the existing chrome" (design.md:282) and lists "focusable footer links" under *manual* verification (design.md:479). The two new `<Link>`s reuse `className="hover:text-foreground"` (`footer.tsx:9` precedent) which has a **hover** style but **no explicit focus-visible** style in the snippet. Whether focus is visible depends on a global `:focus-visible` rule not shown or verified in this design. r1 didn't reach this; the design asserts inheritance without citing where the focus ring comes from. The E2E asserts link *resolution*, not focus visibility. Unverified acceptance criterion (low — likely a global ring exists, but the design doesn't establish it).
- **Req 5.3 empty-state — the design DOES pick "omit".** design.md:229-231 + Error Scenario 6 (design.md:438-440): zero posts/projects → section omitted, no empty-state copy. Consistent and intentional. **Fine** (the brief asked which it picks — it picks omit).
- **Req 5.1 explicit Home link — covered.** design.md:226 hand-adds `<a href="/">Home</a>` with the correct rationale (Home is in neither `navItems` nor `slashPages`). **Fine.**
- **Req 6.2 six-href config literal — verified exact.** The literal (design.md:257-264) is `/about,/now,/colophon,/contact,/sitemap,/slashes` and the unit test (design.md:453) asserts exactly those six. Matches. **Fine.** Note `/contact` is in the slashPages list but is owned by another spec — the `/sitemap`+`/slashes` link-resolution E2E will `request.get("/contact")`; confirmed `/contact` is `force-static` and 200s on GET (r1 verified). **Holds.**
- **Req 7.3 metadata description — NOT covered** (see §4: literal `"…"`). This is the one r1-untouched requirement the design leaves genuinely open.

---

## Top 5 risks/gaps

1. **The date-only rule is documentation-only with a confirmed silent next-day bug, and a free fix was skipped (§1, Compounding/escalate).** A pasted evening-Eastern timestamp in `now.mdx` builds clean and shows the wrong day. The Req 10.3 seed test already parses the frontmatter — adding `!/T/.test(updated)` is one line and is not specified. The schema-refine rejection rationale argues against a *posts-wide* refine, not the *pages-only* one actually proposed.
2. **The Pagefind E2E carve-out is over-mitigation and mis-cites its precedent (§3a, Novel).** `SiteSearch` only fetches the index on dialog-open (`site-search.tsx:55-83`); the slash-pages E2E never opens it, so the index-404 error cannot fire. `blog-axe.test.ts:78-81` is an axe a11y comment, not a console-error carve-out — wrong authority cited.
3. **Component-page metadata `description` is a literal `"…"` (§4/§5, Novel).** Req 7.3 left unspecified for `/sitemap` and `/slashes`; the implementer ships the ellipsis or invents copy.
4. **The zero-byte self-test assertion is specified two contradictory ways (§2, Compounding).** "Keep `=== CANONICAL_HEADINGS.length` and pick contributions as subject" vs "assert `=== <subject>.headings.length`" — pick one (the latter).
5. **The colophon `rel` assertion's host-only selector flags `mailto:`/hostless links and silently also tests the footer's `_blank` links (§3c, Novel).** No false failure today, but the selector needs an explicit `http(s):`-only filter and the NFR narrative wrongly implies the colophon page contains no `target="_blank"` links.

## Top 3 conclusions to challenge or reverse

1. **"The authoring-doc rule is the requirements-consistent mitigation … v2 does not add a schema refine [because it] would deviate from Req 4.1" (design.md:23).** Reverse the framing. A value-preserving `pages`-only `.refine(v => !/T/.test(v))` adds validation, not a field/transform/git change, and is pages-scoped (not cross-collection). The design rejected a broader strawman. Even setting the refine aside, the **one-line `!/T/` assertion in the already-planned Req 10.3 test** closes the gap for free and is not mentioned.
2. **"Tolerate a missing Pagefind index … matching `blog-axe.test.ts:78-81`" (design.md:473).** Reverse: the index is never fetched on a plain slash-page load (the dialog is never opened), and the cited lines are an axe-audit comment, not a console-error filter. Drop the carve-out or re-cite `blog-pagefind-failure-matrix.test.ts`.
3. **"`smoke.test.ts` already uses `toHaveTitle` against this template" (design.md:469).** Challenge: `smoke.test.ts:5` uses an *unanchored* `/matthewfield\.ca/` against the **home** page, whose title is the `default` and does NOT pass through the `%s | …` template. The new anchored `/\| matthewfield\.ca$/` check is genuinely new (and correct), but it is not "already used."

## What's missing before acting on this document

- A **one-line `!/T/` assertion** in the Req 10.3 seed-sentinel test (or an explicit, correctly-scoped argument for why the pages-only refine violates 4.1). The current sole-documentation mitigation has a confirmed silent-failure path.
- **Remove or re-justify the Pagefind carve-out** (it guards an unreachable path on these pages and mis-cites its precedent), and **add an `http(s):`-only filter** to the colophon external-link selector so hostless/`mailto:` links aren't mis-flagged.
- **Real `description` strings** for `/sitemap` and `/slashes` `generateMetadata` (Req 7.3) — not `"…"`.
- **One** zero-byte self-test assertion form (recommend `=== <subject>.headings.length`), and the `writeDocs` helper body showing per-doc dir derivation.
- **Correct the XML-sitemap line citations** (19-20, not 20-21) and **establish where the footer focus ring comes from** for Req 8.4 (cite the global `:focus-visible` rule or add one).

**Net:** the architecture remains sound and over-build-free (re-confirmed: no registry, no parity
normalizer, `pages` import allowed, leaf `siteConfig`, inline link lists). v2 closed r1's two
red-test traps and the control-flow contradiction. The remaining exposure is concentrated in
**three new E2E claims that are weaker than their prose** (Pagefind over-mitigation + mis-citation,
the `toHaveTitle` precedent overstatement, the colophon selector breadth) and **one date
mitigation that left a free guard on the table**. None is structural; all are precision/coverage
defects an implementer would otherwise discover at red-CI or post-launch.
