import type { Metadata } from "next";

import { pages } from "#site/content";

import { ReadingList } from "@/components/now/reading-list";
import { MDXContent } from "@/components/shared/mdx-content";
import { SectionKicker } from "@/components/shared/section-kicker";
import { formatContentDate } from "@/lib/format-date";
import { getCurrentlyReading } from "@/lib/reading";

// Velite's pages schema requires content/pages/now.mdx (task 8). If that
// entry is ever removed or renamed, fail loudly at module load rather than
// letting generateMetadata and the page component disagree on whether the
// route should render. Also require `updated` so the build fails explicitly
// if the frontmatter field is ever dropped.
function getNowPage() {
  const entry = pages.find((page) => page.slug === "now");
  if (!entry) {
    throw new Error("Missing Velite entry for 'now' (expected content/pages/now.mdx)");
  }
  if (!entry.updated) {
    throw new Error("Velite entry for 'now' is missing required frontmatter field: updated");
  }
  return entry as typeof entry & { updated: string };
}

const nowPage = getNowPage();

export function generateMetadata(): Metadata {
  return {
    title: nowPage.title,
    description: nowPage.description,
    robots: { index: true },
  };
}

export default function NowPage() {
  const { datetime, display } = formatContentDate(nowPage.updated);
  const currentlyReading = getCurrentlyReading();
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <SectionKicker label="now" />
      <h1 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">{nowPage.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated <time dateTime={datetime}>{display}</time>
      </p>
      <div className="prose dark:prose-invert max-w-measure mt-6">
        <MDXContent code={nowPage.body} />
      </div>
      {currentlyReading.length > 0 ? (
        <section className="mt-12" aria-labelledby="reading-heading">
          <h2 id="reading-heading" className="font-display text-2xl tracking-tight">
            Reading
          </h2>
          <ReadingList entries={currentlyReading} />
        </section>
      ) : null}
    </article>
  );
}
