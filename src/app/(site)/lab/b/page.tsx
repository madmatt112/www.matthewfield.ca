import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";

import { profile } from "#site/content";

import { formatContentDate } from "@/lib/format-date";
import { getBuildInfo } from "@/lib/build-info";
import { getCurrentlyReading } from "@/lib/reading";

import { realPosts, realProjects } from "../_shared/data";
import {
  BrandLink,
  ContactStrip,
  LabHero,
  LabPage,
  LabSection,
  MonoLabel,
  SectionIndexRow,
} from "../_shared/parts";

export const metadata: Metadata = {
  title: "Mockup B — Status readout",
  robots: { index: false, follow: false },
};

/** One key/value row of the readout. Mono key, sans value, hairline separated. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-4 sm:grid-cols-3 sm:gap-6">
      <dt className="sm:col-span-1">
        <MonoLabel>{label}</MonoLabel>
      </dt>
      <dd className="text-sm text-foreground sm:col-span-2">{children}</dd>
    </div>
  );
}

/**
 * Variant B — "Status readout".
 *
 * The homepage as a spec sheet for a person: the facts a recruiter wants, in the
 * flat hairline surface language the design system already uses. Availability
 * uses the `success` role paired with an icon and text, never colour alone
 * (visual-design R5.3 / R6.2).
 */
export default function MockupB() {
  const [newestPost] = realPosts();
  const [newestProject] = realProjects();
  const [currentBook] = getCurrentlyReading();
  const build = getBuildInfo();

  return (
    <LabPage>
      <LabHero>
        <p className="max-w-measure text-lg text-foreground">
          Platform and infrastructure engineer. A decade of building reliable distributed systems
          and the developer platforms that run on them.
        </p>
      </LabHero>

      <LabSection kicker="status" heading="Status" headingHidden>
        <dl className="divide-y divide-border rounded-lg border border-border">
          <Row label="available">
            <span className="inline-flex items-center gap-2 text-success">
              <CircleCheck aria-hidden="true" className="size-4" />
              <span>Open to senior platform / DevOps / SRE roles</span>
            </span>
            <span className="block text-muted-foreground">
              Consulting and contract via{" "}
              <a
                href={profile.availabilityLinkHref}
                target="_blank"
                rel="noopener"
                /* Inline in a sentence — permanent underline, see WCAG 1.4.1. */
                className="text-brand underline underline-offset-4"
              >
                {profile.availabilityLinkLabel}
              </a>
            </span>
          </Row>

          <Row label="based">{profile.location}</Row>

          <Row label="focus">
            Kubernetes platforms, developer tooling, and the docs that go with them
          </Row>

          {newestProject ? (
            <Row label="latest build">
              <BrandLink href={`/projects/${newestProject.slug}`}>{newestProject.title}</BrandLink>
              <span className="block text-muted-foreground">{newestProject.summary}</span>
            </Row>
          ) : null}

          {newestPost ? (
            <Row label="latest post">
              <BrandLink href={`/blog/${newestPost.slug}`}>{newestPost.title}</BrandLink>
              <span className="block text-muted-foreground">
                <time dateTime={formatContentDate(newestPost.date).datetime}>
                  {formatContentDate(newestPost.date).display}
                </time>
              </span>
            </Row>
          ) : null}

          {currentBook ? (
            <Row label="reading">
              {currentBook.title}
              <span className="block text-muted-foreground">{currentBook.author}</span>
            </Row>
          ) : null}

          <Row label="this site">
            Next.js on Vercel ·{" "}
            {build ? (
              <a
                href={build.commitUrl}
                target="_blank"
                rel="noopener"
                className="font-mono text-brand underline underline-offset-4"
              >
                {build.shortSha}
              </a>
            ) : (
              <span className="font-mono text-muted-foreground">local</span>
            )}{" "}
            ·{" "}
            <BrandLink href="/colophon" className="underline">
              colophon
            </BrandLink>
          </Row>
        </dl>
      </LabSection>

      <LabSection kicker="sections" heading="Sections" headingHidden>
        <SectionIndexRow />
      </LabSection>

      <ContactStrip />
    </LabPage>
  );
}
