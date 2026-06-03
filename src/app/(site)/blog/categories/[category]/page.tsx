import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TaxonomyList } from "@/components/blog/taxonomy-list";
import { getAllCategories, getPostsByCategory } from "@/lib/blog-taxonomy";

export const dynamic = "force-static";
export const dynamicParams = false;

type RouteParams = { category: string };

export function generateStaticParams(): RouteParams[] {
  return getAllCategories().map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { category } = await params;
  return {
    title: `Posts in category ${category}`,
    description: `Blog posts in category ${category} on matthewfield.ca`,
    alternates: { canonical: `/blog/categories/${category}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<RouteParams> }) {
  const { category } = await params;
  const posts = getPostsByCategory(category);
  if (posts.length === 0) notFound();
  return <TaxonomyList kind="category" value={category} posts={posts} />;
}
