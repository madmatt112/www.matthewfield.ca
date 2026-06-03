// playground/manifest.ts — project root, server/build-import-safe (NO "use client", NO React runtime)
import type { ComponentType } from "react"; // type-only import; erased at build (Req 1.3)

export type PlaygroundFrameHint = { aspectRatio: string } | { height: string };

export type PlaygroundItem = {
  slug: string; // URL-safe kebab-case, unique across the manifest
  title: string;
  description: string;
  tags: string[];
  iframeIsolated: boolean;
  load: () => Promise<{ default: ComponentType }>; // lazy thunk: () => import("./[slug]")
  frame?: PlaygroundFrameHint; // iframe sizing hint (Req 4.4); ignored for same-page items
};

export const playgroundItems: PlaygroundItem[] = [
  {
    slug: "scribble-pad",
    title: "Scribble Pad",
    description:
      "A tiny canvas drawing toy with a clashing palette and serif type — proof the reset isolates same-page items.",
    tags: ["canvas", "drawing", "interactive"],
    iframeIsolated: false,
    load: () => import("./scribble-pad"),
  },
  {
    slug: "starfield",
    title: "Starfield",
    description:
      "A full-bleed, position:fixed starfield animation that needs its own viewport — proof of the iframe path.",
    tags: ["canvas", "animation", "full-bleed"],
    iframeIsolated: true,
    load: () => import("./starfield"),
    frame: { aspectRatio: "16 / 10" },
  },
];

// Pure partition helpers (F3) — the route generateStaticParams AND the Vitest integrity test
// import these, so the test never imports a route page.tsx.
export const landingParams = (items: PlaygroundItem[]) => items.map((it) => ({ slug: it.slug }));
export const embedParams = (items: PlaygroundItem[]) =>
  items.filter((it) => it.iframeIsolated).map((it) => ({ slug: it.slug }));
