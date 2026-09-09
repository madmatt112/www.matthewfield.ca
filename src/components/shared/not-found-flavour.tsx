"use client";

import { useEffect, useState } from "react";
import Image, { type StaticImageData } from "next/image";

import beanie from "@/assets/not-found/beanie.jpg";
import cat from "@/assets/not-found/cat.jpg";
import squash from "@/assets/not-found/squash.jpg";

// One of three photos, picked on the client after mount so the server-rendered
// 404 (which is prerendered once) and the first client render agree.
const FLAVOURS: { src: StaticImageData; alt: string }[] = [
  { src: cat, alt: "Matthew looking up at a cat standing on his head." },
  { src: squash, alt: "Matthew hugging a large squash with a face drawn on it." },
  {
    src: beanie,
    alt: "Matthew in a toque, unimpressed, with a small child facing the bushes behind him.",
  },
];

export function NotFoundFlavour() {
  const [index, setIndex] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: the pick must happen after hydration so the prerendered 404 and the first client render match
    setIndex(Math.floor(Math.random() * FLAVOURS.length));
  }, []);
  // Reserve the box before the pick lands so the text column does not jump.
  return (
    <figure className="m-0 aspect-[5/6] w-[220px] justify-self-center overflow-hidden rounded-2xl bg-muted sm:w-[300px]">
      {index !== null && (
        <Image
          src={FLAVOURS[index].src}
          alt={FLAVOURS[index].alt}
          width={300}
          height={360}
          sizes="(min-width: 640px) 300px, 220px"
          className="h-full w-full object-cover"
          priority
        />
      )}
    </figure>
  );
}
