# Adversarial Review — professional-profile Requirements

You are a senior principal engineer with deep experience in Next.js App Router sites,
MDX content pipelines, transactional email (Resend / Postmark / SES), form security at
the edge, and WCAG 2.1 AA conformance. You have shipped hiring-funnel pages that took
real spam abuse and real recruiter traffic, and you have debugged enough "but it worked
in CI" contact-form regressions to be cynical about honeypot-only defenses.

Your job is to **tear this requirements document apart**. You are not here to validate,
congratulate, or suggest minor polish. You are here to find the weaknesses, the
unstated assumptions, the contradictions between user stories and acceptance criteria,
the acceptance criteria that cannot actually be verified, the security gaps, and the
places where the spec will push implementation into ambiguous territory and produce
bugs. Be ruthless. If a requirement sounds right but can't be tested, say so. If the
steering docs contradict a requirement, name both and pick a side.

Ground every criticism in the actual text of the requirements document, product.md,
tech.md, and structure.md. Do not invent constraints the project hasn't made.

## Documents under review

- Target: `.spec-workflow/specs/professional-profile/requirements.md`
- Steering context: `.spec-workflow/steering/product.md`, `tech.md`, `structure.md`

Read all four before writing.

## Analysis Dimensions

Produce a numbered section per dimension below. Within each, surface specific attack
angles — name requirement numbers, quote acceptance criteria, cite concrete failure
scenarios. Do not speak in generalities.

### 1. Contact-form abuse surface and Resend blast radius

- Challenge the claim that a single hidden honeypot field is sufficient spam defense
  for the "primary professional inbound funnel" (intro + product.md objective #1).
  tech.md itself admits honeypot stops "~90% of naive bot submissions" and does not
  stop targeted or headless attacks — stress-test what happens on day one when a
  motivated script bypasses it.
- Resend's free tier is 100 emails/day (tech.md). Requirement 3 defers rate limiting
  entirely (NFR Security → Rate limiting). Model the attacker who simply submits the
  form 101 times in one minute: the inbox is flooded, the daily quota is consumed,
  and every legitimate recruiter submission after that silently fails. Is that
  outcome acceptable, and if so where is that tradeoff stated?
- Req 3.6 says the submitter's email is set as `reply-to`. That means any attacker
  can cause Matthew's replies to land in an attacker-controlled inbox by spoofing
  the `email` field. There is no email verification step. Challenge whether this is
  actually safe, or whether it at least needs to be acknowledged.
- Req 3.3 calls for "length bounds" but never specifies numbers. An attacker could
  submit a 10 MB `message` and the spec does not forbid it. Name the concrete
  ceilings the requirements should state (name, email, message) and the HTTP code
  for oversize bodies.
- Req 3.5: silently returning HTTP 200 to the honeypot bot is correct theory, but
  Req 4.1 says the UI moves focus and clears fields on success. A human who
  accidentally filled the honeypot (browser autofill, password manager filling any
  visible-to-DOM field, assistive tech surfacing hidden fields) gets a silent-drop
  experience with no feedback their message was lost. Surface this failure mode.
- Alternatives dismissed without discussion: Cloudflare Turnstile, hCaptcha,
  time-to-submit heuristics, Resend webhooks for bounce handling. At minimum the
  requirements should state why these are out of scope or defer to a later spec.

### 2. MDX-driven profile: underspecified content schema and layout

- Req 1 defines the profile page but does not define the profile. There is no
  acceptance criterion specifying required frontmatter fields beyond "title,
  description", no required content sections (experience? skills? education?
  headshot?), no structured data for roles or dates. A markdown-only contract means
  the page can render completely empty and still pass Req 1.1–1.6. Name the missing
  schema fields.
- Req 1.3: "wider container than standard content pages... narrower than full-bleed,
  wider than the standard prose column." This is not measurable. Two implementers
  will produce two different widths. Demand a concrete max-width (px or rem) or a
  token name.
- product.md feature #2 says the profile "uses wide layout to maximize viewport
  width," which reads as wider than Req 1.3's "narrower than full-bleed." Flag the
  contradiction and force a resolution.
- Req 1.6 says the build fails loudly on missing frontmatter or parse errors. But
  MDX allows importing React components — what happens when the MDX imports a
  component that doesn't exist, or when a component throws at render? Is that
  covered by "fails to parse"? Cite the gap.
- No acceptance criterion covers images inside the profile (headshot, company
  logos, etc.). structure.md says content images colocate with MDX and Velite
  copies them — does that apply to the single-document `profile` schema? Not
  stated.
- The profile has no acceptance criteria for: table of contents, heading anchors,
  section navigation, print styling / PDF export, "download resume" affordance.
  product.md calls this a "visual resume/CV" — recruiters print and share resumes.
  Name what's missing.

### 3. Progressive-enhancement and no-JS claims that quietly contradict the design

- NFR Usability → Progressive enhancement says "if JavaScript fails to load... the
  form action still posts to `/api/contact` for a no-JS baseline experience
  (target: functional, not polished)." But Req 3.4 specifies the API returns
  JSON for validation errors and Req 3.7 specifies JSON for Resend failures. A
  no-JS form post will render raw JSON in the browser window. That is not
  "functional" by any normal user's definition. Either the API needs a
  content-negotiation path (HTML redirect-after-post for form-encoded requests) or
  the claim should be struck. Force a decision.
- Req 3.2 says the client "SHALL POST the payload" — singular. But Req 4.2 says
  field-level errors must preserve user input and focus the first invalid field.
  That requires client-side orchestration of the JSON error response. A no-JS
  baseline by definition cannot satisfy Req 4.2. The two requirements cannot both
  be true on the same submission path.
- react-obfuscate is a client-only component (tech.md). NFR Usability concedes
  no-JS users lose access to the email entirely. But Req 2.1 also requires
  "LinkedIn and GitHub profile" links — those can and should work without JS.
  Confirm they are plain `<a href>` and are not accidentally wrapped in a client
  component.
- CSP (tech.md) requires `script-src 'self' 'unsafe-inline'`. react-obfuscate's
  click-to-reveal typically decodes a scrambled string at runtime. Verify whether
  react-obfuscate's bundling strategy actually complies with the stated CSP, or
  whether it injects inline scripts/event handlers that will be blocked. NFR
  Security → CSP compliance asserts no loosening is needed — challenge that
  assertion with the library's actual behavior.

### 4. Accessibility acceptance criteria that cannot be tested or are subtly wrong

- Req 4.1 moves focus to the success message after submit. This is a WCAG best
  practice when done carefully, but moving focus unexpectedly can disorient AT
  users if the target isn't a heading, isn't `tabindex="-1"`, or is visually
  off-screen. The criterion doesn't specify any of that. Name the missing detail.
- Req 4.2 uses `aria-live="assertive"` for form errors. The WAI-ARIA Authoring
  Practices guidance is that `assertive` interrupts whatever the user is doing
  and should be reserved for critical alerts (e.g., session timeouts). Form
  validation errors are better served by `role="alert"` or `aria-live="polite"`.
  Push back on `assertive` as the default.
- Req 4.4 requires `aria-required` — but HTML `required` on the input is the
  correct baseline; `aria-required` is a redundant fallback. Challenge whether
  the spec should say "native `required`, with `aria-required` only where a
  native attribute can't be used."
- Req 4.6 requires WCAG 2.1 AA contrast "in both themes" but there is no
  acceptance criterion specifying how this is verified: automated axe-core in
  CI? Lighthouse Accessibility score threshold? Manual audit? Without a
  verification mechanism, this is a hope, not a requirement.
- NFR Usability → Mobile responsive says "tap targets meet minimum size" but
  does not state the size (WCAG 2.5.8 Target Size Level AA is 24×24 CSS px
  minimum; Level AAA is 44×44). Name the gap.
- Nothing in Req 4 covers screen-reader verification of the honeypot field.
  If the honeypot is `display: none` it is invisible to screen readers (good,
  though some bots detect it). If it's positioned off-screen it is read aloud
  (bad — a screen reader user will fill it, then get Req 3.5's silent drop).
  The requirement should specify the hiding technique.

### 5. Component reuse, layout wrapping, and the "same component" claim

- Req 5.3 says /profile and /contact "SHALL consume the same React component(s)
  located in `src/components/shared/` — no parallel implementation, no per-page
  configuration prop required for the happy path." This forbids a layout prop.
  But /profile uses a wider container (Req 1.3) and /contact uses the standard
  layout (Req 5.2). How does the *same* component render inside two different
  layouts without a layout prop? Either (a) the layout is imposed by the parent
  page, or (b) there is a prop. The requirement as written is not implementable
  — force the resolution.
- The contact form, the obfuscated-email component, and the social-link list are
  all stated as separate components (NFR Architecture). But Req 5 treats them as
  one "contact section." What is the actual component boundary — a single
  `<ContactSection>` wrapper, or three independent components re-rendered on two
  pages? Demand clarity.
- Matthew's LinkedIn, GitHub, and email live in `src/config/site.ts` per
  structure.md. The requirements never say this. Without that statement an
  implementer will reasonably hard-code them in the component, duplicating them
  with the nav/footer. Name the missing integration point.
- Req 3.10 mandates a Playwright smoke test "against a mocked or sandboxed
  Resend integration." Those are very different test strategies. A mock asserts
  only that the handler was called with the right arguments; a sandbox asserts
  the live Resend API accepted the request. Pick one — or state explicitly
  that both modes are supported and when each is used.

### 6. Missing scope, measurement, and integration details

- Success metric in product.md is "contact form submissions" (inbound inquiries).
  The spec includes no acceptance criterion about **measuring** submissions —
  no analytics event, no Resend webhook handler for delivery failures, no log.
  How will Matthew know if the funnel is working? How does he detect a silent
  regression a week after deploy? (The Playwright smoke test catches functional
  regressions, not "is email reaching my inbox.") Name the observability gap.
- Req 1.5 says metadata follows "the site-wide metadata template established in
  site-foundation." What template? Is it defined? If site-foundation hasn't
  landed that yet, this requirement has an implicit blocking dependency that
  isn't declared.
- product.md feature #8 lists /contact as a slash page. /slashes auto-indexes
  slash pages. Nothing in this spec says /contact needs to be registered with
  /slashes, a /sitemap entry, or the nav bar's "Contact" link. Is that
  someone else's spec, or is it missing?
- No acceptance criterion covers the relationship between /profile and /about
  (product.md: "distinct from the Professional Profile — more 'who is Matthew'
  than 'what's on his resume.'"). What prevents duplicate content? What
  prevents SEO cannibalization when both pages rank for Matthew's name?
- Req 3.7 chooses HTTP 502 for Resend failures. 502 is "bad gateway" — correct
  in spirit — but 503 "service unavailable" with a `Retry-After` header is
  arguably more useful because the client can decide whether to retry. No
  retry strategy is specified on the client side either. Challenge the choice.
- Lighthouse ≥90 (NFR Performance) has no CI enforcement clause. Compare to
  Req 3.10 which explicitly makes the contact-form smoke test CI-blocking.
  Without CI enforcement, "blocking issue if any new page falls below 90" is
  prose, not a gate. Name the missing CI hook.

## Closing Deliverables

After the six sections, conclude with:

1. **Top 5 risks or gaps**, ranked by potential impact. For each: one sentence
   naming the risk, one sentence on the concrete failure scenario, one sentence
   on what the spec needs to add or change.
2. **Top 3 conclusions in the requirements to challenge or reverse**, with
   specific reasoning. Examples of candidates (not a checklist — pick what you
   actually find): the honeypot-only spam defense, the progressive-enhancement
   claim, the "no per-page configuration prop" rule, the choice of
   `aria-live="assertive"`, the deferral of rate limiting.
3. **What's missing** — concrete additions that should be written into the
   requirements before implementation starts (frontmatter schema fields,
   field length limits, verification methods for a11y and performance gates,
   analytics hooks, layout width token, integration with /slashes and nav,
   etc.).

Be specific and concrete. Cite requirement numbers. Cite failure scenarios
(what the attacker, the recruiter on a phone, the screen-reader user, the
no-JS visitor, the build system actually experiences). If something is
actually fine as written, say so in one sentence and move on — do not pad.

## Where to write your analysis

Write your complete analysis to:

`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/professional-profile/reviews/adversarial-analysis-requirements.md`

Create the file if it does not exist. Overwrite it if it does.
