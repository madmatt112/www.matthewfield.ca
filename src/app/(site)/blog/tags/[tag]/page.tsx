import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TaxonomyList } from "@/components/blog/taxonomy-list";
import { getAllTags, getPostsByTag } from "@/lib/blog-taxonomy";

export const dynamic = "force-static";
export const dynamicParams = false;

type RouteParams = { tag: string };

export function generateStaticParams(): RouteParams[] {
  return getAllTags().map((tag) => ({ tag }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { tag } = await params;
  return {
    title: `Posts tagged ${tag}`,
    description: `Blog posts tagged ${tag} on matthewfield.ca`,
    alternates: { canonical: `/blog/tags/${tag}` },
  };
}

export default async function TagPage({ params }: { params: Promise<RouteParams> }) {
  const { tag } = await params;
  const posts = getPostsByTag(tag);
  if (posts.length === 0) notFound();
  return <TaxonomyList kind="tag" value={tag} posts={posts} />;
}
