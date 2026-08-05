import { profile } from "#site/content";

import { NewTabHint } from "@/components/shared/new-tab-hint";
import { SectionKicker } from "@/components/shared/section-kicker";
import { siteConfig } from "@/config/site";

/**
 * The landing hero — a priority identity surface (visual-design R8.3): brand
 * `/ kicker`, serif display name, hairline brand rule, then a lead that says
 * what Matthew does instead of naming a job category.
 */
export function HomeHero() {
  return (
    <section className="flex flex-col items-start gap-6">
      <SectionKicker label="home" />
      <h1 className="font-display text-4xl tracking-tight text-balance sm:text-5xl md:text-6xl">
        {siteConfig.name}
      </h1>
      <hr className="h-px w-16 border-0 bg-brand" />
      <p className="max-w-measure text-lg text-foreground">{siteConfig.intro}</p>
      <p className="max-w-measure text-sm text-muted-foreground">
        {profile.location} · {profile.availability}{" "}
        <a
          href={profile.availabilityLinkHref}
          target="_blank"
          rel="noopener"
          /*
           * Inline inside a sentence, so the underline is permanent rather than
           * hover-only: against the surrounding muted text the brand colour alone
           * is a 1.05:1 difference, which fails WCAG 1.4.1 (axe link-in-text-block).
           */
          className="text-brand underline underline-offset-4"
        >
          {profile.availabilityLinkLabel}
          <NewTabHint />
        </a>
      </p>
    </section>
  );
}
