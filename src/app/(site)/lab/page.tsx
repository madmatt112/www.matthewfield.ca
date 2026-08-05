import type { Metadata } from "next";
import Link from "next/link";

import { SectionKicker } from "@/components/shared/section-kicker";

export const metadata: Metadata = {
  title: "Homepage mockups",
  robots: { index: false, follow: false },
};

const variants = [
  {
    href: "/lab/a",
    label: "A — Sentence + Latest",
    description: "Real intro copy, then a mixed stream of recent work.",
  },
  {
    href: "/lab/b",
    label: "B — Status readout",
    description: "The homepage as a spec sheet: the facts, hairline-ruled.",
  },
  {
    href: "/lab/c",
    label: "C — Featured work",
    description: "One large project with cover art, secondary items beside it.",
  },
  {
    href: "/lab/d",
    label: "D — Path index",
    description: "The site as a listing of routes, with real counts.",
  },
  {
    href: "/lab/e",
    label: "E — A + D (recommended)",
    description: "A's intro and work stream, with D's path index for wayfinding.",
  },
];

/** Temporary index for the homepage mockups. Deleted once a direction is chosen. */
export default function LabIndex() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-20 pb-16 sm:px-6 md:pt-28 md:pb-24 lg:px-8">
      <div className="flex flex-col gap-6">
        <SectionKicker label="lab" />
        <h1 className="font-display text-4xl tracking-tight">Homepage mockups</h1>
        <hr className="h-px w-16 border-0 bg-brand" />
        <p className="max-w-measure text-base text-muted-foreground">
          Four directions for the landing page, built with the real design tokens, fonts, and
          content. Not linked from the site and not indexed.
        </p>
      </div>
      <ul className="mt-12 divide-y divide-border border-y border-border">
        {variants.map((variant) => (
          <li key={variant.href}>
            <Link href={variant.href} className="flex flex-col gap-1 py-5">
              <span className="text-lg text-brand underline-offset-4 hover:underline">
                {variant.label}
              </span>
              <span className="text-sm text-muted-foreground">{variant.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
