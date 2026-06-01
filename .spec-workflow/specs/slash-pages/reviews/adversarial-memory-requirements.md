# Adversarial Review Memory — requirements
Last updated: 2026-05-29 (after v3/r3 review — resolved in v4; document converged)

## r3 (v3 review) outcomes — all accepted, resolved in v4
- **F1 (Blocking) Req 9.3 breaks `check-authoring-docs.test.mjs`:** v4 makes `main()` take the doc-list as a parameter and names the test update (Req 9.3).
- **F2/F2a/F3 off-by-one ships on /blog+/projects; central fix:** v4 fixes `formatContentDate` centrally with `timeZone: "UTC"` (also corrects blog/projects), making the TZ test trivial (Req 2.2, Req 10.4, Decision #5).
- **F4 `getNowPage()` "structurally identical" vs enforce `updated` seam:** v4 = existence check PLUS an `updated`-presence throw; dropped "structurally identical" (Reqs 2.3, 2.5).
- **F5 sentinel test near-tautological:** v4 reframes Req 10.2 honestly as a narrow "didn't re-ship the about.mdx placeholder during the index flip" guard.
- **F6 XML sitemap advertises two noindex URLs:** v4 drops `/sitemap`+`/slashes` from the XML `routes` array (Req 7.6) — the proper fix, not a documented wart.
- Confirmed clean by r3: `SiteConfig` takes `slashPages` cleanly; the `updated` schema add is genuinely additive (`pages` not `.strict()`); `checkHeadings` core reusable.
- r3 verdict: "converged document with a handful of real residual defects, not nitpicks — fix F1, pick a side on F2/F4, ready for design." v4 does all of that.

## v1/v2 outcomes (for reference)

## r2 (v2 review) outcomes — all accepted, resolved in v3
- **F1 `/now` date off-by-one (Compounding, verified):** `s.isodate()` emits midnight-UTC ISO; `formatContentDate` is TZ-naive → renders day-before in Canadian zones. v3: require UTC-pinned date-only rendering + TZ-independence unit test (Req 2.2, Req 10).
- **F2 `/sitemap` omits Home `/` (Novel, verified):** `/` is in neither `navItems` nor `slashPages`. v3: add Home explicitly; E2E asserts every static `/sitemap` link 200s (Req 5.1, 10.3). Heavy XML-parity still deliberately declined (Decision #4).
- **F3 sentinel test unimplementable/brittle (Compounding):** compiled Velite `body` is a JS function-string; generic-word sentinels + 40-word floor are brittle. v3: read raw `.mdx` from disk, strip frontmatter, match the *literal* scaffolding strings, drop the word floor (Req 10.2).
- **F4 registry-relocated + triple-stated invariant (Compounding):** v3 states the `slashPages` invariant once; acknowledges config-vs-markdown trade (Decision #2); removes circular Req 6.2/6.3/10.1 restatement.
- **F5 authoring doc ungated / Req 9.3 dead words (Novel):** `check-authoring-docs.mjs` hardcodes one path. v3: firmly require parameterizing it to gate the new doc (Req 9.3) — no optionality.
- **Conclusion A:** `updated` made required on `now.mdx` specifically (Req 2.5, Req 10); stale-date tradeoff named in Decision #1.
- **Conclusion C / Add-5:** explicit `getNowPage()`/`getColophonPage()` guards mirroring `getAboutPage()` (Reqs 2.3, 3.2).
- Confirmed: **no v1 concept secretly reintroduced** (registry/git-date/parity/group/index appear only in disclaiming sections).

## v1 outcomes (for reference)

## Cumulative Findings Summary

### Accepted (resolved in v2)
- **3a Registry over-engineering** (v1): Cut `src/config/pages.ts` registry, `group` enum, `index` flag. Replaced with a minimal `siteConfig.slashPages` list. XML `sitemap.ts` left untouched.
- **3b XML double-emission of `/contributions`+`/resources`** (v1, Critical): Dissolved by cutting the registry-derived static set and the XML refactor.
- **3c Unimplementable route-existence test** (v1, Major): Cut; replaced with a `slashPages`-invariant test (six expected hrefs, non-empty title/desc).
- **4a Index-filter parity contradiction (Req 8.2 vs 6.1 vs 11.2)** (v1, Critical): Dissolved — parity test cut; `/sitemap` is no longer required to match `/sitemap.xml`.
- **4b Parity carve-out under-specified** (v1, Major): Dissolved with the parity test.
- **1a Uncommitted `now.mdx` breaks `pnpm dev`** (v1, Major): Dissolved — git-date transform dropped entirely; no git invocation introduced (Req 4.4).
- **1b `.transform` not additive / must merge** (v1, Major): Dissolved — now a pure field addition `updated: s.isodate().optional()`, existing transform untouched (Req 4.1).
- **1c git-date noise-prone semantic** (v1, Minor): Addressed — manual `updated` field is honest about meaningful updates (Decision #1).
- **5a `/sitemap`+`/slashes` indexability circular** (v1, Major): Accepted — both now `noindex` (Req 7.2, Decision #3).
- **2b "real seed content" untestable** (v1, Major): Added a placeholder-sentinel + min-word-count test (Req 10.2).
- **6a Footer already links `/slashes`** (v1, Major scope-honesty): Reframed Req 8 — only `/about`+`/now` links are new work; `/slashes` link is verify-existing.
- **6b Missing authoring doc** (v1, Major): Added `docs/slash-pages-authoring.md` (Req 9).
- **2a `/about` ~90% no-op** (v1, Minor): Reframed Req 1 criteria as verify-existing vs new.
- **6c `/sitemap` vs `/sitemap.xml` URL split** (v1, Minor): Clarified in Introduction and Req 5.

### Partially Accepted
- **5b Indexing sparse/volatile `/now` is a brand risk** (v1, Minor): `/now` kept indexable (recruiters benefit from finding it), but mitigated by the non-placeholder seed floor (Req 10.2). Tradeoff documented (Decision #3).

### Rejected
- (none outright; v1 findings were largely accepted)

### Unresolved
- (none carried forward)

## Patterns & Themes
- v1's central theme: the author over-engineered (registry + XML refactor + git transform + parity tests) against the user's explicit "keep it boring" instruction, and the over-engineering *introduced* correctness bugs the simpler design lacks. v2 systematically cut complexity.
- Secondary theme: scope-honesty — several v1 requirements asserted work that already exists. v2 labels verify-existing vs new.

## Guidance for Next Review (v2 / r2)
- **Do NOT re-litigate the cut registry or git-date** — they are gone. Re-raising them is Recurring only if v2 secretly reintroduced them.
- **Focus on the NEW v2 surface**: (1) the `slashPages` list living in `siteConfig` — is config the right home, does it bloat `site.ts`, typing? (2) the placeholder-sentinel/min-word test (Req 10.2) — is it brittle/false-positive-prone (e.g. legitimately short `/now`, the word "TODO" appearing in prose, the ≥40-word floor being arbitrary)? (3) `/now` `updated` field semantics — stale-date risk now that it's fully manual (the opposite failure mode from v1). (4) `/sitemap` non-parity — does "human convenience page that may silently omit pages" create its own problem? (5) authoring-doc Req 9.3's "optional CI wiring" — is that a real gate or dead words? (6) any contradictions introduced by the v2 rewrite. (7) the seed-content test reading MDX bodies — how does it read compiled vs raw MDX, and does that coupling break on Velite changes?
- Well-covered, low-value to re-examine: the indexability decision, the footer scope.
