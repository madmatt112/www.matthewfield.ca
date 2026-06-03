import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { landingParams, playgroundItems } from "#playground/manifest";

import PlaygroundFrame from "../../_components/playground-frame";

type Params = Promise<{ slug: string }>; // Next 16: params is async (matches blog/[slug])

// Hoist dynamic() out of render: each lazy component is created once at module
// init, not per-render (React Compiler: no components-during-render). Keyed by
// slug so the per-slug client item is still SSR'd + hydrated.
const itemComponents = new Map(playgroundItems.map((it) => [it.slug, dynamic(it.load)] as const));

export const dynamicParams = false; // unknown slug → 404 (Req 3.2)

export function generateStaticParams() {
  return landingParams(playgroundItems); // all slugs (Req 3.4)
}

function find(slug: string) {
  return playgroundItems.find((it) => it.slug === slug);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const it = find(slug);
  if (!it) return {};
  return { title: it.title, description: it.description, robots: { index: true } }; // Req 8.2
}

export default async function ItemLanding({ params }: { params: Params }) {
  const { slug } = await params;
  const it = find(slug);
  if (!it) notFound(); // defensive; dynamicParams=false already 404s unknown slugs

  if (it.iframeIsolated) {
    const style: React.CSSProperties =
      it.frame && "height" in it.frame
        ? { height: it.frame.height }
        : { aspectRatio: it.frame?.aspectRatio ?? "16 / 10" };
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <h1>{it.title}</h1>
        <p>{it.description}</p> {/* real indexable text (Req 4.1, 8.5) */}
        <iframe
          src={`/playground/${it.slug}/embed`}
          title={it.title}
          className="w-full"
          style={style}
        />
      </main>
    );
  }

  const Item = itemComponents.get(it.slug)!; // SSR'd + hydrated client item (varies by slug)
  return (
    <>
      <noscript>This experiment needs JavaScript.</noscript> {/* Req 3.5 */}
      <PlaygroundFrame>
        {/* eslint-disable-next-line react-hooks/static-components -- Item is a module-level-stable dynamic() component from itemComponents (created once at module init, constant per slug), so the rule's state-reset concern does not apply. */}
        <Item />
      </PlaygroundFrame>
    </>
  );
}
