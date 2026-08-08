import { profile } from "#site/content";

// The professional summary is declared `s.string().optional()` in
// velite.config.ts on purpose: a required field would abort the profile
// collection parse on absence and velite would report only
// `no data resolved for 'profile' collection`, naming neither the file nor the
// field. Validation therefore lives here, and this module produces the ONLY
// error message for a missing or out-of-bounds summary. Same shape as
// getNowPage() in src/app/(site)/now/page.tsx: throw at module load so the
// build fails loudly rather than rendering an empty section or a PDF that
// opens with nothing.
const SUMMARY_MIN_LENGTH = 100;
const SUMMARY_MAX_LENGTH = 600;

export function getProfileSummary(): string {
  const summary = typeof profile.summary === "string" ? profile.summary.trim() : "";
  if (!summary) {
    throw new Error("content/profile.mdx is missing required frontmatter field: summary");
  }
  if (summary.length < SUMMARY_MIN_LENGTH) {
    throw new Error(
      `content/profile.mdx frontmatter field 'summary' is too short: ${summary.length} characters, minimum ${SUMMARY_MIN_LENGTH}`,
    );
  }
  if (summary.length > SUMMARY_MAX_LENGTH) {
    throw new Error(
      `content/profile.mdx frontmatter field 'summary' is too long: ${summary.length} characters, maximum ${SUMMARY_MAX_LENGTH}`,
    );
  }
  return summary;
}

export const profileSummary = getProfileSummary();
