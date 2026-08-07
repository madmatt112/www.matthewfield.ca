# Lighthouse runs — profile-resume

Records Lighthouse results for `/profile` (Req NFR Performance: Performance ≥90).

**Not at parity with the two sibling runs-logs.** `docs/projects-showcase-lighthouse-runs.md`
and `docs/contributions-and-resources-lighthouse-runs.md` each pair their log with a
cadence script (`scripts/check-lighthouse-cadence.mjs`,
`scripts/check-contributions-resources-lighthouse-cadence.mjs`) that parses the most
recent entry's count line and fires red in CI when the content count crosses a
threshold. **This log deliberately ships no cadence script and no count line, and
nothing in CI reads it.** `/profile` is a single fixed page whose content grows a role
at a time rather than a collection that accretes entries, so there is no count to
trigger on. Re-running is a manual decision, not an automated pin. Do not add a
`- ... at run time: N` line here expecting a script to read it — none exists.

## How these numbers were produced

`pnpm lhci` runs `lhci autorun` over **all seven URLs in `lighthouserc.js`**
(`/profile`, `/contact`, `/blog`, `/blog/fixture-code`, `/blog/fixture-toc`,
`/blog/tags/fixture`, `/blog/categories/fixture`), three runs each, desktop preset.
`/profile` is the first URL. The tables below record `/profile` specifically; the
full-set outcome is summarised under each run for context.

Caveats that apply to every number here:

- **Local developer run, not a CI gate.** These were measured on one WSL2 machine
  against `next start` on `localhost:3013` with headless Chrome. Absolute timings are
  machine- and load-dependent; treat the category scores as the signal and the
  millisecond metrics as indicative.
- **`total-byte-weight` is not a meaningful pass.** `lighthouserc.js` still pins
  `maxNumericValue` to the shared `TODO_BYTE_WEIGHT_PLACEHOLDER` (2,500,000) flagged
  `STATUS: SCAFFOLD ONLY` pending the blog-enhanced Task 36 measurement. Every URL
  clears it by a wide margin because the threshold is a placeholder, not a budget. The
  observed byte weights are recorded as raw data only.
- **No `numberOfRuns: 1` shortcut.** The config's three runs per URL were used as-is;
  `lhci` asserts against the median run. Where all three runs agreed, that is stated.

## Run 1 — profile-resume implementation (2026-08-07)

Commit `b5277ef`, working tree clean. Lighthouse 12.1.0, `@lhci/cli` 0.14.0, Node
v24.13.0, headless Google Chrome 149.0.7827.200, desktop preset, three runs.

### `/profile`

| Category       | Score |
| -------------- | ----- |
| Performance    | 100   |
| Accessibility  | 100   |
| Best Practices | 100   |
| SEO            | 100   |

All three runs returned identical scores — no spread. **Performance 100 ≥ 90: the NFR
Performance gate holds.**

Supporting metrics (median run, desktop preset):

| Metric                   | Value         |
| ------------------------ | ------------- |
| First Contentful Paint   | 0.3 s         |
| Largest Contentful Paint | 0.7 s         |
| Total Blocking Time      | 0 ms          |
| Cumulative Layout Shift  | 0             |
| Speed Index              | 0.3 s         |
| DOM size                 | 404 elements  |
| Network requests         | 45            |
| `total-byte-weight`      | 396,769 bytes |

Two design claims verified against the report rather than assumed:

- **CLS 0 and TBT 0 ms.** The design's "static rendering, no client JS; the change is
  HTML weight only" claim holds at the measurement level — `/profile` adds no blocking
  work and no layout shift. (The 13 script requests are the site-wide Next.js runtime,
  present on every route, not anything the profile components introduced.)
- **Zero `pagefind/*` requests on `/profile`.** `lighthouserc.js` notes there is
  intentionally no `userFlow`, and asks for manual confirmation that the resource list
  excludes Pagefind once measurement runs. Confirmed: 0 of 45 requests match
  `pagefind`.

Lighthouse JSON result IDs (`/profile` only):

| Run | lighthouseVersion | fetchTime                |
| --- | ----------------- | ------------------------ |
| 1   | 12.1.0            | 2026-08-07T17:22:40.026Z |
| 2   | 12.1.0            | 2026-08-07T17:22:52.569Z |
| 3   | 12.1.0            | 2026-08-07T17:23:04.515Z |

### Full seven-URL set (context)

`lhci autorun` exited 0. All seven URLs scored Performance 100. Two SEO warnings fired,
both on the deliberately `noindex` fixture posts that `lighthouserc.js` already
downgrades from `error` to `warn` for exactly this reason:

| URL                        | Perf | A11y | BP  | SEO | Note                         |
| -------------------------- | ---- | ---- | --- | --- | ---------------------------- |
| `/profile`                 | 100  | 100  | 100 | 100 |                              |
| `/contact`                 | 100  | 100  | 100 | 100 |                              |
| `/blog`                    | 100  | 100  | 100 | 100 |                              |
| `/blog/fixture-code`       | 100  | 96   | 100 | 66  | SEO warn — noindex, expected |
| `/blog/fixture-toc`        | 100  | 100  | 96  | 63  | SEO warn — noindex, expected |
| `/blog/tags/fixture`       | 100  | 100  | 100 | 100 |                              |
| `/blog/categories/fixture` | 100  | 100  | 100 | 100 |                              |

### Finding: `pnpm lhci` needs `BLOG_INCLUDE_DRAFTS=1` at build time

The first attempt at this run used a plain `pnpm build` — the true production
configuration — and **aborted at URL 4 of 7**. All four fixture URLs
(`/blog/fixture-code`, `/blog/fixture-toc`, `/blog/tags/fixture`,
`/blog/categories/fixture`) return **404** against a default production build, because
every fixture post carries `draft: true` and `src/lib/blog.ts` filters drafts unless
`BLOG_INCLUDE_DRAFTS === "1"`. Lighthouse treats a 404 as
`ERRORED_DOCUMENT_REQUEST`/`Runtime error`, `lhci` exits 1, and — importantly — **the
assert step never runs at all**, so a plain `pnpm lhci` reports failure without ever
evaluating the `/profile` gates.

The `/profile` numbers from that first, drafts-off run were identical (Performance 100,
Accessibility 100, Best Practices 100, SEO 100; `total-byte-weight` 396,444 bytes;
fetchTimes `17:17:25.285Z`, `17:17:38.510Z`, `17:17:51.026Z`), so the finding does not
affect this record's conclusion. It does mean:

> **Run `pnpm lhci` against a build made with `BLOG_INCLUDE_DRAFTS=1`**, and start the
> server with the same variable. The `lighthouserc.js` URL list assumes drafts are
> present — its per-URL SEO downgrade for `/blog/fixture-*` is written for pages that
> only exist in a drafts-on build.

This is a pre-existing `lighthouserc.js`/build-mode mismatch inherited from earlier
specs, not something profile-resume introduced. It was recorded rather than fixed
here — changing the config's URL list or adding a documented drafts-on Lighthouse build
step is out of scope for this task.

### Reproduction

```sh
pnpm exec velite build
BLOG_INCLUDE_DRAFTS=1 pnpm build
BLOG_INCLUDE_DRAFTS=1 pnpm start            # separate shell; binds port 3013
pnpm lhci --upload.target=filesystem --upload.outputDir=./.lighthouseci/reports
```

`--upload.target` was overridden because `lighthouserc.js` defaults to
`temporary-public-storage`, which publishes each report to a public Google Cloud
bucket. Reports were kept local instead; `/.lighthouseci/` is gitignored.
`pnpm build:search` was **not** run, so `public/pagefind/` was absent — this is
irrelevant to `/profile` (zero Pagefind requests, confirmed above) but means `/blog`'s
byte weight here excludes the Pagefind bundle, which is what `lighthouserc.js`
intends anyway.
