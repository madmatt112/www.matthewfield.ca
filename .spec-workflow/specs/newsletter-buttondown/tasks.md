# Tasks Document

> **Retroactive capture.** Tasks 1–8 were implemented on branch `feat/buttondown-email-template`
> (commits `e3f29b3`, `8151529`, 2026-08-17) and are marked `[x]` because the work exists and was
> verified, not because a task-by-task review ran — no dashboard review has been triggered for this
> spec. Tasks 9–12 are genuinely outstanding.
>
> The `_Prompt` fields on completed tasks are written as they would have been had the spec preceded
> the code, so a future agent re-running any task has the same brief.

## Email template

- [x] 1. OKLCH→hex converter with contrast gate
  - File: `scripts/oklch-to-hex.mjs`
  - Parse both token blocks from `src/styles/tokens.css`, convert OKLCH to sRGB hex, flatten alpha
    tokens over that theme's background, and assert the WCAG pairs the email CSS cites
  - Purpose: make the email port re-derivable so it cannot silently drift from the design system
  - _Leverage: src/styles/tokens.css_
  - _Requirements: 1.1, 1.2, 1.3, 2.5_
  - _Prompt: Implement the task for spec newsletter-buttondown, first run spec-workflow-guide to get the workflow guide then implement the task: Write a zero-dependency Node script that reads src/styles/tokens.css, converts every oklch() token in the :root and .dark blocks to sRGB hex, and prints a contrast report. Handle the `oklch(L C H / A%)` alpha form by compositing over that block's --background, because email needs opaque values. | Restrictions: No new dependencies — write the color math inline. Do not hardcode token values; parse the file. Exit non-zero if a gated pair falls below 4.5:1 so a token change fails loudly. | _Leverage: src/styles/tokens.css_ | Success: Running the script prints both themes with correct hex, flags out-of-gamut values, reports every gated pair, and exits 0 on the current token set._

- [x] 2. Buttondown custom CSS (Modern template)
  - File: `email/buttondown/custom-css.css`
  - Port the token palette and heading ramp to email-safe CSS, overriding Buttondown's Modern
    stylesheet where it conflicts
  - Purpose: the ship-now path — works on the Basic plan, no template upgrade needed
  - _Leverage: scripts/oklch-to-hex.mjs output, .spec-workflow/steering/design-system.md_
  - _Requirements: 1.1–1.7, 2.1–2.4_
  - _Prompt: Implement the task for spec newsletter-buttondown, first run spec-workflow-guide to get the workflow guide then implement the task: Write custom CSS for Buttondown's Modern template that ports this site's tokens. First fetch and read Buttondown's live Modern stylesheet — it sets `* { color: #000 }` and marks p/ul/li sizing and every blockquote color !important, and your overrides must beat those. | Restrictions: NO CSS custom properties (Fastmail lacks support). Literal hex only, each commented with the token it came from. Use !important only where beating a vendor !important requires it. Fraunces must fall back to Georgia, never to a sans. | Success: Every rule that needs to win, wins against the live vendor stylesheet; all text clears AA in both schemes._

- [x] 3. Preview harness reproducing the real cascade
  - File: `email/buttondown/preview.html`
  - Load Buttondown's live Modern stylesheet, then `custom-css.css`, over faithful Modern markup
  - Purpose: review the email without a Buttondown account, against the true cascade
  - _Requirements: 2.1, 2.2_
  - _Prompt: Implement the task for spec newsletter-buttondown, first run spec-workflow-guide to get the workflow guide then implement the task: Build a single-file local preview that links Buttondown's hosted Modern CSS first and the custom CSS second, wrapping representative content (masthead, kicker, headings, links, list, blockquote, pullquote, inline and block code, image, figcaption, table, unsubscribe block) in Buttondown's documented class names. | Restrictions: Do not vendor a copy of Buttondown's CSS — link the live one so the preview cannot go stale. Document clearly that a browser is not an inbox. | Success: Opening it shows the styled email; computed styles confirm the overrides beat the vendor's !important rules._
  - **Found by doing this**: dark-mode `.colophon` lost a specificity fight with its own light rule
    (`.newsletter-masthead .colophon`, two classes, both `!important`), rendering at **3.29:1** —
    an AA failure invisible from reading the CSS. Fixed by repeating the two-class selector in the
    dark block.

- [x] 4. Contrast sweep across both schemes
  - File: (verification task — no committed artifact)
  - Walk every element rendering its own text, resolve its true painted background, and assert AA
  - Purpose: prove Req 2.1 rather than assert it
  - _Requirements: 2.1, 2.2, 2.3_
  - _Prompt: Implement the task for spec newsletter-buttondown, first run spec-workflow-guide to get the workflow guide then implement the task: Drive the preview with Playwright in both colorScheme light and dark. For every element with its own text node, compute the contrast ratio against the first non-transparent ancestor background, applying the large-text threshold where size/weight earn it. | Restrictions: Do not spot-check a hand-picked list — enumerate every text element, since the bug you are looking for is in the element you did not think to check. | Success: 0 failures in both schemes, with the lowest passing ratio reported._
  - **Found by doing this**: table body cells were **invisible in dark mode**. Buttondown's
    `* { color: #000 }` catches `td`, and only `th` had been overridden — the earlier spot-check
    tested `th` and missed it. Fixed by setting `td` colour in both themes.

- [x] 5. Full HTML template (Professional plan)
  - File: `email/buttondown/template.html`; `.prettierignore`
  - Table-based Django template with inlined critical styles, plus a Prettier exclusion
  - Purpose: ready when/if the Professional plan is taken
  - _Requirements: 1.1–1.7, 2.1–2.4_
  - _Prompt: Implement the task for spec newsletter-buttondown, first run spec-workflow-guide to get the workflow guide then implement the task: Write a full HTML email template using DJANGO syntax (not Liquid). Table-based with role="presentation" — Outlook's Word engine ignores div layout. Inline critical styles on elements as well as declaring them in head, because Gmail strips <style> on some forward paths. Use only template variables Buttondown documents. | Restrictions: Add it to .prettierignore — Prettier's HTML parser fails on `{# #}` and reflowing would break the inline styles. Flag the body placeholder as unverified; do not present a guess as fact. | Success: Renders correctly; every variable used is a documented one except the body placeholder, which is explicitly marked._

- [x] 6. Email documentation
  - File: `email/buttondown/README.md`
  - Plan matrix, install steps, token table, client test checklist, open questions
  - Purpose: the install is manual and infrequent — it must be reproducible months later
  - _Requirements: 1.1, 2.5_
  - _Prompt: Implement the task for spec newsletter-buttondown, first run spec-workflow-guide to get the workflow guide then implement the task: Document which file to use on which plan, how to install each, how to preview, the token→hex table with contrast figures, what did not survive the port and why, the untested client matrix, and the open questions. | Restrictions: Correct the brief's wrong assumptions explicitly rather than silently — a future reader will otherwise re-derive them. Separate verified from unverified. | Success: Someone with no context can install the CSS and knows exactly what remains untested._

## Signup

- [x] 7. Vendor module and API endpoint
  - Files: `src/lib/newsletter.ts`, `src/app/api/newsletter/route.ts`
  - Buttondown call with timeout and typed errors; endpoint with origin check, zod, honeypot, size cap
  - Purpose: subscribe without weakening the CSP or sending visitors off-site
  - _Leverage: src/lib/mail.ts, src/app/api/contact/route.ts_
  - _Requirements: 3.1–3.6, 6.4–6.7_
  - _Prompt: Implement the task for spec newsletter-buttondown, first run spec-workflow-guide to get the workflow guide then implement the task: FIRST verify whether Buttondown's embed snippet can run in the browser under this site's CSP — check next.config.ts for connect-src and form-action, and prove it in a browser rather than reasoning about it. Then build the vendor module and route handler, mirroring src/lib/mail.ts for timeout and error-class shape and src/app/api/contact/route.ts for the origin check, honeypot, and size cap. | Restrictions: Do NOT relax the CSP to accommodate the vendor. Do not follow the vendor's success redirect. Never forward the vendor's HTML error body to the client. No API key — the endpoint is public by design. | Success: All guard paths return their intended status; a browser submit clears CSP; a direct browser fetch to Buttondown is proven blocked._

- [x] 8. Signup component and placements
  - Files: `src/components/shared/newsletter-signup.tsx`, `src/app/(site)/newsletter/page.tsx`,
    `src/components/layout/footer.tsx`, `src/app/(site)/blog/[slug]/page.tsx`,
    `src/config/site.ts`, `src/app/sitemap.ts`
  - One component with block/compact variants; placed at post end, footer, and `/newsletter`
  - Purpose: capture intent where it is highest without interrupting anyone
  - _Leverage: components/shared/status-callout.tsx, components/ui/{input,label,button}_
  - _Requirements: 4.1–4.5, 5.1–5.6, 6.1–6.3_
  - _Prompt: Implement the task for spec newsletter-buttondown, first run spec-workflow-guide to get the workflow guide then implement the task: Build one signup component with block and compact variants, and place it at the end of blog posts, in the footer, and on a new /newsletter page. Register the route in the sitemap and homepage path index. | Restrictions: NO modal, popover, overlay, interstitial, scroll trigger, exit intent, or timer — this is an explicit user constraint, not a preference. Never move focus on mount. Take a per-instance `id`: a blog post renders two instances and duplicate DOM ids would break htmlFor and aria-describedby. Use semantic tokens only. No signup on the homepage hero. | Success: 0 axe violations on /, /blog/[slug] and /newsletter in both themes; focus moves to the outcome after submit; the full suite and production build stay green._

## Outstanding

- [x] 9. Unit tests for vendor status mapping
  - File: `src/lib/newsletter.test.ts`
  - Cover the status→error mapping in `subscribeToNewsletter` (2xx/3xx accept, 400, 429, 5xx,
    timeout, opaqueredirect)
  - Purpose: close the gap recorded in design.md § Testing Strategy — this logic is currently only
    covered indirectly, and it encodes undocumented vendor behaviour that could change
  - _Leverage: existing vitest setup_
  - _Requirements: 3.4, 3.5_
  - _Prompt: Implement the task for spec newsletter-buttondown, first run spec-workflow-guide to get the workflow guide then implement the task: Add vitest coverage for subscribeToNewsletter's status mapping using a stubbed fetch. Assert each documented branch and that the timeout path raises TimeoutError. | Restrictions: Stub fetch — never call Buttondown from a test. Do not assert on the vendor's HTML body; only status handling is the contract. Note that vitest shells a velite build, so do not run the suite from parallel agents. | Success: Every branch of the status mapping is asserted and the suite stays green._
  - **Found by doing this**: mutation-testing the finished suite showed that
    `if (response.status === 0 || response.type === "opaqueredirect") return;` was **dead code** —
    the following `if (response.status < 400) return;` already accepts status 0, so deleting the
    guard broke no test. Removed, with the reasoning moved into a comment warning against adding a
    lower bound. 7 of 8 mutation classes were caught before the fix; all 8 after.

- [x] 10. De-duplicate the origin check
  - Files: `src/lib/request-origin.ts`, `src/app/api/contact/route.ts`, `src/app/api/newsletter/route.ts`
  - Extract `isAcceptedHost` / `originAllowed` into one shared module
  - Purpose: two copies will drift, and this is a security control
  - _Requirements: 6.4_
  - _Prompt: Implement the task for spec newsletter-buttondown, first run spec-workflow-guide to get the workflow guide then implement the task: Extract the duplicated same-origin check into a shared module and have both routes consume it. | Restrictions: Check the repo's paired-merge CI guards BEFORE starting — editing api/contact may force coupled files to change together, which is exactly why this was deferred. If the guard makes the change disproportionate, record that and stop rather than expanding the diff. | Success: One implementation, both routes consume it, contact-form tests still pass._
  - **The stated blocker did not exist.** Checking the guards, as the Restrictions required, showed
    `verify-paired-merge.mjs` tracks `[next-config-imports.test.ts, next.config.ts,
    project-errors.ts, blog-errors.ts]` and the two canary guards track chokepoint fixtures plus
    `projects.test.ts` — **none names `api/contact/route.ts`.** The deferral generalized from the
    guards existing rather than reading their file list. Extracted to `src/lib/request-origin.ts`;
    contact's 26 pre-existing tests passed unchanged, which is the behaviour-preservation proof.
    Deferral `d-528554d8` resolved.

- [ ] 11. On-site archive of past issues
  - Purpose: Requirement 7
  - _Requirements: 7.1, 7.2, 7.3_
  - _Prompt: Implement the task for spec newsletter-buttondown, first run spec-workflow-guide to get the workflow guide then implement the task: Resolve whether an on-site archive is additive before building it. Essays are already canonical as blog posts, so an archive may duplicate the blog index rather than add anything — settle Req 7.2 with the owner first. If it proceeds, fetch issues from the Buttondown API at build time and degrade gracefully when unavailable. | Restrictions: Do not build this before the duplication question is answered. Do not weaken the CSP. | Success: Either a working archive, or a recorded decision not to build one._

- [x] 12. Welcome email copy
  - File: `email/buttondown/welcome-email.md`
  - Purpose: Requirement 8
  - _Requirements: 8.1, 8.2_
  - _Prompt: Implement the task for spec newsletter-buttondown, first run spec-workflow-guide to get the workflow guide then implement the task: Draft the welcome email using the /human-prose skill, per the brief's drafting rule. State cadence, subject matter, and how to unsubscribe. | Restrictions: The /human-prose skill is mandatory here — the brief requires it for all human-facing copy. Do not write it inline without invoking the skill. | Success: Copy drafted with the skill and installed in Buttondown's welcome-email setting._
  - **Found by doing this**: the draft cited Matthew's own Azure post and credited the
    `-HyperVGeneration` default to `New-AzImage`. Checking the post showed the flag is on
    `New-AzImageConfig`. Corrected before commit — a wrong detail in the author's own war story
    would be worse than no detail. Check any copy that cites his posts against the post.
  - **Note on Success criterion**: the copy is drafted and committed. *Installing* it in Buttondown
    is Matthew's, and is folded into task 13.

## Owner actions (not code)

- [ ] 13. Install the Buttondown settings and run the client test matrix
  - Set the template to **Modern**, paste `custom-css.css` into the CSS box, and paste
    `welcome-email.md` (plus its subject line) into the welcome-email setting
  - Then per `email/buttondown/README.md` § Testing: Gmail web + Android (check the auto-inverted
    rendering specifically), Outlook Windows, Apple Mail macOS + iOS dark, a forwarded copy, and a
    long issue against Gmail's ~102KB clipping threshold

- [ ] 14. Perform one live subscribe to close the untested success path
  - The failure paths are verified; the accepted path is inferred from the vendor's 302. One real
    signup on the preview deployment settles it, and confirms the double opt-in copy is accurate
