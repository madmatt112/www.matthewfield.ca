import type { Metadata } from "next";

import { pages } from "#site/content";

import { MDXContent } from "@/components/shared/mdx-content";
import { NewTabHint } from "@/components/shared/new-tab-hint";
import { NewsletterSignup } from "@/components/shared/newsletter-signup";
import { SectionKicker } from "@/components/shared/section-kicker";
import { BUTTONDOWN_REFERRAL_URL } from "@/lib/newsletter";

/**
 * Prose lives in content/pages/newsletter.mdx so copy can be edited without
 * touching JSX. This component owns only the parts that are not prose: the
 * signup form and the Buttondown credit, whose URL is a code constant.
 *
 * Copy follows the voice reference in the Eden "North star" doc (Brand HQ
 * board), which pins Matthew's hand-written Buttondown vetting answers as the
 * source for bios, about pages, and positioning. The description frontmatter
 * is verbatim from it. Rewrite through the /human-prose skill, not ad hoc.
 */
function getNewsletterPage() {
  const entry = pages.find((page) => page.slug === "newsletter");
  if (!entry) {
    throw new Error(
      "Missing Velite entry for 'newsletter' (expected content/pages/newsletter.mdx)",
    );
  }
  return entry;
}

const newsletterPage = getNewsletterPage();

export function generateMetadata(): Metadata {
  return {
    title: newsletterPage.title,
    description: newsletterPage.description,
    robots: { index: true },
  };
}

export default function NewsletterPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <SectionKicker label="newsletter" />
      <h1 className="font-display mt-4 text-4xl sm:text-5xl">{newsletterPage.title}</h1>
      <p className="mt-6 max-w-prose text-lg text-muted-foreground">{newsletterPage.description}</p>

      {/* The "What you get" list was muted in the original markup; prose
          would otherwise promote it to full foreground. */}
      <div className="prose dark:prose-invert max-w-measure mt-10 [&_ul]:text-muted-foreground">
        <MDXContent code={newsletterPage.body} />
      </div>

      <div className="mt-12">
        <NewsletterSignup
          id="newsletter-page"
          heading="Subscribe"
          blurb="Posts land in your inbox when they're written; I won't pad content or grind out filler to hit a schedule."
        />
      </div>

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
