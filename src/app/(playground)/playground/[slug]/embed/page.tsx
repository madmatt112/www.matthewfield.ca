import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { playgroundItems, embedParams } from "#playground/manifest";

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return embedParams(playgroundItems); // iframe-only slugs (Req 4.5)
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const it = playgroundItems.find((i) => i.slug === slug);
  return { title: it?.title, robots: { index: false } }; // noindex, own <title> (Req 4.6, 8.4)
}

export default async function ItemEmbed({ params }: { params: Params }) {
  const { slug } = await params;
  const it = playgroundItems.find((i) => i.slug === slug);
  if (!it || !it.iframeIsolated) notFound(); // a same-page slug's /embed cleanly 404s (Req 4.5)
  const Item = dynamic(it.load);
  return <Item />; // full-bleed, NOT wrapped in PlaygroundFrame (Req 4.3)
}
