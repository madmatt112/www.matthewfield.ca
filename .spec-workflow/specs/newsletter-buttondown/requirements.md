# Requirements Document

> **Retroactive spec.** Requirements 1–6 were implemented before this document was written
> (branch `feat/buttondown-email-template`, 2026-08-17), then captured here. Requirements 7–8
> are outstanding and unimplemented. Nothing in 1–6 was written to match the code after the
> fact without checking it: every acceptance criterion below is either verified against the
> implementation or explicitly marked unverified.
>
> **Not in the original decomposition.** `.spec-workflow/spec-decomposition/decomposition.md`
> predates the newsletter decision and never mentions it. This spec is net-new scope, added to
> the roadmap after the fact rather than derived from the decomposition.

## Introduction

A newsletter, delivered by Buttondown, that reads as part of matthewfield.ca rather than as a
third-party bolt-on. Two surfaces: the **email itself**, styled from this site's design tokens,
and the **signup path on the site**, which must work under the site's existing Content Security
Policy without weakening it.

Context and the decisions that precede this spec live in
`research/newsletter-buttondown-brief.md`. The ones that matter here:

- **The site is the front door.** Essays are canonical on matthewfield.ca; the newsletter drives
  attention to the site, not away from it.
- **Buttondown is the platform.** Chosen for indie ethics, custom email CSS, and an API that lets
  signup live on this site. Substack and X are excluded on ethical grounds and must never be
  proposed as alternatives.
- **Human-facing copy is drafted with `/human-prose`.** Code, templates, and CSS are exempt.

## Alignment with Product Vision

`product.md` frames the site as a personal home that signals infra/platform craft, not a corporate
template. Two consequences shape this spec:

- A newsletter is an owned distribution channel, consistent with the site being the canonical home
  for writing. It is a delivery mechanism, not a second publication.
- The signup must not degrade the site. The design system's "restraint over decoration" principle
  and the accessibility gates in `design-system.md` apply to the signup exactly as they apply to
  every other surface — which rules out the interstitial patterns newsletter tools usually ship.

## Requirements

### Requirement 1 — Email design parity

**User Story:** As a subscriber, I want the email to look like the site it came from, so that the
newsletter reads as the author's own work rather than a generic template.

#### Acceptance Criteria

1. WHEN the email renders THEN it SHALL use color values derived from `src/styles/tokens.css`,
   converted to sRGB hex.
2. IF a token is expressed in `oklch()` THEN the email CSS SHALL NOT contain that `oklch()` value,
   because no email client supports it.
3. IF a token carries alpha (`oklch(1 0 0 / 10%)`) THEN the email SHALL use the value flattened
   over that theme's background, because Outlook renders translucent borders unreliably.
4. WHEN headings render THEN they SHALL follow the ramp settled in `design-system.md`
   (h1 36px serif 400, h2 30px serif 400, h3 18px sans 600, h4–h6 16px sans 600).
5. WHEN a client strips `@font-face` THEN display headings SHALL fall back to Georgia, not to a
   sans face, so the editorial intent survives the fallback.
6. WHEN body text renders THEN it SHALL use a system sans stack rather than Geist, because Geist is
   a webfont that Gmail and Outlook strip.
7. The email CSS SHALL NOT rely on CSS custom properties, because Fastmail does not support them.

### Requirement 2 — Email accessibility

**User Story:** As a subscriber with low vision or a dark-mode client, I want the email to stay
readable, so that the design does not cost me the content.

#### Acceptance Criteria

1. WHEN any text renders in either scheme THEN it SHALL meet WCAG 2 AA contrast against the surface
   it actually sits on (≥4.5:1 normal, ≥3:1 large).
2. WHEN a client honors `prefers-color-scheme: dark` THEN the email SHALL use the `.dark` token
   values from `tokens.css`.
3. IF a client ignores `prefers-color-scheme` THEN the light rendering SHALL remain correct on its
   own, so dark support is never load-bearing.
4. WHEN a link renders THEN it SHALL be underlined, so color is not the only signal (WCAG 1.4.1).
5. WHEN a design token changes THEN a contrast regression SHALL be detectable without sending mail.

### Requirement 3 — Signup works under the site CSP

**User Story:** As a visitor, I want to subscribe from the site and have it actually work, so that
the signup is not silently broken.

#### Acceptance Criteria

1. WHEN a visitor submits the signup form THEN the subscription SHALL be recorded in Buttondown.
2. The site CSP (`connect-src 'self'`, `form-action 'self'`) SHALL NOT be weakened to accommodate
   the vendor.
3. WHEN a subscription succeeds THEN the visitor SHALL remain on matthewfield.ca and SHALL NOT be
   redirected to buttondown.com.
4. WHEN Buttondown rejects the address THEN the visitor SHALL see an actionable message.
5. WHEN Buttondown is slow or unavailable THEN the request SHALL time out and the visitor SHALL see
   a retryable message rather than a hang.
6. WHEN a subscription succeeds THEN the visitor SHALL be told to expect a confirmation email,
   because Buttondown uses double opt-in.

### Requirement 4 — Non-interruptive signup UI

**User Story:** As a reader, I want to read without being interrupted, so that the site respects my
attention.

#### Acceptance Criteria

1. The signup SHALL NOT be presented as a modal, popover, overlay, or interstitial.
2. The signup SHALL NOT be triggered by scroll depth, exit intent, or a timer.
3. The signup SHALL NOT be dismissible, because it SHALL never obscure content in the first place.
4. WHEN the signup mounts THEN it SHALL NOT move focus, so it never steals the caret from a reader.
5. The signup SHALL occupy ordinary document flow at every viewport.

### Requirement 5 — Signup accessibility and theme parity

**User Story:** As a keyboard or screen-reader user, I want to subscribe unaided, so that the form
is usable by the same standard as the rest of the site.

#### Acceptance Criteria

1. WHEN the signup renders on any route THEN it SHALL produce zero axe violations at
   wcag2a/wcag2aa/wcag21a/wcag21aa in both light and dark themes.
2. WHEN a submission resolves THEN the outcome SHALL be announced to assistive technology.
3. WHEN a submission fails THEN focus SHALL move to the message describing the failure.
4. WHEN the email field is invalid THEN it SHALL carry `aria-invalid` and be associated with its
   error message.
5. Interactive targets SHALL meet the site's minimum touch-target convention (`min-h-11`).
6. WHEN the compact variant hides its visible label THEN the field SHALL retain an accessible name.

### Requirement 6 — Signup placement and abuse resistance

**User Story:** As the author, I want the CTA where intent is highest and bots filtered out, so the
list grows with real readers.

#### Acceptance Criteria

1. A signup SHALL appear at the end of each blog post, after the share controls and before
   navigation away.
2. A dedicated `/newsletter` page SHALL exist as a linkable destination, and SHALL be present in
   the sitemap and the homepage path index.
3. A compact signup SHALL appear in the site footer without crowding the existing footer nav.
4. WHEN a request arrives from a foreign origin THEN the endpoint SHALL reject it.
5. WHEN a honeypot field is filled THEN the endpoint SHALL return success WITHOUT subscribing, so a
   bot gets no signal to adapt to.
6. WHEN a request body exceeds a fixed size cap THEN the endpoint SHALL reject it before parsing.
7. The endpoint SHALL validate the address server-side regardless of client-side validation.

### Requirement 7 — On-site archive (NOT IMPLEMENTED)

**User Story:** As a visitor, I want to read past issues without leaving the site, so the site
stays the canonical home for the writing.

#### Acceptance Criteria

1. WHEN a visitor opens the archive THEN past issues SHALL be listed on matthewfield.ca.
2. IF an issue is also published as a blog post THEN the archive SHALL NOT duplicate it.
3. The archive SHALL degrade gracefully when the Buttondown API is unavailable.

**Status:** Not started. The brief poses on-site archive vs. Buttondown-hosted; on-site fits the
front-door decision, but the duplication question in criterion 2 is unresolved — essays are already
canonical as blog posts, so an archive may be redundant rather than additive.

### Requirement 8 — Welcome email copy (NOT IMPLEMENTED)

**User Story:** As a new subscriber, I want a welcome email that sets expectations, so I know what
I signed up for.

#### Acceptance Criteria

1. The welcome email SHALL state cadence, subject matter, and how to unsubscribe.
2. The copy SHALL be drafted with the `/human-prose` skill, per the brief's drafting rule.

**Status:** Not started. Blocked on nothing technical — it is a writing task.

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility**: the vendor call, the HTTP endpoint, and the UI are three separate
  files. The vendor call knows nothing about HTTP requests; the UI knows nothing about Buttondown.
- **Modular Design**: one signup component serves every placement through variants rather than
  duplicated markup per surface.
- **Dependency Management**: the email assets are inert files for a third-party platform and SHALL
  NOT be imported by site code or scanned by the site's build.
- **Clear Interfaces**: the endpoint returns typed JSON (`{ok}` / `{error}`) so the client renders
  vendor failures without parsing vendor HTML.

### Performance

- The signup SHALL add no blocking work to initial render; it is the only client component on an
  otherwise static content page.
- Requests to Buttondown SHALL carry a timeout well under the platform's function limit.

### Security

- No credential SHALL be required or stored. Buttondown's embed endpoint is public by design.
- The CSP SHALL remain unchanged; the vendor is reached server-side only.
- The endpoint SHALL enforce a same-origin check, matching the existing `/api/contact` convention.

### Reliability

- A vendor outage SHALL surface as a retryable message, never as an unhandled error or a hang.
- The email CSS SHALL be regenerable from `tokens.css` so it cannot silently drift from the site.

### Usability

- The success state SHALL set the expectation of a confirmation email, since double opt-in means
  "subscribed" is not yet true at that moment.
- Error copy SHALL say what to do next, not merely that something failed.
