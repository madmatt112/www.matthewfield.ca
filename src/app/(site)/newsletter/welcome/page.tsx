import type { Metadata } from "next";
import Link from "next/link";

import { SectionKicker } from "@/components/shared/section-kicker";

/**
 * Landing page for Buttondown's "After confirming" redirect
 * (Settings → Subscribing → Redirects → After confirming).
 *
 * WHY THIS PAGE EXISTS: the welcome *email* is a transactional email in
 * Buttondown's model, and editing it needs the Standard plan. On the free plan
 * the only lever is that redirect, so the site does the job the email cannot —
 * which also suits the front-door decision better than an email would. The
 * email copy is still written and waiting in email/buttondown/welcome-email.md
 * for whenever the plan allows it.
 *
 * Copy is deliberately shorter than the email's: whoever reads this has just
 * clicked a confirmation link and wants to be told it worked, not re-sold.
 *
 * NOINDEX, and absent from src/app/sitemap.ts on purpose. It is a
 * post-conversion destination reached only from an email link; in search
 * results it would be a dead end for anyone who has not just subscribed.
 */
const title = "You're in";
const description = "Your subscription to Field Notes is confirmed.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    robots: { index: false, follow: true },
  };
}

export default function NewsletterWelcomePage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <SectionKicker label="newsletter" />
      <h1 className="font-display mt-4 text-4xl sm:text-5xl">{title}</h1>

      <div className="mt-8 max-w-prose space-y-4 text-lg">
        <p>
          Your email is confirmed. Field Notes lands when there&rsquo;s something worth sending,
          which might not be this week. Two in a month, then nothing for six weeks. I&rsquo;d rather
          skip than pad.
        </p>
        <p>
          It&rsquo;s essays about building software, working for myself, and the rest of it.{" "}
          <Link href="/newsletter" className="underline underline-offset-4">
            The longer version
          </Link>{" "}
          is there if you subscribed from a footer and never read it.
        </p>
        <p>
          Everything I send is published on{" "}
          <Link href="/blog" className="underline underline-offset-4">
            the blog
          </Link>{" "}
          first, so there&rsquo;s plenty to read in the meantime.
        </p>
        <p className="text-base text-muted-foreground">
          Changed your mind already? Every email carries an unsubscribe link at the bottom. One
          click, no exit survey.
        </p>
      </div>
    </article>
  );
}
