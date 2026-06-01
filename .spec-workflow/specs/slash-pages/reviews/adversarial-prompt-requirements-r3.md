# Adversarial Review: slash-pages requirements (v3)

You are a senior staff engineer who ships content-driven static sites on Next.js App Router + Velite, with a reviewer's instinct for catching half-baked requirements before they cost an implementer hours. Your job is **not** to validate this document. **Tear it apart** — but this is the third review of a document that has already absorbed two rounds of fixes, so your bar is higher: find the *residual* defects, the problems the v3 fixes *introduced*, and anything genuinely blocking that survived. Be specific and concrete; cite failure scenarios, not abstract risks. **If the document is in fact ready for design, say so plainly** — do not invent issues to fill a quota. Manufactured nitpicks waste everyone's time; a clean "this is ready, here are at most a couple of optional polish items" is a valid and valuable verdict at this stage.

Read the target document in full first:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/requirements.md`

Ground your attack in the project's actual constraints:
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md` (§8 Slash Pages, §10 Dark/Light)
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/spec-decomposition/decomposition.md` (spec #7)

**Verify v3's new claims against live code — do not take them on faith.** Inspect at least:
- `src/lib/format-date.ts` — v3 (Req 2.2, Decision #5) asserts the displayed `/now` date must be rendered in a fixed UTC frame and that `formatContentDate` is TZ-naive. Confirm the exact current implementation and whether passing `timeZone: "UTC"` to it is even possible without changing its signature (it constructs its own `Intl.DateTimeFormat` internally — can a caller inject a timezone, or does Req 2.2 silently require *modifying the shared helper*, which would affect blog/projects rendering?). This is the highest-value thing to check: does the v3 fix as specified actually have a clean implementation path, or did it just relocate the problem?
- `velite.config.ts` — `posts.updated: s.isodate().optional()` (~line 100) and how `/blog` renders post dates today. If `/blog` already renders `posts.updated`/`date` via the same `formatContentDate`, then **the off-by-one bug v3 "discovered" already ships in production on the blog** — meaning either (a) it's not actually a bug in practice (investigate why — maybe dates are authored with time, maybe SSR-on-Vercel-UTC masks it), or (b) v3 is fixing it for `/now` only while leaving the identical bug in `/blog`, an inconsistency worth flagging. Determine which.
- `scripts/check-authoring-docs.mjs` — v3 Req 9.3 commits to parameterizing `main()` over a `{ path, headings }` list. Confirm the pure `checkHeadings` core is genuinely reusable and that this is a small change, not a rewrite. Check whether any existing test imports/depends on the current `main()` shape such that parameterizing it breaks them.
- `src/config/site.ts` — confirm the `SiteConfig` type can take a `slashPages: {href,title,description}[]` cleanly and that nothing else (e.g. a config-shape test) pins the current shape.

## Analysis dimensions

### 1. The v3 timezone fix (Req 2.2, Req 10.4, Decision #5) — did it actually land, or relocate?
- Stress-test the implementability: `formatContentDate(iso)` builds its own formatter with no `timeZone`. Req 2.2 says "pass `timeZone: 'UTC'` to the formatter **or** use a date-only formatter." The first option requires editing the shared helper (blast radius: every consumer); the second requires a *new* formatter the spec doesn't name or locate. Challenge whether Req 2.2 is actually actionable or just punts the real decision to the implementer with two hand-wavy options.
- Req 10.4 asserts a test under "at least `TZ=UTC` and `TZ=America/Toronto`." Vitest sets `TZ` per-process; you cannot change `TZ` mid-test cleanly. Challenge whether this test is realistically implementable (does it require `process.env.TZ` manipulation + module re-import, or running the suite twice under different `TZ`?). If the mechanism is non-trivial, the spec should say how.
- If `/blog` already ships the same off-by-one (verify), challenge the *scope* decision: why fix `/now` and not the shared helper? Either the bug is real (fix it once, centrally, benefiting blog too) or it isn't (then Req 2.2's UTC mandate is cargo-culting). Force consistency.

### 2. Required-`updated`-on-`now.mdx` (Req 2.5, Req 10.3) — enforcement reality
- Req 2.5 says the `/now` route treats missing `updated` as a build error, but the schema field is `.optional()` collection-wide (Req 4.1). So the enforcement lives in route code (`getNowPage()` must check `updated` presence), not the schema. Confirm the spec actually *says* `getNowPage()` validates `updated` — or does Req 2.3's "structurally identical to `getAboutPage()`" (which only checks entry existence, not field presence) contradict Req 2.5's stronger requirement? `getAboutPage()` does NOT check any optional field. "Structurally identical" + "also enforce `updated`" may be contradictory instructions. Find the seam.

### 3. The seed-content literal-sentinel test (Req 10.2) — is it meaningful now?
- v3 narrowed sentinels to the two literal scaffolding strings (`"Placeholder content."`, `"Replaced in a downstream spec."`). Challenge whether this test now asserts anything useful: it only fails if someone ships the *exact* current placeholder. The moment Matthew writes one real sentence, it passes — even if the rest is `"TODO finish this."`. Is this test now so weak it's theatre? Weigh that against v2's over-brittle version — did v3 overcorrect into uselessness? Is the right answer to cut the test entirely (the build guard + human review suffice) rather than ship a near-tautology?
- Note `about.mdx`'s current placeholder body is `"Placeholder content. Replaced in a downstream spec."` — so the test as written would pass the moment `/about` is given any non-placeholder prose, which is the point, but confirm the two strings are actually the ones in the scaffolding and the frontmatter-strip step is specified well enough to implement.

### 4. Residual scope / convention gaps
- Re-examine the `/sitemap` value question one more time: it's `noindex`, lists every post/project, has E2E + theme coverage. Decomposition spec #7 *does* mandate an HTML `/sitemap`, so it can't simply be cut — but challenge whether listing all dynamic content (vs. just linking to `/blog` and `/projects` index pages) is warranted, or whether a leaner `/sitemap` (sections + slash pages + "see /blog, /projects") satisfies the decomposition with less surface.
- Check the Velite `pages` schema change for cross-spec collision: `velite.config.ts` is a shared file. Does adding `updated` to `pages` risk anything for the existing `about.mdx` (no `updated`) or future page specs? (Req 4.2 claims backward-compat — verify the `.optional()` truly makes existing entries valid.)
- Accessibility/SEO: with `/sitemap` and `/slashes` `noindex` but still in the **XML** `sitemap.ts` `routes` array (which v3 leaves untouched), the site now advertises two `noindex` URLs in its XML sitemap. Is that the pre-existing inconsistency v1 flagged, now knowingly retained? Confirm whether v3's "leave `sitemap.ts` untouched" silently re-accepts the very inconsistency v1's registry was partly meant to fix, and whether that's an acceptable, documented trade or an unacknowledged regression of intent.

### 5. Internal consistency after three rewrites
- Hunt for stale cross-references, contradictory acceptance criteria, or decisions that no longer match requirement bodies after the v3 edits (e.g. renumbered Req 6/Req 10 items, "verify-existing" labels, Decision list vs. Req text). Flag any reference that points at the wrong number or a cut concept.

## Prior Review Context

Two prior reviews ran. **Resolved — do NOT re-litigate unless v3 regressed them:**
- v1: registry over-engineering, XML double-emission, parity contradiction, git-date transform, circular indexability, missing authoring doc, `/about` no-op honesty — all cut/fixed in v2.
- v2/r2: `/now` date off-by-one (→ v3 UTC fix), `/sitemap` omits Home (→ v3 adds Home + link-200 E2E), brittle sentinel test (→ v3 literal-string + raw-file read), triple-stated `slashPages` invariant (→ v3 states once), ungated authoring doc (→ v3 firmly gates it), `updated` made required on `now.mdx`, explicit `getNowPage()`/`getColophonPage()` guards.

Classify each of YOUR findings as **Novel** / **Compounding** / **Recurring** (escalate severity for Recurring). Spend your energy on: whether the v3 timezone and gating fixes are *actually implementable as specified* (not just asserted), the `getAboutPage()`-identical-vs-also-check-`updated` seam (dimension 2), whether the narrowed sentinel test is now worthless, and any internal inconsistency from three rounds of edits. **A short report concluding "ready, with N minor polish items" is the expected and acceptable outcome if the document has genuinely converged.**

## Closing deliverables
- **Top risks/gaps** (as many as are real — could be as few as 2–3 if the doc has converged), ranked, each with a concrete failure scenario and Novel/Compounding/Recurring tag.
- **Conclusions to challenge or reverse** (if any remain).
- **What's missing** — or an explicit statement that nothing blocking remains and the document is ready for the design phase.

Write your complete analysis to:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-analysis-requirements-r3.md`
