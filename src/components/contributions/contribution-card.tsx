import { ContributionLinkRail } from "@/components/contributions/contribution-link-rail";
import { formatContributionDate, type Contribution } from "@/lib/contributions";

export type ContributionCardProps = {
  contribution: Contribution;
  index: number;
};

export function ContributionCard({ contribution, index }: ContributionCardProps) {
  const headingId = `contrib-${index}`;
  const { repo, repoUrl, title, description, date, language, links } = contribution;
  return (
    <article className="contribution-card">
      <div className="contribution-card__head">
        <code className="contrib-repo">{repo}</code>
        <h2 id={headingId} className="contribution-card__title">
          {title}
        </h2>
      </div>
      <p className="contribution-card__desc">{description}</p>
      <div className="contribution-card__meta">
        <time dateTime={date}>{formatContributionDate(date).display}</time>
        {language ? <span className="contrib-language">{language}</span> : null}
      </div>
      <ContributionLinkRail links={links} labelledBy={headingId} repoUrl={repoUrl} />
    </article>
  );
}
