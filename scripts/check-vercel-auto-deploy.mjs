#!/usr/bin/env node
/**
 * check-vercel-auto-deploy — Req 0.3 v4 migration grace-period gate.
 *
 * Reads env vars:
 *   - VERCEL_TOKEN       : Bearer token for the Vercel API.
 *   - VERCEL_PROJECT_ID  : the Vercel project ID (prj_...).
 *   - MIGRATION_DEADLINE : ISO-8601 date string (e.g. "2026-06-01").
 *
 * Calls `GET https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID` with
 * the Bearer token and inspects whether the project still has a Git
 * integration linked (which is what drives Vercel's automatic "deploy on
 * push" behavior).
 *
 * --- Pinned auto-deploy field (v9 response shape assumption) ----------
 * Per Vercel API v9 documentation and observed responses, a GitHub-
 * connected project has a top-level `link` object on the project payload:
 *   {
 *     "link": {
 *       "type": "github",            // or "gitlab" / "bitbucket"
 *       "repo": "owner/name",
 *       "repoId": 1234567,
 *       "productionBranch": "main",
 *       "deployHooks": [...]
 *     },
 *     ...
 *   }
 * When the Git integration is DISCONNECTED in the Vercel dashboard,
 * the `link` field is absent (or null). Vercel has no per-toggle "auto
 * deploy on push" field in the v9 project response — the Git integration
 * being LINKED at all is the signal that pushes will auto-deploy.
 *
 * Therefore the pinned condition for "auto-deploys enabled" is:
 *     project.link && project.link.type
 *
 * If a future Vercel API revision introduces a finer-grained toggle
 * (e.g. a `disabled` flag inside `link`), extend the check below — the
 * current shape only supports the connected/disconnected binary.
 * ---------------------------------------------------------------------
 *
 * Three-state behavior:
 *   - MIGRATION_DEADLINE unset or NaN → exit 1 with remediation diagnostic.
 *   - now <= deadline AND auto-deploys enabled → ::warning:: + exit 0.
 *   - now >  deadline AND auto-deploys enabled → exit 1 with grace-expired
 *     diagnostic naming the deadline + dashboard remediation.
 *   - auto-deploys disabled → exit 0 (desired post-migration state).
 */

const TAG = "[check-vercel-auto-deploy]";

const { VERCEL_TOKEN, VERCEL_PROJECT_ID, MIGRATION_DEADLINE } = process.env;

const missing = [];
if (!VERCEL_TOKEN) {
  missing.push("VERCEL_TOKEN — set to a Vercel API token with read access to the project");
}
if (!VERCEL_PROJECT_ID) {
  missing.push("VERCEL_PROJECT_ID — set to the Vercel project ID (prj_...) for this site");
}
if (!MIGRATION_DEADLINE) {
  missing.push("MIGRATION_DEADLINE — set to an ISO-8601 date string, e.g. 2026-06-01");
}
if (missing.length > 0) {
  for (const m of missing) console.error(`${TAG} missing env var: ${m}`);
  process.exit(1);
}

const deadlineMs = Date.parse(MIGRATION_DEADLINE);
if (Number.isNaN(deadlineMs)) {
  console.error(
    `${TAG} MIGRATION_DEADLINE is not a valid ISO date: ${JSON.stringify(MIGRATION_DEADLINE)}. ` +
      `Set MIGRATION_DEADLINE to an ISO-8601 date string, e.g. 2026-06-01.`,
  );
  process.exit(1);
}

async function main() {
  const url = `https://api.vercel.com/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}`;

  let res;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    });
  } catch (err) {
    console.error(`${TAG} fetch error contacting Vercel API: ${err.message}`);
    process.exit(1);
  }

  if (res.status !== 200) {
    const body = await res.text().catch(() => "");
    console.error(
      `${TAG} Vercel API returned status ${res.status} for GET ${url}` +
        (body ? `\n${TAG} body: ${body.slice(0, 500)}` : ""),
    );
    process.exit(1);
  }

  let project;
  try {
    project = await res.json();
  } catch (err) {
    console.error(`${TAG} failed to parse Vercel API JSON: ${err.message}`);
    process.exit(1);
  }

  // Pinned check — see header comment block for v9 response shape rationale.
  const autoDeploysEnabled = Boolean(project?.link && project.link.type);

  if (!autoDeploysEnabled) {
    console.log(`${TAG} auto-deploys correctly disabled — post-migration state OK.`);
    process.exit(0);
  }

  const now = Date.now();
  const deadlineIso = new Date(deadlineMs).toISOString();
  const linkSummary = `${project.link.type}:${project.link.repo ?? "?"}`;

  if (now <= deadlineMs) {
    // State B — within grace period; warn but pass.
    console.log(
      `::warning::Vercel auto-deploys are still enabled (${linkSummary}). ` +
        `Migration grace period ends ${deadlineIso}. ` +
        `Before then, disconnect the Git integration in the Vercel dashboard ` +
        `(Project → Settings → Git → Disconnect) so CI is the sole deploy path.`,
    );
    process.exit(0);
  }

  // State C — grace period expired; fail.
  console.error(
    `${TAG} migration grace period expired (deadline ${deadlineIso}) but ` +
      `Vercel auto-deploys are still enabled (${linkSummary}). ` +
      `Operator must disconnect the Git integration in the Vercel dashboard ` +
      `(Project → Settings → Git → Disconnect), or extend MIGRATION_DEADLINE ` +
      `in repo Settings → Variables if the migration is intentionally delayed.`,
  );
  process.exit(1);
}

await main();
