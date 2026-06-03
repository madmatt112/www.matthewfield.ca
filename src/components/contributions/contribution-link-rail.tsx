import type { ContributionLink } from "@/lib/contributions";

export type ContributionLinkRailProps = {
  links: ContributionLink[];
  labelledBy: string;
};

const DEFAULT_LABELS: Record<ContributionLink["kind"], string> = {
  pr: "Pull request",
  commit: "Commit",
  issue: "Issue",
  release: "Release notes",
  writeup: "Write-up",
  discussion: "Discussion",
};

export function ContributionLinkRail({ links, labelledBy }: ContributionLinkRailProps) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="contrib-link-rail">
      {links.map((link) => (
        <a key={link.url} href={link.url} rel="noopener">
          {link.label ?? DEFAULT_LABELS[link.kind]}
        </a>
      ))}
    </div>
  );
}
