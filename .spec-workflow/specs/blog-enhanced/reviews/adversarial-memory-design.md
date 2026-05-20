# Adversarial Review Memory — design
Last updated: 2026-05-20 (after v3 review)

## Cumulative Findings Summary

### Accepted (resolved across v2/v3)
- **Pagefind crawl `--site URL` ambiguity** (v1): replaced with `wget --mirror + pagefind --site ./out` (v2).
- **Pagefind UI custom-vs-default-ui** (v1): reversed to `@pagefind/default-ui` (v2). ~30KB lazy cost accepted.
- **`PROD_LIKE_PORT` centralization** (v1): reversed to three duplicated literals with grep-audit comments (v2). Aligns with CLAUDE.md "DO NOT over-engineer."
- **`<CopyButton />` UTF-8 decode** (v1): fixed via `TextDecoder` + `Uint8Array.from(atob(...))` (v2).
- **rehype-pretty-code text-extraction fidelity** (v1): plugin reordered BEFORE `rehype-pretty-code`; uses `hast-util-to-text` (v2).
- **`data-copy-source` RSS bloat** (v1): stripped from `bodyHtml` via regex in `safeBodyHtml` (v2). Test added (v3).
- **CI gating semantics for "deploy without search"** (v1): Error Scenario 4 rewritten (v2).
- **`always() && expr` canonical form** (v1): adopted (v2).
- **`Check Vercel auto-deploy status` pinned in YAML** (v1): pinned with explicit step block (v2).
- **`verify-vercel-token` issue-close `.[0]` bug** (v1): fixed via label-based close-all loop (v2).
- **`fixture-search` SEO leak** (v1, P0): `Metadata.robots = { index: false, follow: false }` (v2) + `X-Robots-Tag` header chain (v3).
- **`/^fixture-/` regex false-positive** (v1): narrowed to `KNOWN_FIXTURE_SLUGS` exact-match Set (v2).
- **`getPublishedPosts()` allow-list enforcement** (v1): new verifier (v2) + file-level loophole closed via taxonomy module split to `src/lib/blog-taxonomy.ts` (v3).
- **Lighthouse 350KB guess** (v1, P0): measurement-during-implementation methodology + per-URL assertMatrix (v2).
- **Readiness timeout extended 90s→180s** (v1) (v2).
- **Port-conflict guard reframed as fail-fast diagnostic** (v1) (v2).
- **`fixture-search` is unreachable to wget `--mirror`** (v2, P0): `--input-file=./urls-extra.txt` enumerates hidden posts (v3).
- **wget extensionless output** (v2, P0): `--adjust-extension` added (v3).
- **No master timeout on `run-pagefind-crawl.mjs`** (v2): 600s `Promise.race` master timeout added (v3).
- **Per-button `aria-live` regions over-correction** (v2): single shared `<output aria-atomic="true">` (v3) — BUT has new architectural contradiction; see Unresolved.
- **`<meta robots>` alone vs `X-Robots-Tag` header** (v2): `next.config.ts` headers callback emits `X-Robots-Tag` (v3) — BUT introduces new clean-clone build break; see Unresolved.
- **`hiddenFromLists` semantic overload** (v2): `excludeFromSearch?: boolean` second flag added with truth table (v3).
- **Migration runbook step 1 "no behavior change"** (v2): explicit behavior-change list (v3).
- **ALLOWED_CALLERS file-level granularity** (v2): taxonomy helpers MOVED to non-allowlisted module (v3).
- **`git grep` regex matches JSDoc** (v2): per-line scan with comment-marker skip + word-boundary anchor (v3).
- **New verifier step ordering not pinned in YAML** (v2): pinned between Typecheck and Unit tests; `verify-ci-topology.mjs` updated (v3).
- **Language source-of-truth between `data-code-language` and `data-language`** (v2): `data-code-language` dropped; `data-language` is sole source (v3).
- **`<SiteSearch />` trigger as `<a href="#">`** (v2): pinned as `<button type="button">` (v3).

### Partially Accepted
(none — each revision has resolved findings or rejected them; no partial states currently.)

### Rejected
(none through v3 — every prior finding has been accepted to some degree, though several v3 "accepted" fixes introduce new issues per Unresolved.)

### Unresolved (raised in v3 review)
- **`next.config.ts` `import velite from "./.velite/index.js"` breaks on clean clone** (v3 §1 novel, P0): no postinstall hook configured in `package.json`; first-time `next build` fails with module-not-found.
- **`run-pagefind-crawl.mjs` `await import("./src/lib/build/derive-post-slug.js")` is broken** (v3 §6 novel, P0): source is `.ts`, no `.js` build output exists at that path. Same applies to `verify-pagefind-no-drafts.mjs`.
- **Task 0 spike tests the wrong pipeline** (v3 §2 novel, P0): runs against current `main` which has no `--input-file` usage and no hidden posts; validates the v2 happy path, NOT the v3 mechanisms.
- **`<CopyButton />` DOM-marker hydration cannot consume React context across `createRoot()` boundaries** (v3 §5 novel, P0): the `CopyStatusProvider` is dead code; copy buttons cannot write to the shared `<output>` region as the design specifies.
- **wget `--no-parent` is incompatible with mixed-entry-point crawling via `--input-file`** (v3 §6 novel, P0): may silently restrict link-walking from input-file URLs.
- **Spike's `npx -y pagefind@latest` vs pinned package.json version mismatch** (v3 §2 novel).
- **Spike has no enforcement artifact** (v3 §2 novel): no observable record confirms pass; gate is a polite request.
- **`urls-extra.txt` lifecycle not pinned** (v3 §6 novel): persists in repo after each crawl; not in `.gitignore`.
- **`extraSlugs` does not filter `excludeFromSearch: true` posts or drafts** (v3 §3 / §6 novel): hidden+excluded posts get fetched by wget anyway; local dev mode includes drafts.
- **No test for the four-row `(hiddenFromLists, excludeFromSearch)` truth table** (v3 §3 novel).
- **`X-Robots-Tag` header applies-to scope not explicitly stated** (v3 §1 novel): policy ambiguous for `excludeFromSearch: true` posts.
- **Pagefind's `data-pagefind-body`-absent semantics not pinned** (v3 §3 novel): without explicit `--root-selector`, Pagefind's default may index `excludeFromSearch: true` posts anyway.
- **`<output>` element vs `<div role="status">` SR-compatibility ambiguity** (v3 §5 novel).
- **`aria-atomic="true"` interacts poorly with the 1s clear-to-empty timeout** (v3 §5 novel): empty re-announcement is non-standard SR behavior.
- **Verifier comment-skip regex doesn't handle inline trailing `//` comments** (v3 §4 novel).
- **No Vitest test ensuring `verify-getPublishedPosts-callers.mjs` passes against current codebase** (v3 §4 novel).
- **`next.config.ts` typecheck against `.velite/index.d.ts` not verified** (v3 §1 novel): `velite.posts` may be typed `any`.
- **Velite transform failure now surfaces as `pnpm install` failure if postinstall hook is added** (v3 §1 novel): degrades operator diagnostic clarity.

## Patterns & Themes
- **"Pinned but not verified" is recurring across v1, v2, AND v3.** v1: Pagefind `--site URL`. v2: `wget --mirror`. v3: `next.config.ts` velite import (postinstall hook doesn't exist), `--input-file` mechanism (spike doesn't cover it), `CopyStatusProvider` (architecturally incompatible with hydration). The Task 0 spike was meant to break this pattern but tests the WRONG things, so the pattern continues. Recommend hard rejection of "pinned in design without proof-of-concept" in any v4.
- **Architectural contradictions between server-rendered and progressively-enhanced surfaces.** The `<CopyStatusProvider>` is a React context that cannot reach the DOM-hydrated copy buttons. This is a category of bug that has appeared TWICE now (v2's per-button regions had a similar isolation issue). The blog-enhanced design has TWO live regions of architecture — React components and DOM-marker progressive enhancement — and the boundary between them is poorly defined.
- **Each revision's fix introduces a new issue at the same architectural seam.** v1's shared region had `aria-describedby` misuse; v2's per-button regions had N-region overhead; v3's shared `<output>` has React-context-vs-DOM-hydration mismatch. The underlying problem is that copy buttons are NOT React-mounted, so any "let copy buttons consume React state" design is wrong by construction.
- **Cross-cutting tooling assumptions that don't hold.** v3 assumes velite has a postinstall hook (doesn't), assumes `.ts` files can be imported by `.mjs` scripts as `.js` paths (can't), assumes Velite's typed output is available in `next.config.ts` at build time (chicken-and-egg with the build sequence). Each assumption is plausible in isolation; collectively they form an implementation booby-trap.
- **Migration runbook is mature.** The step-by-step verification gates, rollback semantics, and grace-period handling are well-thought-through. Not flagged again.

## Guidance for Next Review (v4)
- **Focus on:** (1) `next.config.ts` velite import topology — does it work on a clean clone? (2) The `<CopyButton />` architecture — is the React context actually reachable? (3) Task 0 spike scope — does it test what v3 changed? (4) The `.ts`-imported-as-`.js` issue in `.mjs` scripts. (5) `data-pagefind-body`-absence semantics under Pagefind 1.x defaults — this has been assumed but never confirmed.
- **Well-covered, do not re-examine:** Pagefind UI choice (`@pagefind/default-ui` is correct); `PROD_LIKE_PORT` duplication; UTF-8 decode; migration runbook structure; `KNOWN_FIXTURE_SLUGS` exact-match audit; `--adjust-extension` flag; CI gating semantics with `always() && expr`; the language-source-of-truth pin (only `data-language` now); label-based issue close; readiness timeout + last-status reporting.
- **Specifically require empirical evidence in v4:** (a) actual `pnpm install && next build` log from a clean clone, OR a `try/catch` fallback in `next.config.ts`. (b) actual proof that `createRoot()` rendered copy buttons can consume the `CopyStatusProvider`, OR the architecture is rewritten to drop React context. (c) actual Task 0 spike output that tests `--input-file` against an unlinked URL, OR the spike is rewritten. Without these three empirical artifacts, v4 design SHALL NOT be approved.
