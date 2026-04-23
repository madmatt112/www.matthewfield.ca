import type { Metadata } from "next";
import Image from "next/image";

import { HeroCard } from "@/components/shared/hero-card";
import { siteConfig } from "@/config/site";

export function generateMetadata(): Metadata {
  return {
    title: "Home",
  };
}

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-16">
      <section className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-10">
        <Image
          src="/images/profile.jpg"
          alt={`Portrait of ${siteConfig.name}`}
          width={160}
          height={160}
          priority
          className="rounded-full border border-border object-cover"
        />
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{siteConfig.name}</h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            {siteConfig.description}
          </p>
        </div>
      </section>

      <section aria-labelledby="sections-heading" className="mt-12 sm:mt-16">
        <h2 id="sections-heading" className="sr-only">
          Sections
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {siteConfig.heroCards.map((card) => (
            <HeroCard
              key={card.href}
              title={card.title}
              description={card.description}
              href={card.href}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
