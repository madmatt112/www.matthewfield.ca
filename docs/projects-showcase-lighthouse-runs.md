# Lighthouse runs — project-showcase

Tracks Lighthouse re-verification cadence for the project-showcase feature (Req
12.0). The cadence script `scripts/check-lighthouse-cadence.mjs` reads the most
recent run entry's `- Published projects at run time: N` line.

Pin: when `(current_count - last_count) >= 3` AND `current_count % 3 === 0`,
the CI cadence step fires red and a new run entry MUST be added below before
the build can go green again. "current_count" is the count of non-draft,
non-fixture (`!/^fixture-/`) entries in `.velite/projects.json` produced by
Build 2. Fixture projects are excluded — the cadence tracks user-facing
projects, not test substrates.

## Run 1 — launch (2026-05-27)

- Published projects at run time: 0
- /projects:                    Perf 100 | A11y 98 | BP 100 | SEO 100
- /projects/fixture-placeholder: Perf 100 | A11y 96 | BP 100 | SEO 100

Source: Task 28.3 implementation log (Lighthouse 12.1.0, desktop preset,
headless Chrome 144.0.7559.132, single-run methodology).

Lighthouse JSON result IDs:

| URL                           | lighthouseVersion | fetchTime                |
| ----------------------------- | ----------------- | ------------------------ |
| /projects                     | 12.1.0            | 2026-05-28T03:40:46.577Z |
| /projects/fixture-placeholder | 12.1.0            | 2026-05-28T03:41:12.646Z |

Note: at launch, the only non-draft project in `.velite/projects.json` is
`fixture-published-second`, which is filtered out by the `^fixture-` regex,
yielding count = 0. The first cadence trigger fires when 3 real (non-fixture)
projects are published.
