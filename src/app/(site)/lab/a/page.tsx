import type { Metadata } from "next";

import { profile } from "#site/content";

import { NewTabHint } from "@/components/shared/new-tab-hint";

import { KIND_LABEL, latestStream } from "../_shared/data";
import {
  BrandLink,
  ContactStrip,
  LabHero,
  LabPage,
  LabSection,
  SectionIndexRow,
  StreamRow,
} from "../_shared/parts";

export const metadata: Metadata = {
  title: "Mockup A — Sentence + Latest",
  robots: { index: false, follow: false },
};

/**
 * Variant A — "Sentence + Latest".
 *
 * The hero says something instead of naming a category, and the page leads with
 * actual work rather than links to sections. Sections demote to a text row.
 */
export default function MockupA() {
  const stream = latestStream(5);
  return (
    <LabPage>
      <LabHero>
        <p className="max-w-measure text-lg text-foreground">
          I&rsquo;m a platform and infrastructure engineer with a decade of experience building
          reliable distributed systems and developer tooling. Mostly Kubernetes and the platforms
          developers build on top of it. I write good docs, and I care about open source.
        </p>
        <p className="max-w-measure text-sm text-muted-foreground">
          {profile.location} · {profile.availability}{" "}
          <a
            href={profile.availabilityLinkHref}
            target="_blank"
            rel="noopener"
            /* Inline in a sentence: underline is permanent, not hover-only —
               colour alone against surrounding muted text fails WCAG 1.4.1. */
            className="text-brand underline underline-offset-4"
          >
            {profile.availabilityLinkLabel}
            <NewTabHint />
          </a>
        </p>
      </LabHero>

      <LabSection kicker="latest" heading="Recent work">
        <ul className="divide-y divide-border">
          {stream.map((item) => (
            <StreamRow
              key={item.href + item.title}
              kind={KIND_LABEL[item.kind]}
              title={item.title}
              description={item.description}
              href={item.href}
              date={item.date}
            />
          ))}
        </ul>
        <p className="mt-6 text-sm">
          <BrandLink href="/blog">All writing</BrandLink>
        </p>
      </LabSection>

      <LabSection kicker="sections" heading="Sections" headingHidden>
        <SectionIndexRow />
      </LabSection>

      <ContactStrip />
    </LabPage>
  );
}
