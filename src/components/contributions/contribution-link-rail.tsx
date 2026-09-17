import { NewTabHint } from "@/components/shared/new-tab-hint";
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
    if (host === "github.com") return "View on GitHub";
    if (host === "gitlab.com") return "View on GitLab";
    return "Repository";
  } catch {
    return "Repository";
  }
}

/** Deep-link the repo home straight to its rendered README, on forges that anchor it. */
function repoHref(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "github.com") return `${url}#readme`;
    return url;
  } catch {
    return url;
  }
}

export function ContributionLinkRail({ links, labelledBy, repoUrl }: ContributionLinkRailProps) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="contrib-link-rail">
      {repoUrl ? (
        <a href={repoHref(repoUrl)} target="_blank" rel="noopener">
          {repoLinkLabel(repoUrl)}
          <NewTabHint />
        </a>
      ) : null}
      {links.map((link) => (
        <a key={link.url} href={link.url} target="_blank" rel="noopener">
          {link.label ?? DEFAULT_LABELS[link.kind]}
          <NewTabHint />
        </a>
      ))}
    </div>
  );
}
