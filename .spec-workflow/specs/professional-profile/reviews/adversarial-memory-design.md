# Adversarial Review Memory — design
Last updated: 2026-06-02 (after v3 review → v4 produced)

## Round 3 outcome (v3 → v4)
Round 3 reviewed v3 against the LIVE CODE and found the design's prescriptions correct but the v3 Response Log dishonestly presented them as shipped — the feature was built against v2 and the code lacks the v3 fixes. Five drift items confirmed against code (R1 testId gate absent + R2 catch-all absent = live prod Req-3.10 vector; R3 inFlightRef absent; R4 __mode + 4.3/4.4/4.8 + JS-submit E2E absent; R5 Origin-null normalization absent; R6 .max() bounds + 413 string). v4 resolution: kept all (reviewer-endorsed) design prescriptions, rewrote the Response Log to separate *specified design* from *implementation status*, and added an "Implementation Status & Required Remediation" table (R1–R6 with file:line refs) routing code-conformance to the implementation phase. Also fixed doc accuracy: documented the `<AvatarPlaceholder>` absent-branch, corrected the 4-file E2E inventory, loosened the `Headers`-constructor claim, added LHCI URL-set confirmation, and annotated the `__mode` 9s-vs-expect-timeout trap. v4 submitted for approval. **The loop's job (design → v4) is complete; R1–R6 are open against the CODE and must be picked up as implementation/remediation tasks.**

## Cumulative Findings Summary

### Accepted (addressed in v2, then v3)
**From v1 (all landed, verified against live code in r2):** `execFileSync`+`--follow` git transform, multi-tenant `testId`-partitioned mock, `getResendClient()` sanity guard, `Retry-After: 60` Vitest assertion, reduced-motion Playwright test, `THEME_STORAGE_KEY` export, dropped broken `setExtraHTTPHeaders` CSP pass, mail-provider-filter launch prerequisite, `structure.md` drift docs, edge-middleware considered-and-rejected, honeypot silent-200.

**From v2 review → fixed in v3:**
- **`testId`→`X-Test-Id` ungated in prod** (r2-§1): now gated behind `NODE_ENV !== 'production'` AND a route step-8 catch-all sanitizes any unexpected throw → 502 (closes the CRLF-`testId`→unhandled-500 / Req 3.10 vector and the trust-boundary crossing).
- **Racy double-submit guard** (r2-§3/§4): replaced stale-closure `state.kind` check with a synchronous `inFlightRef` `useRef` latch.
- **Req 4.3/4.4/4.8 untested** (r2-§4): mock gains `POST /__mode?testId=&status=` error-forcing control; new E2E for validation-error UX, server-error recovery UX, and Enter-key semantics. "Playwright covers the wiring" overclaim removed.
- **JS-vs-native submit regression** (r2-§6, recurring/escalated): added `framenavigated` + no-`action`-attribute behavioral test.
- **Origin: null false-403** (r2-§2): `null`/empty/unparseable Origin normalized to absent → both-absent allow path. Origin-check value honestly reframed (near-zero CSRF benefit on credential-free endpoint; retained per Req 3.5b + as cheap friction; wildcard width correct).
- **Minor (r2-§4/§5/§3)**: `.max()` bounds on profile string fields; `vercel.json` shell precedence verified + zero-fetch-failure-signal documented; cold-path 9s/10s budget caveat + ~8s tuning lever; `unknown` server-error bucket documented; headshot-present branch noted as known untested; StrictMode dev-double-fire of success `CustomEvent` flagged.

### Partially Accepted
- **`force-static` vs `'error'`** (r2-§5): Req 1.9 literally pins `force-static`, so v3 keeps it and documents `'error'` as a candidate *requirements* refinement (the requirement's stated intent — surface accidental dynamic-API usage — is better served by `'error'`, but the design conforms to the approved req rather than contradicting it). Not a design defect; a req-level note.

### Rejected / Confirmed sound (no change, reasonable)
- Stale-in-flight-fetch overwriting newer state (r2-§3): bounded by the re-entry guard; A settles before B starts. No fix; r2 agreed the design over-worried it. (Watch: a future refactor removing the guard reopens it with no test.)
- Clear-on-success ordering (r2-§3): success branch doesn't render inputs, so no stale-value-under-focused-heading render. Clean.
- `*.vercel.app` wildcard width: correct on a credential-free endpoint (tightening only adds false-403s).

### Unresolved (carry into r3)
- None outstanding from v1/v2 — every prior finding is either fixed in v3 or consciously dispositioned with rationale. The v1 carry-forward (JS-submit regression test) is now CLOSED in v3.

## Patterns & Themes
- v1 = build-time correctness; v2 = the seams the v1 fixes introduced (testId trust boundary, racy guard) + the untested behavioral requirements (4.3/4.4). The author absorbs findings with concrete code each round and is now reviewing against live implementation.
- The design doc is converging: v3 added a "Adversarial Review Response Log" section. Remaining risk surface is *secondary effects of v3's own new mechanisms* (the `__mode` mock control, the `inFlightRef` latch, the `NODE_ENV` gate, the Origin normalization) and any req↔design or design↔code drift r2 did not reach.

## Guidance for Next Review (r3)
This is the convergence round. Do NOT re-litigate v1/v2 findings — all fixed or dispositioned. Hunt for:
- **Second-order defects in v3's new mechanisms**: Does the `NODE_ENV` gate actually dead-code-eliminate in the *client* bundle (the `window.__TEST_ID` read in `contact-form.tsx`), or only server-side? Does `process.env.NODE_ENV` read correctly in a Next 16 route handler vs. edge? Does the `inFlightRef` `finally` reset correctly on the network-abort path (12s) so a user is never permanently locked out of resubmitting? Does the `__mode` `timeout` sentinel actually exercise the 9s server abort, or does the mock just hang the socket past Playwright's own timeout?
- **The Origin normalization**: does treating `null` as absent now *over*-open the endpoint (any attacker can send `Origin: null` to bypass)? Reconcile with the "credential-free → it doesn't matter" claim — but verify there is no inconsistency where the design simultaneously relies on and dismisses the check.
- **Req↔design completeness** r2 didn't fully sweep: NFR sections (performance/Lighthouse, observability, reliability), `/contact` vs `/profile` metadata distinctness, the `source` enum `.catch(undefined)` swallowing a malformed `source` silently.
- **Internal consistency of the doc after 3 rounds of edits**: contradictions between the new Response Log, the body sections, and the mermaid diagrams (e.g. the sequence diagram still shows the old error mapping; does it match the new step-8 catch-all?). Stale diagrams are a real drift risk after heavy editing.
- If genuinely converged, say so plainly and keep findings proportionate — do not manufacture severity.
