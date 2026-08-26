import { notFound } from "next/navigation";

import { getPostBySlug, getPublishedPosts } from "@/lib/blog";
import { ogContentType, ogSize, renderArticleCard } from "@/lib/og-card";

// Per-post Open Graph image. Lives in the [slug] segment so it merges with
// the page's own `openGraph` block — a parent-level image is dropped as soon
// as a child segment defines `openGraph` without `images`.
export const dynamic = "force-static";
export const dynamicParams = false;

export const alt = "Post title card from matthewfield.ca";
export const size = ogSize;
export const contentType = ogContentType;

type RouteParams = { slug: string };

export function generateStaticParams(): RouteParams[] {
  return getPublishedPosts().map((p) => ({ slug: p.slug }));
}

export default async function PostOpenGraphImage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();
  return renderArticleCard({ section: "blog", title: post.title, date: post.date });
}
