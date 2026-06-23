import type { Metadata } from "next";

import { HeroCard } from "@/components/shared/hero-card";
import { SectionKicker } from "@/components/shared/section-kicker";
import { siteConfig } from "@/config/site";

export function generateMetadata(): Metadata {
  return {
    title: "Home",
  };
}

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-20 sm:px-6 md:pt-28 lg:px-8">
      <section className="flex flex-col items-start gap-6">
        <SectionKicker label="home" />
        <h1 className="text-balance font-display text-4xl tracking-tight sm:text-5xl md:text-6xl">
          {siteConfig.name}
        </h1>
        <hr className="h-px w-16 border-0 bg-brand" />
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          {siteConfig.description}
        </p>
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
