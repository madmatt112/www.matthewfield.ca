#!/usr/bin/env node
/**
 * verify-deploy — Req 0.3 v4 operator-side verification gate.
 *
 * Usage:
 *   node scripts/verify-deploy.mjs https://my-deploy.vercel.app
 *
 * Runs three checks against the given deploy URL in parallel:
 *   (a) GET /                            → 200
 *   (b) GET /pagefind/pagefind-entry.json → 200 + valid JSON
 *   (c) GET /blog/fixture-search         → 200
 *
 * Uses Promise.allSettled so every check is reported even if one rejects.
 * Exits 0 on full pass, non-zero on any failure with a diagnostic naming
 * the failing URL and status code.
 *
 * The MATTHEWFIELD-SEARCH-SMOKE phrase check via the search UI is a manual
 * step performed by the operator (per design).
 */

const TAG = "[verify-deploy]";

const rawUrl = process.argv[2];
if (process.argv.length !== 3 || !rawUrl || !rawUrl.startsWith("https://")) {
  console.error("usage: node scripts/verify-deploy.mjs <https://deploy-url>");
  process.exit(2);
}

const deployUrl = rawUrl.replace(/\/+$/, "");

/**
 * Perform a single check. Resolves with a result record rather than throwing,
 * so Promise.allSettled aggregation stays simple.
 *
 * @param {string} path
 * @param {{ expectStatus?: number, parseJson?: boolean }} [opts]
 */
async function check(path, { expectStatus = 200, parseJson = false } = {}) {
  const url = `${deployUrl}${path}`;
  try {
    const res = await fetch(url);
    if (res.status !== expectStatus) {
      return {
        ok: false,
        url,
        message: `${url} → ${res.status} (expected ${expectStatus})`,
      };
    }
    if (parseJson) {
      try {
        const body = await res.json();
        if (!body || typeof body !== "object") {
          return { ok: false, url, message: `${url} → not a JSON object` };
        }
      } catch (err) {
        return {
          ok: false,
          url,
          message: `${url} → invalid JSON: ${err.message}`,
        };
      }
    }
    return { ok: true, url };
  } catch (err) {
    return { ok: false, url, message: `${url} → fetch error: ${err.message}` };
  }
}

const settled = await Promise.allSettled([
  check("/"),
  check("/pagefind/pagefind-entry.json", { parseJson: true }),
  check("/blog/fixture-search"),
]);

const failures = [];
for (const s of settled) {
  if (s.status === "rejected") {
    failures.push(`unexpected rejection: ${s.reason}`);
  } else if (!s.value.ok) {
    failures.push(s.value.message);
  }
}

if (failures.length > 0) {
  for (const msg of failures) console.error(`${TAG} ${msg}`);
  process.exit(1);
}

console.log(`${TAG} ${deployUrl} verification passed (3/3 checks).`);
