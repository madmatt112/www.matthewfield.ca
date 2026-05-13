# Adversarial Analysis: professional-profile tasks.md

The decomposition is detailed, but several places collapse multiple shippable units into one checkbox, several requirements have no task pointing at them, and the phase ordering documents directories and constants well before the code that justifies them. The most consequential failures are around **task 17** (a single checkbox hiding ~6 surfaces), **missing CI infrastructure** (LHCI, axe-core install, sitemap verification), and **task 24's local-only verification** masquerading as end-to-end coverage.

## 1. Task atomicity — INVEST-S violations

### Task 8 (Velite schema + content in same commit) — partial defense, oversold constraint

The same-commit rule (Req 1.14) is real but does **less work than the task claims**. Re-read Req 1.14: "schema-first commits fail Velite's missing-file check; content-first commits fail TypeScript at first import." The TS-at-first-import claim assumes `/profile/page.tsx` already imports `profile` from `#site/content`. In this task list, that page does not exist until task 18 — six tasks later. So `content/profile.mdx`-first lands fine; nothing imports `profile` yet.

That means the actual atomic core of task 8 is narrower than the task body claims. A cleaner split:

- **Task 8a**: Add the `profile` collection definition (schema + transform with `execFileSync`/`--follow`/named-error) to `velite.config.ts` **without registering it in `defineConfig.collections`**. The collection is dormant: Velite ignores it; the build is unaffected.
- **Task 8b**: Land `content/profile.mdx` **plus the `collections: { pages, profile }` registration** in one commit. This is the actual atomic unit — registering single-doc-with-pattern requires the file to exist, and vice versa.

Splitting this way preserves the Req 1.14 invariant (registration + file land together) and makes the schema/transform reviewable on its own merits (the named-error contract, the `--follow` choice, the `execFileSync` security argument). Bundling all of it forces a reviewer to evaluate frontmatter copywriting and a security-conscious shell-bypass decision in the same diff.

The task prompt's "content-first leaves the `profile` collection unregistered (Velite ignores the file silently and `/profile/page.tsx` references an undefined collection)" — again, this only matters once task 18 lands. The chronology is wrong inside the task body.

### Task 11 (API route — nine pipeline steps) — legitimately atomic for compile, but tests aren't

Nine pipeline steps in one `POST` function is large but the function itself is genuinely one reviewable unit — you cannot land "size cap + origin check" and then "honeypot + zod" across two PRs without the in-between commit being a broken handler. So the *handler* is atomic.

The *tests* in task 12 are not. Task 12 enumerates ~12 test cases (oversize, honeypot, four zod-failure variants, malformed JSON, four non-plain-object variants, happy path, 503-with-Retry-After, four origin-check classes). Splitting task 12 into:

- **12a**: oversize / malformed / non-plain-object / happy-path cases (request-shape tests)
- **12b**: zod-field tests (per-field validation)
- **12c**: honeypot + source-normalization + origin-check tests (security-pipeline tests)
- **12d**: 503-with-`Retry-After` + 502 mapping (error-mapping tests)

…makes the test suite reviewable in chunks that map to distinct failure modes. Any one of these slices passing without the others is meaningful coverage progress.

The under-the-hood concern: a 12-case Vitest file is large enough that the `_Prompt`'s "all cases pass" success criterion becomes a yes/no signal that doesn't surface which branch slipped. The implementer ticks the checkbox after writing them all; a reviewer cannot easily tell whether the 503-with-`Retry-After` assertion is present (the regression-without-it would silently violate Req 3.8 per the task's own warning).

### Task 17 (ContactForm) — worst offender, ~6 independent surfaces

Task 17's body lists at least the following responsibilities, several of which are independently shippable:

1. **DOM skeleton**: form, three labeled inputs (`<Label htmlFor>`, native `required`, no `aria-required`), submit button, honeypot positioned via `display:none`.
2. **Form-state machine**: discriminated union, 5 variants, `attemptId`-keyed effect.
3. **Submission pipeline**: JSON POST, 12s `AbortController`, source from props, `window.__TEST_ID` hook.
4. **Focus management transitions**: three distinct effects (success → focus h2, validation-error → focus first invalid, server-error → focus role=status).
5. **Reduced-motion-aware `scrollIntoView`**: runtime media-query read.
6. **Server-error UI**: heading + "Try again" button + LinkedIn `<a>` recovery CTA + 429/502/503/504/network mapping.
7. **`contact_submit_success` CustomEvent dispatch**.

Of these, 1, 2, 3, and 6 must land together for the form to work at all. But 4 (focus management), 5 (reduced-motion), and 7 (CustomEvent) are observably independent: a focus-management bug doesn't break submission; a missing CustomEvent dispatch doesn't break the success state; a smooth-scroll regression for reduced-motion users doesn't affect anyone else.

Proposed split:

- **17a**: DOM skeleton + state machine + submission + LinkedIn recovery CTA + status-code mapping (the form-works core).
- **17b**: Focus management for all three transitions (the keyboard-a11y surface).
- **17c**: Reduced-motion-aware `scrollIntoView` + non-rotating "Sending…" indicator (the motion surface).
- **17d**: `contact_submit_success` CustomEvent dispatch on success transition (the observability hook).

This also fixes the trace problem: when task 23's reduced-motion E2E case fails, the implementer can't tell whether the regression is in 17b or 17c without re-reading the entire 60-line task body.

### Task 23 (CSP + axe + reduced-motion in one file) — colocation hides orthogonal failure modes

Three independent test classes share one file:

- CSP smoke (security): asserts zero `securitypolicyviolation` events across click-to-reveal + submit on `/profile` and `/contact`.
- axe-core/playwright (a11y, two themes): asserts WCAG 2.1 AA clean against four page+theme combinations.
- Reduced-motion (motion-correctness): asserts no smooth-scroll AND `animationName === 'none'` on the role=status indicator.

These three fail for entirely unrelated reasons. An axe-rule regression (e.g. an obscure `region` rule firing on the success message) does not block the CSP guarantee or the reduced-motion guarantee from being landed/re-landed independently. Colocating them creates a single point-of-failure for E2E review: any flake on any surface blocks the whole file from being green, which in turn blocks the wrapper script from passing `pnpm test:e2e` in task 24.

Three separate files (`contact-csp.test.ts`, `contact-axe.test.ts`, `contact-reduced-motion.test.ts`) would land in parallel under the same wrapper, each owning its own diagnostic surface.

## 2. Requirement coverage — what's missing from tasks

The following requirements have **no task delivering them** (or are absorbed into tasks too vague to enforce):

### NO TASK delivers `@lhci/cli` CI integration (Req-NFR-Performance)

Req-NFR-Performance is explicit: "`@lhci/cli` SHALL run as a non-blocking CI job that executes against the Vercel preview deploy for the PR and posts the four scores as a PR comment." There is no task that:

- Adds `@lhci/cli` as a devDependency.
- Adds a GitHub Actions workflow file (`.github/workflows/lhci.yml` or equivalent).
- Configures the LHCI manifest (`lighthouserc.json`) to hit the Vercel preview URL and post a PR comment.

Task 24 runs `pnpm build` locally; that is not Lighthouse, that is not non-blocking, and it does not post a PR comment. **Minimum addition**: a new task "Add `@lhci/cli` CI workflow targeting Vercel preview URL, post four scores as PR comment". Satisfies Req-NFR-Performance.

### NO TASK installs `@axe-core/playwright` (Req 4.10)

Task 23's prompt uses `new AxeBuilder({ page }).withTags(...)`. `AxeBuilder` comes from `@axe-core/playwright`. Task 14 installs `react-obfuscate` and shadcn primitives, but nowhere installs `@axe-core/playwright`. The task author probably assumes this is implicit in "install missing primitives," but `@axe-core/playwright` is not a shadcn primitive and not in task 14's scope. **Minimum addition**: extend task 14 to `pnpm add -D @axe-core/playwright`, OR add a dedicated task "Install @axe-core/playwright". Without this, task 23 cannot import `AxeBuilder` and the test file won't compile.

### NO TASK delivers DMARC tightening reminder (Req 3.6 14-day calendar reminder)

Req 3.6: "Matthew SHALL set a 14-day post-launch calendar reminder to review DMARC aggregate reports; tighten to `p=quarantine` (and later `p=reject`) only after observing clean alignment for at least two weeks." This is operational, but it is in the requirements with a SHALL. Task 2 sets up `p=none` SPF/DKIM/DMARC and stops there. No task enumerates the calendar-reminder action.

If this is intentional ("out of scope, operator's responsibility"), it should be explicit in the task list as a deferred-to-launch checklist entry. Otherwise it ships as a requirement with no owner.

### Task 17 does NOT enumerate 429/504 status mapping (Req 4.4)

Req 4.4's handled set is five-fold: 429, 502, 503, 504, network. Task 17's body mentions:

- "Submission AbortController: 12-second client-side ceiling; on abort/network failure → `server-error` with `status: 'network'`."
- Implicit reference to "three outcomes" in focus-management (success / validation-error / server-error).

Nowhere does task 17 enumerate that the response-status branch must treat 429, 502, 503, 504 as `server-error`. The implementer could read this as "anything non-200, non-400 is server-error" — which incidentally works — but the requirement asks for an explicit set, and the 429 case specifically has subtle body-shape handling (Vercel platform 429 emits a Vercel-formatted page, not the structured JSON of Req 3.7). **Minimum addition**: task 17's body must enumerate "treat HTTP 429, 502, 503, 504 as `server-error` regardless of body shape; 503 surfaces `Retry-After: 60` as `retryAfterSeconds`".

### Task 17 does NOT verify 44×44 tap targets on ContactForm controls (Req 4.11)

Task 15 covers SocialLinks tap targets (`min-h-11 min-w-11`). Task 16 covers ObfuscatedEmail (`min-h-11`). Task 17's body covers state machine, ARIA, focus management — but does not mention `min-h-11` on the submit button, on input fields, or on any other tappable control. shadcn's default `Button` may or may not clear 44px depending on the size variant; shadcn's default `Input` is ~36px tall. **Minimum addition**: task 17 must state that the submit button and each input/textarea row must clear 44×44 CSS px on touch viewports.

### Task 17 does NOT call out the `sm:` side-by-side name/email layout (Req-NFR-Usability)

Req-NFR-Usability: "Name and email fields render side-by-side at `sm:` breakpoint (640px) and above; below `sm:` they stack vertically." Task 17 reads as if it's one stack of three fields. **Minimum addition**: explicit grid/flex layout breakpoint behavior in task 17, OR a separate sub-task for the responsive layout.

### NO TASK reserves vertical space for the contact section (Req-NFR-Performance no vertical layout shift)

Req-NFR-Performance: "No vertical layout shift from obfuscation reveal or form state changes — the contact section reserves its vertical space up front." No task addresses pre-allocation of vertical space (e.g. `min-height` on the form container or status region). This would manifest as a CLS bump when the role=status region first renders into the layout flow. Not regression-detected by axe; not tested by any current task.

### NO TASK verifies headshot responsive layout (Req 1.5)

Req 1.5 explicitly defers stacking/side-by-side to the design phase (now decided), but no task verifies the responsive layout actually works. Task 18 says "optional headshot via Next.js `<Image>`" but doesn't enumerate the breakpoint behavior. A Playwright responsive-viewport test (320px, 768px, 1280px) is missing.

### NO TASK asserts `<link rel="canonical">` is absolute (Req 6.3)

Req 6.3: "The Playwright smoke test SHALL assert that the rendered `<link rel="canonical">` on `/profile` is an absolute URL starting with `https://matthew-field.ca/`." Neither task 22 (contact-form.test.ts) nor task 23 (contact-csp-axe.test.ts) includes this assertion. The task bodies focus on form behavior, CSP, and a11y; canonical-URL assertion is orphaned. **Minimum addition**: a single `await expect(page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/^https:\/\/matthew-field\.ca\//)` in task 22 or a new dedicated SEO test file.

### NO TASK verifies `role="status"` mounts inside `<main>` (Req 4.10 + Req 4.1)

Req 4.1: "The `role="status"` region SHALL be mounted inside the `<main>` landmark." Req 4.10 axe's `region` rule will surface this indirectly *if* the status region renders outside a landmark and gets evaluated. But axe doesn't always evaluate `role="status"` against the `region` rule — it depends on the rule set. Task 17 mentions ARIA roles but doesn't pin the DOM-hierarchy constraint. **Minimum addition**: task 22 (or task 23 axe pass) asserts via `page.locator('main >> role=status').count() > 0` after submission.

### NO TASK verifies `contact_submit_success` CustomEvent fires (Req-NFR-Observability)

Task 17 *fires* the event. Task 22 navigates and submits but does not subscribe to the event before submission and assert it fires. **Minimum addition**: in task 22, `page.evaluate(() => new Promise(r => document.addEventListener('contact_submit_success', () => r(true), { once: true })))` raced against the submit, with an assertion that the promise resolves.

### Tasks 10 and 12 do NOT assert logging discipline (Req 3.10)

Req 3.10: handler SHALL NOT pass user-input fields to `console.*`. Task 10 (mail.ts tests) doesn't cover this — mail.ts has its own `MUST NOT call console.*` rule and the test could intercept `console.warn`/`console.error` to assert no input is logged. Task 12 (route.ts tests) doesn't enumerate "spy on `console.warn`, assert no field values appear in any logged string." Without this, a regression that logs `console.warn('resend_failure', { email })` ships unnoticed.

### NO TASK verifies `/contact` is in `src/app/sitemap.ts` (Req 5.6)

Req 5.6 says `/contact` inclusion in the XML sitemap is "already handled by `src/app/sitemap.ts` from site-foundation (static route enumeration)." Is this still true? `src/app/sitemap.ts` may enumerate by directory crawl, by explicit list, or by something else. No task verifies. If `sitemap.ts` enumerates by an explicit list and `/contact` isn't in it, the requirement is silently violated. **Minimum addition**: task 24 (or a new sub-task) reads the generated sitemap.xml and asserts `<loc>...contact</loc>` is present.

### NO TASK installs/configures rehype-slug for Req 1.11 heading anchors

Req 1.11: "IF the author includes h2 or h3 headings in the profile MDX body THEN each SHALL render with an anchor ID (via a rehype plugin such as rehype-slug — exact plugin selection deferred to Design)". Design hand-waves the plugin selection. No task installs `rehype-slug` or configures Velite's MDX rehype-plugins chain. If `content/profile.mdx` ships with no headings on first commit, this is silently unverified. **Minimum addition**: task 8 (or a new task) installs and configures `rehype-slug` in `velite.config.ts`'s MDX options.

### Tagline copy in Req 2.5 not pinned to literal string

Req 2.5 (and product.md #5): "Shoot me a message — I respond to every human :)". Tasks 18 and 19 say "tagline `<p>`" / "tagline `<p>` (distinct copy from /profile)" — but Req 2.5 is the *exact* copy and is specified for the profile page. **Minimum**: task 18 must call out that exact tagline literal.

## 3. Ordering and dependency edges

### Task 13 in Phase 4, consumed only by task 23 in Phase 7

`THEME_STORAGE_KEY` is exported in Phase 4 (task 13) but its only consumer is the axe test in Phase 7 (task 23). Between landing and use, the constant is dead code. If task 23 is ever deferred or dropped (e.g. axe-core/playwright install issues — see §2), task 13 is orphan code that touches `theme-provider.tsx` for no runtime reason. **Better**: move task 13 into Phase 7, immediately before task 23, or fold it into task 23's body (task 23 already touches the import statement). The export-then-use coupling is tight enough that splitting them across 10 tasks creates a "why does this export exist?" question for any future contributor.

### Task 7 (structure.md update for `scripts/` and `vercel.json`) in Phase 1

`scripts/run-e2e.mjs` is created in task 21 (Phase 7). `vercel.json` is created in task 5 (Phase 1). Updating `structure.md` to document `scripts/` in Phase 1 means the steering doc references a directory that does not exist on disk for the 14 tasks between task 7 and task 21. This is a structure-doc-lies-about-reality window. If a future contributor reads structure.md between those tasks landing, they'll grep for `scripts/` and find nothing. **Better**: split task 7 into 7a (Phase 1, `vercel.json` documentation only) and 7b (Phase 7, `scripts/` documentation, lands with task 21).

### Tasks 11 and 14 both lay claim to adding `zod` to `package.json`

Task 11's body: "Add `zod` to `package.json` dependencies if not already present." Task 14's body: "verify zod is in dependencies (added in task 11 if not earlier)." This is circular: task 11 conditionally adds it ("if not already present"), task 14 verifies its presence. If task 11 lands first, zod is added. If task 14 lands first (impossible per phase order, but the verify-step exists regardless), task 14 does nothing for `zod`. **Better**: pick one task as the canonical zod-installer. Recommend: a dedicated step in Phase 0 or Phase 1 that adds both `zod` and `react-obfuscate` ("Install runtime deps used by the contact pipeline"). Task 11 and task 14 then simply import what already exists.

### Tasks 1 and 2 (manual tasks) — no machine-enforceable predicate

Tasks 1 and 2 declare "MUST complete before task X lands on `main`." There is no CI gate, no pre-commit hook, no automated check. The success criterion is "operator confirms in dashboard." A future contributor (or Matthew on a busy day) could commit task 3 (which contains the alias value) without verifying task 1. Once committed, GitHub Code Search indexes the alias within minutes — irreversible.

**Minimum mitigation**: add a small pre-commit hook (or a check in the PR template) that warns when `src/config/site.ts` changes to include a `links.email` field if a corresponding "task 1 verified" marker is missing in the commit. Alternatively: the alias value lives in an env var (`NEXT_PUBLIC_CONTACT_EMAIL`) until task 1 is verified, then is promoted to `siteConfig` in a later commit. The current procedure relies entirely on the operator remembering, which is the failure mode the task tries to prevent.

### Task 8's same-commit constraint — no mechanism enforces it

Task 8's prompt says "Stage both files in the same commit" and "same-commit rule is mandatory." There is no pre-commit hook, no CI check, no lint rule that would catch a future contributor splitting them across commits. If someone later refactors `velite.config.ts` (e.g. extracts the transform to `src/lib/velite-transforms.ts`) and accidentally separates the schema and content into two commits during the refactor, the "constraint" is just a comment. The constraint should either be enforced by tooling (a pre-commit hook that fails if `velite.config.ts` changes the `profile` collection but `content/profile.mdx` isn't also touched) or accepted as a procedural-only guarantee with the documented failure mode.

### Task 21's webServer.env pin — verify-vs-fix ambiguity

Task 21 body: "Verify `e2e/playwright.config.ts`'s `webServer` clause does NOT set `webServer.env` to a literal object — env inheritance is required." But task 21's files list is `scripts/run-e2e.mjs` (new) + `package.json` (modified). If the implementer reads "verify" as "audit, do not edit," and the playwright config IS misconfigured today, task 21 silently passes the audit and the E2E suite breaks on first run. The task should explicitly state: "If `webServer.env` is currently a literal object, change it to `{ ...process.env, PORT: '3013' }` as part of this task — files list extends to include `e2e/playwright.config.ts`."

## 4. Task-to-requirement traceability gaps

### Tasks citing only design, not requirements

- **Task 5** cites Req 1.4 (✓ has requirement).
- **Task 7** cites only "Design §Implementation Sequencing — structure.md updates." There is no underlying requirement clause — structure.md hygiene is a steering-doc concern. Either this task is correctly scoped as "tooling-only, not requirements-traceable," or it should be removed (work that maps to no requirement is scope creep).
- **Task 9** cites Req 3.6, 3.7, 3.8, 3.10, 3.11 (✓).
- **Task 10** cites only "Design §Testing Strategy → Unit Testing → mail.ts." The underlying requirement is Req 3.13 (CI smoke coverage) by extension, but Req 3.13 specifically scopes to Playwright, not Vitest. Unit tests for `mail.ts` deliver Req 3.6/3.7/3.8/3.10 via regression-protection. Cite those.
- **Task 12** same as task 10 — cite Req 3.5/3.6/3.7/3.8/3.10 by extension.
- **Task 13** cites only design. The underlying requirement is Req 4.10 (axe in two themes). Cite it.

### Task 18 over-claims Req 1.12

Task 18's `_Requirements_` field is "Req 1.1, 1.5–1.10, 1.13, Req 6.1–6.3". It does *not* cite Req 1.12 (build fails on render-time exceptions). But it also doesn't deliver Req 1.12 — that's enforced incidentally by `pnpm build` running in task 24. Either include Req 1.12 in task 24 explicitly, or pin it to task 8 (where Velite collection validation enforces 1.12a–c) and task 18 (where 1.12d is exercised). Right now Req 1.12 is unowned.

### Req 2.5 (tagline exact copy) appears in zero task `_Requirements:` fields

Task 18 cites "Req 1.1, 1.5–1.10, 1.13, Req 6.1–6.3" — note no Req 2.5. Task 19 cites "Req 5.1, 5.2, 5.3, 5.4" — no Req 2.5. The tagline copy is unowned.

### Req 3.12 (reply-to attacker-controllable acknowledgment) appears in zero `_Requirements:` fields

This is acknowledgment-only, not implementation, so this may be fine. But if the task list is meant to be a complete requirements trace, the acknowledgment should appear somewhere (e.g. task 9 since it constructs `reply_to`).

### Req 5.5 enum-lock-in note

Req 5.5's "Adding a new submission source... SHALL require updating BOTH this `z.enum` literal AND the smoke test's per-source assertions" is a future-implementer warning. No task carries this note. Consider folding the note into task 11's `_Prompt_` (the zod source-enum lives there).

## 5. Completion criteria — what does "done" mean?

### Task 5 success is unverifiable locally

Task 5's success criterion: "A Vercel preview build succeeds and the Velite profile transform emits a non-empty updatedAt." The implementer authoring `vercel.json` cannot verify this locally — `pnpm build` runs in a non-shallow clone, so the transform succeeds regardless of whether the `buildCommand` is correct. The actual verification requires a Vercel preview deploy, which means task 5 is "done" only after task 8 lands content and a PR is opened. The task ordering papers over this: task 5 ships in Phase 1, but its success criterion can only be checked in Phase 2 or later.

**Better**: task 5's success criterion should be "vercel.json file present with the documented buildCommand string verbatim." Vercel-preview verification belongs in a separate post-merge verification task (or in task 24's final-integration step, with an explicit "PR preview built successfully and `.velite/profile.json` updatedAt is non-empty" bullet).

### Tasks 1, 2, 5 require infrastructure outside CI

Tasks 1 and 2 are `[MANUAL]` and Phase 0; task 5 is partially manual (preview deploy required). All three block implementation downstream:

- Task 3 lands the alias value — requires task 1 verified.
- Production cutover requires task 2 verified.
- Task 8 requires task 5 verified (Vercel deploy with shallow-clone remedy).

But none of these have a "blocks task X if not green" gate. A PR landing task 3 before task 1 is verified will not be rejected by CI. The procedure-only enforcement is fragile for a multi-month implementation timeline. **Better**: add a `.spec-workflow` predicate or a CODEOWNERS rule that requires explicit ack from "operator role" before task 3 can land.

### Task 4 (CSP `form-action 'self'`) has no failing test if removed

Per the design's own admission: "The directive's value is **defense-in-depth against a future regression to native `<form>` submission**." No task tests it. Task 23's CSP smoke exercises the JS-submit path's `connect-src 'self'`, NOT the `form-action 'self'` directive. If a future contributor removes `form-action 'self'` from `cspDirectives`, no test fails, no CI breaks, no review catches it (unless the reviewer happens to know the directive is intentional).

**Better**: task 23 includes a response-header assertion: `await expect(response.headers()['content-security-policy']).toContain("form-action 'self'")`. This is a 2-line addition that locks in the requirement.

### Task 24 — "all pass locally" ≠ "production-safe"

Task 24 runs `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build && pnpm test:e2e`. All six can pass locally and the Vercel production deploy can still fail:

- Local `pnpm build` runs against a non-shallow clone; the Velite transform succeeds; on Vercel the shallow-clone remedy in `vercel.json` is the only thing keeping it green.
- Local `pnpm test:e2e` uses the mock Resend server; the production deploy's real Resend integration is never end-to-end-verified except by post-launch manual test.
- Local `pnpm build` does not emit the CSP response headers in the same way Vercel does (Next.js dev vs prod parity is generally close but not guaranteed).

Task 24 should be split into:

- **Task 24a**: local quality gate (the six commands).
- **Task 24b**: post-merge verification — open the production URL, submit a real form, verify email arrives, verify CSP headers via curl, verify `<link rel="canonical">` is absolute.

Without 24b, "Final guardrail before requesting review" is overstated — review can only check what's locally verifiable.

## 6. Manual tasks and operational surface

### Who is the operator?

Tasks 1 and 2 are `[MANUAL]` and assume "Matthew" is both implementer and operator. This works today (single-author project). It does not work for future contributors or for any future scenario where Matthew steps back and a maintainer picks up the codebase. **Minimum**: the task prompts should explicitly say "Operator = the holder of the Vercel/DNS/mail-provider admin credentials, which today is Matthew." Future-proofs the documentation.

### Task 1 verification is human-eyeballed

"Test email to the alias is delivered correctly" depends on the operator sending a test from a personal account and confirming receipt. There is no automated dashboard check, no monitoring, no alerting. If the filter is misconfigured later (e.g. an unrelated DNS change causes legitimate mail to be filtered as spam), there is no early signal — Matthew finds out when a recruiter mentions they emailed and got no reply. **Minimum**: add a follow-up task "Set up mail-provider monitoring/alerts for filter-rule changes," or accept this as a documented operational residual.

### Task 2 production-RESEND_FROM regression has no guard

After task 2 cuts production over to the verified-domain `from`, any later regression (e.g. a contributor sets `RESEND_FROM=onboarding@resend.dev` in production Vercel env to debug something and forgets to revert) silently degrades deliverability. Recruiters' inboxes mark `onboarding@resend.dev` as spam more aggressively. **Better**: add a runtime check in `mail.ts` that, in production env (`process.env.VERCEL_ENV === 'production'`), throws if `RESEND_FROM` matches `onboarding@resend.dev`. Two-line addition; closes the regression class.

### DMARC tightening procedure is not a task

Per §2 above: Req 3.6 mandates a 14-day post-launch calendar reminder. No task. Either add it explicitly or note in `_Requirements:` that this is operator-deferred and acknowledged.

---

## Closing Deliverables

### Top 5 risks/gaps (ranked)

1. **`@lhci/cli` CI workflow missing entirely** (no task; Req-NFR-Performance). Failure scenario: the funnel ships, a future contributor adds a hero animation that drops the perf score to 78, and there is no CI signal — Matthew finds out months later when manually running Lighthouse. The requirement asserts a non-blocking PR-comment workflow that does not exist anywhere in the task list.

2. **Task 17 hides ~6 surfaces behind one checkbox** (Req 4 family, Req-NFR-Observability, Req 4.4, Req 4.11). Failure scenario: implementer ships the form-works core but omits the `contact_submit_success` CustomEvent dispatch or the reduced-motion-aware `scrollIntoView`. Code review nods at "ContactForm landed"; the regressions ship undetected. The 60-line task body is too coarse a review unit.

3. **Task 23 colocates three orthogonal E2E surfaces** (Req 4.2, Req 4.6, Req 4.10, Req-NFR-Security CSP). Failure scenario: an axe-core update introduces a new `region` rule check that fails on the success message; task 23 goes red; the CSP and reduced-motion coverage is blocked behind unblocking the axe fix. CI is binary; the file is binary; the failure mode is binary even though three independent guarantees are at stake.

4. **`<link rel="canonical">` absolute-URL assertion not in any task** (Req 6.3). Failure scenario: a future change to `metadataBase` in `src/app/layout.tsx` (or a Next.js version bump that resolves canonical differently) silently breaks Req 6.3 absoluteness; ranker treats it as relative; SEO disambiguation degrades. The requirement is explicit and the test is one line — currently in zero tasks.

5. **Task 5 success criterion ("Vercel preview build succeeds") is unverifiable in the task** (Req 1.4). Failure scenario: task 5 lands a typo'd `vercel.json` (`buildComand` instead of `buildCommand`), `pnpm typecheck && pnpm build` locally both pass, the task is checked off, and the failure surfaces only at task 8's Velite transform when Vercel runs with a shallow clone. The success criterion delegates verification to a Vercel deploy that doesn't run as part of task 5.

### Top 3 conclusions to challenge or reverse

1. **"Task 8's same-commit bundle is correct → wrong, should split as 8a/8b."** The same-commit invariant is genuine, but only between content + collection registration. The transform implementation (with `execFileSync` security choices and the named-error contract) is a reviewable unit on its own. Splitting into 8a (schema + transform, unregistered) and 8b (registration + content + frontmatter) preserves Req 1.14 while making the security-conscious transform code reviewable in isolation.

2. **"Task 23's three-surfaces-in-one-file is acceptable → wrong, separate into three test files."** CSP, axe, and reduced-motion fail for orthogonal reasons. Colocation creates a single point of E2E failure that blocks unrelated work. Three files share the wrapper script and run in parallel under the same `pnpm test:e2e` invocation; the cost of splitting is negligible and the diagnostic clarity is real.

3. **"Task 24 is sufficient end-to-end verification → wrong, missing real-Resend smoke + production CSP header check + canonical absoluteness."** Local-all-pass does not equal production-safe. A post-merge verification task (24b) that hits the production URL and verifies real-Resend, real CSP headers, and the absolute canonical URL is the only end-to-end signal that the funnel actually delivers mail. Without it, "the funnel works" is asserted but never observed.

### What's missing before this task list should be implemented

**Tasks to add**:

- **New Task A**: `pnpm add -D @axe-core/playwright`. Satisfies Req 4.10 (task 23 imports `AxeBuilder`).
- **New Task B**: Add `@lhci/cli` GitHub Actions workflow targeting the Vercel preview URL. Satisfies Req-NFR-Performance.
- **New Task C**: Install and configure `rehype-slug` in Velite's MDX options. Satisfies Req 1.11.
- **New Task D**: Production-env runtime guard in `mail.ts` rejecting `RESEND_FROM === 'onboarding@resend.dev'` in `VERCEL_ENV === 'production'`. Satisfies Req 3.6 regression-protection.
- **New Task E**: E2E assertion that `<link rel="canonical">` on `/profile` is absolute and starts with `https://matthew-field.ca/`. Satisfies Req 6.3.
- **New Task F**: E2E assertion that `contact_submit_success` CustomEvent fires on success path. Satisfies Req-NFR-Observability.
- **New Task G**: E2E or build-output assertion that `/contact` appears in the generated `sitemap.xml`. Satisfies Req 5.6.
- **New Task H**: E2E assertion that the production CSP response header contains `form-action 'self'`. Satisfies Req-NFR-Security CSP clause (currently undefended).
- **New Task I**: Post-merge verification task — submit real form on production, verify email receipt, verify response headers, verify canonical. Satisfies the "production-safe" gap in task 24.
- **New Task J**: 14-day post-launch DMARC tightening reminder. Satisfies Req 3.6 calendar-reminder clause (or explicitly mark deferred/operator-only).

**Tasks to split**:

- **Task 8 → 8a (schema + transform, unregistered) / 8b (registration + content)**.
- **Task 12 → 12a (request-shape) / 12b (zod fields) / 12c (security pipeline) / 12d (error mapping)**.
- **Task 17 → 17a (core form + submission) / 17b (focus management) / 17c (reduced-motion + non-rotating indicator) / 17d (CustomEvent dispatch)**.
- **Task 23 → contact-csp.test.ts / contact-axe.test.ts / contact-reduced-motion.test.ts**.
- **Task 24 → 24a (local quality gate) / 24b (post-merge production verification)**.

**Tasks to move**:

- **Task 7 → 7a (vercel.json doc in Phase 1) + 7b (scripts/ doc in Phase 7, with task 21)**.
- **Task 13 → Phase 7, immediately before task 23, or fold into 23**.

**Tasks to merge or clarify**:

- **Tasks 11 + 14 zod-installation overlap → one canonical task** (recommend a "Phase 1: install runtime deps" task that adds `zod` and `react-obfuscate` together).
- **Task 21 verify-vs-fix ambiguity** → explicit "audit AND fix if necessary, extending files list to `e2e/playwright.config.ts`".

The decomposition is workable but ships with ~10 requirements unowned and ~4 tasks whose checkbox-level granularity will mask real regressions. Splitting tasks 17 and 23, adding the LHCI/axe-install/canonical-assertion tasks, and adding a post-merge verification task close the largest gaps.
