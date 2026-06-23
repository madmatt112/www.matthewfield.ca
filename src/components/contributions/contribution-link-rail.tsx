import type { ContributionLink } from "@/lib/contributions";

export type ContributionLinkRailProps = {
  links: ContributionLink[];
  labelledBy: string;
  repoUrl?: string;
};

const DEFAULT_LABELS: Record<ContributionLink["kind"], string> = {
  pr: "Pull request",
  commit: "Commit",
  issue: "Issue",
  release: "Release notes",
  writeup: "Write-up",
  discussion: "Discussion",
};

/** Label the repo home link by its forge, falling back to a neutral term. */
function repoLinkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "github.com") return "GitHub";
    if (host === "gitlab.com") return "GitLab";
    return "Repository";
  } catch {
    return "Repository";
  }
}

export function ContributionLinkRail({ links, labelledBy, repoUrl }: ContributionLinkRailProps) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="contrib-link-rail">
      {repoUrl ? (
        <a href={repoUrl} rel="noopener">
          {repoLinkLabel(repoUrl)}
        </a>
      ) : null}
      {links.map((link) => (
        <a key={link.url} href={link.url} rel="noopener">
          {link.label ?? DEFAULT_LABELS[link.kind]}
        </a>
      ))}
    </div>
  );
}
