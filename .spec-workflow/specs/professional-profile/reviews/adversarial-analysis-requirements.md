# Adversarial Analysis — professional-profile Requirements

Target: `.spec-workflow/specs/professional-profile/requirements.md`
Steering: `product.md`, `tech.md`, `structure.md`

## 1. Contact-form abuse surface and Resend blast radius

**The honeypot is the only defense, and tech.md already tells us it's not enough.**
Req 3.5 and NFR Security → Honeypot spam defense install a single hidden field as
the sole anti-abuse mechanism. tech.md line 113 says honeypot "stops ~90% of
naive bot submissions; does not stop targeted or headless-browser attacks." The
requirements document accepts this as the "launch-time defense" (NFR Security →
Rate limiting) and offers no compensating control. Day-one failure scenario: a
scraper sees the form, notices the honeypot field has `display:none` or
`aria-hidden`, leaves it empty, fires 500 submissions with randomized
`name`/`email`/`message`. Every one passes zod (Req 3.3 specifies no content
quality check), every one hits Resend (Req 3.6), every one arrives in
Matthew's inbox. There is no requirement that says "the spec must degrade
gracefully when bot traffic exceeds threshold X." This is the #1 failure mode
and the requirements shrug at it.

**Resend's 100/day quota becomes a denial-of-inbox vector.** tech.md line 45
establishes the free tier at 100 emails/day. Req 3 defers rate limiting (NFR
Security → Rate limiting) and mandates that every validated submission reaches
Resend (Req 3.6). An attacker scripts 101 valid submissions in one minute:
requests 1–100 flood the inbox, request 101 triggers Resend's quota error,
Req 3.7 returns HTTP 502 with a "user-friendly error message." From that moment
until the 24-hour rolling window resets, **every legitimate recruiter who
submits the form sees the 502 error**. The requirements do not acknowledge
this tradeoff, do not define a "degraded mode" where the obfuscated email
becomes the primary CTA, and do not specify alerting so Matthew knows the
funnel is down. The NFR labels rate limiting "deferred" — that is not a
mitigation, that is a rename.

**Req 3.6's `reply-to` policy is a phishing helper with no acknowledgment.**
The requirement reads: "the submitter's email as `reply-to`." There is no
email verification step, no SPF/DKIM check on the submitted address, no
warning that the `reply-to` field is attacker-controllable. Concrete attack:
attacker submits `name="Jane Recruiter"`, `email="attacker@evil.tld"`,
`message="Interested in your profile — please reply."` Matthew hits reply.
His response lands in the attacker's inbox, not Jane's (because Jane never
sent anything). If the attacker's message references a real hiring event,
Matthew may disclose availability, salary expectations, or personal details
to a spoofed sender. This is a social-engineering surface that deserves at
least an explicit acknowledgment in the requirements ("reply-to is
attacker-controlled; Matthew must treat inbound email addresses as
unverified") and arguably a format constraint (reject role-based addresses,
display-name mismatches, or disposable domains).

**Req 3.3 says "length bounds" and specifies no numbers.** A conformant
implementation could cap `message` at 1 MB — or at 10 MB if the route handler
has no body-size limit above it. An attacker who notices this submits a
10 MB `message` 100 times; the Resend API call may succeed (Resend's text
field limit is not stated in the spec), may be silently truncated, or may
push the function's memory/execution-time envelope (Vercel Hobby functions
have a 4.5 MB body limit by default and a 10s execution cap — neither is
mentioned). Concrete missing ceilings the spec must state:

- `name`: 1–100 chars
- `email`: 254 chars (RFC 5321 envelope limit)
- `message`: 10–5000 chars (or whatever Matthew actually wants to read)
- `honeypot`: must be empty-string; any non-empty value triggers Req 3.5
- HTTP code for oversize body: 413 `Payload Too Large`, before zod even runs
- Total request body cap enforced at the route handler (Next.js App Router
  does not cap body size by default — this must be explicit)

**Req 3.5 silent-drop vs. Req 4.1 success UX is a trap for real humans.**
Req 3.5 says populated honeypot → HTTP 200 + no email. Req 4.1 says
HTTP 200 → "display an inline success message, move keyboard focus to the
message, and clear the form fields." A human whose password manager or
browser autofill populated the honeypot (LastPass aggressively fills any
input with `name="email"`-like attributes; Safari autofill surfaces
hidden-but-present fields for accessibility) follows the Req 4.1 happy
path: sees "Message sent!", fields cleared, focus moved. They leave.
Matthew never gets the message. There is no telemetry (see §6) so this
failure is invisible to both sides. The spec needs to address: (a) the
honeypot-hiding technique (see §4), and (b) the specific failure mode
where a human triggers the bot path.

**Dismissed alternatives the requirements should at least name.** None of
the following appear in the requirements or NFRs, though all are standard
for hiring-funnel contact forms:

- Cloudflare Turnstile or hCaptcha (invisible CAPTCHA, no PII collected,
  works under restrictive CSP — would compose with the existing
  `script-src 'self' 'unsafe-inline'` since both have `'self'`-compatible
  integrations)
- Time-to-submit heuristics (bots submit in <1s; humans don't)
- Origin/Referer header check (rejects cross-origin scripted posts)
- Resend inbound webhook for bounce handling (if Matthew replies to a
  spoofed `reply-to`, the bounce tells him the address was fake)
- A simple per-IP token-bucket using Vercel Edge Config (stateless-ish,
  free tier, addresses the "we need an external state store" objection
  in tech.md)

At minimum the spec must state *why* these are out of scope or deferred
to a later spec — currently they are simply unmentioned, so an
implementer cannot tell whether the omission is deliberate or an
oversight.

## 2. MDX-driven profile: underspecified content schema and layout

**Req 1 defines the page but not the profile.** Req 1.1 names `title` and
`description` as frontmatter fields. That is the entire schema contract.
No required role history (positions, dates, employers), no required
skills taxonomy, no headshot, no location, no years-of-experience summary.
A conformant implementation can ship `content/profile.mdx` containing:

```mdx
---
title: "Matthew Field"
description: "Engineer."
---

Hi.
```

…and pass Req 1.1 through 1.6. product.md calls this page "a visual
resume/CV" and "the main mechanism by which employers and recruiters
get in touch" (business objective #1). The schema must mandate the
content structure that makes it a resume. Concrete missing frontmatter
fields the Velite schema should enforce:

- `headline` (the one-line role summary that appears under the name)
- `location` (city, country — recruiters filter by this)
- `availability` (open-to-work flag; product.md implies an active job
  hunt)
- `links.linkedin`, `links.github`, `links.email` — or a statement that
  these come from `src/config/site.ts` and the profile schema does not
  duplicate them (see §5)
- `headshot` (path to image, or explicit "no headshot required")
- `updatedAt` (so recruiters know the page isn't three years stale)
- `resumePdf` (optional, for the "download my resume" affordance —
  see below)

And required MDX body sections (enforced by a post-parse validator, since
frontmatter alone cannot enforce body structure): `## Experience`,
`## Skills`, `## Education`, or a documented rationale for why these
are optional.

**Req 1.3 is unmeasurable and conflicts with product.md.** Req 1.3:
"wider container than standard content pages… narrower than full-bleed,
wider than the standard prose column." Two implementers, two widths.
Meanwhile product.md feature #2 says the profile "uses wide layout to
maximize viewport width" — which reads closer to full-bleed than to a
"narrower than full-bleed" container. Resolution the spec must force:
pick a concrete max-width (e.g., `max-w-5xl` / 1024px, or a named
design token `--layout-profile-max-w`), and either (a) amend Req 1.3
to cite the token and delete the hand-wavy language, or (b) amend
product.md to agree with Req 1.3. As written they contradict. Site-
foundation presumably owns layout tokens — this spec must cite the
specific token, not re-describe layout in prose.

**Req 1.6 does not cover MDX runtime errors.** "Fails to parse or is
missing required frontmatter fields" → build fails loudly. But MDX
compiles to React component code. Failure modes not covered:

- MDX imports a component that doesn't exist in `src/components/mdx/`
  (parse succeeds; ReferenceError at render; on server components this
  becomes a 500 at runtime and a silent build-time error depending on
  Next.js's static-generation behavior)
- MDX imports a component that exists but throws during render (valid
  JSX, runtime exception)
- MDX uses an experimental syntax that Velite's MDX version doesn't
  support (parse error surfaces, but where? CI? Or Vercel build log
  only?)

The requirement should specify: the build fails loudly on (a) frontmatter
schema violations, (b) MDX compile errors, (c) references to undefined
MDX components, and (d) render-time exceptions when statically generating
`/profile`. (d) matters because Next.js static generation may degrade
to SSR on errors rather than failing the build — this must be
prevented.

**No acceptance criterion covers profile images.** structure.md line 212
says content images colocate with MDX and Velite copies them to
`public/static/`. But the profile is a *single-document* schema
(NFR Architecture says "adds a `profile` single-document schema"). Does
the Velite image-copy convention apply to single-document schemas, or
only to collection schemas? The requirements are silent. A headshot
referenced as `![Matthew Field](./matthew.jpg)` could either be copied
by Velite or produce a 404 depending on how the single-document schema
is configured. Req 1 must either mandate that images work (and require
the Velite config to support it) or explicitly route the headshot
through `public/images/` per structure.md's "site images" category.

**No table of contents, heading anchors, or print/PDF story.** product.md
explicitly calls this a "visual resume/CV." Recruiters:

- Print the page and hand it to a hiring manager. No Req in §1 mentions
  print stylesheet, page-break hints, or "Download resume" affordance.
  A gradient background and dark-mode-first styling print as a gray
  blob.
- Share a deep link to "Experience" or "Skills". No acceptance criterion
  requires heading anchors or a table of contents.
- Scroll-jump between sections on mobile. No section navigation
  specified.

tech.md mentions `rehype/remark plugins` for "table of contents
generation, footnotes, GitHub Flavored Markdown, heading anchors" —
which implies these are available. Req 1 does not require the profile
page to use them. If the profile page does not have anchor links,
recruiters cannot share `/profile#experience` — that is a direct hit
on the primary business objective.

## 3. Progressive-enhancement and no-JS claims that quietly contradict the design

**The no-JS form post returns JSON, which is not "functional."** NFR
Usability → Progressive enhancement: "the form action still posts to
`/api/contact` for a no-JS baseline experience (target: functional, not
polished)." Req 3.4 mandates `400 + JSON` on validation failure. Req 3.7
mandates `502 + user-friendly error message` (the message being in the
JSON body, since no HTML response is specified) on Resend failure. Req
3.5 returns `200` to the honeypot. None of these specify `Content-Type`
negotiation. A no-JS user submitting the form sees their browser
render `{"error":"Validation failed","fields":{...}}` on a blank
page with no navigation back. The back button returns them to a form
with their values preserved only if the browser chooses to restore
from session history — many mobile browsers do not. This is not
"functional," it is a broken form. Force a decision:

- **Option A (keep the no-JS claim):** The API must content-negotiate.
  If `Accept` does not include `application/json` or `Content-Type` is
  `application/x-www-form-urlencoded`, respond with `303 See Other`
  + `Location: /contact?status=success` (or `/contact?status=error&…`)
  and render the status from query params on the next page load. This
  is the *only* POST-then-redirect pattern that actually works without
  JS.
- **Option B (drop the no-JS claim):** Delete the Progressive
  enhancement NFR and replace it with "JavaScript is required to submit
  the contact form; the no-JS fallback is the obfuscated email and the
  LinkedIn/GitHub links, which work without JS."

As written the spec is self-contradicting and will ship whichever option
the implementer finds easiest, not whichever is correct.

**Req 4.2 cannot coexist with no-JS on the same path.** Req 4.2: "field-
level errors… PRESERVE the user's entered values so no typing is lost,
and leave focus on the first invalid field." This is client-side
orchestration of a JSON response. There is no way to focus a specific
field or preserve input without re-rendering the form from JS state. A
no-JS form post, even with Option A above, cannot meet Req 4.2 — the
best it can do is re-render the form server-side with values echoed
back via query params and a hash anchor like `#field-email`. The
requirement must be split: "When JS is enabled, Req 4.2 applies. When
JS is disabled, server echoes values and sets the URL fragment to the
first invalid field." Without that split, Req 4.2 is a client-only
requirement masquerading as universal.

**react-obfuscate and LinkedIn/GitHub links — verify the dependency
graph.** NFR Usability is honest that no-JS users lose the email.
Req 2.1 requires LinkedIn and GitHub links — those are plain URLs and
should work in any no-JS renderer. But structure.md line 187 says "push
`\"use client\"` as far down the component tree as possible — wrap only
the interactive leaf." If the contact section is implemented as one
top-level `<ContactSection>` client component (the simplest
implementation), the LinkedIn/GitHub `<a>` tags get pulled into the
client bundle and fail to render without JS. The spec should state
explicitly: **LinkedIn and GitHub links are server-rendered and do not
require JS hydration.** Currently it does not.

**CSP compliance for react-obfuscate is asserted without evidence.**
NFR Security → CSP compliance claims "no loosening is needed." tech.md
line 115 specifies `script-src 'self' 'unsafe-inline'` and
`connect-src` restrictive. react-obfuscate's runtime decode typically
uses inline event handlers wired up by React, not by CSP-violating
`<script>onclick=…>` — React attaches via `addEventListener` so
`unsafe-inline` is not strictly required. **But:** react-obfuscate
v3.x composes a `mailto:` href from decoded fragments; some builds
use `eval`-like patterns for the decode step. The spec should not
*assume* compliance — it should mandate a CSP test case in the
Playwright suite: load `/contact` with `Content-Security-Policy-Report-
Only` matching the production policy, click the obfuscated email,
assert zero CSP reports. Currently Req 3.10 only tests the contact
form; obfuscate is untested.

## 4. Accessibility acceptance criteria that cannot be tested or are subtly wrong

**Req 4.1 moves focus without specifying the target.** "Move keyboard
focus to the [success] message." For this not to disorient AT users,
the target element needs to be a heading (for meaningful announcement),
must have `tabindex="-1"` (so JS focus works on a non-interactive
element), and must not be visually off-screen (or the sighted keyboard
user loses track). The requirement mentions none of these. Missing
detail:

- Target element: `<h2>` or `role="status"` with `aria-live="polite"`
  (which is already required) and `tabindex="-1"`
- Scroll behavior: the browser must scroll the target into view if it's
  below the fold
- Focus ring visibility: on a focused non-interactive element, the
  focus ring must still be visible (browser defaults hide focus on
  `tabindex="-1"` elements in some engines)

**Req 4.2's `aria-live="assertive"` is wrong for validation errors.**
WAI-ARIA Authoring Practices: `assertive` interrupts whatever the user
is doing and should be reserved for critical, time-sensitive alerts
(session timeouts, payment failures). Form validation errors are not
critical — the user is actively trying to submit the form, the errors
are a cooperative part of the flow, not an interruption. The correct
pattern is `role="alert"` (implicit `aria-live="assertive"` semantics
but with the "alert" role conveying meaning) **or** `aria-live="polite"`
paired with `aria-describedby` on each invalid field. `assertive` will
cause screen readers to cut off whatever they were reading (e.g., the
label of the field the user just corrected) to announce the error,
which is worse UX than `polite`. Reverse this: use `aria-live="polite"`
or `role="alert"` for field-level errors, and reserve `assertive`
(if at all) for server errors ("Something went wrong on our end").

**Req 4.4's `aria-required` is redundant.** HTML5 `required` is the
correct baseline — every modern screen reader announces it. Adding
`aria-required="true"` is a fallback for platforms where the native
attribute is missing or the element is a non-native control (a custom
`<div role="textbox">`). For real `<input>` elements with native
`required`, `aria-required` is noise. The requirement should say:
"native `required`; `aria-required` only where a custom control lacks
native semantics." As written, implementers will add both to every
field, producing no harm but also no benefit, and establishing a
cargo-cult pattern elsewhere in the site.

**Req 4.6 WCAG AA contrast has no verification mechanism.** "All text,
borders, focus rings, and error states SHALL meet WCAG 2.1 AA contrast"
is a hope, not a gate. How does CI fail if a new color token drops
contrast below 4.5:1? Options:

- `axe-core/playwright` integration in the contact-form smoke test
  with `rules: ['color-contrast']`
- Lighthouse Accessibility score ≥ 95 as a hard CI threshold (not just
  the ≥ 90 "blocking issue" prose in NFR Performance, which is not a
  CI gate — see §6)
- A manual pre-launch audit with a stated acceptance checklist

Without one of these named, "meets WCAG 2.1 AA" is aspirational.

**NFR Usability mobile tap-target size specifies no size.** "Tap targets
meet minimum size." WCAG 2.5.8 (AA) is 24×24 CSS px; 2.5.5 (AAA) is
44×44 CSS px. Apple HIG is 44×44 pt; Material Design is 48×48 dp. All
four differ. Pick one — recommend 44×44 px as the practical default —
and name it. Mobile Safari autofilled touch handling routinely pushes
small submit buttons off-target on iPhone SE; a 24×24 compliant button
is still annoying.

**Nothing covers screen-reader behavior of the honeypot field.** Req
3.1 requires an "invisible honeypot field that legitimate users will
not fill." Invisibility strategy is not specified. Three options with
very different outcomes:

- `display: none` → invisible to humans and screen readers, invisible
  to keyboard focus. Good. Some bots detect this and skip the field.
- `visibility: hidden` / `aria-hidden="true"` → invisible to screen
  readers, may or may not be focusable depending on browser. OK.
- Positioned off-screen (`.sr-only` or `position: absolute; left:
  -9999px`) → **read aloud by screen readers**, focusable. A screen
  reader user hears "First name (second): text input" and dutifully
  fills it. Their submission hits Req 3.5's silent-drop path. They
  think they contacted Matthew. They did not.

This is an accessibility failure disguised as a security feature. The
spec must mandate: honeypot field has `display: none` OR equivalent
`tabindex="-1" + aria-hidden="true" + autocomplete="off"` so
assistive technology does not expose it to users.

## 5. Component reuse, layout wrapping, and the "same component" claim

**Req 5.3 forbids the only sane implementation of Req 1.3 + Req 5.2.**
Req 1.3 says /profile is wider than standard; Req 5.2 says /contact is
standard layout; Req 5.3 says both pages use the *same component* in
`src/components/shared/` with "no per-page configuration prop required
for the happy path." These three can only all be true if **the parent
page owns layout**, not the component. So the contact section
component renders its own content width-agnostic, and the two page
files wrap it in different layout containers. The spec does not say
this. An implementer reading Req 5.3 in isolation will build
`<ContactSection widthVariant="profile" />` and violate the "no prop"
rule, or — worse — duplicate the component and violate the
"no parallel implementation" rule. Amend Req 5.3 to: "the shared
component renders layout-agnostic markup; the profile page and contact
page impose their own layout wrappers."

**"Contact section" is one requirement, three components, zero
boundary definition.** NFR Architecture calls out three components:
contact form, obfuscated-email, social-link. Req 5 treats them as
"the contact section." There is no acceptance criterion defining the
composition:

- Is there a `<ContactSection>` wrapper component that contains all
  three, or do `/profile/page.tsx` and `/contact/page.tsx` each render
  the three siblings directly?
- If the wrapper exists, does it own the "Shoot me a message…" copy
  (Req 2.3), or does each page render the copy separately?
- Does the wrapper own the heading structure ("Contact" `<h2>`) or is
  that the page's job?

Without this, two implementers will produce two different component
graphs. The spec must declare either "there is a `<ContactSection>`
wrapper that composes the three components and owns the tagline copy"
or "pages compose the three shared components directly and each page
owns its tagline."

**Site config integration is unspecified.** structure.md line 74: "Site
metadata, nav items, social links" live in `src/config/site.ts`.
Req 2.1 requires LinkedIn and GitHub links. Req 2.2 requires the
obfuscated email. Nowhere does the requirements document state that
these values come from `src/config/site.ts`, not from a hard-coded
constant in the contact component. An implementer will write:

```tsx
<a href="https://linkedin.com/in/mfield">LinkedIn</a>
<a href="https://github.com/mfield">GitHub</a>
<Obfuscate email="fieldm58@gmail.com" />
```

…and duplicate what the site nav/footer already do. When Matthew
changes his LinkedIn URL, he updates it in `src/config/site.ts` and
the contact section silently diverges. Add: **"LinkedIn, GitHub, and
email values SHALL be read from `src/config/site.ts`; they SHALL NOT
be hard-coded in the contact components."**

**Req 3.10 mock-vs-sandbox ambiguity is a test strategy collision.**
"Playwright contact-form smoke test SHALL submit the form against a
mocked or sandboxed Resend integration." Two very different tests:

- **Mock:** Intercepts the fetch inside the route handler and returns
  a canned 200. Asserts the *local code path*: form → API → mock →
  200 response. Catches regressions in form markup, zod schema,
  client-side submission logic, and API route shape. Does NOT catch
  regressions in Resend API contract, auth, domain verification, or
  key rotation.
- **Sandbox:** Hits Resend's test/sandbox domain with a real API call.
  Catches Resend contract regressions, API key validity, and DNS/SPF
  issues. Requires a live Resend sandbox key in CI. Slower, flakier,
  and costs against any shared quota.

"Or" is not a strategy. The spec must pick. Recommendation: mock in
unit/CI smoke (fast, always runs), plus a separate scheduled nightly
e2e test that hits the Resend sandbox (catches contract drift).
Currently "or" will produce two different decisions by two different
implementers.

## 6. Missing scope, measurement, and integration details

**Success metric has no instrumentation.** product.md success metric #1:
"Contact form submissions: The site generates inbound professional
inquiries." The requirements include zero acceptance criteria for
observability:

- No analytics event on submit (Plausible/Umami/etc. is "future vision"
  in product.md but the requirements do not even reserve the hook).
- No Resend webhook handler for delivery failures (Resend can POST to
  an endpoint on bounce/complaint/delivery).
- No server-side log of accepted submissions (Vercel function logs are
  ephemeral and unqueryable without a paid tier).
- No "heartbeat" check — a cron that submits a known-good form weekly
  and verifies it reached the inbox.

Failure scenario: Matthew deploys a change to `next.config.ts` CSP that
breaks the form. Playwright smoke test passes (the test mocks Resend).
For seven days no real submissions arrive. Matthew has no idea whether
the form is broken or simply unvisited. By the time he notices, he has
missed seven days of recruiter outreach. The requirements must at
minimum reserve: "an analytics event fires on successful submission"
and/or "an internal endpoint is available to test end-to-end email
delivery."

**Req 1.5 depends on a template that may not exist.** "Follows the
site-wide metadata template established in site-foundation." Grep
site-foundation. Is this template actually defined? If site-foundation
is incomplete, Req 1.5 is blocked on a prerequisite not declared in
this spec. Add to Req 1.5: "If site-foundation's metadata template is
not yet merged at implementation time, this spec SHALL NOT ship until
the template lands; metadata schema is not re-specified here." Or
reference the specific file/export (`src/lib/metadata.ts`?) so the
dependency is concrete.

**/contact is a slash page but not wired into /slashes, /sitemap, or
the nav.** product.md feature #8 lists /contact among slash pages.
product.md also says /slashes is an index of all slash pages and
/sitemap auto-generates an HTML sitemap. The requirements never say
/contact must be:

- Added to whatever drives the /slashes index
- Included in the XML sitemap (`src/app/sitemap.ts` per structure.md)
- Linked from the top nav's "Contact" entry (product.md feature #9
  implies the nav has section links; is "Contact" one of them?)

If these are owned by another spec, cite it ("nav registration is
covered by site-foundation task N"). If they are this spec's
responsibility, add acceptance criteria. Currently they are in limbo.

**No disambiguation between /profile and /about.** product.md feature
#8: /about is "distinct from the Professional Profile — more 'who is
Matthew' than 'what's on his resume.'" No acceptance criterion prevents
the two pages from having overlapping content, competing for the same
Google query ("matthew field devops"), or presenting contradictory
bios. At minimum the spec should add: "/profile's meta description
SHALL differ from /about's; /profile has `rel=canonical` on itself
(not /about); if Matthew's name appears on /about, /about SHOULD
include a link to /profile for disambiguation."

**Req 3.7's HTTP 502 is defensible but unidirectional.** 502 "bad
gateway" is fine when Resend returns an error — Next.js is the gateway,
Resend is the upstream. But for a Resend timeout or 5xx, 503 "service
unavailable" + `Retry-After: 60` would let a thoughtful client (or the
fetch helper on the client side) decide whether to retry automatically.
Req 3 has no retry strategy on the client side at all: Req 4.2 says
preserve values and show an error, but does not say "offer a retry
button" or "auto-retry with exponential backoff." For a funnel where
Resend blips are the most likely error class, no-retry is a lost
lead. Add: (a) 503 + `Retry-After` on upstream timeout, 502 on Resend
4xx/explicit error; (b) client shows a "Try again" button in the error
UI; (c) client does NOT auto-retry (to avoid amplifying an outage).

**Lighthouse ≥ 90 is prose, not a gate.** NFR Performance: "Lighthouse
≥ 90 on both /profile and /contact after first deploy… Blocking issue
if any new page falls below 90." Compare with Req 3.10: "the Playwright
contact-form smoke test SHALL submit the form… and assert a 200
response" — that is an executable assertion, testable in CI. The
Lighthouse claim names no runner, no CI step, no failure threshold,
no schedule. "Blocking issue" is meaningless without an enforcement
mechanism. Options:

- `@lhci/cli` (Lighthouse CI) in GitHub Actions on every PR, with
  asserted thresholds per category (performance ≥ 90, accessibility
  ≥ 95, best practices ≥ 90, SEO ≥ 90) and the action fails when any
  page falls below
- Vercel's built-in Speed Insights with a CODEOWNERS-gated alert
- A scheduled nightly check against production + a Slack/email
  notification

Pick one, cite the tool, and add the acceptance criterion: "CI SHALL
run Lighthouse CI against `/profile` and `/contact` on every PR and
fail the build if any score falls below 90." Otherwise the claim is a
best-effort promise.

## Top 5 Risks or Gaps (ranked by impact)

1. **Resend quota DoS** — An attacker with a trivial script can exhaust
   Matthew's 100/day Resend quota in under a minute, blackholing the
   primary recruiting funnel for up to 24 hours. The spec must add
   either (a) pre-Resend rate limiting (Vercel Edge Config / KV), (b) a
   non-email-based signal when the form is unavailable, or (c) an
   explicit acknowledgment that funnel downtime is acceptable and a
   documented fallback ("the LinkedIn link is always the primary CTA").

2. **Honeypot-accessible-to-screen-readers silent drop** — If the
   honeypot is hidden via `.sr-only` or off-screen positioning, screen-
   reader users are sent down Req 3.5's silent-success path and never
   reach Matthew. The spec must mandate `display: none` or an
   equivalent technique that hides the field from assistive technology
   as well as from sighted users (and ideally specify the `aria-hidden`
   / `tabindex="-1"` / `autocomplete="off"` combo).

3. **No-JS claim produces a raw-JSON broken-form experience** — Req 3.4
   and 3.7 return JSON; NFR Usability claims the form works without JS.
   A no-JS submitter sees `{"error":"…"}` on a blank page. The spec
   must either add content-negotiation (303 + query-param redirect
   pattern) or retract the no-JS claim. Shipping as written will fail
   Req 4.2 *and* the progressive-enhancement NFR simultaneously.

4. **No analytics, no delivery confirmation, no heartbeat** — product.md
   measures success by inbound submissions; the spec has no way to
   measure them. A silent regression (CSP change, env var typo, Resend
   auth expiry not covered by the mocked smoke test) takes the funnel
   offline and nothing tells Matthew. The spec must add at minimum a
   submission-success analytics event and a periodic end-to-end email
   delivery check.

5. **Profile page content schema is underspecified** — "a visual
   resume/CV" with `title` + `description` as the only required
   frontmatter will produce implementations that diverge wildly and
   cannot evolve together. The spec must add concrete schema fields
   (headline, location, availability, headshot, updatedAt) plus an
   MDX structure contract (required `## Experience` / `## Skills` /
   `## Education` sections, or an explicit opt-out).

## Top 3 Conclusions to Challenge or Reverse

1. **Reverse "honeypot alone is sufficient at launch."** tech.md itself
   says honeypot stops only naive bots. The funnel is the primary
   business objective. Add one additional defense that does not
   require external state: origin/Referer check (server-side, zero
   cost, zero state) + time-to-submit heuristic (client-stamped
   timestamp in a hidden field, server rejects <1s). These compose
   with the honeypot and do not require Vercel KV or Upstash. If the
   spec truly wants to defer rate limiting, it must pair that
   deferral with these cheaper defenses.

2. **Reverse `aria-live="assertive"` for form validation errors
   (Req 4.2).** Use `role="alert"` (or `aria-live="polite"` with
   `aria-describedby`). Assertive interrupts the screen reader
   mid-sentence and is wrong for cooperative form validation. This is
   a WCAG-adjacent best-practice inversion and will produce a worse
   experience for AT users than doing nothing.

3. **Reverse Req 5.3's "no per-page configuration prop required."** It
   is uninformable absolutism. Either state that layout is imposed by
   the parent page (the shared component has no width concern) or
   allow a minimal layout prop. The current wording backs implementers
   into duplication or covert prop-smuggling. This is the kind of
   anti-coupling rule that produces worse coupling.

## What's Missing — concrete additions the requirements must include before implementation

### Schema and content

- Velite profile frontmatter fields: `headline`, `location`,
  `availability`, `headshot`, `updatedAt`, and the final answer on
  whether `links.*` live in the profile frontmatter or in
  `src/config/site.ts`.
- Required MDX body section contract: `## Experience`, `## Skills`,
  `## Education` (or documented opt-outs).
- Single-document Velite image handling for the headshot: either the
  schema supports colocated images (mirror the blog convention) or
  the requirement sends the headshot through `public/images/`.

### Contact form hardening

- Explicit field length caps: name 1–100, email ≤254, message
  10–5000, and a total request-body cap at the route handler.
- HTTP 413 for oversize bodies; HTTP 429 path reserved even if not
  enforced at launch.
- Origin/Referer header check.
- Time-to-submit heuristic (hidden timestamp field, reject <1s).
- Honeypot hiding technique: `display: none` + `tabindex="-1"` +
  `aria-hidden="true"` + `autocomplete="off"`.
- Acknowledgment that `reply-to` is attacker-controlled and Matthew
  must treat inbound sender addresses as unverified.
- Specify the Resend sender identity (sandbox domain, production
  domain, DMARC posture) and whether SPF/DKIM/DMARC are this spec's
  scope or site-foundation's.

### No-JS / progressive enhancement

- Either: API content-negotiates (`application/x-www-form-urlencoded`
  → 303 redirect to `/contact?status=…`) and server echoes values
  via query params.
- Or: NFR Usability → Progressive enhancement is struck and replaced
  with "JS required for form submission; no-JS fallback is the
  obfuscated email + LinkedIn/GitHub links."
- Explicit confirmation that LinkedIn/GitHub links are server-
  rendered and do not require JS to function.

### Accessibility

- Target for `aria-live` and focus move on success: heading with
  `tabindex="-1"`, scroll-into-view, visible focus ring.
- `role="alert"` or `aria-live="polite"` (not `assertive`) for field
  validation.
- Mobile tap-target minimum size stated in CSS px (recommend 44×44).
- CI enforcement: `axe-core/playwright` assertion with
  `color-contrast` rule; Lighthouse CI with per-category thresholds
  (performance ≥ 90, accessibility ≥ 95, best-practices ≥ 90,
  SEO ≥ 90) blocking the PR on failure.
- `aria-required` only on non-native controls; native `required` on
  real `<input>`s.

### Layout and composition

- Concrete max-width for /profile (px, rem, or named token from
  site-foundation) — resolve the contradiction with product.md's
  "maximize viewport width."
- Explicit statement that /profile's layout wrapper is owned by the
  page, and the shared contact component is layout-agnostic.
- Component-boundary decision: single `<ContactSection>` wrapper vs.
  three siblings; who owns the tagline copy.
- `src/config/site.ts` is the single source for LinkedIn / GitHub /
  email; contact components consume from there.

### Observability and integration

- Analytics event on successful submission (name the tool or
  explicitly defer to a later "Analytics" spec).
- Either a Resend bounce/complaint webhook handler or an explicit
  decision to monitor bounces manually via the Resend dashboard.
- End-to-end delivery heartbeat (scheduled Playwright or
  independent cron) in addition to the per-PR mocked smoke test.
- Decide: Req 3.10 uses mocked Resend in CI; a separate scheduled
  nightly test hits the Resend sandbox to catch contract drift.
- /contact registration: slashes index, XML sitemap, top nav entry —
  cite the owning spec or add acceptance criteria here.
- /profile vs. /about SEO disambiguation (canonical URLs, meta
  description divergence, inter-page link).

### MDX robustness

- Build fails on: frontmatter schema violations, MDX compile errors,
  references to undefined MDX components, render-time exceptions
  during static generation. Name each failure class in Req 1.6.

### Error handling

- HTTP 503 + `Retry-After` on Resend timeout (vs. 502 on Resend
  explicit error); client shows a "Try again" button; no automatic
  retry.

### Testing strategy

- CSP compliance test case for react-obfuscate: load /contact under
  the production CSP (via `Content-Security-Policy-Report-Only`),
  click the obfuscated email, assert zero CSP violation reports.
