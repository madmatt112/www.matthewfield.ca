import type { Metadata } from "next";

import { pages } from "#site/content";

import { MDXContent } from "@/components/shared/mdx-content";
import { SectionKicker } from "@/components/shared/section-kicker";
import { getBuildInfo } from "@/lib/build-info";

// Velite's pages schema requires content/pages/colophon.mdx. If that
// entry is ever removed or renamed, fail loudly at module load rather than
// letting generateMetadata and the page component disagree on whether the
// route should render.
function getColophonPage() {
  const entry = pages.find((page) => page.slug === "colophon");
  if (!entry) {
    throw new Error("Missing Velite entry for 'colophon' (expected content/pages/colophon.mdx)");
  }
  return entry;
}

const colophonPage = getColophonPage();

export function generateMetadata(): Metadata {
  return {
    title: colophonPage.title,
    description: colophonPage.description,
    robots: { index: true },
  };
}

export default function ColophonPage() {
  const build = getBuildInfo();
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <SectionKicker label="colophon" />
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        {colophonPage.title}
      </h1>
      <div className="prose dark:prose-invert max-w-measure mt-6">
        <MDXContent code={colophonPage.body} />
      </div>
      {build && (
        <p className="mt-8 font-mono text-xs text-muted-foreground">
          This build:{" "}
          <a
            href={build.commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline"
          >
            {build.shortSha}
          </a>
        </p>
      )}
    </article>
  );
}
