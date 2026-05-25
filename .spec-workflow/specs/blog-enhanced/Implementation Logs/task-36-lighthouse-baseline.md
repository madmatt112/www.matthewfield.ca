# Task 36 — Lighthouse Baseline + Threshold Matrix

**Status:** DEFERRED MEASUREMENT (Option A scaffold). Threshold matrix is
unverified until `pnpm build` is green and a final lhci run is performed
against a deploy preview.

## Methodology (per design §"Lighthouse")

1. Run Lighthouse against blog-core's `main` to record baseline `B[url]`
   per URL (desktop preset, `numberOfRuns: 3`, median of `total-byte-weight`).
2. Implement blog-enhanced spec.
3. Re-run Lighthouse to record `M[url]` per URL.
4. Pin per-URL `total-byte-weight` `maxNumericValue` via `assertMatrix`
   using formula:

   ```
   maxNumericValue[url] = B[url] + 100_000 + 0.10 * B[url]
   ```

## Baseline commit SHA pin

- File: `LIGHTHOUSE_BASELINE_SHA.txt` at repo root.
- Captured value: `e79e1cb2a548f390e5d4a9aaa3d7cb7390fe9f70`
  (`git rev-parse HEAD` at scaffold time, `main` branch).
- Task 38 reads this file to verify drift; if drifted, re-baseline.

## URL list

Lighthouse runs against these URLs (matches `lighthouserc.js`):

- `/profile`
- `/contact`
- `/blog`
- `/blog/fixture-code`
- `/blog/fixture-toc` (added in this task)
- `/blog/tags/fixture`
- `/blog/categories/fixture`

## Blocker (Option A rationale)

`pnpm build` currently fails with a Turbopack server-relative import error
from `@pagefind/default-ui` (Task 19's known blocker):

```
./node_modules/.pnpm/@pagefind+default-ui@1.5.2/node_modules/@pagefind/default-ui/npm_dist/mjs
Module not found: Can't resolve './pagefind/pagefind.js'
server relative imports are not implemented yet.
```

Without a successful production build, neither a baseline run nor an
implementation-side measurement can be performed honestly. Rather than
guess thresholds (the task restriction forbids "Thresholds are MEASURED,
not guessed"), this implementation lands a **scaffold**:

- URL list updated to include `/blog/fixture-toc`.
- `assertMatrix` shape pinned per-URL with a single TODO placeholder
  `maxNumericValue` (`2_500_000`) clearly flagged in code comments as
  "to be measured pre-merge".
- Baseline SHA file committed so Task 38 has the pin contract.

## Pre-merge follow-up checklist

- [ ] Resolve Task 19 build blocker (Turbopack / Pagefind import).
- [ ] On blog-core `main` at SHA `e79e1cb2a548f390e5d4a9aaa3d7cb7390fe9f70`
      (or current `main` — update `LIGHTHOUSE_BASELINE_SHA.txt` if
      re-baselined), run `lhci autorun` and record `B[url]` for each URL.
- [ ] Tabulate `B[url]` here (one row per URL).
- [ ] On blog-enhanced branch (post-build-fix), run `lhci autorun` and
      record `M[url]` for each URL.
- [ ] Compute `maxNumericValue[url] = B[url] + 100_000 + 0.10 * B[url]`.
- [ ] Replace `TODO_BYTE_WEIGHT_PLACEHOLDER` in `lighthouserc.js` with
      per-URL measured thresholds (inline literal per matrix entry).
- [ ] Manually verify Lighthouse resource list contains NO `pagefind/*`
      entries (one-shot regression check — Pagefind is dialog-gated and
      must not be in the byte-weight audit).
- [ ] Confirm `lhci assert` passes against the threshold matrix.
- [ ] Re-run on Vercel deploy preview (final acceptance per Task 38).

## Caveats carried forward

- Pagefind exclusion is a ONE-SHOT manual check at implementation time,
  NOT an automated regression assertion (per design v2 caveat / r1 attack 5).
- Threshold matrix is currently UNVERIFIED — do not mark Task 36 complete
  in the dashboard until the checklist above is satisfied.

## Baseline measurement table (to be filled in)

| URL                          | B[url] (bytes) | M[url] (bytes) | maxNumericValue (bytes) |
| ---------------------------- | -------------- | -------------- | ----------------------- |
| /profile                     | TBD            | TBD            | TBD                     |
| /contact                     | TBD            | TBD            | TBD                     |
| /blog                        | TBD            | TBD            | TBD                     |
| /blog/fixture-code           | TBD            | TBD            | TBD                     |
| /blog/fixture-toc            | TBD            | TBD            | TBD                     |
| /blog/tags/fixture           | TBD            | TBD            | TBD                     |
| /blog/categories/fixture     | TBD            | TBD            | TBD                     |
