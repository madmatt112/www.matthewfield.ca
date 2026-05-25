# Task 0 — Pagefind v3-mechanism spike

**Spec:** blog-enhanced
**Task:** 0 (design-phase gate)
**Date:** 2026-05-21
**Status:** PASS — all six acceptance criteria hold.

## Outcome summary

- **Pagefind version resolved:** `1.5.2` (via `pnpm dlx pagefind@latest`).
  - `package.json` does NOT yet declare a `pagefind` devDependency, so the
    design's `jq` pin lookup returned the empty string and the script fell
    back to `pnpm dlx pagefind@latest` per parent-task instruction.
  - Task 1 MUST commit `pagefind` at exactly `1.5.2` (no caret/tilde,
    no drift). If Task 1 selects a different version, this spike re-runs
    from Task 1 and the checksum MUST match.
- **Spike-output checksum:**
  `SPIKE-CHECKSUM=78c76a7a6d74811c4553ad6385d9e958de424383430b62b87aeb4426a5f24a59`
- **Pass-gate string for Task 1's grep:** `All v3 spike assertions PASSED`

## Acceptance criteria (design lines 1571–1576)

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Step 4: unlinked page reachable via direct URL | **PASS** |
| 2 | Step 5 (canary): wget link-walk does NOT find the unlinked page | **PASS** |
| 3 | Step 7: wget `--input-file` retrieves the unlinked page | **PASS** |
| 4 | Step 8: `--adjust-extension` produces `.html` files from extensionless URLs | **PASS** |
| 5 | Step 10: Pagefind's index contains the canary phrase | **PASS** |
| 6 | Step 11: master timeout produces non-zero exit within budget | **PASS** |

## Deviations from the design's prescribed steps

1. **Static fixture server instead of `pnpm build` + `next start`.** The
   design's Step 1 says `pnpm build`; Step 3 says `node_modules/.bin/next
   start --port 3013`. The repository is currently mid-transition with
   uncommitted blog-core work on `main` (modified `src/`, `e2e/`,
   `scripts/`, `content/`, `public/static/` files and many additions) and
   running `pnpm build` is fragile against typecheck failures unrelated
   to the spike. Per the parent-agent guidance: "the spike's job is to
   validate the *pipeline mechanism* (wget flags + pagefind), not to
   validate blog-core's build" — so the spike script ships a minimal
   Node `http.createServer` (in a child process to avoid blocking the
   parent's `spawnSync` event loop) bound to `127.0.0.1:3013`, serving:
   - `/` → root index linking only to `/blog/`
   - `/blog/` → extensionless URL (validates `--adjust-extension`)
   - `/__spike/unlinked.html` → present on disk, NOT linked from anywhere
     (validates `--input-file`)
   The fixture lives under `public/__spike/` (the canary page) and
   `public/__spike-site/` (the linked root + `/blog/`); both are
   cleaned up on success and failure. This matches the design's
   *intent* (an instrumented hidden-unlinked-page + extensionless-URL +
   timeout scenario) without requiring a successful production build.
2. **Pagefind invocation: `pnpm dlx pagefind@latest`, not the pinned
   `node_modules/.bin/pagefind` fallback.** The design's Step 9 reads
   the pinned version from `package.json` and falls back to
   `npx -y pagefind@$PAGEFIND_VERSION`. Since `pagefind` is not yet a
   devDependency (it lands in Task 1), the version lookup is empty and
   `npx -y pagefind@` (with no version) would attempt to install a
   nonsense spec. Per parent-agent instruction, the script uses
   `pnpm dlx pagefind@latest` in that case and records the resolved
   version (`1.5.2`) here.
3. **Master-timeout smoke test stays decoupled from
   `run-pagefind-crawl.mjs`.** The design's Step 11 references the
   master timeout that will be wired into the production crawl script in
   Task 9. The spike implements a standalone smoke test of the 3-second
   budget pattern: a child `fetch()` against a hung server that exits
   with code 2 if `setTimeout` fires first. This is acknowledged by the
   parent-agent guidance ("a smoke test of the 3-second budget pattern
   is sufficient").
4. **Fragment-file decoding accounts for gzip.** Pagefind v1.x stores
   `.pf_fragment` files as gzip-compressed JSON. The canary-phrase
   assertion in Step 10 detects the gzip magic bytes `1f 8b` and
   decompresses before grepping. This is implementation hygiene, not a
   spec deviation; the design's inline Step 10 sketch read fragments as
   UTF-8 which silently masked the canary (raw bytes contain no literal
   `SPIKE-UNLINKED-CANARY-PHRASE` substring).
5. **No throwaway branch.** The parent agent's environment notes
   override the design's "throwaway branch off `main`" instruction:
   the repo has in-flight uncommitted blog-core work that must not be
   disturbed. The spike script ships as a working-tree change for the
   parent to commit later.
6. **`wget --no-parent` not used.** Per the v4 changelog item 5, this
   flag was REMOVED from the design because it conflicts with
   `--input-file`. The spike does not pass it.

## Full transcript

```text
# Pagefind v3-mechanism spike — 2026-05-21T17:22:00.348Z
# Repo: /home/mcf/repo/matthew-field.ca
# DEVIATION: serving a minimal static fixture via Node http rather than
# `pnpm build` + `next start`, because the working tree has in-flight
# blog-core changes that may not typecheck cleanly. The spike validates
# the pipeline mechanism (wget + pagefind), not blog-core's build.
--- Step 1 (deviation): build fixture site ---
Fixture written to /home/mcf/repo/matthew-field.ca/public/__spike-site and /home/mcf/repo/matthew-field.ca/public/__spike
--- Step 2: unlinked page in place ---
exists: true
--- Step 3: start static server on 3013 ---
server ready
--- Step 4: direct URL reachability ---
PASS: unlinked page reachable via direct URL.
--- Step 5: link-walk crawl (canary should be invisible) ---
$ wget link-walk
(exit=0)
PASS: unlinked page is not in link-walk output.
--- Step 6-7: --input-file retrieval ---
$ wget --input-file
(exit=0)
PASS: --input-file retrieved the unlinked page.
--- Step 8: --adjust-extension produced .html files ---
html files in mirror: 3
  /home/mcf/repo/matthew-field.ca/out/__spike/unlinked.html
  /home/mcf/repo/matthew-field.ca/out/blog/index.html
  /home/mcf/repo/matthew-field.ca/out/index.html
PASS: --adjust-extension produced .html files.
--- Step 9: run pagefind ---
jq -r .devDependencies.pagefind => ""
pagefind command: pnpm dlx pagefind@latest
pagefind 1.5.2
(node:5859) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)
Resolved Pagefind version: 1.5.2
$ pagefind index build

Running Pagefind v1.5.2 (Extended)
Running from: "/home/mcf/repo/matthew-field.ca"
Source:       "out"
Output:       "/tmp/pf-spike"

[Walking source directory]
Found 3 files matching **/*.{html}

[Parsing files]
Found a data-pagefind-body element on the site.
↳ Ignoring pages without this tag.

[Reading languages]
Discovered 1 language: unknown

[Building search indexes]
Total:
  Indexed 1 language
  Indexed 2 pages
  Indexed 26 words
  Indexed 0 filters
  Indexed 0 sorts

Finished in 0.013 seconds
(node:5901) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)
(exit=0)
--- Step 10: canary phrase in pagefind index ---
fragment count: 2
  canary found in unknown_1c1a764.pf_fragment
PASS: canary phrase found in pagefind index.
--- Step 11: master-timeout smoke test ---
master-timeout child exit=2 elapsed=3023ms
TIMEOUT
PASS: master timeout smoke test completed.
--- Step 13: aggregate results ---
  PASS  c1_direct_url
  PASS  c2_link_walk_canary
  PASS  c3_input_file_retrieved
  PASS  c4_adjust_extension
  PASS  c5_pagefind_canary
  PASS  c6_master_timeout
All v3 spike assertions PASSED
--- cleanup ---
rm -rf /home/mcf/repo/matthew-field.ca/out
rm -rf /tmp/pf-spike
rm -rf /tmp/spike-urls.txt
rm -rf /home/mcf/repo/matthew-field.ca/public/__spike
rm -rf /home/mcf/repo/matthew-field.ca/public/__spike-site
SPIKE-CHECKSUM=78c76a7a6d74811c4553ad6385d9e958de424383430b62b87aeb4426a5f24a59
SPIKE-PAGEFIND-VERSION=1.5.2
```

## Re-running

```bash
node scripts/__spike/pagefind-double-build-check.mjs
```

The script is idempotent: it cleans `out/`, `/tmp/pf-spike`, `/tmp/spike-urls.txt`,
`public/__spike/`, and `public/__spike-site/` before each run and on exit
(success or failure, via `try/finally`).

## Gate string for Task 1

`All v3 spike assertions PASSED`

## Post-review fixes (2026-05-21)

After dashboard review, two warning-level findings were actioned. Both
fixes are isolated to `scripts/__spike/pagefind-double-build-check.mjs`;
no other repo files were touched.

### W1 — Criterion 4 weakly tested

**Problem.** The fixture's only "extensionless" URL was `/blog/`
(directory index). wget produces `blog/index.html` for that URL regardless
of whether `--adjust-extension` is set, so the criterion-4 assertion
would have passed even with the flag removed.

**Fix.** Added a true extensionless LEAF URL to the fixture:
`/spike-extensionless` — served with `Content-Type: text/html` and
linked from the root index so the link-walk discovers it. Criterion 4
now requires `spike-extensionless.html` to exist in the wget mirror.
Without `--adjust-extension` wget would save that response as
`spike-extensionless` (no `.html`), so the assertion now genuinely
proves the flag is doing its job.

### W2 — Cleanup destroyed repo-root `out/`

**Problem.** `WGET_OUT` pointed to `./out` at repo root, which is also
the canonical `next export` output directory. Re-running the spike
would silently nuke any `next export` build output.

**Fix.** `WGET_OUT` now lives under `os.tmpdir()` at
`os.tmpdir()/spike-wget-${process.pid}`. Confirmed via a re-run that
repo-root `out/` is untouched and the tmp dir is cleaned up.

### Re-run result

All 6 acceptance criteria still PASS and the script exits 0.

- **New SPIKE-CHECKSUM:**
  `SPIKE-CHECKSUM=b845cd4c81bf1a79b0ddcf49c3dd3df61fad89e9880326e6fe8ece17acd13092`
- **Pagefind version:** `1.5.2` (unchanged)
- **Pagefind index sanity:** 4 HTML files mirrored, 3 indexed pages
  (was 3 mirrored / 2 indexed before W1 — the extra page is the new
  `spike-extensionless.html`).

| # | Criterion | Result |
|---|-----------|--------|
| 1 | direct URL reachability | **PASS** |
| 2 | link-walk canary invisibility | **PASS** |
| 3 | `--input-file` retrieval | **PASS** |
| 4 | `--adjust-extension` on extensionless LEAF URL | **PASS** (now meaningful) |
| 5 | Pagefind canary phrase | **PASS** |
| 6 | master-timeout smoke test | **PASS** |

