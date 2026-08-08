# Requirements Document — profile-resume

## Introduction

This spec brings Matthew's resume content onto the site. `/profile` today renders a short narrative
(`content/profile.mdx`) plus a contact section; it has no employment history, skills, or education. A
recruiter arriving from the landing page's index row labelled `CV` currently finds a bio, not a CV.

The direction is **structured data, not pasted prose, and a curated subset, not the whole document.**
Work history becomes a validated Velite collection rendered as a timeline beneath the existing
narrative. The resume is not a separate page: `/profile` *is* the CV, and the print stylesheet
delivered by `visual-design` (R8.5) is what turns it into a PDF.

Two audiences drive the split. The `.docx` master stays complete because ATS keyword density is a
feature there. The site optimises for signal per screen, carries no contact details that invite
abuse, and does the one thing a PDF cannot: link out to the project pages, contributions, and code
that substantiate the claims.

## Alignment with Product Vision

Serves `product.md`'s **professional inbound funnel** — the stated primary business objective — by
making `/profile` answer "can this person do the job?" without a click. Reinforces **builder
credibility** by wiring employment claims to the project pages that evidence them. Honours
**markdown-first content** and **simple to maintain**: experience is data Matthew edits, not JSX.
Extends the **Professional Profile** key feature, which already describes `/profile` as "functioning
as a visual resume/CV" — a promise the current page does not keep.

## Requirements

### Requirement 1 — Experience as validated structured content

**User Story:** As Matthew, I want work history stored as structured data rather than prose, so that
it renders consistently, prints correctly, and cannot silently lose a field.

#### Acceptance Criteria

1. The spec SHALL add a Velite collection for employment history, authored as a data file under
   `content/`, following the established `contributions.yaml` / `resources.yaml` pattern.
2. The schema SHALL model a role with at minimum: organisation, title, start date, end date
   (absent/null meaning current), location, a one-line summary, and an ordered list of
   responsibility highlights.
3. The schema SHALL model **nested named deliveries** within a role (the resume's "Highlighted
   Delivery" blocks), each with its own title, Matthew's role on it, and body — because the source
   material is three levels deep and a flat bullet list cannot express it.
4. WHEN a required field is missing or a date is malformed THEN the build SHALL fail with a message
   naming the file and the offending entry, consistent with the other collections' validation.
5. Dates SHALL be stored ISO-formatted and formatted at render via the existing date helper; no
   display strings in the data file.
6. WHEN roles are rendered THEN they SHALL be ordered most-recent-first, derived from the data rather
   than from file order.
7. The `.docx` master SHALL remain the complete ATS artifact and is NOT generated from, nor
   generative of, this data. Authoring the collection is a manual editorial act. No document parsing
   is in scope.

### Requirement 2 — `/profile` composition and layout

**User Story:** As a recruiter, I want one page that opens with who Matthew is and then substantiates
it with employment history, so that I can assess him in a single scroll.

#### Acceptance Criteria

1. `/profile` SHALL compose, in order: the existing narrative (`profile.mdx`), then experience, then
   skills and education, then the existing contact section.
2. The narrative SHALL remain MDX-authored prose in Matthew's voice and SHALL be free to carry
   non-professional content — interests, family, side pursuits. It SHALL NOT be replaced by, reduced
   to, or duplicated into the structured data. `/profile` SHALL read as a person's page that contains
   a CV, not a CV with a name on top.
3. A **professional summary** SHALL exist as a field distinct from the narrative, authored in
   `profile.mdx` frontmatter alongside the existing `headline` / `location` / `availability` fields.
   It SHALL introduce the experience section on screen and SHALL open the printed CV (R6), so that
   suppressing the personal narrative in print does not leave the PDF with no summary at all.
4. WHEN the experience timeline is laid out THEN it MAY use the page container's full width while
   long-form prose within it SHALL hold the `--container-measure` ceiling — the "widen gutters, not
   the measure" rule (`visual-design` R4.3). Exceeding the standard measure SHALL be recorded with a
   rationale in this spec's design, per the design system's exceptions rule.
5. The page SHALL retain its existing `SectionKicker`, serif headline, and single brand CTA; it SHALL
   NOT introduce a second brand-filled button (`visual-design` R2.3).
6. WHEN rendered at any named Tailwind breakpoint, in both themes, THEN every section SHALL be
   correct and usable.

### Requirement 3 — Curated content, not the whole document

**User Story:** As a visitor, I want the profile to carry signal rather than keyword density, so that
I can read it rather than skim past it.

#### Acceptance Criteria

1. The published profile SHALL NOT include: a telephone number; a personal email address other than
   the site's own obfuscated address; a timezone line duplicating the existing `location`
   frontmatter; or a repeated LinkedIn/GitHub/website header block already present in site chrome.
2. The published profile SHALL NOT include job-search framing inside an experience entry — the
   availability line above it already states it.
3. The published profile SHALL NOT include named, in-flight client engagements that carry an expiry
   date; consulting work SHALL be described by the services offered.
4. Responsibility highlights SHALL state outcomes, not activity. Bullets that name a technology
   already listed under skills without an accompanying result SHALL be omitted or merged.
5. ATS-oriented artifacts — post-nominal letters, `Tech & tools:` prefix rows, and exhaustive service
   or hardware inventories — SHALL NOT appear as body copy. Per-role technology MAY appear as tags.
6. Where breadth is evidenced only by an inventory (e.g. on-prem hardware alongside cloud services),
   a single compressed line SHALL preserve the signal rather than deleting it outright.
7. Prior-role content that dilutes a senior platform profile (front-line helpdesk duties from
   2017–2018) SHALL be omitted.

### Requirement 4 — Cross-linking instead of duplication

**User Story:** As a reader, I want a delivery I'm interested in to take me to its full write-up, so
that the profile stays readable without losing depth.

#### Acceptance Criteria

1. A nested delivery SHALL be able to reference a project by slug, and WHEN it does THEN the rendered
   entry SHALL link to that project's page.
2. IF a referenced project slug does not resolve THEN the build SHALL fail rather than emitting a
   dead link, consistent with the project-showcase link validation posture.
3. WHEN a delivery links to a project page THEN its profile-page body SHALL be a short summary, not a
   restatement of the project write-up.
4. This requirement is satisfied for Rudder, which already has a project page. Authoring a project
   page for the Temporal platform delivery is **out of scope** here — it is content work for the
   project showcase — but the schema SHALL NOT block it.

### Requirement 5 — Skills and education

**User Story:** As a recruiter screening for specific technologies, I want to find them quickly
without reading a wall of them.

#### Acceptance Criteria

1. Skills SHALL be grouped by category and rendered as structured content, not free prose.
2. The published skill set SHALL be curated to what Matthew would defend in an interview rather than
   an exhaustive inventory.
3. Education SHALL render credential, institution, completion date, and honours.
4. WHEN skills or education are empty or absent THEN their sections SHALL NOT render an empty
   heading.

### Requirement 6 — The CV is a rendering of `/profile`, not a second page

**User Story:** As Matthew, I want one page to maintain, so that a resume and a profile cannot drift
apart.

#### Acceptance Criteria

1. The spec SHALL NOT introduce a `/resume` route. `/profile` is the single professional surface.
2. WHEN `/profile` is printed THEN the existing print stylesheet SHALL produce a clean, light,
   readable CV including the new experience, skills, and education sections.
3. **WHEN printed THEN the personal narrative section SHALL be suppressed.** The PDF is strictly
   professional: it comprises name, headline, location, availability, the professional summary
   (R2.3), experience, skills, education, and contact details. The screen page and the PDF therefore
   differ by design — the page opens as a person, the PDF opens as a candidate.
4. WHEN printed THEN chrome, the contact form, and interactive controls SHALL be hidden while the
   email and social links SHALL remain as text (existing print behaviour, extended to new sections).
5. WHEN printed THEN a role or an education entry SHALL NOT break across a page boundary mid-heading.
6. WHEN printed from dark mode THEN output SHALL be dark-on-light, per the existing print token
   overrides.

### Requirement 7 — Machine-readable professional data

**User Story:** As a recruiter using tooling that reads structured data, I want the profile to expose
it, so that Matthew's experience is parseable.

#### Acceptance Criteria

1. `/profile` SHALL emit JSON-LD describing Matthew as a `Person`, including occupation and
   employment history derived from the same collection that renders the page.
2. The JSON-LD SHALL be derived from the structured data, never hand-maintained in parallel.
3. The JSON-LD SHALL NOT contain any contact detail excluded by Requirement 3.

### Requirement 8 — Accessibility and design-system conformance

**User Story:** As a visitor using assistive technology or a bright screen, I want the new sections to
meet the same bar as the rest of the site.

#### Acceptance Criteria

1. All new surfaces SHALL use design-system token roles and named Tailwind steps; no arbitrary values
   (`visual-design` R1.2).
2. WHEN axe is run against `/profile` in both themes THEN it SHALL report zero violations.
3. Brand-coloured links appearing inline within a sentence SHALL carry a permanent underline, not a
   hover-only one (WCAG 1.4.1). **This includes fixing the existing violation on `/profile`** at the
   availability line, which axe currently reports in light theme.
4. The experience timeline SHALL use semantic markup conveying its structure to assistive technology;
   visual date columns SHALL NOT be the only expression of chronology.
5. Existing Vitest and Playwright suites SHALL remain green, and the landing page's `/profile` index
   row SHALL continue to resolve.

### Requirement 9 — Site-wide content consistency

**User Story:** As a visitor reading more than one page, I want the site to agree with itself.

#### Acceptance Criteria

1. Years of experience SHALL be stated consistently across `siteConfig.intro`, `profile.mdx`, and the
   profile summary. The agreed figure is **"a decade"**.
2. There SHALL be ONE canonical interests list, carried in the profile narrative. The experience,
   skills, and education sections SHALL NOT carry a second list, and the resume's interests SHALL be
   merged into the canonical one rather than added alongside it. `/about` MAY treat the same material
   at greater length. This criterion targets divergent duplicate lists — it does NOT restrict personal
   content on `/profile`, which R2.2 explicitly protects.
3. WHEN the narrative and structured data both touch a subject (e.g. documentation practice) THEN it
   SHALL be stated once, in the narrative, in Matthew's voice.

## Non-Functional Requirements

### Code Architecture and Modularity

- **Data/presentation split**: the collection schema lives with the other Velite schemas; selectors
  live in `src/lib/`; rendering lives in components under `src/components/`. `src/lib/` must not
  import from `src/components/`.
- **Single responsibility**: separate components for the experience timeline, skills, and education
  rather than one profile mega-component.
- **No new content pipeline**: reuse Velite, the existing date helper, and the established
  collection-validation conventions.

### Performance

- `/profile` remains statically rendered with no added client JS; the Lighthouse Performance gate
  (≥90) and the site's byte-weight posture hold. Any added imagery must not regress LCP or CLS.

### Security

- No telephone number, no personal email, and no client-identifying detail in rendered output, page
  source, or JSON-LD. The existing email obfuscation remains the only email exposure.

### Reliability

- Malformed or incomplete experience data fails the build rather than rendering a broken page.
- A missing optional section degrades to not rendering, never to an empty heading or a stray rule.

### Usability

- Correct and legible at all named breakpoints in both themes; long-form prose holds the ~75-character
  measure; the printed CV is legible on A4 and US Letter.

## Revision History

- **v2** — the personal register on `/profile` is now protected explicitly rather than by implication.
  **R2.2** states the narrative may carry non-professional content and that `/profile` reads as a
  person's page containing a CV, not a CV with a name on top. **R9.2** was rewritten: as drafted
  ("interests in exactly one place") it could be read as pushing interests off `/profile` entirely —
  the opposite of the intent, which was only to prevent two divergent lists. **R6.3** decides print
  behaviour: the narrative is suppressed and the PDF is strictly professional. That decision created
  a gap — a CV with no summary — closed by new **R2.3**, a professional summary in `profile.mdx`
  frontmatter that introduces the experience section on screen and opens the PDF.
- **v1** — initial requirements: structured experience collection, curated content policy, `/profile`
  composition, cross-linking to project pages, print-as-CV, JSON-LD, accessibility, consistency.
