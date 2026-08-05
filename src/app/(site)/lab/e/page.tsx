import type { Metadata } from "next";

import { profile } from "#site/content";

import { NewTabHint } from "@/components/shared/new-tab-hint";

import { KIND_LABEL, latestStream } from "../_shared/data";
import { PathIndex } from "../_shared/path-index";
import { BrandLink, ContactStrip, LabHero, LabPage, LabSection, StreamRow } from "../_shared/parts";

export const metadata: Metadata = {
  title: "Mockup E — A + D",
  robots: { index: false, follow: false },
};

/**
 * Variant E — A's structure with D's path-index for wayfinding.
 *
 * A's ordering (say who you are, show the work, then help people navigate) with
 * D's route listing replacing A's plain text row of section links, so the
 * sections carry real counts instead of only names.
 */
export default function MockupE() {
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
            /* Inline in a sentence: permanent underline, not hover-only — colour
               alone against surrounding muted text fails WCAG 1.4.1. */
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

      <LabSection kicker="index" heading="Index" headingHidden>
        <PathIndex />
      </LabSection>

      <ContactStrip />
    </LabPage>
  );
}
