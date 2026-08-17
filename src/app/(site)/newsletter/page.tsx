import type { Metadata } from "next";
import Link from "next/link";

import { NewTabHint } from "@/components/shared/new-tab-hint";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";
import { SectionKicker } from "@/components/shared/section-kicker";
import { BUTTONDOWN_REFERRAL_URL } from "@/lib/newsletter";

/**
 * Copy here follows the voice reference in the Eden "North star" doc (Brand HQ
 * board), which pins Matthew's hand-written Buttondown vetting answers as the
 * source for bios, about pages, and positioning. The tagline below is verbatim
 * from it. Rewrite through the /human-prose skill, not ad hoc.
 */
const title = "Field Notes";
const description =
  "A former tech 9-to-5-er's journey through the dark teatime of the soul to the sustainable future of work.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    robots: { index: true },
  };
}

export default function NewsletterPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <SectionKicker label="newsletter" />
      <h1 className="font-display mt-4 text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-6 max-w-prose text-lg text-muted-foreground">{description}</p>

      <div className="mt-10 max-w-prose space-y-4">
        <p>
          I was laid off in January. Since then I&rsquo;ve been building software, helping local
          non-profits and small businesses untangle their technology, day-trading options, and
          writing about all of it. I&rsquo;ve given myself until February to make self-employment
          actually pay.
        </p>
        <p>
          Field Notes is that attempt, sent while the ending is still in doubt. You get what worked
          and what didn&rsquo;t, close enough to the event that I can&rsquo;t tidy it up in
          hindsight.
        </p>
      </div>

      <div className="mt-10">
        <NewsletterSignup
          id="newsletter-page"
          heading="Subscribe"
          blurb="Essays land in your inbox when they're written. No schedule to pad out."
        />
      </div>

      <section aria-labelledby="what-you-get" className="mt-16">
        <h2 id="what-you-get" className="font-display text-3xl">
          What you get
        </h2>
        <ul className="mt-4 flex flex-col gap-3 text-muted-foreground">
          <li>
            Essays on building and selling small software, working for yourself, and what a decade
            of platform engineering turns out to be good for once you leave the job.
          </li>
          <li>
            The other interests, because they&rsquo;re the same interest. I&rsquo;m a classical
            musician and a producer; I trade options. What connects them is connecting: people to
            ideas, systems to systems.
          </li>
          <li>
            No schedule. Two in a month, then nothing for six weeks. I&rsquo;d rather skip than pad.
          </li>
          <li>
            Everything is published on{" "}
            <Link href="/blog" className="underline underline-offset-4">
              the blog
            </Link>{" "}
            first. The email just means you don&rsquo;t have to check.
          </li>
          <li>One click unsubscribes, and your address goes nowhere else.</li>
        </ul>
      </section>

      <p className="mt-12 text-sm text-muted-foreground">
        Delivered with{" "}
        <a
          href={BUTTONDOWN_REFERRAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          Buttondown
          <NewTabHint />
        </a>
        , an independent newsletter tool.
      </p>
    </article>
  );
}
