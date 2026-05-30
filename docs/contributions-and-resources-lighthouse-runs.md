# Lighthouse runs — contributions-and-resources

Tracks Lighthouse re-verification cadence for the contributions-and-resources
feature (Req NFR-Performance). The cadence script
`scripts/check-contributions-resources-lighthouse-cadence.mjs` reads the most
recent run entry's `- Entries at run time (contributions + resources): N` line.

Pin: when `(current_count - last_count) >= 10`, the CI cadence step fires red
and a new run entry MUST be added below before the build can go green again.
"current_count" is `contributions.length + resources.length` — the combined
entry count from `.velite/contributions.json` and `.velite/resources.json`
produced by Build 2. There is no draft/fixture filtering: neither collection
has a draft flag, and the cadence tracks every published entry across both
pages.

## Run 1 — launch (2026-05-29)

- Entries at run time (contributions + resources): 0
- /contributions: not yet measured (no entries at launch)
- /resources:     not yet measured (no entries at launch)

Note: at launch both `content/contributions.yaml` and `content/resources.yaml`
are the empty-list literal `[]`, so `.velite/contributions.json` and
`.velite/resources.json` are both `[]` and the combined count is 0. The first
cadence trigger fires once 10 entries (contributions + resources combined) have
shipped since this baseline. Replace the "not yet measured" lines with the
real `Perf | A11y | BP | SEO` scores on the first run after entries land.
