# Contributions and resources authoring guide

Reference documentation for authoring entries in the `contributions.yaml` and
`resources.yaml` content files. The build enforces these constraints; this doc
explains them so you learn them BEFORE breaking CI.

The canonical section headings below are checked mechanically by
`scripts/check-authoring-docs.mjs` (wired into CI before the first build). Each
heading must remain an exact single line — no commas, no colons. Do not rename
one without updating that check in the same PR.

Both files live under `content/` and are validated by a custom Velite YAML
loader. Unlike the `posts` and `projects` collections, neither file carries a
`draft` flag (see [No-draft policy and removal latency](#no-draft-policy-and-removal-latency)).

## Contributions YAML shape

`content/contributions.yaml` is a top-level YAML list. Each entry describes one
open-source contribution. There are no per-entry pages; the whole list renders
on `/contributions`.

### Required fields

- `repo` (string, 1–80 chars) — `owner/name`, matching the regex
  `^[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9._-]+$`. See the rationale below.
- `repoUrl` (string) — must parse as a URL and use `http:` or `https:` only.
  Other schemes (`mailto:`, `javascript:`, `file:`) are rejected.
- `title` (string, 5–100 chars after trim) — the contribution/PR title.
- `description` (string, 30–280 chars after trim).
- `date` (ISO date, `YYYY-MM-DD`) — when the contribution happened OR will
  happen. There is NO upper bound; a future date is allowed (see the asymmetry
  note under [Resources YAML shape](#resources-yaml-shape)).
- `links` (list of 1–5 link objects) — see [Link kinds](#link-kinds). Each
  `kind` may appear at most once across the list.

### Optional fields

- `language` (string, 1–24 chars).

There are no other optional fields. Every object boundary is `.strict()`, so an
unknown key fails the build.

### The `repo` regex and GitHub-compatibility rationale

The regex requires a single `/` separating two segments: an owner that starts
with an alphanumeric character (`[a-zA-Z0-9]`) followed by alphanumerics, dots,
underscores, or hyphens, then a repository name made of the same character
class. This mirrors GitHub's own `owner/name` shape: GitHub usernames and org
names are alphanumeric-with-hyphens and cannot begin with a separator, and repo
names allow dots, underscores, and hyphens. Keeping the field GitHub-compatible
means `repo` can be displayed verbatim and pasted into a GitHub URL without
transformation. The field is ASCII-only by design — it reflects forge naming
conventions, not free-form prose.

### Example entry

```yaml
- repo: "prometheus/prometheus"
  repoUrl: "https://github.com/prometheus/prometheus"
  title: "Fix flaky scrape-timeout test under load"
  description: "Reworked the scrape manager test to use a deterministic clock so the timeout assertion stops failing intermittently on busy CI runners."
  date: "2026-04-12"
  language: "Go"
  links:
    - kind: "pr"
      label: "Pull request"
      url: "https://github.com/prometheus/prometheus/pull/14021"
    - kind: "commit"
      url: "https://github.com/prometheus/prometheus/commit/abc1234"
```

## Link kinds

`links[].kind` is a closed enum. Each entry needs 1–5 links and a `kind` may
appear at most once per entry (duplicate kinds fail the build with a named
error). `label` is optional (1–60 chars); when omitted the page renders a
default label for the kind. `url` follows the same http(s)-only rule as
`repoUrl`.

| `kind`       | Typical use                       | Default label |
| ------------ | --------------------------------- | ------------- |
| `pr`         | A merged or open pull request     | Pull request  |
| `commit`     | A direct commit                   | Commit        |
| `issue`      | An issue you filed or resolved    | Issue         |
| `release`    | A tagged release you shipped      | Release       |
| `writeup`    | A blog post / writeup of the work | Write-up      |
| `discussion` | A discussion / RFC thread         | Discussion    |

### Forge-mapping convention

The enum is named for GitHub's vocabulary, but the site is forge-agnostic. Map
the equivalent concept on other forges to the closest `kind`:

- GitLab **Merge Request** → `pr`
- Gerrit **change** / Bitbucket **pull request** → `pr`
- A patch posted to a mailing list and committed → `commit`
- GitLab/Gitea **issue** → `issue`
- A tag/release on any forge → `release`

This keeps the icon set small and the enum stable. If a future kind genuinely
has no mapping, extend the enum in `src/lib/build/contributions-schema.ts` (and
add its default label and icon) in a single PR.

## Resources YAML shape

`content/resources.yaml` is a top-level YAML list. Each entry is a curated
bookmark rendered on `/resources`, grouped by category.

### Required fields (no optional fields)

- `title` (string, 2–80 chars after trim).
- `url` (string) — URL-parseable, `http:` or `https:` only.
- `description` (string, 20–200 chars after trim).
- `category` — closed enum; see [Resource categories](#resource-categories).
- `added` (ISO date, `YYYY-MM-DD`) — when you added this to your list.

The schema has no optional fields and every object is `.strict()`.

### `added` is mandatory and future-blocked; `date` is not

`added` is upper-bounded: the schema refines it with
`Date.parse(added) <= buildStartUtc`, where `buildStartUtc` is captured once at
build-module load. A future `added` value is rejected. This is the opposite of
contributions' `date`, which has NO upper bound:

- A **contribution** can be future-dated because `date` means "when the
  contribution happened OR will happen" — a scheduled release is legitimate.
- A **resource** `added` means "when I added this to my list", which is by
  definition in the past. Blocking future values prevents an AI-assisted seeding
  hallucination (e.g. a stray `2027-…` date) from pinning an entry to the top of
  its category forever.

### `added` UTC wall-clock caveat (Req 4.2)

The comparison is done in UTC. An ISO date with no time component is
interpreted as midnight UTC. If you are in a timezone behind UTC and set
`added` to your local "today", that value can already be "tomorrow" in UTC. When
the build runs before UTC midnight of that day, the refine rejects the entry as
future-dated. If a same-day `added` is rejected for this reason, use yesterday's
date (or simply re-run the build after UTC midnight).

### Example entry

```yaml
- title: "k9s"
  url: "https://k9scli.io/"
  description: "Terminal UI for navigating Kubernetes clusters; fast resource browsing and live log tailing without leaving the shell."
  category: "devops-tools"
  added: "2026-05-20"
```

## Resource categories

`category` is a closed enum. The canonical slugs and their display labels are:

| Slug              | Display label |
| ----------------- | ------------- |
| `appdev-tools`    | App Dev Tools |
| `devops-tools`    | DevOps Tools  |
| `blogs-and-feeds` | Blogs & Feeds |
| `reading`         | Reading       |
| `fun-stuff`       | Fun Stuff     |

### Display label vs slug

The YAML only ever contains the **slug**. The human-readable **display label**
lives in `RESOURCE_CATEGORY_LABELS` in `src/lib/resources.ts`, never in the
YAML. The slug is also the anchor and the section render order
(`CATEGORY_ORDER`, which mirrors the enum order). Keeping labels out of the YAML
means relabelling a category is a one-line code change with no data migration.

### Extension workflow

Adding a category is a closed-enum change that touches three places in a single
PR:

1. `src/lib/build/resources-schema.ts` — add the slug to the `category` enum.
2. `src/lib/resources.ts` — add the slug to `RESOURCE_CATEGORY_LABELS` and to
   `CATEGORY_ORDER`.
3. This author doc — add the slug/label row to the table above.

Expected cadence is zero to ~2 additions per year. A typo in `category` is a
closed-enum violation that fails the whole build (see
[No-draft policy and removal latency](#no-draft-policy-and-removal-latency) for
the blast-radius tradeoff).

## Seeding added for legacy bookmarks

When you first import a backlog of bookmarks, it is fine to give the entire seed
set a single `added` date — for example the YAML file's first-commit date —
rather than reconstructing the real date each bookmark was discovered. This is
an explicitly supported pattern.

Degenerate-case acknowledgement: because intra-category order breaks ties on
`title` (see [Sort order](#sort-order)), a seed set that all shares one `added`
date sorts **alphabetically by title within each category**. In other words,
for the seed set "most recently added first" collapses to "alphabetical within
category". This is expected, not a bug; as you add later entries with distinct
(more recent) `added` dates, those float above the seed block naturally.

## Sort order

Both pages sort deterministically with three keys, so output is stable across
builds.

- **Contributions** (`byDateDescRepoAscTitleAsc`, one flat list): `date`
  descending, then `repo` ascending, then `title` ascending. ISO date strings
  sort correctly lexicographically.
- **Resources** (`byAddedDescTitleAscUrlAsc`, within each category): `added`
  descending, then `title` ascending, then `url` ascending. Categories
  themselves render in `CATEGORY_ORDER` (enum order); empty categories are
  omitted.

The third key (`title` for contributions, `url` for resources) guarantees a
total order so equal-`date`/`added` entries never reorder between builds. See
[Seeding added for legacy bookmarks](#seeding-added-for-legacy-bookmarks) for
the resources seed-date degenerate case, where a shared `added` date reduces the
order to `title` ascending within the category.

## Empty-file behavior

Three states are distinguished by the loader:

- **Missing file** — if `content/contributions.yaml` or
  `content/resources.yaml` does not exist, the collection is simply empty and
  the page renders its empty state. This is a valid zero-entry state.
- **Explicit empty list `[]`** — a file whose entire content is `[]` is a valid
  zero-entry state, identical in effect to a missing file. This is the preferred
  way to keep the file present while holding zero entries.
- **Empty / null / zero-byte file** — a file that is blank, whitespace-only, or
  parses to `null` is a BUILD ERROR, not a silent fallback. The loader throws a
  named diagnostic: `<basename> is empty or null. To represent zero entries,
write the explicit empty list literal: []`. A top-level value that parses to a
  non-list (e.g. a mapping) is likewise a named build error.

The distinction is deliberate: a truly empty file is almost always an accident
(a half-finished edit), so it fails loudly, whereas the explicit `[]` literal is
an unambiguous statement of intent.

### Loader forward-coupling — registering a future YAML collection

The custom loader (`makeContentYamlLoader` in
`src/lib/build/content-yaml-loader.ts`) has a `test` that matches **all**
`content/**/*.yml` and `content/**/*.yaml` files. It validates a file only if
that file's basename is registered in the `schemasByBasename` map
(`contributions.yaml`, `resources.yaml`). Any other YAML file that flows through
the loader is given a **benign passthrough**: `yamlParse(...) ?? []`, i.e. its
value is returned as-is and a `null`/empty file degrades to `[]` WITHOUT
validation.

Consequence for a future author: if you add a new YAML content collection, you
MUST register its per-entry schema in `schemasByBasename`. An unregistered YAML
file is NOT validated — it gets the null→`[]` passthrough and ships whatever it
contains. The strict empty-file and per-entry checks described above apply only
to registered basenames.

## No-draft policy and removal latency

Neither collection carries a `draft` flag, diverging from the `posts` and
`projects` precedent. Rationale: these entries have no per-entry route, no MDX
body, and no SEO-indexed standalone URL, so there is nothing to "stage" at the
entry level the way a draft post stages a page.

- **Staging an entry (feature-branch workaround).** To hold an entry until a
  companion blog post lands, keep the YAML edit on a feature branch and merge it
  when ready. **Limitation:** you carry rebase friction every time `main`'s YAML
  changes during the embargo window. A `draft: true` flag would be
  lower-friction, but is intentionally not provided.
- **Removing an entry.** Delete the entry from the YAML, commit, and let CI
  deploy. **Removal latency = one CI + deploy cycle.** A `draft` flag would NOT
  fix this — toggling a flag is bottlenecked on the same CI + deploy cycle.
  Sub-cycle takedown latency would need a separate mechanism and is out of
  scope.

Closed-enum blast radius: a typo in a closed-enum field (`kind` or `category`)
fails the Velite build, which blocks the entire deploy — including unrelated
changes in the same commit. This is the accepted tradeoff. Fix-forward by
reverting the offending commit or pushing a correcting commit.

## Deep-link anchor stability

Both pages expose anchors — `/resources#cat-<category-slug>` (one per category
section) and `/contributions#contrib-<n>` (one per contribution, by sort
position). These are NOT a stable URL contract, but the instability is narrowly
scoped:

- `#cat-<category-slug>` anchors MAY change only if the `category` enum is
  edited to rename or remove a slug. They do NOT change for unrelated reasons.
  An external `#cat-<old-slug>` link breaks silently on a rename — there is no
  301 redirect and no soft fallback. This is an accepted consequence of the
  category-rename workflow.
- `#contrib-<n>` anchors MAY change only if a contribution is added or removed
  in a way that shifts sort position, OR if the contributions comparator is
  changed in a future spec. They do NOT change for unrelated reasons.

In practice, callers can expect both anchor families to remain stable across any
deploy that does not add, remove, rename, or re-sort entries. If you publish a
deep link externally, be aware it can break under exactly the conditions above.

## GitHub activity data

`content/github-activity.yaml` holds the daily GitHub contribution counts that
render as the activity heatmap on `/contributions`. It is a third YAML content
file under `content/`, registered in the loader's `schemasByBasename` map
alongside `contributions.yaml` and `resources.yaml`, so it gets the same strict
per-entry validation (see
[Loader forward-coupling](#loader-forward-coupling--registering-a-future-yaml-collection)).

### Generated file — do not hand-edit it row by row

This file is **generated** by running the refresh query below and writing the
whole file from the response. Do not edit individual rows by hand. A hand-tuned
count silently stops matching GitHub, and nothing in the build can detect it:
the schema only checks shape, not truth.

The raw API response the current seed was generated from is committed at
`scripts/__fixtures__/github-activity/seed-52w.json` so any number in the YAML
can be checked against the payload it came from. That path is listed in
`.prettierignore` deliberately — the fixture must stay byte-identical to what
the API returned, so it is never reformatted.

### Entry shape

Two lines per record, one record per calendar day, ascending by `date`:

```yaml
- date: "2026-02-10"
  count: 12
```

- `date` (ISO `YYYY-MM-DD`) — a single calendar day. Upper-bounded by the build
  clock, so a future date fails the build.
- `count` (integer ≥ 0) — that day's contribution count.

The object is `.strict()` and there are exactly these two fields. In particular
GitHub's own `contributionLevel` is **not** stored: it is bucketed against the
account's personal maximum over whatever period was queried, so it cannot be
reproduced offline. Levels are derived locally in `src/lib/github-activity.ts`,
which makes the guarantee _same file → same grid_.

### The refresh query

Authenticated GitHub GraphQL API v4, run by hand through the `gh` CLI. This is
the exact query the current data was seeded with — copy it verbatim rather than
rewriting it from the GitHub docs, or a refresh can quietly produce a different
span or a different field selection. Save it as `query.graphql`:

```graphql
query ContributionCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
```

Invocation, verbatim:

```bash
gh api graphql \
  -F login=madmatt112 \
  -F from="2025-08-12T00:00:00Z" \
  -F to="2026-08-10T23:59:59Z" \
  -F query=@query.graphql
```

`from` and `to` are **RFC 3339 `DateTime` values, not bare dates**.
`contributionsCollection` rejects a bare `YYYY-MM-DD`.

The recorded range is 52 weeks: `2025-08-12` through `2026-08-10`, 364 days
inclusive, which is under GitHub's one-year cap on `contributionsCollection`.
It produced 364 records — `dataStart` `2025-08-12`, `anchorDate` `2026-08-10`,
2003 total contributions, 129 active days. The API returns the calendar as
Sunday-aligned weeks and the bounds above made its first and last week partial,
so flatten `weeks[].contributionDays[]` into a single ascending list of
`{date, count}` and write that. Record every count exactly as returned: the
anchor day is usually still in progress at query time, so a trailing `count: 0`
is the honest value, not something to adjust.

### Re-derive from and to on every refresh

Re-running the invocation above with its literal dates reproduces the
_procedure_ but not the _range_ — it would re-fetch the same year and leave the
data as stale as it was. Both bounds must be re-derived from the new anchor:

- `to` = the new anchor date at `T23:59:59Z`. Use the most recent day the API
  actually reports, which also keeps the schema's future-date bound satisfied.
- `from` = anchor − 363 days at `T00:00:00Z`, which gives 364 days inclusive.

Shortening that span is not caught as an error — see the next section.

### Every day in the covered range must be present

The build requires a record for **every** calendar day from `dataStart` (the
minimum `date`) to `anchorDate` (the maximum `date`), inclusive, including days
with `count: 0`. A gap fails the build naming the first missing date, and a
duplicated date fails naming the date. Zero-count days are data, not padding:
without them a quiet period and an unseeded period would look identical.

Contiguity makes coverage decidable from the file alone, but only _within_ what
the file covers. **A short refresh silently shortens the published period** — a
90-day pull is perfectly contiguous, passes every build check, and simply
publishes 90 days instead of the full range. Nothing fails; the page just
covers less. This is why the span is re-derived rather than shortened for
convenience.

### The 26-week frame and the published range are different things

The grid is a fixed frame of 26 columns × 7 rows = 182 days, ending on the
Saturday on-or-after `anchorDate`. That is grid geometry, an implementation
fact.

The **published range** is the intersection of that frame with the data the file
actually carries: it starts at whichever of `dataStart` or the frame's start is
later, and ends at `anchorDate`. It is whatever the data covers — never assume
or write "26 weeks" as the period shown to a visitor. Days inside the frame but
outside the covered range are rendered as _no data_, not as zero-activity days.

Seeding 52 weeks while framing 26 is intentional: the surplus is ignored by the
grid and exists so the longer payload stays checkable.

### Staleness is a soft failure and the as-of line is the tell

Nothing about staleness fails the build. The page always renders a freshness
disclosure stating `anchorDate` — that "as of" line is the tell. If it reads
months ago, the data is old; the graphic is honest-but-limited rather than
broken, so it is never hidden.

`scripts/check-github-activity-freshness.mjs` runs in CI before the build and
emits `::warning::` annotations for:

- **Stale** — `anchorDate` older than **45 days** before the build clock. This
  threshold is a contract, not a tunable.
- **Incomplete coverage** — the file spans fewer than 182 days.
- **Impossible date** — `anchorDate` ahead of the build clock.
- **All counts zero** — records exist but every `count` is `0`, the signature of
  a mis-parameterised refresh query.
- **File absent** or **file is `[]`** — no data to render at all.

It **always exits 0**. Every one of these is a nudge to reseed, never a build
failure.

### An occasional coverage warning on a complete file is expected

The coverage check is a span rule: it warns whenever
`anchorDate − dataStart + 1 < 182`. It deliberately does not re-implement the
window arithmetic.

That test never misses an incomplete file. The frame's start is
`anchorDate + k − 181`, where `k ∈ [0, 6]` is the anchor's distance to the
following Saturday, so a file that genuinely fails to cover the frame always has
a span below 182. The cost of the simplification is over-warning: when the
anchor is not a Saturday the rule also fires on up to six span values that do in
fact cover the frame — six at a Sunday anchor, none at a Saturday.

So a coverage warning on a file that covers the frame is **expected behaviour,
not a bug**. The check is built to over-warn rather than ever go silent. If you
see it and the span is at or just below 182, widen the refresh window and it
goes away.
