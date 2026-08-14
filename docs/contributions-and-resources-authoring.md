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

This file is **machine-written weekly**. A scheduled GitHub Actions workflow
refreshes it every week and commits the result, rewriting the whole file from
the API response each time — see
[The automated refresh](#the-automated-refresh), which is the normal path. Do
not edit individual rows by hand. A hand-tuned count silently stops matching
GitHub, and nothing in the build can detect it: the schema only checks shape,
not truth. The next scheduled run then overwrites the edit anyway, so the only
thing a hand edit buys is a week of wrong numbers.

The raw API response at `scripts/__fixtures__/github-activity/seed-52w.json` is
the **seed** payload — the response the file was first generated from, and not
the response behind the file you are reading now. **It stopped corresponding to
`content/github-activity.yaml` at the first automated sync**: from that run
onward the YAML carries a different range and different counts, so checking a
current number against this fixture proves nothing. Keep it as the seed's
provenance record; to check a live number, re-run the refresh and compare
against the response that run fetched. That path is listed in `.prettierignore`
deliberately — the fixture must stay byte-identical to what the API returned,
so it is never reformatted.

### The automated refresh

**This is the normal path, and it needs no human.**
`.github/workflows/sync-github-activity.yml` runs on a weekly cron —
`37 9 * * 2`, Tuesdays at 09:37 UTC — and can also be started from the Actions
tab (`workflow_dispatch`). Each run:

1. fetches the contribution calendar with `scripts/sync-github-activity.mjs`;
2. rewrites `content/github-activity.yaml` in full from the response;
3. runs `pnpm gate:github-activity` over the result, and stops without
   committing if any stage of it fails;
4. commits `chore(content): refresh GitHub activity data` and pushes it;
5. confirms a production deployment for that commit reached `success`.

**Which token commits.** The commit and the push are made with the workflow's
own default `GITHUB_TOKEN`, authored as `github-actions[bot]`. The zero-scope
read PAT in `GH_CONTRIBUTIONS_TOKEN` is used for the calendar query in step 1
and for nothing else — it never reaches the commit, the push, or the deployment
check. See [Tokens, permissions, and expiry](#tokens-permissions-and-expiry).

**`ci.yml` does not run on the resulting commit.** A push made with the default
`GITHUB_TOKEN` does not start another workflow run — GitHub suppresses that to
prevent recursion. So the gate in step 3 is the only validation this data ever
gets, which is why the workflow refuses to commit a payload that fails it.

**Vercel deploys it anyway — an assumption, not a guarantee.** Deployments are
created by Vercel's own Git integration rather than by `ci.yml`, so the
suppressed CI run does not suppress the deploy. That is an assumption about how
this project is wired and not something the workflow can promise; step 5 is
what turns the assumption into an observation, and a red run is how it reports
the assumption being wrong.

**The first automated commit produces a large diff, and that is expected.** The
committed seed covers `2025-08-12` through `2026-08-10`, while the first real
run covers a 364-day window ending on its own run date — the two ranges cannot
coincide, so almost every row changes at once. This is correct behaviour, not
an anomaly to investigate: the gate is what makes a large diff safe. Do not
hand-edit the file to make the diff smaller.

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

**This is rung 3 of the ladder in [Refreshing by hand](#refreshing-by-hand)** —
authenticated GitHub GraphQL API v4, run by hand through the `gh` CLI. It is
not the normal path and it is not the first thing to try: the automation is the
normal path (see [The automated refresh](#the-automated-refresh)), and rungs 1
and 2 come first. Rung 3 is for the case where the script's own _fetch_ is what
is broken.

The **canonical copy** of this query is `CONTRIBUTION_CALENDAR_QUERY` in
`scripts/sync-github-activity.mjs`. The block below is a reproduction of it,
held equal to it by a test in `scripts/sync-github-activity.test.mjs` — so copy
it verbatim rather than rewriting it from the GitHub docs, or a refresh can
quietly produce a different span or a different field selection. Save it as
`query.graphql`:

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

Invocation. The bounds are **derived from the day you run it**, never pasted:
the dates in the trailing comments are illustrative — they are the seed's
bounds, shown only so the shape is recognisable — and copying them re-fetches
the frozen year (see
[Re-derive from and to on every refresh](#re-derive-from-and-to-on-every-refresh)).
The login is pinned deliberately: the heatmap belongs to a person, not to
whoever happens to own the repository.

```bash
TO_DAY="$(date -u +%F)"                          # the run day, e.g. 2026-08-10
FROM_DAY="$(date -u -d "$TO_DAY -363 days" +%F)" # 364 days inclusive, e.g. 2025-08-12

gh api graphql \
  -F login=madmatt112 \
  -F from="${FROM_DAY}T00:00:00Z" \
  -F to="${TO_DAY}T23:59:59Z" \
  -F query=@query.graphql
```

`from` and `to` are **RFC 3339 `DateTime` values, not bare dates**.
`contributionsCollection` rejects a bare `YYYY-MM-DD`.

Save the response, hand it to the same transform the workflow uses, and gate
the result — this path is outside the workflow, so nothing gates it for you:

```bash
node scripts/sync-github-activity.mjs --input response.json
pnpm gate:github-activity
```

**The figures that follow describe the _seed_, not the live file.** They were
true of the first payload and became false at the first automated sync; only
the shape rules carry over. The seed's range was 52 weeks — `2025-08-12`
through `2026-08-10`, 364 days inclusive, which is under GitHub's one-year cap
on `contributionsCollection` — and it produced 364 records, with `dataStart`
`2025-08-12`, `anchorDate` `2026-08-10`, 2003 total contributions and 129
active days. Every one of those numbers moves on each refresh; read the current
values out of `content/github-activity.yaml` rather than from here.

What does carry over: the span stays 364 days inclusive, and the API returns
the calendar as Sunday-aligned weeks, so bounds like these make its first and
last week partial. Flatten `weeks[].contributionDays[]` into a single ascending
list of `{date, count}` and write that. Record every count exactly as returned:
the anchor day is usually still in progress at query time, so a trailing
`count: 0` is the honest value, not something to adjust.

### Re-derive from and to on every refresh

**Rung 3 again**, and the reason it is a rung rather than the normal path: the
automation derives these bounds itself on every run, so only a hand-run
`gh api graphql` needs this section at all.

Re-running the invocation above with literal dates reproduces the _procedure_
but not the _range_ — it would re-fetch the same year and leave the data as
stale as it was. Both bounds must be re-derived, and they are derived from the
**run clock**, not from the file being replaced:

- `to` = the UTC day the refresh runs, at `T23:59:59Z`.
- `from` = that same day − 363 days, at `T00:00:00Z`, which gives 364 days
  inclusive.

**The request bounds and the resulting anchor are two different things, and
this section is about the first.** `from` and `to` are the _request_: what you
ask GitHub for, computed from the run clock before any response exists.
`anchorDate` is the _result_: the maximum `date` in the calendar the response
actually returned, and that is what gets written to the file and disclosed in
the "as of" line. The two normally coincide at `to`, but the response is the
authority — never write an anchor you computed rather than one the API
reported, and never push `to` past the run day to force one, because the schema
rejects a future date.

Shortening that span is not caught as an error — see the next section.

Whatever bounds you end up with, run `pnpm gate:github-activity` before
committing: a hand-run refresh gets none of the workflow's validation for free.

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

### Tokens, permissions, and expiry

Two credentials, deliberately different, so that neither can do the other's
job.

**The read token — `GH_CONTRIBUTIONS_TOKEN`.** A repository secret holding a
**classic PAT with zero scopes**. The contribution calendar is public data, so
no scope is needed to read it. The name cannot begin with `GITHUB_` — GitHub
forbids that prefix for secrets — which is why it reads `GH_CONTRIBUTIONS_TOKEN`
rather than something tidier.

**Do not "upgrade" it to `read:user`.** Zero scopes is the property being
protected, not an oversight. A scoped token would silently begin publishing
private contributions the moment any existed, and the heatmap would stop
matching the public profile anyone can verify for themselves. Public-only by
construction is the point.

**Expiry is a foreseen operational event, not an incident.** A classic PAT
lapses after at most a year, so this token _will_ expire, on a date that can be
put in a calendar. When it does, the run **fails with an
authentication-specific message** — `::error::[sync] api-auth …`, naming the
credential rather than the data — instead of silently producing an empty
calendar. That red run is the primary expiry detector and it fires within one
cadence period, so within seven days. The remedy is routine: mint a new
zero-scope classic PAT, replace the secret, re-run. Nothing else changes, and
the previously committed data keeps rendering throughout.

**The write credential is the workflow's own `GITHUB_TOKEN`.** The workflow
declares exactly two permission scopes and no others:

| Scope         | Value   | Why it is needed                                              |
| ------------- | ------- | ------------------------------------------------------------- |
| `contents`    | `write` | the commit and the push of the refreshed file                 |
| `deployments` | `read`  | the production deployment check, which returns 403 without it |

The repository's default workflow permission is `read`, and declaring a
`permissions:` block zeroes every scope it does not list — which is why both
are spelled out even though each is used by only one step. Neither token
appears in a run log, in the committed file, in a build artifact, or in
anything served to a browser.

### When the sync fails, what tells you

**The delivery channel is the red run in the Actions tab plus GitHub's own
workflow-failure notification — and nothing else.** No issue is filed, no
message is sent anywhere, nothing else turns red. Every failing path names a
cause on an `::error::` line and repeats it in the run summary as
`FAILED — <cause>`, so the run tells you _what_ broke once you look at it.
Nothing makes you look.

The causes a run can name:

| Cause                                                                                               | What happened                                                                          |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `request-failure`                                                                                   | the calendar request threw or timed out, or returned a non-2xx other than 401/403      |
| `api-auth`                                                                                          | 401 or 403, or `GH_CONTRIBUTIONS_TOKEN` absent on the fetch path — the expiry case     |
| `api-error`                                                                                         | a 200 carrying `errors`, or a null `data.user` — the rename or account-transfer signal |
| `degraded-payload`                                                                                  | the response carried zero contribution-day records                                     |
| `file-absent-no-seed`                                                                               | `content/github-activity.yaml` is missing and no seed was requested                    |
| `input-unreadable`                                                                                  | an `--input <file>` that cannot be read or parsed, naming the errno                    |
| `flag-missing-value`                                                                                | `--login` or `--input` passed with no value after it                                   |
| `internal-error`                                                                                    | anything else that threw, carrying the thrown `name: message`                          |
| `gate-rejected`                                                                                     | `pnpm gate:github-activity` failed, naming the stage `G1`–`G4` that stopped it         |
| `commit-failed`, `push-failure`, `push-race-exhausted`, `resync-failed`                             | the commit, the push, or the retry after a racing push                                 |
| `deploy-api-unavailable`, `deploy-not-success`, `deploy-environment-unrecognised`, `deploy-timeout` | the production deployment check                                                        |

In every one of these the previously committed file is left untouched, so the
page keeps rendering the last good data.

**This channel is known to be weak, and this repository has direct evidence of
it.** The since-deleted `.github/workflows/verify-vercel-token.yml` failed on
eleven or more consecutive scheduled runs from 2026-06-01; it never succeeded
once in its whole history; and not one of those notifications produced any
action — the repository has had zero issues filed in it, ever. **That workflow
no longer exists.** It was removed rather than repaired, because a permanently
red weekly workflow trains the habit of ignoring red weekly workflows, and that
habit is the only failure-delivery channel this sync has. The removal commit
`a6557de` carries the fuller record of that reasoning, but the three facts
above are the whole of the argument and are written out here so they hold
whether or not that SHA still resolves. The evidence is historical, and it is
cited because it is the honest measure of what this channel is worth.

**Escalation beyond the red run is deliberately not built.** An issue-based
channel — file on failure, reuse rather than duplicate, distinguish causes,
close on recovery — is deferred as **`d-65ff36e0`**
(`.spec-workflow/deferrals/d-65ff36e0.md`), with two countable revisit
triggers: `verify-vercel-token.yml` being rebuilt, or this workflow's own
history showing two or more consecutive failed scheduled runs. Until then the
gap is real, and it is recorded rather than papered over.

**A known failure mode with no detector in scope: the 60-day disablement.**
GitHub disables scheduled workflows in a repository that has seen no activity
for 60 days. If that happens the sync simply stops — no run, therefore no red
run, therefore no notification. **Nothing in this project detects it**, and
that is stated plainly rather than hidden behind a check that does not cover
it. In particular the 45-day freshness warning **cannot** catch this case: it
fires only inside a CI run that a human started, and the premise of the 60-day
mode is precisely that nobody has started anything. What surfaces it is the "as
of" line on `/contributions` drifting further into the past until someone
notices. Re-enabling the workflow from the Actions tab is the fix.

**The 45-day check is a backstop, not a notification channel.**
`scripts/check-github-activity-freshness.mjs` runs in CI before the build and
warns when `anchorDate` is more than 45 days old — see
[Staleness is a soft failure and the as-of line is the tell](#staleness-is-a-soft-failure-and-the-as-of-line-is-the-tell).
It always exits 0, it fires only inside a human-initiated CI run, and the
automation neither weakens nor re-tunes it: the 45-day threshold is still a
contract, not a tunable.

### Refreshing by hand

The automation is the normal path. When it cannot run — GitHub Actions is
unavailable, or the workflow itself is disabled or broken — work down this
ladder and stop at the first rung that works.

1. **`workflow_dispatch`** — the preferred manual path. Actions tab → _Sync
   GitHub activity_ → _Run workflow_. It is the same workflow, so the result is
   gated, committed and deployment-checked exactly as a scheduled run would be,
   and there is nothing further to do.
2. **Run the script locally**, with the read token in the environment and no
   flags:

   ```bash
   GH_CONTRIBUTIONS_TOKEN=… node scripts/sync-github-activity.mjs
   ```

   Same login, same bounds, same query, same transform as the workflow — it
   needs nothing from Actions, which is what makes it cover both of rung 1's
   failure cases.

3. **`gh api graphql` by hand, then the same transform** — see
   [The refresh query](#the-refresh-query) for the query, the derived bounds and
   the invocation. Needed only when the script's own _fetch_ is what is broken.
   The bounds are hand-supplied on this rung, which is the one thing it does not
   share with the two above:

   ```bash
   node scripts/sync-github-activity.mjs --input response.json
   ```

There is no rung 4: hand-writing the file is not a documented path, and
[Generated file — do not hand-edit it row by row](#generated-file--do-not-hand-edit-it-row-by-row)
still stands.

**Gate it before you commit — nothing else will.** Rungs 2 and 3 write the file
on your machine, outside the workflow, so they get none of its validation for
free:

```bash
pnpm gate:github-activity
```

That alias runs the **four gate checks and, ahead of them, the normalisation**:
`prettier --write content/github-activity.yaml` (`G1`), then `velite build`
(`G2`), `node scripts/check-github-activity-payload.mjs` (`G3`) and `next build`
(`G4`). The `prettier --write` stage is **not** one of the four checks — it is
there so that the bytes which get validated are the bytes which get committed,
because `.githooks/pre-commit` reformats staged YAML _after_ the gate has run.
**It must not be dropped from the alias.** Without it the hook can rewrite a
payload the gate already approved, and the validated bytes and the committed
bytes stop being the same thing.

**Recovering an absent file.** If `content/github-activity.yaml` has been
deleted, an ordinary refresh will not bring it back: the script refuses to
create the file and aborts with `file-absent-no-seed`. That refusal is
deliberate — it is what stops a broken run inventing a payload — so recovery is
an explicit opt-in. Dispatch the workflow with the **`seed`** input ticked
(Actions tab → _Sync GitHub activity_ → _Run workflow_ → **seed**), or locally
run `node scripts/sync-github-activity.mjs --seed`. `seed` relaxes the
file-must-exist precondition **and nothing else**: the seeded payload goes
through exactly the same gate as any other refresh, skipping no validation, so
follow the local form with `pnpm gate:github-activity` before committing just
as you would any other hand refresh.
