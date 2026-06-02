import type { Metadata } from "next";

import { pages } from "#site/content";

import { MDXContent } from "@/components/shared/mdx-content";
import { formatContentDate } from "@/lib/format-date";

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
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{nowPage.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated <time dateTime={datetime}>{display}</time>
      </p>
      <div className="mt-6 text-base leading-relaxed text-foreground">
        <MDXContent code={nowPage.body} />
      </div>
    </article>
  );
}
