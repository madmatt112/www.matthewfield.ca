# Experience, skills, and education authoring guide

Reference documentation for the professional history that renders on
`/profile`: `content/experience.yaml`, `content/skills.yaml`,
`content/education.yaml`, and the `summary` field in `content/profile.mdx`
frontmatter. The build enforces the shapes; this doc explains them so you learn
them BEFORE breaking CI, and carries the editorial rules the build cannot
enforce.

The canonical section headings below are checked mechanically by
`scripts/check-authoring-docs.mjs` (wired into CI before the first build). Each
heading must remain an exact single line — no commas, no colons. Do not rename
one without updating that check in the same PR.

All three YAML files are validated by the custom Velite loader
(`makeContentYamlLoader`), the same one that validates `contributions.yaml` and
`resources.yaml`. Every object boundary is `.strict()`, so an unknown key fails
the build.

## Source of truth

The curated YAML under `content/` is canonical for professional history.
Everything `/profile` publishes — the timeline, the skills groups, the
education entries, the JSON-LD — is read from those files.

The master `.docx` resume is an **export target, not an input**. When an ATS
copy is needed, it is produced from what the site already publishes, with
whatever keyword density that channel wants added on top. Nothing in this
repository reads the `.docx`, no parsing pipeline exists, and none is planned
(R1.7). The two artifacts differ on purpose: the `.docx` optimises for keyword
matching, the site optimises for signal per screen.

The direction is the privacy gate, which is why it is a rule and not a habit.
Content reaches the site only by being typed into a YAML file and checked
against [The R3 curation checklist](#the-r3-curation-checklist). If the `.docx`
were an input, one unreviewed paste could push a phone number into a public
repository. Do not copy blocks of the `.docx` into these files. Write the
entry, then check it.

## Experience YAML shape

`content/experience.yaml` is a top-level YAML list. Each entry is one role.
There are no per-role pages; the whole list renders as the timeline on
`/profile`. Order is derived from the dates by the selector, so entry order in
the file does not matter.

### Required fields

- `organisation` (string, 2–80 chars after trim) — the employer.
- `title` (string, 2–80 chars after trim) — the job title.
- `start` (month, `YYYY-MM`) — see
  [Dates and the current role](#dates-and-the-current-role).
- `location` (string, 2–60 chars after trim).
- `summary` (string, 30–400 chars after trim) — one line on what the role was.
- `highlights` (list of 1–10 strings, each 20–240 chars after trim) — the
  responsibility bullets.

### Optional fields

- `organisationUrl` (string) — must parse as a URL and use `http:` or `https:`
  only. Other schemes (`mailto:`, `javascript:`, `file:`) are rejected.
- `end` (month, `YYYY-MM`) — **omit entirely for a current role.**
- `tech` (list of up to 12 strings, each 1–24 chars) — rendered as per-role
  tags, not as body copy.
- `deliveries` (list of up to 4 objects) — see
  [Deliveries and project links](#deliveries-and-project-links).

There are no other fields. In particular there is no `phone` field, no email
field, and no free-form contact field anywhere in these schemas. That absence
IS the R3.1 enforcement: combined with `.strict()`, the forbidden data cannot
be expressed. Do not add such a field.

The 240-character ceiling on a highlight is load-bearing, not cosmetic. It
makes a keyword-inventory line mechanically impossible to author, which is half
of R3.4 and R3.5.

### Example entry

```yaml
- organisation: "CrowdStrike"
  organisationUrl: "https://www.crowdstrike.com"
  title: "Infrastructure Engineer III"
  start: "2021-01"
  end: "2026-01"
  location: "Remote"
  summary: "Member of the Infrastructure Engineering Kubernetes team, owning fleet lifecycle for production clusters."
  tech: ["kubernetes", "temporal", "golang"]
  deliveries:
    - title: "Rudder"
      role: "Architect & Lead Engineer"
      project: "rudder"
      body: "A single pane of glass for the Kubernetes fleet, replacing per-cluster tooling with one control surface."
  highlights:
    - "Owned build, management, and lifecycle of 40+ Kubernetes clusters, cutting upgrade time from days to hours."
```

## Dates and the current role

`start`, `end`, and education's `completed` are **month-precision**: the string
`YYYY-MM`, matching `/^\d{4}-(0[1-9]|1[0-2])$/`. Quote them in YAML. Full ISO
dates are deliberately not used — employment is not a day-precision fact, and
`YYYY-MM-DD` would force a fabricated day into the file. Display formatting
happens at render time; never put a formatted string like `Jan 2021` in the
data.

The `isoMonth()` primitive (`src/lib/build/content-schema-primitives.ts`)
produces three distinct failures:

- not `YYYY-MM`, or a month outside `01`–`12` (`2026-13` is caught here, not
  reported as a future date);
- a syntactically valid string that is not a real calendar month;
- a month later than the build start instant. Employment and education dates
  must not be future-dated.

**`end` is omitted for a current role. It is never `null`.** The schema uses
`.optional()` and not `.nullable()`, so an explicit `end: null` is rejected as
a type error. There is exactly one spelling for "current", which is what stops
two roles from disagreeing about how they say the same thing. R1.2's
"absent/null" phrasing is resolved here in favour of absent-only.

When `end` is present it must be greater than or equal to `start`. A role that
ends before it begins fails the build with a message naming both values.

## Deliveries and project links

A delivery is one of the resume's "Highlighted Delivery" blocks — a named piece
of work inside a role. Up to 4 per role.

- `title` (string, 2–60 chars after trim) — required.
- `role` (string, 2–60 chars after trim) — Matthew's role on that delivery, not
  the job title again.
- `body` (string, 30–500 chars after trim) — required.
- `project` (kebab-case slug, 1–80 chars) — optional.
- `highlights` (list of up to 6 strings, each 20–200 chars) — optional. There
  is no minimum count, so `highlights: []` is valid.

When `project` is set, the delivery links to `/projects/<slug>` and the body
SHALL be a short summary rather than a restatement of the project write-up
(R4.3). Say what it was and why it mattered; the project page carries the
depth. When there is no project page, the delivery keeps its own bullets — that
is what `highlights` is for.

The slug is validated three ways in `prepare()`, and all three throw:

1. the slug is not in the raw `projects` collection;
2. it resolves to a project with `draft: true`;
3. it resolves to a `fixture-`-prefixed project.

Cases 2 and 3 are separate on purpose. Drafts and fixtures are filtered out on
production only, so a link to one renders fine in dev and preview and 404s only
in production. Raw existence alone is a satisfied-shaped check, not a satisfied
one.

## Skills YAML shape

`content/skills.yaml` is a top-level YAML list. Each entry is one group.

- `category` (string, 2–60 chars after trim).
- `items` (list of 1–12 strings, each 1–32 chars).

**At most 8 groups**, enforced in `prepare()` from `SKILLS_MAX_GROUPS` in
`src/lib/build/skills-schema.ts`. A group with zero items is rejected by the
`items` minimum, because an empty group is exactly the empty section R5.4
forbids.

Both bounds mechanize half of R5.2. The other half is judgement: publish what
you would defend in an interview, not everything you have touched. If a ninth
group seems necessary, merge two rather than raising the cap — the cap is a
spec decision, not a default.

```yaml
- category: "Cloud & Hybrid Infrastructure"
  items: ["AWS", "GCP", "OCI", "Azure"]
```

## Education YAML shape

`content/education.yaml` is a top-level YAML list. Each entry is one
credential.

- `credential` (string, 2–120 chars after trim) — required.
- `institution` (string, 2–80 chars after trim) — required.
- `completed` (month, `YYYY-MM`) — required, same rules as employment dates.
- `institutionUrl` (string) — optional, `http:`/`https:` only.
- `honours` (string, 2–40 chars after trim) — optional.
- `note` (string, 2–80 chars after trim) — optional, for a major or stream.

```yaml
- credential: "Bachelor of Applied Information Systems Technology"
  institution: "NAIT"
  institutionUrl: "https://www.nait.ca"
  completed: "2018-01"
  honours: "With Honours"
  note: "Network Management Major"
```

## The professional summary

`summary` lives in `content/profile.mdx` frontmatter, beside `headline`,
`location`, and `availability`. It is 100–600 characters after trim. It
introduces the experience section on screen and it opens the printed CV, which
is why it exists at all: print suppresses the personal narrative, so without a
separate summary the PDF would open with no summary at all.

Validation lives in `src/lib/profile-summary.ts`, not in the collection schema.
The schema field is `s.string().optional()` on purpose — a required field
aborts the whole profile parse on absence, and Velite then reports only `no
data resolved for 'profile' collection`, naming neither the file nor the field.
The guard owns the error message end to end.

The summary must state Matthew's experience as **"a decade"** (R9.1). The same
figure appears in `siteConfig.intro` and in the profile narrative, and a test
asserts they agree. Change one and you change all of them.

The summary is not a compressed copy of the narrative. It is the professional
register: what Matthew does, at what scale, with what. Personal material stays
in the narrative body.

## The R3 curation checklist

The published profile is a **curated subset**, not the whole resume. Walk this
list against every edit to the three YAML files and to the summary. Each item
is a rule you can check, and each is checked again in the spec's verification
task.

Two of these are partly mechanical — the schemas have no contact field, and the
length ceilings block inventory lines. The rest is judgement, which is why it
is written down here rather than pretended into code.

1. **R3.1 — no contact details.** No telephone number. No personal email
   address other than the site's own obfuscated one. No timezone line (the
   `location` frontmatter already says it). No LinkedIn, GitHub, or website
   header block (site chrome already carries those links). _Check:_ grep the
   files for digit runs and for `@`; the schemas give you nowhere to put these,
   so the only way they arrive is smuggled inside a prose field — `summary`, a
   highlight, or a delivery `body`.
2. **R3.2 — no job-search framing inside an entry.** "Seeking", "open to",
   "available for", "looking for my next" do not belong in a role. The
   availability line above the timeline already states it, and a role that
   carries it reads as stale the day the search ends. _Check:_ grep for those
   phrases across the three files.
3. **R3.3 — no named in-flight client engagements.** A named client with an
   expiry date dates the page and exposes the client. Describe consulting by
   the services offered instead. _Check:_ every consulting entry names a
   service, not a customer.
4. **R3.4 — outcomes, not activity.** A highlight states what changed. A bullet
   that only names a technology already listed under skills, with no result
   attached, is omitted or merged into one that has a result. _Check:_ read
   each highlight and ask what it claims happened.
5. **R3.5 — no ATS artifacts as body copy.** No post-nominal letters. No
   `Tech & tools:` prefix rows. No exhaustive service or hardware inventories.
   Per-role technology belongs in `tech`, where it renders as tags. _Check:_ no
   highlight is a comma-separated list of product names.
6. **R3.6 — compress, do not delete.** Where breadth is evidenced only by an
   inventory — on-prem hardware alongside cloud services, for example — keep
   one compressed line that preserves the signal. Deleting the inventory
   outright loses a real claim about range. _Check:_ each breadth claim from
   the master document survives as at least one line.
7. **R3.7 — no diluting prior-role content.** Front-line helpdesk duties from
   2017–2018 are omitted. They pull a senior platform profile downward and the
   reader has already stopped by then. _Check:_ no role lists ticket handling,
   desktop support, or password resets.

## One interests list and one voice

`/profile` is a person's page that contains a CV, not a CV with a name on top.
The narrative body of `content/profile.mdx` is free to carry non-professional
material — interests, family, side pursuits — and nothing here restricts that.
What follows targets duplication, not personality.

**One canonical interests list (R9.2).** It lives in the profile narrative. The
experience, skills, and education files SHALL NOT carry a second one. When the
resume has interests the narrative lacks, **merge** them into the existing
sentence rather than adding a list beside it. Two lists drift; one does not.
`/about` may treat the same material at greater length.

**One statement per subject (R9.3).** Where the narrative and the structured
data both touch a subject — documentation practice is the standing example —
state it once, in the narrative, in Matthew's voice. The structured data
carries the record; the narrative carries the view.

## What the build checks and what it cannot

Mechanical, and will fail CI:

- every field bound, every enum, every unknown key (`.strict()`);
- date format, real-calendar-month, not-future-dated, and `end >= start`;
- `end: null` (rejected as a type error);
- an unresolvable, draft, or fixture `project` slug;
- more than 8 skill groups, or a group with no items;
- a missing or too-short `summary` in `content/profile.mdx`;
- the "a decade" phrasing agreeing across `siteConfig.intro`, the narrative,
  and the summary.

Judgement, and will not fail anything:

- every item in [The R3 curation checklist](#the-r3-curation-checklist) except
  the parts the schemas make unexpressible;
- whether a highlight states an outcome or an activity;
- whether the skills list is curated or exhaustive;
- whether interests were merged or appended.

Errors from the first list name the file, the entry, and the field. Entries are
located by `organisation` in `experience.yaml`, `category` in `skills.yaml`,
and `credential` in `education.yaml`.

One trap when verifying locally: `pnpm build` is `next build` alone and never
runs Velite. The cross-collection checks — project slugs and the skills-group
cap — run only in `prepare()`, which means `pnpm exec velite build` is the
command that catches them. CI reaches the same code path through
`pnpm install --frozen-lockfile`, which triggers the `postinstall` Velite
build.
