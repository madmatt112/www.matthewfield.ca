/**
 * Deployed-commit metadata for the unobtrusive build stamp shown in the footer
 * (site-wide) and on /colophon.
 *
 * The SHA is read from the build environment, never committed: Vercel's git
 * integration sets `VERCEL_GIT_COMMIT_SHA` on native deploys, while the CI
 * `vercel build` path runs inside GitHub Actions where `GITHUB_SHA` is set
 * instead. Empty strings count as absent (`||`, not `??`). Local dev has
 * neither, so this returns `null` and nothing renders.
 *
 * Call only from server components: the value is inlined into the static HTML
 * at build time and is never exposed as a client-side env var.
 */
const REPO = "madmatt112/www.matthewfield.ca";

export interface BuildInfo {
  /** First 7 characters of the deployed commit SHA. */
  shortSha: string;
  /** Canonical GitHub URL for the deployed commit. */
  commitUrl: string;
}

export function getBuildInfo(): BuildInfo | null {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA;
  if (!sha) return null;
  return {
    shortSha: sha.slice(0, 7),
    commitUrl: `https://github.com/${REPO}/commit/${sha}`,
  };
}
