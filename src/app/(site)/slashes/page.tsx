import type { Metadata } from "next";

import { SectionKicker } from "@/components/shared/section-kicker";
import { siteConfig } from "@/config/site";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  return {
    title: "Slashes",
    description:
      "An index of the standalone IndieWeb pages on matthewfield.ca and what each is for.",
    robots: { index: false },
  };
}

export default function SlashesPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <SectionKicker label="slashes" />
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Slashes</h1>
      <ul className="mt-6 space-y-6">
        {siteConfig.slashPages.map((page) => (
          <li key={page.href}>
            <a
              href={page.href}
              className="text-base font-medium text-brand underline underline-offset-4"
            >
              {page.title}
            </a>
            <p className="mt-1 text-sm text-muted-foreground">{page.description}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
