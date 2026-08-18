import type { Metadata } from "next";

import { pages } from "#site/content";

import { MDXContent } from "@/components/shared/mdx-content";
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
 * Prose lives in content/pages/newsletter-welcome.mdx. It is deliberately
 * shorter than the email's: whoever reads this has just clicked a confirmation
 * link and wants to be told it worked, not re-sold.
 *
 * NOINDEX, and absent from src/app/sitemap.ts on purpose. It is a
 * post-conversion destination reached only from an email link; in search
 * results it would be a dead end for anyone who has not just subscribed.
 */
function getWelcomePage() {
  const entry = pages.find((page) => page.slug === "newsletter-welcome");
  if (!entry) {
    throw new Error(
      "Missing Velite entry for 'newsletter-welcome' (expected content/pages/newsletter-welcome.mdx)",
    );
  }
  return entry;
}

const welcomePage = getWelcomePage();

export function generateMetadata(): Metadata {
  return {
    title: welcomePage.title,
    description: welcomePage.description,
    robots: { index: false, follow: true },
  };
}

export default function NewsletterWelcomePage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <SectionKicker label="newsletter" />
      <h1 className="font-display mt-4 text-4xl sm:text-5xl">{welcomePage.title}</h1>

      {/* The closing unsubscribe note is an aside, not part of the welcome, so
          it stays de-emphasised. Targeting the last paragraph keeps that true
          however many paragraphs the MDX grows to. */}
      <div className="prose prose-lg dark:prose-invert max-w-measure mt-8 [&>p:last-child]:text-base [&>p:last-child]:text-muted-foreground">
        <MDXContent code={welcomePage.body} />
      </div>
    </article>
  );
}
