import type { Metadata } from "next";
import Link from "next/link";

import { NewTabHint } from "@/components/shared/new-tab-hint";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";
import { SectionKicker } from "@/components/shared/section-kicker";
import { BUTTONDOWN_REFERRAL_URL } from "@/lib/newsletter";

const title = "Newsletter";
const description =
  "Occasional essays on platform engineering, infrastructure, and developer tooling — delivered by email.";

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
      <p className="mt-6 max-w-prose text-lg text-muted-foreground">
        I write about the parts of platform engineering that don&rsquo;t fit in a pull request — the
        decisions, the trade-offs, and the things that only look obvious afterwards.
      </p>

      <div className="mt-10">
        <NewsletterSignup
          id="newsletter-page"
          heading="Subscribe"
          blurb="Essays land in your inbox when they're written, not on a schedule I'd have to pad out to meet."
        />
      </div>

      <section aria-labelledby="what-to-expect" className="mt-16">
        <h2 id="what-to-expect" className="font-display text-3xl">
          What to expect
        </h2>
        <ul className="mt-4 flex flex-col gap-3 text-muted-foreground">
          <li>Essays first. Every issue is a piece of writing, not a roundup of links.</li>
          <li>
            No fixed cadence. You&rsquo;ll hear from me when there&rsquo;s something worth the
            interruption.
          </li>
          <li>
            Everything is also published on this site — the newsletter is a delivery mechanism, not
            a paywall. Start with the{" "}
            <Link href="/blog" className="underline underline-offset-4">
              blog
            </Link>
            .
          </li>
          <li>One click unsubscribes, and your address is never shared.</li>
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
