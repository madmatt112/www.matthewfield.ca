import { notFound } from "next/navigation";

import { registry } from "../registry";

type RouteParams = { name: string };

export default async function ComponentPreviewPage({ params }: { params: Promise<RouteParams> }) {
  if (process.env.BLOG_INCLUDE_DRAFTS !== "1") notFound();

  const { name } = await params;
  const entry = registry[name];
  if (!entry) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Component Preview: {name}</h1>
      {entry.kind === "component" ? (
        <entry.component />
      ) : (
        <article dangerouslySetInnerHTML={{ __html: entry.html }} />
      )}
    </div>
  );
}
