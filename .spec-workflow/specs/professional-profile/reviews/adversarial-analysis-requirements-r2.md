# Adversarial Analysis — professional-profile Requirements (Round 2)

Focus dimensions explored in depth: **Testability (§1), Editorial-discretion vs anchors (§2), Bot defense (§3), Resend/Vercel collisions (§4), Velite/freshness (§6), Accessibility (§7)**. Other dimensions probed where novel findings surfaced.

---

## §1. Testability and executability of "SHALL" clauses

### 1.1 Req 3.11 — Playwright cannot mock a server-side `fetch` to Resend `[Novel]`

The spec asserts: "a Playwright smoke test SHALL mount the `/contact` page, fill and submit the form, and assert a 200 response. The test SHALL mock the Resend `fetch` call and assert the route invoked it once with the expected payload shape."

Playwright's interception APIs (`page.route`, `context.route`, `page.routeFromHAR`) operate at the browser-network boundary. They see the client's `POST /api/contact`. They *cannot* see the outbound `fetch('https://api.resend.com/emails', ...)` that happens inside the Next.js Route Handler, because that fetch is initiated from the Node server process, not from the page.

Options actually available — each with a cost the spec doesn't acknowledge:
- **MSW + Node interceptor started in `global-setup.ts`**: only works if Playwright runs against a Next.js server in the same process (it normally doesn't; `next start` is a child process). Intercepting a child process's `fetch` from the Playwright test process is not a thing.
- **Env-gated mock Resend client** (`RESEND_MOCK=1` swaps `sendEmail` to an in-memory stub writing to a test-only file): pollutes production code with a branch the prod bundle must ship. Violates "no vendor detail leaks" sensibility.
- **Wire a dedicated mock server** (a sidecar HTTP server on localhost that pretends to be Resend; set `RESEND_BASE_URL=http://localhost:PORT` in the test env): cleanest but requires an env-configurable Resend client base URL, which the spec never names. Also allows the "assert invoked once with expected payload" check — because the mock server can record calls and expose them to the test.
- **Run Next.js inside the Playwright test process via `next`'s programmatic API**: possible but fragile; Next doesn't officially support it for App Router + Route Handlers in 14/15.

**Consequence if unresolved**: implementer picks whichever approach they feel like, or writes a "mock" that merely checks the 200 response and never actually asserts the payload shape — the clause quietly degrades to "route returns 200 when fed valid input," which is much weaker than the spec claims.

**Fix**: the spec must either (a) mandate a specific interception strategy (e.g., "Resend client base URL is env-configurable; CI points it at a test recorder") or (b) drop the "expected payload shape" assertion and state only what can actually be verified from the browser side.

### 1.2 NFR Security — CSP test is a race, not an assertion `[Novel]`

The spec says: "loads `/contact` with a `Content-Security-Policy-Report-Only` header matching the production policy, clicks the obfuscated email to trigger react-obfuscate's runtime decode, and asserts zero CSP violation reports."

Two defects:

1. **No `report-uri`/`report-to` endpoint is specified**, so violations do not become "reports." They fire as `SecurityPolicyViolationEvent`s on `document`. The test must hook `document.addEventListener('securitypolicyviolation', ...)` *before any page script runs* — which means `page.addInitScript()`, not `page.evaluate()` after navigation. Without `addInitScript`, inline-script violations from Next.js hydration fire before the listener exists and are never captured. The test passes while violations are occurring.
2. **The test runs under report-only, but production runs under enforcing CSP.** A violation that causes a real resource to be blocked in production (react-obfuscate attempting an inline eval of the de-obfuscated address, for example) is merely logged in the test. Test passes; production breaks; they are non-equivalent.

**Fix**: specify that the test installs a listener via `addInitScript` *and* that the smoke test also runs against the enforced policy (either as a second job or by injecting the enforcing policy via `page.setExtraHTTPHeaders`) asserting no errors thrown in the click-to-reveal flow.

### 1.3 Req 4.7 — `axe-core/playwright` color-contrast test has no theme-switch harness `[Novel]`

"Verified by an `axe-core/playwright` assertion (rule: `color-contrast`) running as part of the contact-form smoke test."

This runs under whatever theme the browser defaults to at test time. `next-themes` persists the choice in localStorage/cookie; a fresh Playwright context has neither, so the theme defaults to system preference — which in CI is almost always light.

**Scenario**: Matthew later tweaks a dark-mode variable from `--muted-foreground` to a paler grey that drops below 4.5:1 on dark backgrounds but remains fine on light. The smoke test passes because it only ran light. Production ships a WCAG 2.1 AA violation.

**Fix**: the contact-form smoke test SHALL run the axe color-contrast check under both `light` and `dark` themes, toggling by setting the `next-themes` cookie or localStorage key between passes. Spell this out — "runs under both themes" — otherwise it gets implemented as a single-pass check.

### 1.4 NFR Performance — manual Lighthouse review by the PR author is not a gate `[Compounding; v1 asked for CI, spec compromised to manual review]`

"Verified manually against the Vercel preview deploy on the implementing PR before merge. Falling below 90 on any category is a blocking issue. No CI gate required; enforcement is pre-merge review."

Matthew is the sole maintainer (product.md target user #4). "Pre-merge review" by the author of the PR is a tautology: it's a promise to check one's own work. The clause cannot fail — there is no adversarial reviewer to enforce it. On a bad week, Matthew merges without checking and nothing breaks externally.

This would be tolerable if the spec named an objective artifact: "the PR description SHALL include a screenshot of a Lighthouse report with all four scores ≥ 90." That creates evidence. "Manual review" without an artifact creates nothing.

**Fix (cheap)**: require the PR description to paste the four Lighthouse scores. This is still trust-based but leaves a record — and a future adversarial reviewer can audit historical PRs for compliance. Alternatively, `@lhci/cli` as a non-blocking CI check that posts scores as a PR comment: zero enforcement overhead, permanent audit trail.

---

## §2. Editorial discretion vs deep links and heading order

### 2.1 Req 1.8 promises anchors that Req 1.3 permits to not exist `[Novel]`

Req 1.8 states `/profile#experience`-style deep links SHALL work via rehype-slug. Req 1.3 says body structure is at Matthew's editorial discretion — no required headings.

Rehype-slug generates anchor IDs from the text of whatever headings are actually present. It does not manufacture anchors for expected-but-absent headings. If Matthew writes a profile with the heading "Career So Far" instead of "Experience", `/profile#experience` returns the top of the page, not the Career So Far section. If he writes no subheadings at all, every fragment link is broken.

This is not a bug in rehype-slug — it's a contradiction in the spec. The acceptance criterion in Req 1.8 claims a behavior (deep links work) that requires a content contract Req 1.3 refuses to impose.

**Fix — pick one**:
1. Reword Req 1.8: "IF the profile includes h2/h3 headings, THEN each SHALL render with an anchor ID via rehype-slug." Removes the deep-link promise entirely.
2. Reword Req 1.3 to require a minimum set of h2 sections (e.g., at least one of Experience/Skills/Education) if the spec wants the SEO signal.
3. State explicitly that deep-link targets are Matthew's responsibility when authoring — the spec provides the mechanism, not the targets.

Currently the spec pretends both are true. They are not.

### 2.2 Heading hierarchy is not constrained; WCAG 1.3.1 / axe `heading-order` not checked `[Novel]`

No requirement enforces h1 → h2 → h3 sequential order in the profile MDX body. Matthew can legally write `# Title` → `### Skills` (skipping h2), which violates WCAG 1.3.1 (Info and Relationships) and fails axe's `heading-order` rule.

Req 4.7 specifies only the `color-contrast` rule in the axe assertion. `heading-order`, `landmark-one-main`, `region`, and other WCAG 2.1 AA-relevant rules are not invoked.

**Fix**: the contact-form smoke test (or a separate `/profile` smoke test) SHALL run `axe-core` with the default WCAG 2.1 AA ruleset, not just `color-contrast`. That is a one-line change in practice and raises the actual compliance floor dramatically.

### 2.3 SEO disambiguation signal is weaker than Req 6 implies `[Novel]`

Req 6.1 relies on `description` frontmatter to distinguish `/profile` from `/about`. Google uses heading content, body first-paragraph, and internal linking as stronger signals than meta description. With no heading-structure contract (Req 1.3) and no requirement to mention the word "resume" / "CV" / "experience" in the body, two SERP impressions for "matthew field resume" and "matthew field about" may look nearly identical to the ranker.

This isn't a blocking defect for launch, but Req 6 overstates what a differentiated description can deliver. Mark it accurately: "`description` is the minimum disambiguation; structural content differentiation is the author's responsibility."

---

## §3. Bot defense that cannot actually defend

### 3.1 Req 3.4c — client-stamped timestamp is trivially bypassable `[Compounding; memory noted it, this review supplies the threat model and remediation]`

The client stamps `now()` at form mount into a hidden input. The server computes `now - timestamp ≥ 1000 ms`. A bot that reads the form HTML *sees the timestamp field exists*, sets it to `Date.now() - 5000`, POSTs. Server computes 5000 ≥ 1000 → pass.

What this actually stops: a bot that submits the form without rendering it (no hidden field value, server sees `NaN`/missing → reject). That is a narrow class of scraper and is already stopped by zod coercion failing.

What this *doesn't* stop: any bot that parses the form. Which is every bot that matters.

The fix pattern is well-known: the server issues a short-lived HMAC-signed timestamp (or a single-use nonce) when the form is requested, and validates on submission. Req 3.4c as written offers no defense beyond the honeypot it's supposed to augment.

**Two paths**:
- **Accept that this layer is effectively a no-op against any non-trivial bot** and keep it as a cheap filter for the dumbest scrapers. State that accurately in the NFR Security section, so future reviewers don't over-estimate the defense.
- **Upgrade to server-signed timestamps**: `/api/contact-token` returns `{ t: <iso>, sig: HMAC(secret, t) }` at form mount; the form submits both; server verifies. Marginal implementation cost; meaningfully higher bar for bots.

### 3.2 Timing path's silent-200 is a UX trap for fast humans `[Novel; memory covered honeypot path, timing path was never surfaced]`

Req 3.4c returns HTTP 200 silently when `now - timestamp < 1000 ms`. The client runs Req 4.1's success UX: "Message sent!", fields cleared, focus moved to success heading, success announcement.

**Scenario**: a recruiter's password manager (1Password, Dashlane, Bitwarden) auto-fills name and email on focus; the recruiter types a short message they'd already drafted and hits submit. Total elapsed time from `DOMContentLoaded` → submit can easily be 600–900 ms in this flow. Silent 200. Recruiter walks away thinking Matthew received their message. No email was sent.

v1's review caught this failure mode for the honeypot path; Req 3.2's hiding mandate neutralized the honeypot version (password managers won't fill `display:none + autocomplete=off` inputs). The timing path has the same client-side failure mode and was not addressed by Req 3.2's fix.

**Fix options** (one of):
- **Raise the threshold only server-side; don't cut off the user**: if `<1s`, return HTTP 200 *and send the email anyway*. Bots get through occasionally; quota is 100/day; the UX is correct. This defeats the point of the timing check.
- **Silent-drop requires a second signal**: only silent-drop when timing < 1s *AND* honeypot filled or other signal. Single-signal silent-drop is too fragile.
- **Expand the lockout**: require `≥ 3s`, but move the pre-submit focus event (not DOMContentLoaded) as the anchor. Password-manager autofill fires before user interaction; interaction anchor ensures a real human beat.

Whichever path the spec chooses, pick it explicitly. The current silent-200 on a threshold that autofill users regularly trip is a defect.

### 3.3 Honeypot field `name` attribute unconstrained — password managers may fill it `[Novel]`

Req 3.1 and 3.2 specify hiding technique (`display:none`, `tabindex=-1`, `aria-hidden`, `autocomplete=off`) but leave the `name` attribute to the implementer. Password managers pattern-match on common names (`email`, `phone`, `website`, `company`, `address`, `email_confirm`, `url`) and fill them even when the container is `display:none` in some engines (notably some mobile Safari password-manager overlays that ignore visibility).

If the implementer names the honeypot `website` or `email_confirm`, real users — especially those with aggressive autofill — trip the silent-drop.

**Fix**: the spec MUST constrain the honeypot name to a token that password managers reliably ignore. Suggested: `url_secondary`, `nickname`, `company_name_ignored`, or a UUID-suffixed name. Better: the spec names the exact token the implementer will use, removing the judgment call.

### 3.4 Origin/Referer header check interacts with site `Referrer-Policy` and privacy browsers `[Novel]`

Req 3.4b rejects cross-origin submissions. Two gaps:

1. **If the site itself sets `Referrer-Policy: no-referrer` or `same-origin`** (site-foundation's next.config.ts does not specify — unknown), same-origin `fetch` submissions may arrive with no `Referer` header at all. The `Origin` header on a same-origin `fetch` is browser-dependent: Chrome/Firefox include it for POST; Safari historically omitted it on same-origin requests. A Safari visitor may submit with neither `Origin` nor `Referer` — does the check pass or fail?
2. **Brave, Firefox with strict ETP, and Safari's Lockdown Mode** strip or redact these headers more aggressively.

The spec says "matches the site's own origin" — it must specify behavior when headers are absent. If "absent = reject," legitimate Safari/privacy-browser users fail silently. If "absent = allow," a bot simply omits the header and passes.

**Fix**: state the fallback explicitly. Recommended: `Origin` present and matching is pass; `Origin` absent falls back to `Referer`; both absent is pass-with-downgraded-trust (log-only in production; never reject legit traffic on a weak signal).

---

## §4. Resend, sender identity, Vercel execution-limit collisions

### 4.1 Req 3.5 "sandbox sender domain" for production is a funnel-breaker `[Recurring with escalated severity — memory lists as Unresolved]`

Req 3.5: "using the Resend sandbox sender domain as the `from` address."

Resend's sandbox domain (`onboarding.resend.dev`) is explicitly for development. It has:
- Recipient allowlisting (can only send to verified addresses on the account in some tiers)
- No DKIM alignment with a real domain
- No SPF authorization from a real domain
- Producer metadata that flags it as non-transactional to major mail providers

**Concrete scenario**: a Senior Engineering Recruiter at a Fortune-100 uses a corporate email gateway (Mimecast, Proofpoint, Microsoft Defender for Office 365). The gateway applies DMARC enforcement, checks `From` alignment against SPF/DKIM. Mail sent from `onboarding.resend.dev` as `From: matthew@onboarding.resend.dev` or `From: Matthew Field <matthew@onboarding.resend.dev>` will either:
- Fail DMARC alignment for `matthew-field.ca` if the `From` is spoofed to look like Matthew's domain
- Land in quarantine or spam as a disposable-domain signal
- Be stripped entirely on aggressive configurations

**The business objective is a professional inbound funnel.** The contact form succeeds (HTTP 200); the email never reaches the recruiter's inbox. Matthew has no signal (Req observability is deferred) and treats this as "my site is working."

This is the single most severe defect in the document.

**Fix (must-have before launch)**:
- Req 3.5 MUST read: "The production `from` address SHALL be an email address at a domain verified in Resend with SPF, DKIM, and DMARC configured. The sandbox domain MAY be used in preview deploys and local development only."
- The spec SHOULD enumerate the DNS posture required: SPF include for Resend, DKIM CNAME(s) from Resend, DMARC policy at minimum `p=none` with `rua` reporting (`p=quarantine` or `p=reject` only after observing alignment in reports).
- The env-var contract in site-foundation's `.env.example` already names `RESEND_API_KEY`. Add `RESEND_FROM_ADDRESS` and document that preview/prod values differ.

### 4.2 Req 3.7 "Resend 10s timeout" collides with Vercel Hobby 10s function cap `[Compounding — memory flagged; this review adds concrete timing analysis]`

Vercel Hobby plan caps Serverless Function execution at 10 seconds (hard kill, no user code runs after). Req 3.7 says "IF the Resend call times out (e.g. 10s ceiling) THEN the API SHALL respond with HTTP 503 and a `Retry-After: 60` header."

**Timing analysis**: if Resend stalls or responds at 9.8s with a 5xx, any code path after the Resend call has ~200ms to execute. The `Retry-After: 60` response path includes: catching the error, serializing JSON, sending the response. Easily 50–300ms. If the function overruns 10s, Vercel kills it and emits its own platform response — typically 504, sometimes FUNCTION_INVOCATION_TIMEOUT.

**Client-side impact**: the browser sees a 504 with no structured JSON body, no `Retry-After` header. Req 4.3 handles 502/503/network. A 504 is "network-ish" but: (a) the JSON parse fails (no body), (b) the `Retry-After: 60` hint is gone, (c) the code path the spec describes never runs.

**Fix**: set the Resend client timeout to **9 seconds**, not 10. Give the error-path code a 1-second budget. Req 3.7 should read "e.g. 9s ceiling; MUST be less than the hosting platform's function execution cap." Also add 504 to Req 4.3's handled error set.

### 4.3 Req 3.8 "no persistence beyond Resend itself" is violated by default Vercel logging `[Novel]`

Req 3.8 promises form data is not persisted in any log, database, or external service beyond Resend. NFR Security repeats this.

Reality:
- **Vercel's default Function Logs capture request metadata** including headers and, on error, whatever the Route Handler passes to `console.error` or throws. If the handler logs `error.response` from the Resend SDK on failure, and Resend echoes the submitted `subject`/`text` in its error response, the log line contains user-submitted content.
- **Next.js error boundaries and App Router's built-in error handling** surface uncaught exceptions with some request context in the Vercel dashboard.
- **Vercel's Edge Request Logs** capture request paths, response codes, and — depending on project settings — headers. Request body is not captured by default, but can be enabled.

The spec says "SHALL NOT persist." To actually comply, the implementation must:
1. Never pass the user's `message`, `name`, or `email` to `console.log`/`console.error` directly.
2. On Resend errors, log only a sanitized error code + outer Resend error class, not the full response body.
3. Set Next.js `logging.fetches.fullUrl = false` or equivalent to suppress auto-logging of Resend request URLs (which don't contain PII but the Resend SDK may include the request ID that ties back to content server-side).
4. Document the Vercel log retention period (1 day on Hobby; indefinite on higher tiers) as part of the data-retention posture.

**Fix**: Req 3.8 MUST specify the implementation discipline, not just the promise. Add an acceptance criterion: "The `/api/contact` handler SHALL NOT include any of `name`, `email`, or `message` values in `console.*` calls or thrown error messages."

### 4.4 No monitoring for quota exhaustion — "LinkedIn fallback" argument requires the user to know the funnel is down `[Compounding — memory notes accepted; this review surfaces the knowledge gap]`

Memory records user stance: "funnel downtime is acceptable; LinkedIn is always the primary fallback."

The fallback only works if the user knows to use it. The UX is:
1. Recruiter opens `/contact`
2. Fills form, submits
3. Sees `502 Unable to send message. Please try again or use an alternative method.`
4. Recruiter does *not* reliably translate "alternative method" into "click the LinkedIn icon above the form."
5. Recruiter closes the tab, moves to the next candidate.

Meanwhile Matthew has no signal. No webhook, no dashboard alert, no synthetic heartbeat. He discovers the outage on his next weekly Resend-dashboard check — which is also not a spec requirement; it's implied.

**Concrete scenario**: an attacker submits 100 valid-looking messages via a headless browser (easily defeats all layered defenses in §3) at 09:00 Monday. Quota exhausted. Matthew checks Resend on Sunday. Six days of outage; every real submission returned 502. LinkedIn fallback was always available, but no one clicks it because the copy doesn't point there.

**Fix — minimum**: on 502/503/504 the "Try again" area MUST include a visible, explicit secondary CTA: "Or reach out on LinkedIn / by email" with the LinkedIn link inline, not just above. The current Req 4.3 language of "visible Try again button" has no content contract for the degraded CTA.

**Fix — better**: formalize the degraded-mode contract. "WHEN the API returns 502/503/504 THEN the error region SHALL render with (a) the error message, (b) a 'Try again' button, (c) a secondary 'Or reach out on LinkedIn: [link]' with the LinkedIn URL rendered inline as a `<a>` so it works with or without JS." This is a 15-minute implementation cost and directly addresses the "how does the fallback actually activate" gap.

---

## §5. UTF-8 / multibyte collisions

### 5.1 16 KB byte cap vs 5000-character zod cap — CJK and emoji overflow `[Compounding — memory flagged; this review confirms the arithmetic and names the fix]`

5000 UTF-8 characters ≠ 5000 bytes.
- Latin/ASCII: 1 byte/char → 5000 bytes
- CJK (Japanese, Chinese, Korean): 3 bytes/char typical → 15000 bytes
- Emoji / supplementary plane: 4 bytes/char → 20000 bytes

Plus JSON envelope: `{"name":"...","email":"...","message":"..."}` ≈ 50 bytes. Plus a 100-CJK-char name at 3 bytes = 300 bytes. Plus 254-char email (mostly ASCII) ≈ 254 bytes.

**Worst reasonable case**: 100-char CJK name + 254-char email + 5000-char message with any 3-byte characters = 300 + 254 + 15000 + ~50 envelope ≈ **15.6 KB**. Close but under.

**Plausible case**: a 5000-char message containing emoji + CJK mix (a Japanese recruiter using emoji in their closing, or a resume highlight with flag/role emojis) → 5000 chars at avg 3.2 bytes = 16 KB → **413 before zod runs**. The recruiter sees an unhelpful error (Req 3.4a mandates empty body on 413 → client can't produce a user-friendly message; it sees raw fetch response with no JSON).

**Fix — pick one**:
- Raise the byte cap to 32 KB. 2× is plenty of headroom for 5000 CJK+emoji chars; still tiny versus any DoS concern.
- Change Req 3.4a to measure in characters post-JSON-parse: "body JSON SHALL be valid; total `name + email + message` character count SHALL NOT exceed 6000." Removes the byte/char mismatch entirely.
- Keep 16 KB but have the 413 path return a structured JSON body the client can display ("Your message is too long — please shorten it"). Current spec mandates empty body, which is hostile to the user.

### 5.2 zod `.email()` rejects internationalized email (IDN) `[Novel]`

zod v3's `.email()` uses a regex that rejects non-ASCII local parts and IDN (internationalized domain names). RFC 6532 permits `山田@example.co.jp`, `matías@müller.de`, `用户@例子.网址`.

A Japanese or Chinese recruiter using their native-script email address cannot submit the form. The error message is a generic "Invalid email" — they have no recourse.

Adoption of IDN email is low in Western corporate contexts but material in Asian markets, and is a growing signal of domain modernization.

**Fix options**:
- Swap to zod's `.string().refine(isEmail)` with an IDN-aware validator (`email-validator` package with IDN support, or `isemail`). Minor dependency addition.
- Document the limitation: "IDN email addresses are not supported; Matthew's fallback affordances (LinkedIn, obfuscated ASCII email) remain available." Pragmatic; keeps scope tight.

Flagging as Novel because memory did not name IDN; it named the byte/char mismatch.

---

## §6. Profile freshness, Velite assumptions, schema cruft

### 6.1 `updatedAt` staleness with no enforcement `[Compounding — memory noted; this review supplies two mitigations]`

Req 1.2 requires `updatedAt: ISO 8601`. Nothing enforces that the value is updated when the body changes. Matthew edits the body in Feb 2026; forgets; the field shows `updatedAt: 2025-08-15`. Recruiters conclude the profile is stale (and by extension, Matthew isn't actively job-hunting / isn't conscientious).

A stale date is *worse* than no date. At least "no date" is neutral.

**Fix — pick one**:
1. **Derive from git** at build time: a Velite transform reads `git log -1 --format=%cI content/profile.mdx` and sets `updatedAt`. Removes human error. Fails if Velite build environment doesn't have `git` (Vercel does).
2. **CI check**: a workflow step asserts that if `content/profile.mdx` is in the PR's changed files, `updatedAt` must also have been modified in the same PR. Enforceable via `git diff`. Cheap.
3. **Remove the field.** Display only "Updated: [computed from file mtime]" or omit the affordance. Solves the stale-date problem by refusing the contract.

The spec should pick. As-is, the field is a time-bomb.

### 6.2 Velite single-document schema — ambiguity about which collection it lives in `[Recurring with escalated severity — memory flagged; verification shows the feature exists but spec is ambiguous]`

Verification (from `node_modules/velite/dist/index.d.ts:5078`): Velite supports `single?: boolean` on collections, and `CollectionType` specializes output to a scalar rather than an array when `single: true`. The feature exists. The spec's *usage* is underspecified:

- Does `profile` become a new top-level collection (`pattern: "profile.mdx"`, `single: true`, file at `content/profile.mdx`)?
- Or is it an entry in the existing `pages` collection (file at `content/pages/profile.mdx`)?
- Or a new collection under `pages/`?

These choices affect:
- The slug semantics (`s.path()` returns `"profile"` vs `"pages/profile"`).
- The import path from application code (`import { profile } from '#site/content'` vs filtering from `pages`).
- The image-colocation path in `public/static/` (derived from file location).
- Whether the existing `pages` collection schema needs amendment (it doesn't currently have `headline`, `location`, `availability`, `updatedAt`, `headshot`, `resumePdf`).

**Fix**: the spec MUST name the exact Velite collection layout. Recommended: new `profile` collection at the config level, `pattern: "profile.mdx"`, `single: true`, file at `content/profile.mdx` (not inside `pages/`). This keeps the `pages` collection unchanged and avoids a schema-union antipattern.

### 6.3 `headshot` field path semantics undefined `[Novel]`

Req 1.2: "path to image, colocated with the MDX file and copied by Velite to `public/static/` per the site's image convention."

Open questions:
- In frontmatter, is the value written as `headshot: ./headshot.jpg` (relative) or `headshot: headshot.jpg` (bare)?
- Is the field typed as `s.image()` (Velite's image primitive, which handles copy + returns a shape with width/height/blurDataURL) or `s.string()` (which requires manual copy)?
- What is the final URL? `/static/headshot.jpg`? `/static/profile/headshot.jpg`?
- **Where is the headshot rendered?** The MDX body is editorial (Req 1.3) — the author may or may not embed the headshot. The page component (`src/app/(site)/profile/page.tsx`) presumably renders it from frontmatter. Spec doesn't say.

Without resolving this, two valid readings exist: (a) the headshot is rendered by the page shell in a fixed location; (b) the headshot is referenced by the MDX body. Those produce completely different designs.

**Fix**: pick. Recommended: frontmatter value is `./path/to/headshot.jpg` (relative), field uses `s.image()`, page shell renders it in a fixed location near the `headline` (not inside the MDX body). Then the MDX body is genuinely editorial.

### 6.4 `resumePdf` reserved-but-unused is YAGNI schema cruft `[Compounding]`

Memory flagged this. The counter-argument ("optionality for future specs") doesn't survive contact with the structure.md decomposition — when the download-resume affordance becomes scoped, *that spec* adds the field to the schema. Adding it now means:
- New contributors see a field they can't use and don't know how to test.
- Validation logic must tolerate both present and absent states for no current benefit.
- Future spec may want a different type (URL vs. path vs. Velite `s.file()` primitive) and has to migrate.

**Fix**: delete `resumePdf` from Req 1.2. Reintroduce when the feature is built. No meaningful cost to deferral.

---

## §7. Accessibility failures the v2 revision didn't close

### 7.1 Req 4.6 "Enter submits from any focused input" is literally wrong for textarea `[Compounding — memory flagged; this review supplies remediation language]`

"submission SHALL work with Enter from any focused input."

HTML: Enter in a `<textarea>` inserts a newline. Always. If the implementer takes the spec literally, they'll hijack Enter in the textarea — which breaks the universal expectation and WCAG 3.2.2 (Consistent Behavior) / WCAG 3.3.1 (Error Identification by breaking expected text entry). If they don't, the spec is unsatisfied as written.

**Fix**: "submission SHALL work with Enter from any focused `<input>` field. In the message `<textarea>`, Enter inserts a newline per native browser behavior; users submit via the submit button." Or explicitly: "`Cmd/Ctrl+Enter` from the textarea MAY be supported as an additional path."

### 7.2 Req 4.2 `role="alert"` contradicts its own "cooperative" rationale `[Compounding — memory noted the inaccuracy; this review converts it to implementer-action]`

`role="alert"` has implicit `aria-live="assertive"` and `aria-atomic="true"`. On error appearance:
- **NVDA**: interrupts current speech, announces the alert text.
- **JAWS**: same.
- **VoiceOver (macOS/iOS)**: same, with additional attention-grab.

The spec's parenthetical "(screen readers announce cooperatively, not as an interruption)" describes `aria-live="polite"` behavior, not `role="alert"` behavior. An implementer following the spec literally ships `role="alert"`, gets interrupting behavior, and users experience something different from what the rationale describes.

Three fixes:

1. **Match semantics to intent**: use `aria-live="polite"` on each error hint (and drop `role="alert"`). Cooperative, queued, non-interruptive. WCAG-compliant for field-level errors that appear during submission.
2. **Match rationale to semantics**: keep `role="alert"` and rewrite the parenthetical to "(screen readers interrupt to announce errors — this is appropriate for submission failure)."
3. **Use `role="alert"` only on the overall form status, not per-field**: per-field errors are `aria-live="polite"` regions referenced by `aria-describedby`; the top-level "Could not submit — check fields below" is `role="alert"`. This matches real-world patterns.

Recommended: option 3. Option 2 is cheapest if the author wants interruption.

### 7.3 Req 4.1 focus move + scroll-into-view lacks `prefers-reduced-motion` contract `[Novel]`

"move keyboard focus to the heading, scroll it into view if off-screen."

`element.scrollIntoView()` defaults to instant in some browsers, smooth in others depending on `scroll-behavior: smooth` global CSS. `scrollIntoView({ behavior: 'smooth' })` is motion. Users with `prefers-reduced-motion: reduce` must not receive smooth-scroll animation (WCAG 2.3.3 Level AAA, but also part of Level AA via 2.2.2 Pause/Stop/Hide for moving content that autonomously scrolls).

**Fix**: add to Req 4.1: "the scroll-into-view behavior SHALL honor `prefers-reduced-motion`: smooth scroll when not reduced; instant when reduced."

### 7.4 Req 4.3 doesn't specify focus target on server error `[Novel]`

Req 4.2 (400 validation error) explicitly moves focus to the first invalid field. Req 4.3 (502/503/network) describes the status message and "Try again" button but says nothing about focus. Four plausible destinations exist: (a) stays on the now-re-enabled submit button; (b) moves to the status region; (c) moves to the "Try again" button; (d) moves to the LinkedIn fallback link.

Undefined focus after a failed submission is a Level A violation (WCAG 2.4.3 Focus Order) if the resulting focus behavior is surprising, and a Level AA violation (3.3.3 Error Suggestion) if the user can't easily locate the recovery affordance.

**Fix**: explicitly specify — focus moves to the status region (with `tabindex="-1"` on the region), which is adjacent to the "Try again" button and the LinkedIn fallback. This gives keyboard users immediate access to both recovery paths.

### 7.5 Req 4.4 loading spinner lacks `prefers-reduced-motion` contract `[Novel]`

"submit button SHALL show a loading state." Typical implementations use an animated spinner (SVG rotation, CSS `@keyframes`, or a shadcn/ui `<Loader />`). That's motion.

`prefers-reduced-motion: reduce` users must see a static indicator (e.g., "Sending…" text, a pulsing opacity that doesn't rotate, or just a disabled-state badge).

**Fix**: Req 4.4 SHOULD state: "the loading indicator SHALL honor `prefers-reduced-motion: reduce` — no rotating/spinning animation for users with the preference set; text-only or opacity-only indicator is acceptable."

---

## §8. Mobile and responsiveness

### 8.1 No breakpoint specification between narrow mobile and `max-w-5xl` `[Novel]`

`max-w-5xl` is 1024px — the max. Below that, the layout is fluid by default. NFR Usability says "form fields stack on narrow viewports" — at which breakpoint? Tailwind's `sm:` (640px)? `md:` (768px)? Default fluid?

Implementation ambiguity leads to divergent behavior across screen sizes. A landscape tablet (1024×768) may render side-by-side name/email fields that overlap on a 1024px-just-below viewport.

**Fix**: pick a concrete breakpoint. Recommended: fields stack below `sm:` (640px); horizontal pairing from `sm:` up. State it.

### 8.2 Obfuscated email tap target on mobile `[Novel — compounds Req 4.8]`

Req 4.8 requires 44×44 CSS px interactive targets. `react-obfuscate` renders its pre-click state as inline text (typically the obfuscated address or a fallback string). Inline text has line-height as its vertical hit area — on default body text (16px * 1.5 line-height = 24px) the tap target is 24px tall. Fails 44×44.

**Fix**: the `<ObfuscatedEmail />` wrapper MUST apply `min-height: 44px`, adequate horizontal padding, and `display: inline-flex; align-items: center` — or be rendered as an actual `<button>` or `<a>` with appropriate sizing. Spec should name this, not leave it to implementer judgment.

---

## §9. Cross-requirement inconsistencies not already flagged

### 9.1 Req 6.2 "canonical href='/profile'" may be ignored by search engines `[Novel]`

`<link rel="canonical" href="/profile">` — relative path. Google and Bing both recommend absolute URLs for canonical (`https://matthew-field.ca/profile`). Some rankers treat relative canonical as weak signal or ignore it entirely.

Next.js App Router metadata supports `metadataBase` + `alternates.canonical` as a relative path, but the emitted HTML will be absolute if `metadataBase` is set. Spec doesn't require `metadataBase` — it's likely set in site-foundation (verify), but if the absolute/relative emission is broken, Req 6.2's intent fails.

**Fix**: Req 6.2 SHALL read "set `metadata.alternates.canonical = '/profile'` (Next.js resolves via `metadataBase` to the absolute production URL)." Also add a Playwright assertion that the rendered `<link rel="canonical">` is an absolute URL starting with `https://matthew-field.ca`.

### 9.2 `siteConfig.links.email` plaintext in source repo `[Novel]`

Req 2.5 requires the email in `src/config/site.ts`. That file is version-controlled in a public (or potentially public) repo. The email is plaintext in git history, indexable by GitHub code search and clones. react-obfuscate protects the rendered HTML bytes; it does nothing for the source repo.

If the repo is private, this is moot. If it's public (and `.github` hints/branding often suggest personal-site repos are public), the obfuscation is partially defeated: any scraper walking GitHub public repos for email patterns finds it trivially.

**Fix — if repo is public**:
- Construct the email at build time from two env vars: `SITE_EMAIL_LOCAL` and `SITE_EMAIL_DOMAIN`, concatenated in `site.ts` without appearing as a single token.
- Or accept the exposure and document it: "the email is public-repo-visible; react-obfuscate protects rendered HTML only."

The spec has no position on this. State one.

---

## Top 5 Risks (impact-ranked against the professional inbound funnel)

1. **Sandbox sender domain breaks deliverability in production (Req 3.5)** `[Recurring — escalated]`. The funnel sends emails that Fortune-100 / corporate-gateway recruiters never see. This is the #1 risk; the site's primary business objective fails silently.
2. **No degraded-mode contract when the funnel is down** `[Compounding]`. Quota exhaustion + no monitoring + no recovery CTA = invisible outage. Concrete scenario: 100 bot submissions on Monday; 5+ recruiter losses before Sunday's dashboard check. The "LinkedIn fallback" is only meaningful if the user is told to use it in the error UX.
3. **Timing-check silent-drop is a UX trap for password-manager users** `[Novel]`. Autofill submissions in <1s show success UI while no email sends. Every 1Password/Dashlane user with a pre-typed message is at risk.
4. **Vercel 10s cap vs Resend 10s timeout race (Req 3.7)** `[Compounding]`. Spec's 503 + Retry-After path cannot actually execute; client sees opaque 504. Fix: cut Resend timeout to 9s.
5. **Playwright cannot mock server-side `fetch` as Req 3.11 describes** `[Novel]`. The smoke test either degrades to a weaker check than the spec claims, or pollutes production code with a mock-mode branch. Unresolved, the implementation ships a test whose guarantees don't match its acceptance criterion.

## Top 3 Conclusions to Challenge or Reverse

1. **Reverse Req 3.5 — sandbox sender in production is not acceptable. `[Recurring]`** Require a verified custom domain with SPF/DKIM/DMARC posture before the funnel goes live, or the spec fails its own business objective.
2. **Reverse the "no CI Lighthouse gate" decision or require a PR-artifact substitute `[Compounding]`**. Manual review by the sole maintainer of their own PR is not a gate; it's a promise. Require Lighthouse scores pasted in the PR description, or add `@lhci/cli` as a non-blocking reporter. Either leaves an audit trail.
3. **Reverse Req 1.8's deep-link promise as currently stated (or Req 1.3's editorial freedom) `[Novel]`**. The two requirements are mutually inconsistent. Either deep-link support is author-responsibility ("Req 1.8: rehype-slug generates IDs from whatever headings you include") or there's a minimum heading contract. The current "both" is a latent bug.

## What's Missing (concrete additions required before implementation)

**Bot defense**
- Honeypot field `name` attribute MUST be named (e.g., `url_secondary`) to avoid password-manager autofill.
- Timing-check silent-drop MUST be reconciled with password-manager autofill — either drop the silent-success UI, or require a second signal, or upgrade to HMAC-signed timestamps.
- Origin/Referer absence behavior MUST be specified (Safari same-origin, strict privacy browsers).

**Resend / deliverability**
- Req 3.5 MUST require a verified custom sender domain for production.
- DNS posture (SPF, DKIM, DMARC) MUST be specified as configuration prerequisites.
- Resend client timeout MUST be set below Vercel's function cap (9s, not 10s).
- Req 3.8 MUST enumerate specific implementation prohibitions: no `console.*` logging of form fields; no throwing errors containing submitted content.
- Degraded-mode error UX (Req 4.3) MUST include an inline LinkedIn recovery CTA, not just "alternative method" prose.

**Testing mechanics**
- Req 3.11 MUST name the Resend-mocking strategy (env-configurable base URL → test-only recorder, or equivalent), or drop the "asserts invoked once with expected payload" promise.
- NFR Security CSP test MUST specify `page.addInitScript` for the violation listener AND a separate pass under enforcing policy.
- Req 4.7 axe test MUST run under both light and dark themes; rule set MUST include `heading-order` + WCAG 2.1 AA defaults, not only `color-contrast`.
- Req 4.7 MUST include a canonical-URL assertion (Req 6.2 is otherwise unverified).

**Content schema**
- Velite collection layout for `profile` MUST be named (standalone collection vs. `pages/` entry).
- `headshot` MUST specify field type (`s.image()`), path convention, and rendering location (page shell vs. MDX body).
- `resumePdf` SHOULD be removed until the feature is scoped.
- `updatedAt` staleness MUST be mitigated — pick one of: git-derived, CI-enforced, or remove the field.

**Accessibility**
- Req 4.1 scroll-into-view MUST honor `prefers-reduced-motion`.
- Req 4.4 loading indicator MUST honor `prefers-reduced-motion`.
- Req 4.3 MUST specify focus destination on server error.
- Req 4.6 textarea-Enter clause MUST be scoped to `<input>`, or explicit `Cmd/Ctrl+Enter` semantics named.
- Req 4.2 `role="alert"` vs. "cooperative" rationale MUST be reconciled — either change the role to `aria-live="polite"` or rewrite the rationale.

**Validation / i18n**
- 16 KB byte cap MUST be reconciled with 5000-character zod cap (raise to 32 KB, or cap in characters).
- zod `.email()` IDN limitation MUST be acknowledged (either upgrade the validator or document the limitation).

**SEO / misc**
- Req 6.2 canonical URL MUST be absolute (via `metadataBase`), tested.
- `siteConfig.links.email` exposure in public source MUST be addressed or consciously accepted.

**Layout**
- Form-field stacking breakpoint MUST be named.
- Obfuscated email tap target MUST be sized to 44×44 (not relying on line-height).
