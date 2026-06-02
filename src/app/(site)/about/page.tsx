import type { Metadata } from "next";

import { pages } from "#site/content";

import { MDXContent } from "@/components/shared/mdx-content";

// Velite's pages schema requires content/pages/about.mdx (task 7). If that
// entry is ever removed or renamed, fail loudly at module load rather than
// letting generateMetadata and the page component disagree on whether the
// route should render.
function getAboutPage() {
  const entry = pages.find((page) => page.slug === "about");
  if (!entry) {
    throw new Error("Missing Velite entry for 'about' (expected content/pages/about.mdx)");
  }
  return entry;
}

const aboutPage = getAboutPage();

export function generateMetadata(): Metadata {
  return {
    title: aboutPage.title,
    description: aboutPage.description,
    robots: { index: true },
  };
}

export default function AboutPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{aboutPage.title}</h1>
      <div className="mt-6 text-base leading-relaxed text-foreground">
        <MDXContent code={aboutPage.body} />
      </div>
    </article>
  );
}
