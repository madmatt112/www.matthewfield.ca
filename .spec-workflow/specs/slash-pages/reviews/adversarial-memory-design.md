# Adversarial Review Memory — design
Last updated: 2026-06-01 (after v3 review)

## Cumulative Findings Summary

### Accepted
- **`s.isodate()` does not pin to midnight (r1 §1):** re-serializes whatever author wrote (`velite/dist/index.js:140`); time-of-day shifts UTC-pinned display day. v2 scoped benign claim to date-only + authoring rule. v3 added the `!/T/` test gate — **r3 verified it lands** (design.md:168,488; raw-file frontmatter parse sees the literal string, NOT the transform output, so `/T/` matches). RESOLVED.
- **Blast-radius list incomplete (r1 §1):** `/resources`+`/contributions` also re-export `formatContentDate`. v2 corrected to "six consumers / four sections". Consistent across r2+r3.
- **Self-test rewrite under-specified — two red-test traps + control-flow contradiction (r1 §3):** v2 literal diff spec; r2 re-verified 3 pure-core edits, per-doc `writeDocs`, report-all `main()`. RESOLVED.
- **`export type SlashPage` typo (r1 §5):** fixed.
- **Console/CSP E2E false-positive surface (r1 §4):** v2 added error-level-only + prod-server. v3 removed the Pagefind sub-carve-out — **r3 verified** the re-cite to `site-search.tsx:55-83` is correct (fetch gated inside `if(!open) return` effect; slash E2E never opens dialog). RESOLVED.
- **Three asserted-but-unverified criteria (r1 §6):** `toHaveTitle`, colophon `rel`, Req 1.5. v3 reframed each per r2; **r3 verified all land** (see Resolved-in-v3).

### Partially Accepted
- (none)

### Rejected
- (none)

### Resolved in v3 (all r2-unresolved items — r3 verified each against live code)
- **Date `!/T/` test gate** added (design.md:168,488). Raw frontmatter parse reads literal string. VERIFIED.
- **Pagefind carve-out removed**, re-cited to `site-search.tsx:55-83` (fetch inside dialog-open effect at `:80`; early-return `:56-61`). VERIFIED.
- **Real `description` strings** for `/sitemap` (design.md:237) + `/slashes` (:259). VERIFIED (no `"…"` remains).
- **Zero-byte assertion pinned to ONE form** `=== <subjectDoc>.headings.length` (design.md:385); `writeDocs` body shown deriving dir from `rel` (:370-377). VERIFIED against live `test.mjs:34,104`.
- **Colophon `rel` selector `http(s)`-only** + corrected NFR narrative (footer DOES have `_blank` links carrying `noreferrer`) (design.md:504). VERIFIED against `footer.tsx:12-27`.
- **`toHaveTitle` reframed as genuinely-new** (design.md:39,502); `(site)/layout.tsx` bare SiteShell, no title override → template resolves. VERIFIED.
- **XML citations `19-20`** (design.md:51,293); `/about`=15,`/now`=18 stay. VERIFIED against live `sitemap.ts` (about=15,contact=16,colophon=17,now=18,sitemap=19,slashes=20).
- **Focus-ring source stated honestly:** no global `:focus-visible` in `globals.css`. VERIFIED (grep exit 1).

### Unresolved (raised in r3)
- **(BLOCKER, Novel) Seed content + authoring doc don't exist and gate the design's own build/tests/CI (r3 §B):** `content/pages/` has only a PLACEHOLDER `about.mdx` (body still `"Placeholder content. Replaced in a downstream spec."`); `now.mdx`/`colophon.mdx` and `docs/slash-pages-authoring.md` do not exist. The seed-sentinel test (Req 10.2), `!/T/` test, module-load throws, two-doc CI gate (`ci.yml:49`), and `next build` all go RED until authored. The design narrates these as regression guards, not the INITIAL state this spec must clear, and never sequences authoring as an in-spec prerequisite. Reframe `/about` "verify-existing" — its placeholder body must be replaced (authoring work).
- **(Low, Novel) `MDXContent` server-vs-client ambiguity (r3 §D):** `new Function(code)(runtime)` (`mdx-content.tsx:11`) under a no-`unsafe-eval` CSP (`next.config.ts:69` = `'wasm-unsafe-eval'` only) LOOKS like a client CSP violation on the now-live MDX routes, but `MDXContent` is a server component (no `"use client"`) so eval is SSR/build-time — identical to the path `/about` already ships. Benign; add one clarifying line.

## Patterns & Themes
- **v3 closed every r2-unresolved item, and r3 verified all seven fixes land against live code and are internally consistent across Revision-notes / Architecture / Testing-Strategy.** The "v2 mitigations weaker than their prose" pattern (r2's theme) is gone.
- The architecture has been re-confirmed sound and over-build-free across THREE rounds (no registry, no parity normalizer, `pages` import allowed, leaf `siteConfig`, inline link lists, hermetic self-test, correct `force-static`, honest "zero added client JS").
- The remaining gap shifted from "design reasoning" to "execution sequencing": the spec's own gates depend on content/docs that don't exist yet, and the design treats those red states as regressions rather than the starting state.

## Guidance for Next Review (r4 — likely UNNECESSARY)
- **The document has converged. Do NOT open r4 to manufacture nits.** The seven r2 fixes are verified landed; the architecture is sound for three rounds. r3 explicitly declined to invent a fourth structural objection.
- **The ONLY action items are:** (1) sequence the three seed `.mdx` files + the authoring doc as gated in-spec prerequisites (reframe `/about` body as authoring work, not verify-existing); (2) one line noting `MDXContent` is server-side so the eval path isn't mistaken for a client CSP risk.
- **Well-covered, do NOT re-litigate:** all seven r2 fixes (verified landed in r3), the architecture shape, the `pages` chokepoint exemption, the self-test hermeticity, `force-static` correctness, the `new Function`/CSP non-issue, the "zero added client JS" wording.
- If r4 happens at all, its only legitimate job is to confirm the seed content / authoring doc were authored and the build/CI go green — i.e. an implementation-verification pass, not a design teardown.
