# Adversarial Analysis — blog-enhanced/design (v1)

**Reviewer posture:** Staff engineer. Directive critique only. Validations are noted only to dismiss false leads quickly.

**Target:** `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/blog-enhanced/design.md` (949 lines, v1)

**Phase focus:** Feasibility, consistency, edge cases.

---

## Selected attack surfaces

### 1. Pagefind crawl orchestration (`run-pagefind-crawl.mjs`, Components and Interfaces → Search subsystem)

- **Stress-test the contradiction in the crawl strategy.** The design simultaneously documents two crawl mechanisms in the same paragraph: "`pagefind --site .next/static`" and then immediately overrides with "Design decision: crawl the running server via `pagefind --site http://localhost:${PROD_LIKE_PORT}`". The next sentence is "pin during implementation by reading the Pagefind docs against the pinned version." A pinned design that says "pin during implementation" is not pinned. Force a single mechanism with a single rationale, or split into Plan A / Plan B with a documented switch condition — but do not ship both in one bullet.
- **Challenge the claim that Pagefind can crawl a running URL via `--site`.** Pagefind's CLI `--site` flag takes a directory path, not a URL; the URL-crawl path is `pagefind --serve` or relies on the `--site` directory containing pre-rendered HTML. The design's "Pagefind crawls the running server; the `--site` argument is the static-output directory" is internally contradicted by "crawl the running server via `pagefind --site http://localhost:${PROD_LIKE_PORT}`". One of these is wrong. Verify against the Pagefind 1.x CLI reference BEFORE locking the orchestration; otherwise the entire Build-2 step group fails at `pnpm build:search`.
- **Stress-test the "spawn `next start` then crawl" coupling.** The script spawns `next start --port 3013`, polls for readiness, then runs the crawl. If Pagefind is in fact crawling the file system (not HTTP), the spawn is dead code. If Pagefind is crawling HTTP, then "kill via SIGTERM then SIGKILL after 5s" needs to account for: (a) the spawned process being a `pnpm` shim that does not forward signals to the underlying `next`; (b) Next.js's static cache being written to `.next/cache` mid-crawl if the dev/start process touches it; (c) Pagefind discovering paginated routes that Next.js generates lazily (ISR). None of these are mitigated.
- **Challenge the 90-second readiness timeout.** `next start` on a cold Vercel-style CI runner with a freshly-built `.next/` can take 20–40s; under CPU contention the budget is tight. There is no jitter, no exponential back-off in the 500ms poll, and no diagnostic capturing the last response status (so a "ready but 500" condition looks identical to "not yet bound"). Add HTTP status reporting on poll failure and bump the timeout to 180s, OR document explicitly why 90s is the right number.
- **Stress-test the port-conflict guard.** The design says "attempt to open a server on `PROD_LIKE_PORT`; if `EADDRINUSE` is received, exit." This is a TOCTOU race: by the time `next start` actually binds, another process may have grabbed the port. The guard adds zero safety in CI (the runner has no competing processes) and complicates local development (developer runs `pnpm dev` on 3013, then `pnpm build:search` and gets a confusing "port conflict" instead of a clean "stop your dev server first"). Either remove the guard or replace it with an "is anything already listening on 3013?" check that produces an actionable message.

### 2. The triple-source `PROD_LIKE_PORT` constant (Components and Interfaces → `scripts/run-pagefind-crawl.mjs`)

- **Challenge the claim that this is "single source of truth."** The design proposes one constant in `src/config/site.ts`, plus a duplicate literal in `lighthouserc.js` with a hand-written `// Mirror of PROD_LIKE_PORT…` comment, enforced by a new ~15-line `scripts/verify-port-constant.mjs`. That is THREE sources (TS constant, JS literal, a verifier). The "verifier" is itself code that needs maintenance and that does string-parsing on a config file. The user's CLAUDE.md says "DO NOT over-engineer". This pattern is the textbook example of over-engineering a config constant.
- **Challenge the wrapper-script trade-off.** Replacing `next start --port 3013` in `package.json` with `node scripts/start-prod-like.mjs` introduces a permanent runtime cost (process startup, dynamic import of TS via the ts loader, signal-forwarding) for the sake of avoiding one hard-coded literal. The "simpler alternative (`node -e`) was rejected as too ugly" — aesthetic preference is not engineering rationale. Reverse this decision: leave `package.json` with `--port 3013` literal, document that the literal is intentionally duplicated, and let the verifier (if it exists at all) scan a small allow-list of files for the literal.
- **Stress-test the "dynamic `import('@/config/site')` from a `.mjs` script" claim.** `tsconfig` path aliases (`@/`) do NOT resolve in plain Node ESM without a loader like `tsx`, `ts-node`, or `@swc-node/register`. `scripts/run-pagefind-crawl.mjs` will fail at import. Either change the script to `.mts` and run via `tsx` (adds tooling), import the constant from a `.js` build artifact (requires a build step), or duplicate the literal a third time. None of these is acknowledged.

### 3. `<CopyButton />` hydration via base64 `data-copy-source` (Components and Interfaces → `<CopyButton />`)

- **Challenge the claim that base64-encoded raw source survives the rehype pipeline cleanly.** The plugin orders itself "AFTER pretty-code (which transforms the inner `<code>` children)". By that point, `<code>` children are no longer plain text — they are nested `<span>` elements with syntax-highlighting class names. The plugin's `textOf(codeChild)` (extracting concatenated text nodes) will produce the original source ONLY IF rehype-pretty-code preserves all whitespace and emits no additional text nodes. Verify against a code block containing leading whitespace, blank lines, and tab-indented content. Otherwise, the "Copy" output will silently differ from what's displayed.
- **Stress-test the RSS-feed footprint of base64 source duplication.** Every code block emits `data-copy-source="<base64-of-source>"` in `bodyHtml`, which is what ships in `/feed.xml`. For a post with 5 code blocks averaging 500 bytes, base64 inflates that to ~3.4KB of attribute data per post in the RSS payload. Most feed readers strip unknown attributes, but the bytes are wasted. The "Copy button is inert in RSS" rationale doesn't require the `data-copy-source` attribute in RSS — only the rendered page needs it. Consider a server-component injection on the page only, or strip the attribute from `bodyHtml` before RSS render.
- **Challenge the assumption that `atob()` cleanly decodes UTF-8.** `atob()` returns a binary string; if the source contains non-ASCII characters (emoji in code comments, accented identifiers, CJK strings in test fixtures), the `atob()` output will be mojibake when written to clipboard. The correct decode is `new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)))`. The design's "client decodes via `atob()` and writes to clipboard" is wrong for any non-ASCII content.
- **Stress-test the `aria-describedby` "single shared live region" pattern.** The design says the live region has id `"copy-status-live"` and every copy button references it via `aria-describedby`. The live region announces "Copied!" but it serves multiple buttons simultaneously. If the reader clicks Copy on button A and Copy on button B within 2 seconds, the second click overwrites the live-region text, and the screen reader may announce "Copied!" only once. Worse, `aria-describedby` is for description, not status — `aria-live` regions don't need `aria-describedby` to fire announcements. The wiring is mis-conceived.

### 4. CI step ordering, gating, and the "deploys without search" path (Components and Interfaces → CI extensions)

- **Challenge the "Pagefind crawl failure" error-handling claim.** Error scenario 4 says: "The `Vercel deploy (Build 2)` step still runs (not gated on Pagefind output) — site deploys without search". This contradicts the YAML: `Vercel build` is gated only on `DEPLOY_VIA_CI == 'true'`, and `Vercel deploy` is also only gated on `DEPLOY_VIA_CI == 'true'`. There is NO chain that links Pagefind crawl failure to the deploy steps. A failed Pagefind crawl means the `Vercel build` step runs against a missing `public/pagefind/` directory, then `Verify Pagefind artifact in .vercel/output` (gated on `PAGEFIND_ENABLED != 'false'`) runs and fails because the source dir is missing. The "deploy continues without search" narrative is FALSE under the actual gating. Reconcile: either make the verify-artifact step truly optional via `continue-on-error`, or revise the error scenario to say "Pagefind crawl failure aborts the deploy unless the operator first sets `PAGEFIND_ENABLED=false`".
- **Stress-test the "Warn deploying without Pagefind" trigger.** The step condition is `vars.PAGEFIND_ENABLED == 'false' && always()`. The `always()` here is misplaced — `always()` is a status check function, not an additional gate. Used in combination with another expression it ORs with the implicit `success()`. Reference: per GitHub Actions docs, `if: always()` overrides default `success()`; combining with `&&` may yield unexpected truthiness. Verify the exact semantics OR drop `always()` and gate on event/ref alone.
- **Challenge the "DEPLOY_VIA_CI unset == false" assumption.** The migration runbook step 1 says "Merge the spec PR with `DEPLOY_VIA_CI` UNSET. No behavior change." But several new CI steps run unconditionally (`Pagefind crawl`, `Verify Pagefind index`, `Upload Pagefind manifest`) because they are gated only on `PAGEFIND_ENABLED != 'false'` (which defaults to true since unset). So on the first PR-merge, the previously-fast Build-2 group gains a ~30s Pagefind crawl, a verify step, and an artifact upload — all running on every push. This IS a behavior change (CI duration, possibly failure surface). Acknowledge it or gate the new Pagefind steps on `DEPLOY_VIA_CI == 'true'` too.
- **Stress-test the "Check Vercel auto-deploy status" gate as a pre-deploy hop.** The design inserts a new step "BEFORE `Vercel build`". The YAML in the design does NOT show this step inserted; it is described in prose only. The reviewer cannot verify the actual position. Pin the exact insertion point in the YAML block, or the implementer will guess.
- **Challenge the `Verify Vercel token` workflow's idempotent issue-close logic.** The `gh issue list --search "VERCEL_TOKEN auth check failed in:title is:open"` query: (a) doesn't escape the title; (b) returns up to N matches but the script only closes `.[0]`, leaving duplicates open if two failures happened back-to-back; (c) has no rate-limit handling. A flaky token causing 5 weekly failures will leave 5 open issues with the cleanup script perpetually closing one per success run. Use issue labels or a unique tag in the body, and `gh issue list --label ops --search …` then close ALL matches.

### 5. The `fixture-search` published-but-hidden contract (Overview, Integration Points)

- **Challenge the "reachable as a static page" coherence.** `fixture-search` is `draft: false` + `hiddenFromLists: true`. Per the design, it's:
  - excluded from `/blog` (filter through `getVisiblePublishedPosts`),
  - excluded from `/feed.xml`,
  - excluded from `sitemap.xml`,
  - excluded from taxonomy pages (`getAllTags` switched to visible-source),
  - but reachable at `/blog/fixture-search` via `getPostBySlug` (uses `getPublishedPosts`, the non-visible function).
  This is a four-way exclusion list maintained by hand. If someone later adds a new list context (e.g., `/blog/archives`, a homepage "recent posts" widget, an OpenGraph index), they will use `getPublishedPosts()` (the more obviously-named function) and the fixture will leak. The JSDoc warning is the only safeguard; it has no teeth. Pin a stronger contract: add a lint rule (custom ESLint) or a CI grep against `getPublishedPosts` outside an allow-list of call sites.
- **Stress-test the SEO consequences.** A live `/blog/fixture-search` page with content like "MATTHEWFIELD-SEARCH-SMOKE" is reachable by:
  - Google crawler (no `robots.txt` exclusion is mentioned).
  - Pagefind's own crawl (intentional).
  - Anyone who guesses the URL.
  If Google indexes the page, the smoke-phrase appears in search results for the site. Add `noindex` headers / `<meta name="robots" content="noindex">` to fixtures, OR exclude `/blog/fixture-*` from `robots.txt`. Neither is in the design.
- **Challenge the slug-prefix audit's escape hatch coverage.** The Velite check says `slug starts with 'fixture-' AND !draft AND hiddenFromLists !== true → throw`. Three escape options offered. But what about a legitimate post about Jest fixtures titled "Building fixture-driven tests" whose author chose the slug `fixture-driven-testing`? The check forces them to mark it `hiddenFromLists: true` (wrong) or `draft: true` (wrong) or rename the slug (annoying). Reserve a more specific prefix (`__fixture-`, `test-fixture-`, or `_fixture-`) or scope the check to slugs that exactly match the known fixture roster.

### 6. Lighthouse `total-byte-weight = 350KB` threshold (Testing Strategy → Lighthouse)

- **Challenge the 350KB number as "the blog-core baseline + 100KB enhancement budget."** Where is the 250KB baseline measured? Lighthouse reports "Total Byte Weight" including third-party scripts, images, fonts, and runtime JS. The blog-core baseline likely includes:
  - Tailwind's runtime CSS (~15–30KB after purge),
  - the Next.js framework chunk (~80–110KB transferred, gzipped),
  - the Geist font(s) (~20–40KB each),
  - hydration JSON,
  - the MDX-rendered content.
  Without a measurement, 250KB is a guess. The enhancement adds: `pagefind.js` (~50KB lazy, EXCLUDED per the design — good), `ReadingProgress` client island, `CopyURLButton`, `CopyButton`, the rehype-emitted wrappers (added HTML bytes on every code block). The new HTML weight alone could exceed 100KB on a code-heavy post (5 code blocks × ~500 bytes of source × base64 1.33 inflation = ~3KB of base64 + wrapper markup ≈ 5–10KB). The threshold is plucked from thin air. Run a real measurement on the current `main` against the four existing URLs and pin the threshold to baseline + measured-overhead + a 10% buffer.
- **Stress-test the "Pagefind UI excluded from page-load measurement" claim.** Lighthouse's `total-byte-weight` audit measures all bytes loaded by the page, including lazy-loaded resources fetched during the audit run. If Lighthouse's test runs interact with the search dialog (it shouldn't by default), Pagefind WASM gets counted. The design says "Pagefind UI is excluded from the page-load measurement because it lazy-imports on first dialog open" — this only holds if Lighthouse does NOT open the dialog. Verify the Lighthouse config explicitly does not interact with the dialog.

---

## Top 5 risks/gaps

1. **Pagefind crawl mechanism is internally contradictory and unverified.** The design pins both "directory crawl" and "HTTP crawl" in the same paragraph, with a fallback to "pin during implementation." This is a P0 blocker — the entire Build-2 step group depends on `pnpm build:search` succeeding, and the design provides no answer for which command to actually run. **Action:** verify Pagefind 1.x CLI semantics against `--site <dir>` vs HTTP crawl BEFORE implementation begins; pick one; rewrite the orchestration script section.

2. **CI gating semantics for "deploy without search" are mis-stated.** Error scenario 4 claims the deploy continues without search when Pagefind crawl fails, but the YAML gating doesn't support this — the `Verify Pagefind artifact` step runs unconditionally on `PAGEFIND_ENABLED != 'false'` and will fail. The operator-promised "single kill-switch" doesn't actually work as a recovery path post-crawl-failure. **Action:** rewire the gating with a `continue-on-error` on the crawl step + a separate "did the crawl succeed?" gate on the verify step, OR document that crawl-failure requires manually setting `PAGEFIND_ENABLED=false` and re-running.

3. **`<CopyButton />` UTF-8 handling and pretty-code text-extraction are silently broken.** `atob()` does not yield UTF-8; code blocks with non-ASCII content will copy mojibake. Plus, `textOf(codeChild)` runs AFTER rehype-pretty-code's span injection, and may not faithfully reconstruct source whitespace. **Action:** pin a UTF-8-safe decode (`TextDecoder` + `Uint8Array.from(atob)`), and add a unit test for code blocks containing non-ASCII chars, tabs, and trailing newlines.

4. **`fixture-search` SEO leak.** The page is publicly reachable with no `noindex` annotation, no `robots.txt` exclusion. A search engine will eventually index "MATTHEWFIELD-SEARCH-SMOKE" against the production domain. **Action:** add `<meta name="robots" content="noindex, nofollow">` to any post where `hiddenFromLists === true`, OR a sitewide `robots.txt` rule excluding `/blog/fixture-*`.

5. **`PROD_LIKE_PORT` three-source design over-engineers a literal.** A TS constant + a JS mirror literal + a verifier script is more code than the problem warrants. Combined with the `start-prod-like.mjs` wrapper, this introduces tooling fragility (TS path-alias resolution in plain `.mjs` doesn't work without a loader). **Action:** revert to the simplest pattern — hard-code `3013` in `package.json`, `lighthouserc.js`, and the crawl script; add it to an "intentional duplication" comment block in CLAUDE.md or the README; drop the verifier.

---

## Top 3 conclusions to challenge or reverse

1. **REVERSE: "Design SHALL pin… `pagefind --site http://localhost:${PROD_LIKE_PORT}` (crawl running server)."**
   The Pagefind 1.x CLI `--site` flag accepts a directory, not a URL (per Pagefind docs as of 1.x). The correct invocation is `pagefind --site <output-dir>` against a pre-rendered static directory, OR `pagefind --serve` (a wholly different command). Reverse the decision to "crawl HTTP via `--site URL`" — it is not a supported Pagefind invocation. Replace with a verified command after consulting the Pagefind 1.3+ docs.

2. **REVERSE: "Pagefind UI choice: ship our own minimal results UI rather than `@pagefind/default-ui`."**
   The rationale (saves 30KB, avoids Tailwind clash, simpler keyboard handling) is plausible but unmeasured. Building a custom Pagefind UI is non-trivial — keyboard navigation (ArrowUp/Down/Home/End), result-list virtualization at high result counts, accessible announcement of result-count changes, debounced input handling, no-results state, error state. The blog-core spec's stated priorities are stability and small surface area; reinventing a search UI when a maintained one exists is the opposite. Reverse to: use `@pagefind/default-ui` with minimal Tailwind overrides; revisit if the bundle measurement exceeds the budget.

3. **REVERSE: "the `start` script keeps `--port 3013` literal" combined with "Three consumers."**
   The design says the literal stays in `package.json` (good — boring, readable) but then immediately undermines that by replacing the `start` script with `node scripts/start-prod-like.mjs`. Pick one: either keep the literal (and drop the wrapper) or centralize the constant (and replace the literal). The hybrid is the worst of both worlds — duplicated literal AND a new wrapper script AND a verifier. Reverse to: keep `package.json` literal `--port 3013`, drop the wrapper, drop the constant centralization, accept three literal occurrences as "boring, readable" duplication.

---

## What's missing — work to do before acting on this document

- **Verify Pagefind 1.x CLI command surface.** Specifically: does `pagefind --site` accept a URL? Is `pagefind --serve` a separate command? What does `pagefind crawl` (referenced in line 17) actually do? Pin a single command sequence from current docs.
- **Measure the actual blog-core `total-byte-weight` baseline.** Run Lighthouse against `main` on the existing four URLs; record the median; set `350000` as `measured + headroom` not as a guess.
- **Demonstrate the rehype-pretty-code text extraction works for a code block with leading whitespace, blank lines, tabs, and Unicode.** A scrap unit test before locking the `rehypeCopyButton` design.
- **Decide on a noindex strategy for `hiddenFromLists` posts.** Add a `<meta robots="noindex">` insertion in `[slug]/page.tsx` for hidden posts, OR a `robots.txt` route.
- **Audit the GitHub Actions `if:` expression semantics** for the `Warn deploying without Pagefind` step. `vars.PAGEFIND_ENABLED == 'false' && always()` does NOT mean "run only when the var is false, always". Re-derive against the GH Actions function-evaluation rules.
- **Pin the exact `Check Vercel auto-deploy status` insertion point in the YAML block.** Currently described in prose only.
- **Resolve the contradiction** in the migration runbook step 1 ("no behavior change") vs the unconditional new Pagefind steps gated on `PAGEFIND_ENABLED != 'false'` (which is true by default).
- **Add a CI check that `getPublishedPosts()` is not called outside an allow-list** of files (`src/lib/blog.ts`, post-detail page, prev/next nav). Otherwise the `fixture-search` exclusion contract erodes with the next contributor.
- **Specify the `data-copy-source` lifetime in RSS payload.** Strip it from `bodyHtml` before feed render, or accept the ~2–4KB per code-heavy post in the feed.

---

## Items that are actually fine (noted briefly to dismiss)

- The Velite schema additions (`hiddenFromLists?: boolean`, `categories.max(3)`) are minimal and additive. Fine.
- The `RelatedPostMeta = PostMeta & Pick<Post, ...>` composition pattern is clean and matches the v4 requirement deferral. Fine.
- The `<ReadingProgress />` RAF-throttled implementation is the right primitive; the `prefers-reduced-motion` token swap is correct. Fine.
- Excluding share-bar, TOC, related rail, copy buttons via `data-pagefind-ignore="all"` is the right Pagefind hygiene. Fine.
- The two-axis Playwright matrix (Build 1 with drafts + Build 2 without) for TOC parity testing is a thoughtful addition. Fine.
- Reusing `<PostCard />` for the related rail (vs building a slim variant) is the right "boring" choice. Fine.
- The CSP audit conclusion ("no changes required" for Pagefind same-origin import + WASM) is correct under standard `script-src 'self'`. Fine.

---

## End of analysis
