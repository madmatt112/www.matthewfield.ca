# Adversarial Review — professional-profile/design.md (round 2)

You are a principal engineer with deep Next.js App Router, React 18 concurrency, web-security, and Velite/build-pipeline experience, brought in to tear apart a feature design before it is built. Your job is to find weaknesses, not to validate. Assume the author is smart and will defend every choice — your value is in the gaps they cannot see. Do not soften findings. If a section is genuinely sound, say so in one line and move on; spend your words on what is broken, underspecified, or dangerous.

Read these files before writing anything:
- Target: `.spec-workflow/specs/professional-profile/design.md`
- Requirements (the contract this design must satisfy): `.spec-workflow/specs/professional-profile/requirements.md`
- Steering: `.spec-workflow/steering/product.md`, `.spec-workflow/steering/tech.md`, `.spec-workflow/steering/structure.md`
- If useful, inspect the actual repo (`src/`, `velite.config.ts`, `next.config.ts`, `e2e/`, `package.json`, `node_modules/velite`) to ground claims in installed reality rather than assumption.

## Prior Review Context

This design has had ONE prior adversarial round (v1 → v2). The v2 document on disk already incorporates the v1 findings. Read `.spec-workflow/specs/professional-profile/reviews/adversarial-memory-design.md` for the full ledger. In short, v1 already forced and the author already fixed: `execFileSync` + `--follow` in the git transform, a multi-tenant `testId`-partitioned mock-Resend, the `getResendClient()` sanity guard, the `Retry-After: 60` test assertion, reduced-motion Playwright verification, `THEME_STORAGE_KEY` pinning, the dropped broken `setExtraHTTPHeaders` CSP pass, the mail-provider-filter launch prerequisite, `structure.md` drift docs, and the "considered and rejected: edge middleware" section.

**Do NOT re-discover those. They are resolved with concrete code.** For every finding you raise, classify it as:
- **Novel** — not identified in any prior review.
- **Compounding** — deepens or extends a v1 finding in a way v2 did not fully close.
- **Recurring** — a v1 issue v2 knowingly left open; escalate its severity because it was a deliberate carry-forward.

Spend your effort on the dimensions below, which target v2's *new* surface area and the seams the author introduced while fixing v1.

## Analysis Dimensions

### 1. The `testId` → `X-Test-Id` forwarding seam (the v2 fix that may have opened a new hole)
The multi-tenant mock works by having `<ContactForm />` read `window.__TEST_ID`, send it as a JSON body field `testId`, and having the production route handler read `parsed.testId` *before* zod `.strip()` and forward it as an `X-Test-Id` header on the outbound fetch to `${RESEND_BASE_URL}/emails`.
- Challenge the claim that this is benign in production. A hostile client can POST `{name,email,message, testId: "<anything>"}` to the real `/api/contact`; the handler forwards an attacker-controlled string as a request header to the real `api.resend.com`. Enumerate the header-injection / request-smuggling / log-poisoning consequences. Does `fetch` reject CRLF in header values, or does it depend on runtime? Is there any value of `testId` that changes Resend's behavior or the upstream proxy's?
- The design reads `parsed.testId` directly, bypassing the validated/stripped body. Is there any path where `parsed` is not the shape assumed (e.g. `testId` is an object, array, or number) that throws or coerces oddly when set as a header?
- Argue whether the test seam should exist in production code at all. A cleaner design gates the forward behind `process.env.NODE_ENV !== 'production'` or build-time dead-code elimination. The design currently ships the test hook into the production bundle and route. Is that acceptable, or is it a "test code in prod" smell that should be designed out?

### 2. The `*.vercel.app` blanket Origin/Referer suffix match
The handler accepts any request whose `Origin`/`Referer` host ends in `.vercel.app`.
- Construct the concrete attack: can a third party obtain a `*.vercel.app` host (their own Vercel project) and cause a victim's browser to send that as `Origin` to *our* deploy in a way that matters? Walk through whether the both-absent fallback + the wildcard together actually weaken the CSRF posture vs. a tight per-deploy allowlist. The design argues the wildcard "would not improve security" — stress-test that claim with a real scenario.
- If the endpoint has no credentials/cookies, is the entire Origin/Referer check security theater that only adds 403 failure modes for legitimate edge cases (privacy-proxy browsers that strip Referer, `Origin: null` from sandboxed iframes or certain redirects)? Enumerate the false-403 cases for real users and weigh them against what the check actually buys.

### 3. React 18 form-state machine correctness
The form holds TWO `useState` values: a `FormState` discriminated union AND a sibling `{name,email,message}` field-values object, plus an `attemptId` counter, with a focus/scroll/CustomEvent `useEffect` keyed on `[attemptId, state.kind]`.
- StrictMode double-invoke (dev) and effect re-run semantics: does keying on `[attemptId, state.kind]` fire the success-side-effect (clear inputs, move focus, `scrollIntoView`, `dispatchEvent`) exactly once, or can a StrictMode remount or a concurrent re-render double-fire the `CustomEvent` / double-scroll?
- The in-flight fetch uses a 12s `AbortController`. If the user clicks "Try again" (server-error → submitting) while a prior aborted/slow fetch is still settling, is there a race where the stale fetch's `.then` resolves and overwrites the newer state? The early-return guard only blocks while `kind==='submitting'` — trace the interleaving where response A lands after a transition out of and back into `submitting`.
- Field values are cleared on success but "preserved" on error. Where exactly does the clear happen relative to the state transition and the focus effect — is there a render where the inputs show stale values with the success heading already focused?
- `aria-disabled` + in-handler guard instead of native `disabled`: confirm the guard actually prevents double-submit given React event batching, and that a keyboard user pressing Enter twice rapidly cannot slip two POSTs through before the first `setState('submitting')` commits.

### 4. Requirements ↔ design traceability holes
Read requirements.md in full and hunt for requirements the design does not actually satisfy or only gestures at:
- Every Req referenced in the design (1.x, 3.x, 4.x, 6.x, NFR-*) — does the design's mechanism actually discharge it, or does it cite the Req number without a concrete mechanism? Flag citation-without-mechanism.
- Find requirements the design does NOT mention at all. (e.g. analytics/observability, rate-limiting expectations, content/SEO requirements, the `/contact` slash-page requirements vs `/profile` differences, headshot/`s.image()` handling when `headshot` is absent, the `availability`/`location` fields' rendering and length constraints.)
- The design says `<ContactForm />` is NOT unit-tested with jsdom and the only behavioral coverage is Playwright. Is there a Req whose acceptance criterion is now untestable or untested under this strategy?

### 5. Build/runtime edge cases v2's fixes did not close
- The `vercel.json` `buildCommand`: `"git fetch --deepen=1000 || git fetch --unshallow || true && pnpm build"` — analyze the shell precedence. Does `&& pnpm build` bind only to the `|| true` branch, or to the whole chain? Could `pnpm build` be skipped (or run after a failed fetch) due to `||`/`&&` precedence? Write out how `sh` parses this exact string.
- `export const dynamic = 'force-static'` on a page that composes a client component which POSTs to a route handler at runtime — confirm nothing in the static-export path breaks the runtime POST, and that `force-static` is even the right directive vs. default static rendering.
- The 9s server abort vs the 12s client abort vs the Vercel 10s function cap: walk the timeline for a Resend call that takes 9.5s. Which timer fires, what status does the client see, and does the design's claim ("503 reaches the client cleanly") actually hold given the function may be killed at 10s before the catch path's response is flushed?

### 6. The surviving Unresolved item — escalate
- v1 raised, and v2 declined, any test that asserts the form's submit path stays JS-driven (i.e. no native `<form action>` fallback / `event.preventDefault()` is actually called). The CSP smoke is structurally incapable of catching this regression. Make the case for why this is now a HIGHER-severity gap than in v1 (it is the one knowingly-open hole), propose the minimal Playwright assertion that closes it, and challenge the design's framing that it is acceptable.

## Deliverables

Conclude with:
- **Top 5 risks/gaps**, ranked, each tagged Novel/Compounding/Recurring, each with a concrete failure scenario (not an abstract risk) and a specific, minimal fix.
- **Top 3 conclusions to challenge or reverse**, with reasoning — decisions in v2 you believe are wrong, not merely improvable.
- **What's missing** — work that should be added to the design before it is built.

Be specific and concrete. Cite failure scenarios with the exact input/timeline/host that triggers them. If something is actually fine, say so briefly and move on.

Write your complete analysis to: `.spec-workflow/specs/professional-profile/reviews/adversarial-analysis-design-r2.md`
