# Adversarial Analysis: slash-pages requirements (v3, round 3)

**Verdict:** Close, but **not yet ready** — one concrete blocking defect (a test the spec's own Req 9.3 change will break), and two consistency gaps the v3 edits introduced or knowingly retained without saying so. The timezone fix and the gating fix are *directionally* sound and have clean implementation paths, but two of their stated mechanics are wrong on the facts. None of these is a rewrite; all are surgical. After they're addressed this is ready for design.

All claims below were verified against live code.

---

## Top risks / gaps (ranked)

### 1. Req 9.3 as written will break the existing `check-authoring-docs.test.mjs` CLI suite — **Novel, blocking**

Req 9.3 / Decision #6 commit to parameterizing `main()` over a `{ path, headings }` list and adding `docs/slash-pages-authoring.md` to that list. The pure core (`checkHeadings(text)`, `CANONICAL_HEADINGS`) is genuinely reusable and importing it is safe — but the spec asserts this is "a small change" and stops there. It misses that the script's existing self-test (`scripts/check-authoring-docs.test.mjs`) pins the *single-doc CLI contract*, not just the pure core:

- `checkHeadings` / `CANONICAL_HEADINGS` are imported (lines 17, 23) — fine.
- But five CLI tests (lines 61–108) `spawnSync` the real script in a tmp dir that contains **only** `docs/contributions-and-resources-authoring.md` and assert exit codes / stdout:
  - "all headings present → exit 0, no stdout" (line 61) writes *only* the contributions doc. Once `main()` iterates a list that also includes `docs/slash-pages-authoring.md`, the script hits the not-found branch for the missing slash-pages doc and exits non-zero → **this test fails**.
  - "doc missing → non-zero exit, stderr, no annotation" (line 85) and "zero-byte doc → per-heading warnings, warningCount === CANONICAL_HEADINGS.length" (line 97) both assume one doc and one heading set; the warning-count assertion is tied to a single doc's heading list.

**Concrete failure scenario:** Implementer parameterizes `main()` exactly as Req 9.3 says, adds the slash-pages doc to the list, runs `node --test scripts/check-authoring-docs.test.mjs` — the contributions-only CLI tests now fail because the script also looks for the slash-pages doc that the synthetic tmp dirs never create. Implementer is now editing a *neighbouring spec's* test file with no instruction to do so.

**Fix:** Req 9.3 must explicitly call out updating `check-authoring-docs.test.mjs` to drive the parameterized list (e.g. each CLI fixture writes all docs in the list, or the tests are restructured to assert per-doc), OR specify that `main()` takes the doc-list as an argument so tests can inject a single-doc list and the production `process.argv[1]` entry passes the real two-doc list. As written, "small change, pure core already supports it" is true of the *library* but false of its *test surface* — and the spec's own scope honesty (Decision #7) demands naming that.

---

### 2. The `/now` off-by-one already ships on `/blog` and `/projects` — v3 fixes one consumer and silently leaves the identical bug in three others — **Recurring (escalated), unacknowledged inconsistency**

Verified: `formatContentDate` (`src/lib/format-date.ts`) builds one module-level `Intl.DateTimeFormat("en-CA", …)` with **no `timeZone`**, and `formatContentDate(iso)` does `format(new Date(iso))`. `formatPostDate` and `formatProjectDate` are literal re-exports of it (`src/lib/blog.ts:87`, `src/lib/projects.ts:76`, asserted by `format-date.test.ts:27-32`). And those *are* rendered against `s.isodate()` values:

- `src/app/(site)/blog/[slug]/page.tsx:73,75` — `formatPostDate(post.date)` and `formatPostDate(post.updated)`.
- `src/components/blog/post-card.tsx:13`, `related-posts.tsx:16` — `formatPostDate(post.date)`.
- `src/app/(site)/projects/[slug]/page.tsx:71`, `project-card.tsx:16`, `updated-badge.tsx:8` — `formatContentDate` on `project.date`/`updated`.

`posts.date` and `posts.updated` are `s.isodate()` (`velite.config.ts:97,100`), i.e. exactly the midnight-UTC values v3 says render a day early in `America/Toronto`. **So the off-by-one v3 "discovered" already ships in production on the blog and projects** — and v3's Decision #5 scopes the fix to `/now` only, leaving the shared helper TZ-naive.

This forces the consistency question the review demanded:
- If the off-by-one is a *real* bug (v3 asserts it is, with a worked example), then the right fix is **central**: pass `timeZone: "UTC"` to the shared `contentDateFormatter` (or add a date-only formatter and route all `s.isodate()` consumers through it), fixing blog/projects too. Fixing only `/now` ships the *same* user-visible "May 28" bug on every blog post and project the moment a Canadian visitor loads it — an inconsistency that's strictly worse than the status quo because now the codebase has two date-rendering behaviours.
- If it *isn't* a real bug in practice (e.g. Vercel SSR runs in UTC so production never shows the prior day, and the only exposure is local dev in a Canadian zone), then Req 2.2's UTC mandate is cargo-culting and the TZ-independence unit test (Req 10.4) is guarding a non-problem on `/now` while ignoring it everywhere else.

Either way, v3's *scope decision is the gap*: the requirement neither fixes the bug centrally nor states "we are knowingly leaving the identical bug in blog/projects because X." Recurring (this is the v2→v3 date thread) and escalated, because v3's fix as scoped *introduces* a two-behaviour inconsistency rather than resolving the underlying one.

**Recommendation:** Change Req 2.2 / Decision #5 to fix `formatContentDate` centrally (add `timeZone: "UTC"`), make Req 10.4's TZ-independence test cover the shared helper, and note the blast radius is benign (every consumer wants the calendar date, not a zone-shifted one). This is *less* code than a `/now`-only special-case formatter and removes the inconsistency instead of multiplying it.

### 2a. Req 2.2's two-option phrasing punts the real decision — **Compounding**

Beyond scope: Req 2.2 says the implementer SHALL "either pass `timeZone: 'UTC'` to the formatter **or** use a date-only formatter that does not round-trip through a zone-shifting `new Date()`." Option one is impossible without editing the shared module-level `contentDateFormatter` (it's a const closed over by the function; a caller cannot inject `timeZone`) — which *is* the central fix in finding 2, and which the requirement elsewhere implies is out of `/now`'s scope. Option two requires a *new* formatter the spec never names or locates. So Req 2.2 offers two options where one silently requires touching the shared helper (contradicting the `/now`-only framing) and the other invents an unspecced artifact. Collapsing to the central fix (finding 2) eliminates this ambiguity.

---

### 3. Req 10.4's TZ-independence test mechanism is unspecified and not trivially implementable in Vitest — **Novel, should-fix**

Req 10.4 mandates a unit test proving the rendered string is "the 29th … under at least `TZ=UTC` and `TZ=America/Toronto`." But `Intl.DateTimeFormat` resolves the *ambient* zone at construction, and `contentDateFormatter` is a module-level const constructed once at import. `process.env.TZ` only affects `Date`/`Intl` defaults at process start (and on V8 requires it be set before the first `Date`/`Intl` use). You **cannot** flip `TZ` mid-test and have the existing module-level formatter pick it up — and `format-date.test.ts` line 1 explicitly forbids `vi.resetModules()` in that file, so re-importing under a new `TZ` there is off-limits.

If the fix is the *central* `timeZone: "UTC"` (finding 2), the test becomes trivially correct and TZ-independent **by construction** — you don't even need to vary `TZ`, because a UTC-pinned formatter ignores ambient zone; one assertion "May 29, 2026" suffices. So this finding largely dissolves under finding 2's recommendation. But *as currently specified* (vary `TZ` across two zones), the requirement hand-waves a non-trivial mechanism (separate process per `TZ`, or a fresh formatter constructed inside the test with an injected zone). The spec should either adopt the central fix and drop the "vary TZ" language, or state the actual mechanism (e.g. "construct a UTC `Intl.DateTimeFormat` in the test and assert it ignores `TZ`," or "run the case in a `TZ`-overridden child process").

---

### 4. The `getNowPage()` "structurally identical to `getAboutPage()`" vs. "also enforce `updated`" seam — **Novel, real but resolvable**

Verified: `getAboutPage()` checks **only** entry existence (`pages.find(slug==="about")` → throw if absent). It checks no optional field. Req 2.3 says `getNowPage()` SHALL be "structurally identical to the existing `getAboutPage()`." Req 2.5 says the `/now` route SHALL treat a missing `updated` as a build error. These are in tension: a *structurally identical* guard does **not** check `updated`; enforcing `updated` requires an *extra* check `getAboutPage()` doesn't have.

This is not fatally contradictory — "structurally identical" can be read as "same shape: a named throwing build-time guard" and the `updated` check is an added clause — but the document never reconciles them in one place. As written, an implementer who reads Req 2.3 literally writes the existence-only guard and satisfies Req 2.5 *only* via the Req 10.3 unit test (which asserts `now.mdx` carries `updated`). That unit test runs in Vitest, not at `next build`, so Req 2.5's stronger "the **route** treats missing `updated` as a **build error**" is then unmet — the build would happily render a dateless `/now` (the `<time>` render would just produce `formatContentDate(undefined)` → "Invalid Date", a silent ugly failure, not a build throw).

**Fix:** Make Req 2.3 say `getNowPage()` mirrors `getAboutPage()`'s *existence* check **and additionally** throws a named error when `entry.updated` is absent — and stop calling it "structurally identical" (it's "structurally analogous, plus an `updated` presence check"). Then the build-time guarantee in Req 2.5 actually has a home in route code, and the Req 10.3 unit test is the CI belt to the build's braces.

---

### 5. The narrowed sentinel test (Req 10.2) is near-tautological theatre — **Compounding (v2→v3 overcorrection)**

Confirmed: the only placeholder string in the repo is `content/pages/about.mdx` body `"Placeholder content. Replaced in a downstream spec."` — so the two literal sentinels Req 10.2 names are correct and present. But the test now asserts almost nothing: it fails *only* if someone ships those exact two strings. The moment `about.mdx`'s body becomes any other prose — even `"TODO: write this. Replaced soon."` — it passes. For `now.mdx`/`colophon.mdx`, which are *new* files that will never contain the scaffolding strings, the assertion is vacuously true from creation. v2's version was over-brittle (generic words + a 40-word floor false-positive on real prose); v3 overcorrected into a check that the build guard already covers (the route throws if the entry is missing) and that human review covers better.

This is not blocking — a near-tautology is harmless — but it's worth a deliberate call: either (a) cut Req 10.2 entirely and rely on the build guard + review (the honest move, consistent with the user's "don't over-engineer"), or (b) keep it but state plainly in the requirement that its *only* job is to prevent re-shipping the *specific current* `about.mdx` placeholder verbatim during the index-flip, which is a genuine (if narrow) regression it catches. Right now the requirement oversells it as a "non-placeholder floor"; it's a "didn't-forget-to-replace-this-one-file" guard. Pick the framing.

---

### 6. XML sitemap still advertises two `noindex` URLs — knowingly retained, but not documented as such — **Recurring, minor**

Verified: `src/app/sitemap.ts` `routes` array lists `/sitemap` (line 19) and `/slashes` (line 20). v3 makes both `robots: { index: false }` (Req 7.2, Decision #3) and leaves `sitemap.ts` untouched (Decision #2). Net effect: the XML sitemap continues to advertise two URLs that the pages themselves tell crawlers not to index — a "submit a noindex URL in your sitemap" signal Google Search Console flags as a coverage warning. This is the pre-existing inconsistency v1's registry was partly meant to resolve; v2 cut the registry, and v3 inherits the inconsistency.

This is an *acceptable* trade (removing two lines from a hand-maintained array is cheap, but so is shipping the warning), but the document doesn't acknowledge it. The "Explicitly out of scope" / Decision #2 text says "the XML sitemap is left untouched" without noting that leaving it untouched *re-accepts* the noindex-in-sitemap inconsistency. **Fix (one sentence):** add to Decision #2 or #3 an explicit note: "Consequence: `/sitemap` and `/slashes` remain in the XML `routes` array while being `noindex`; this Search-Console coverage warning is knowingly retained as not worth a `sitemap.ts` edit this spec." Then it's a documented trade, not an unacknowledged regression of v1's intent.

---

## Conclusions to challenge

- **Decision #5 ("render `/now` in a fixed UTC frame")** — challenged by finding 2. The decision is right that the bug exists; it's wrong to scope the fix to `/now`. Reverse to a central `formatContentDate` fix; it's less code and removes (rather than creates) an inconsistency.
- **Req 2.3's "structurally identical"** — challenged by finding 4. Soften to "structurally analogous plus an `updated`-presence throw," or Req 2.5's build-time guarantee has no implementation.
- **Req 9.3's "small change, pure core already supports it"** — challenged by finding 1. True of the library, false of the test surface; the requirement must name the test update.

## What's missing (summary)

1. **Blocking:** Req 9.3 must name the `check-authoring-docs.test.mjs` update (finding 1).
2. **Should-fix:** central vs. `/now`-only timezone fix decision + matching the test mechanism (findings 2, 2a, 3).
3. **Should-fix:** reconcile `getNowPage()` "structurally identical" with the `updated` build-error mandate (finding 4).
4. **Minor/polish:** re-frame or cut the sentinel test (finding 5); document the retained noindex-in-XML-sitemap trade (finding 6).

## On the things the review told me to confirm clean

- `src/config/site.ts` (`SiteConfig`): the type takes a `slashPages: { href; title; description }[]` field cleanly; no config-shape test pins the current shape (no test references `SiteConfig`'s key set). **Clean — no objection.**
- Velite `pages` schema add (`updated: s.isodate().optional()`): genuinely additive; `about.mdx` has no `updated` and `.optional()` keeps it valid; the `pages` schema is *not* `.strict()` (unlike `posts`/`projects`), so even a stray field wouldn't throw. Backward-compat claim (Req 4.2) holds. **Clean.**
- `checkHeadings` pure core reusability: confirmed reusable; the *core* parameterizes trivially. The breakage is in the CLI tests, not the core (finding 1).

These three are not manufactured nits — I'm explicitly confirming them clean per the brief.

---

**Bottom line:** One blocking item (finding 1), two should-fix consistency seams the v3 edits opened (findings 2/4), and two minor polish items (5/6). This is a converged document with a handful of *real* residual defects, not a pile of nitpicks — fix finding 1 and pick a side on findings 2 and 4, and it's ready for design.
