# Adversarial Review — professional-profile/design.md (round 3, convergence)

You are a principal engineer specializing in Next.js App Router (Next 16 / React 19), web security, and build pipelines, brought in for a final pre-build teardown. Your job is to find weaknesses, not to validate. This document has been through two prior adversarial rounds and the author has absorbed nearly everything with concrete code. That makes your job harder and more important: the remaining defects are *second-order* — bugs introduced by the fixes themselves, and drift between the doc's many edits. Do not manufacture severity to look productive; if the document has genuinely converged, say so plainly and keep your findings proportionate. But scrutinize the new mechanisms hard — fixes are where fresh bugs hide.

Read before writing:
- Target: `.spec-workflow/specs/professional-profile/design.md`
- Requirements: `.spec-workflow/specs/professional-profile/requirements.md`
- Steering: `.spec-workflow/steering/product.md`, `.spec-workflow/steering/tech.md`, `.spec-workflow/steering/structure.md`
- Prior-round ledger: `.spec-workflow/specs/professional-profile/reviews/adversarial-memory-design.md`
- The feature is ALREADY IMPLEMENTED. Inspect the live code (`src/app/api/contact/route.ts`, `src/lib/mail.ts`, `src/components/shared/contact-form.tsx`, `velite.config.ts`, `next.config.ts`, `vercel.json`, `e2e/`) and judge the design against what ships, not just its prose. Where code and design diverge, cite the code.

## Prior Review Context

Two rounds done. **v1** forced build-time correctness (git transform, Velite guard, CSP mechanism). **v2** found the seams v1's fixes opened (the `testId`→`X-Test-Id` trust boundary, the racy double-submit guard) and the untested behavioral requirements (Req 4.3/4.4). **v3** (the document you are reviewing) addressed all of v2:
- `testId`→`X-Test-Id` forward gated behind `NODE_ENV !== 'production'` + a route step-8 catch-all sanitizing any unexpected throw → 502.
- Synchronous `inFlightRef` `useRef` double-submit latch.
- Mock `POST /__mode?testId=&status=` error-forcing control; new E2E for validation-error, server-error-recovery, Enter-key, and JS-submit-stays-JS.
- `Origin: null`/unparseable normalized to absent (both-absent allow path); Origin-check value reframed as near-zero CSRF on a credential-free endpoint.
- `.max()` schema bounds; `force-static` kept (Req 1.9 pins it) with `'error'` flagged as a req-refinement; doc-precision notes for `vercel.json`, cold-path budget, the `unknown` error bucket, headshot-present, StrictMode `CustomEvent`.

**Do NOT re-discover any of the above.** Classify every finding as **Novel** / **Compounding** (extends a prior finding v3 didn't fully close) / **Recurring** (a prior issue still open — there should be none; if you find one, that is significant).

## Analysis Dimensions

### 1. Second-order defects in v3's new mechanisms
- **The `NODE_ENV` gate's reach.** The gate is meant to dead-code-eliminate the test seam. Verify both halves: (a) server-side, does `process.env.NODE_ENV !== 'production'` actually evaluate correctly in a Next 16 route handler at runtime (it does on Node — confirm), and (b) **client-side**, the `contact-form.tsx` read of `window.__TEST_ID` and the inclusion of the `testId` body field — is *that* actually gated/DCE'd in the production *client bundle*, or does the production client still ship the `window.__TEST_ID` read and still send a `testId` field that the (now-gated) server ignores? If the client still sends it, is that harmless or does it re-open any surface? Cite the live `contact-form.tsx`.
- **The `inFlightRef` latch reset.** Trace the `finally` that resets `inFlightRef.current = false`. On the 12s client-abort / network-failure path, does the `finally` run so the user can resubmit, or can a user get permanently latched out (ref stuck `true`) after one aborted attempt? What about an exception thrown *synchronously* before the try/finally is entered?
- **The `__mode` `timeout` sentinel.** The design says it makes the mock "hang past the 9s server abort." Does that actually exercise the route's `TimeoutError`/503 path, or does the hung socket instead trip Playwright's own action/test timeout first (producing a test failure, not a 503 assertion)? Is the 9s server abort even reachable in the E2E environment, or only in unit tests?
- **The Origin normalization may over-open.** v3 treats `Origin: null` as absent → allowed. Construct whether an attacker can now trivially send `Origin: null` (or omit Origin) to bypass the check entirely. Reconcile this with the design's own "credential-free, so it doesn't matter" claim — is the document now internally inconsistent (simultaneously relying on the check for "cheap friction" AND making it trivially bypassable)? Either the check is worthless (then say so and stop dressing it up) or it has value (then `Origin: null`→allow guts it). Force the design to pick one story.

### 2. Document-internal consistency after three rounds of editing
- **The submission-flow mermaid sequence diagram** (the `sequenceDiagram` block) encodes the OLD error mapping. Does it still match the v3 step-8 catch-all (the new "any other thrown value → 502" branch) and the `unknown` client bucket? Flag every place the diagrams, the prose pipeline, the Error Handling section, and the new "Adversarial Review Response Log" disagree. Stale diagrams after heavy edits are a real drift risk.
- **Cross-references that may have rotted.** v3 added forward/backward references ("see the mock-tenancy production-gating note", "see step 8", "r2-§N"). Verify each referent exists and says what the pointer claims.
- **Req↔design number drift.** Confirm the Req numbers the design cites (3.5a–g, 4.3/4.4/4.5/4.8, 1.9, 3.8, 3.10, 6.1) actually map to the requirements those clauses describe; a miscited Req number is a silent traceability bug.

### 3. Requirements coverage r1/r2 did not sweep
- **NFR sections.** Read the requirements' non-functional sections (performance/Lighthouse budget, observability, reliability, accessibility beyond what's tested). Does the design discharge each with a concrete mechanism, or cite-without-mechanism? Specifically: is there a Lighthouse/perf budget the contact form's client JS or the headshot `<Image>` could blow that the design never addresses?
- **`source` enum silent-swallow.** The handler normalizes `source` via `z.enum(['profile','contact']).optional().catch(undefined)`. A malformed/absent `source` becomes `undefined` → subject "from unspecified". Is there a Req that expects `source` to be reliable (e.g. for funnel analytics)? Silent coercion of a tampered `source` may be fine for email but wrong if any Req treats `source` as trustworthy signal.
- **`/contact` vs `/profile` metadata distinctness** (Req 6.x): the design gives `/profile` a canonical and a distinct description; confirm `/contact`'s metadata is actually distinct and that neither accidentally indexes/deindexes wrongly after the placeholder `robots:{index:false}` removal.

### 4. The testing strategy's residual honesty
- v3 added a lot of E2E. Now check the *opposite* failure: does the design now *over*-promise coverage it cannot deliver? E.g. the JS-submit `framenavigated` test — will it actually catch a native submit, or could a same-origin native POST to `/api/contact` (which `JSON.parse`-fails → 400) produce a navigation the test's `framenavigated` listener races against the assertion? Scrutinize whether each new test actually asserts what it claims.
- The unit-test abstention for `<ContactForm />` stands. With the new E2E cases, is anything STILL uncovered that matters (e.g. the `inFlightRef` double-submit latch itself — is there a test that two rapid submits produce exactly one POST)? If the latch is the v3 headline fix, is it tested?

### 5. Anything genuinely new
- Any failure mode, security seam, build-determinism issue, or a11y defect not touched in three rounds. Headshot `<Image>` LCP/CLS on the wide profile page; the `react-obfuscate` client-bundle cost; CSP interaction with `next/image` optimization; the `content/profile.mdx` MDX body's allowed components vs the no-registry `<MDXContent />` decision.

## Deliverables

Conclude with:
- **Top 5 risks/gaps** (or fewer if the doc has converged — do not pad), ranked, each tagged Novel/Compounding/Recurring, each with a concrete failure scenario and a specific minimal fix.
- **Top 3 conclusions to challenge or reverse**, with reasoning.
- **What's missing** before this design is build-ready.
- **An explicit convergence verdict**: is design v3 ready to build, ready-with-minor-edits, or does it still have a blocking defect? Say which.

Be specific and concrete. Cite exact inputs/timelines/files. If something is fine, say so in one line and move on. Do not invent severity.

Write your complete analysis to: `.spec-workflow/specs/professional-profile/reviews/adversarial-analysis-design-r3.md`
