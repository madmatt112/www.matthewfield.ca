import { ContributionLinkRail } from "@/components/contributions/contribution-link-rail";
import { formatContributionDate, type Contribution } from "@/lib/contributions";

export type ContributionCardProps = {
  contribution: Contribution;
  index: number;
};

export function ContributionCard({ contribution, index }: ContributionCardProps) {
  const headingId = `contrib-${index}`;
  const { repo, title, description, date, language, links } = contribution;
  return (
    <article className="contribution-card">
      <h2 id={headingId}>{title}</h2>
      <code className="contrib-repo">{repo}</code>
      <p>{description}</p>
      <time dateTime={date}>{formatContributionDate(date).display}</time>
      {language ? <span className="contrib-language">{language}</span> : null}
      <ContributionLinkRail links={links} labelledBy={headingId} />
    </article>
  );
}
