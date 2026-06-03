// Port duplicated in package.json (start script) and scripts/run-pagefind-crawl.mjs — keep in sync.
const baseUrl = process.env.LHCI_PREVIEW_URL || "http://localhost:3013";

// Per-URL `total-byte-weight` thresholds.
//
// Methodology (per blog-enhanced design §"Lighthouse", Task 36):
//   1. Run Lighthouse against blog-core's `main` to record baseline `B[url]`.
//   2. Implement spec, re-run Lighthouse to record `M[url]`.
//   3. Pin `maxNumericValue = B[url] + 100_000 + 0.10 * B[url]`.
//
// STATUS: SCAFFOLD ONLY — thresholds below are TODO placeholders to be
// MEASURED pre-merge. Measurement is currently blocked by Task 19's
// Turbopack server-relative import failure in `@pagefind/default-ui`
// (`pnpm build` does not complete). See
// `.spec-workflow/specs/blog-enhanced/Implementation Logs/task-36-lighthouse-baseline.md`
// for the deferred-measurement plan + baseline SHA pin
// (`LIGHTHOUSE_BASELINE_SHA.txt` at repo root).
//
// Pagefind exclusion: there is intentionally NO `userFlow` here — Pagefind
// must NOT be loaded during the byte-weight audit. Manually verify the
// resource list excludes `pagefind/*` once measurement runs.
const TODO_BYTE_WEIGHT_PLACEHOLDER = 2_500_000; // TODO: replace per-URL after measurement.

const urls = [
  `${baseUrl}/profile`,
  `${baseUrl}/contact`,
  `${baseUrl}/blog`,
  `${baseUrl}/blog/fixture-code`,
  `${baseUrl}/blog/fixture-toc`,
  `${baseUrl}/blog/tags/fixture`,
  `${baseUrl}/blog/categories/fixture`,
];

module.exports = {
  ci: {
    collect: {
      url: urls,
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
      },
    },
    assert: {
      // @lhci/cli rejects mixing top-level `assertions` with `assertMatrix`
      // ("Cannot use assertMatrix with other options"). Fold the global
      // category min-score gates into EACH per-URL matrix entry so they
      // apply across all audited routes alongside `total-byte-weight`.
      // Per blog-core spec Task 21 / r3 Attack Surface 6 (≥0.9 hard errors)
      // and Req 10.5/10.6 (per-URL byte-weight).
      //
      // Fixture-* draft posts carry <meta name="robots" content="noindex">
      // by design (blog-enhanced Task 22 + Req 7.4), so Lighthouse's SEO
      // "Page is not indexed" audit pins the SEO score below 0.9 on those
      // routes — a true positive that does not apply to deliberately
      // noindex fixture surfaces. Downgrade SEO to "warn" only for those
      // URLs; production routes (/profile, /contact, /blog) still gate
      // at ≥0.9 hard.
      assertMatrix: urls.map((url) => {
        const isFixturePost = /\/blog\/fixture-/.test(url);
        // Anchor with `$` so `/blog` doesn't accidentally substring-match
        // `/blog/fixture-code` (a single URL would otherwise pick up
        // assertions from multiple matrix entries).
        return {
          matchingUrlPattern: url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
          assertions: {
            "categories:performance": ["error", { minScore: 0.9 }],
            "categories:accessibility": ["error", { minScore: 0.9 }],
            "categories:best-practices": ["error", { minScore: 0.9 }],
            "categories:seo": [isFixturePost ? "warn" : "error", { minScore: 0.9 }],
            // TODO(task-36): replace placeholder with measured value once
            // real-world byte budgets are pinned per URL.
            "total-byte-weight": ["error", { maxNumericValue: TODO_BYTE_WEIGHT_PLACEHOLDER }],
          },
        };
      }),
    },
    upload: {
      target: "temporary-public-storage",
      githubStatusContextSuffix: "/profile-contact",
    },
  },
};
