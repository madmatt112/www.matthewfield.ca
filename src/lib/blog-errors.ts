export const VERCEL_ENV_VAR_NAME = "VERCEL_ENV";
export const VERCEL_FLAG_VAR_NAME = "VERCEL";
export const DRAFT_FLAG_VAR_NAME = "BLOG_INCLUDE_DRAFTS";

export const BLOG_DRAFT_LEAK_GUARD_MSG_PRODUCTION = `[blog-core] Draft posts are visible in a Vercel production build.
${VERCEL_FLAG_VAR_NAME}=1 + ${VERCEL_ENV_VAR_NAME}=production + ${DRAFT_FLAG_VAR_NAME}=1 must never coexist.
Fix on Vercel: remove the ${DRAFT_FLAG_VAR_NAME} environment variable from the Production scope (Project Settings → Environment Variables → scope: Production).
See Req 7.3 in .spec-workflow/specs/blog-core/requirements.md.`;

export const BLOG_DRAFT_LEAK_GUARD_MSG_PREVIEW = `[blog-core] Preview builds are running without drafts. Preview deploys are meant to showcase upcoming drafts.
${VERCEL_FLAG_VAR_NAME}=1 + ${VERCEL_ENV_VAR_NAME}=preview requires ${DRAFT_FLAG_VAR_NAME}=1.
Fix on Vercel: set ${DRAFT_FLAG_VAR_NAME}=1 on the Preview scope (Project Settings → Environment Variables → scope: Preview).
See Req 7.3 in .spec-workflow/specs/blog-core/requirements.md.`;

export function checkVercelDraftGuard(): { kind: "production" | "preview" } | null {
  const vercel = process.env[VERCEL_FLAG_VAR_NAME];
  const env = process.env[VERCEL_ENV_VAR_NAME];
  const drafts = process.env[DRAFT_FLAG_VAR_NAME];
  if (vercel !== "1") return null;
  if (env === "production" && drafts === "1") return { kind: "production" };
  if (env === "preview" && drafts !== "1") return { kind: "preview" };
  const isLooksLikeProd =
    drafts === "1" && env !== "production" && env !== "preview" && env !== "development";
  if (isLooksLikeProd) return { kind: "production" };
  return null;
}
