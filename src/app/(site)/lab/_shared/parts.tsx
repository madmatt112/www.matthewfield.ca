/**
 * Shared building blocks for the homepage mockups.
 *
 * Everything here resolves to design-system token roles and named Tailwind
 * steps — no arbitrary values (visual-design R1.2). Surfaces are flat + hairline
 * per design.md §4, so these use `border-border` directly rather than the shadcn
 * `Card` (which still carries `shadow-sm`).
 *
 * Temporary — deleted with the rest of `/lab` once a direction is chosen.
 */
import Link from "next/link";

import { SectionKicker } from "@/components/shared/section-kicker";
import { SocialLinks } from "@/components/shared/social-links";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { formatContentDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";

/** Page shell: the container, gutters, and hero rhythm every variant shares. */
export function LabPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-20 pb-16 sm:px-6 md:pt-28 md:pb-24 lg:px-8">
      {children}
    </div>
  );
}

/**
 * The signature hero: `/ kicker` + serif display name + hairline brand rule
 * (design.md §3). Identical across all four variants so the comparison is about
 * what sits below it.
 */
export function LabHero({ children }: { children?: React.ReactNode }) {
  return (
    <section className="flex flex-col items-start gap-6">
      <SectionKicker label="home" />
      <h1 className="font-display text-4xl tracking-tight text-balance sm:text-5xl md:text-6xl">
        {siteConfig.name}
      </h1>
      <hr className="h-px w-16 border-0 bg-brand" />
      {children}
    </section>
  );
}

/** Section wrapper: kicker + serif h2 on the standard vertical rhythm. */
export function LabSection({
  kicker,
  heading,
  headingHidden = false,
  children,
}: {
  kicker: string;
  heading: string;
  headingHidden?: boolean;
  children: React.ReactNode;
}) {
  const id = `lab-${kicker.replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="mt-16 md:mt-24">
      <div className="flex flex-col gap-3">
        <SectionKicker label={kicker} />
        <h2
          id={id}
          className={cn("font-display text-3xl tracking-tight", headingHidden && "sr-only")}
        >
          {heading}
        </h2>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

/** Uppercase mono label, neutral. The brand `/` motif stays with SectionKicker. */
export function MonoLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("font-mono text-xs tracking-widest text-muted-foreground uppercase", className)}
    >
      {children}
    </span>
  );
}

export function BrandLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("text-brand underline-offset-4 hover:underline", className)}>
      {children}
    </Link>
  );
}

/** One row of the latest-work stream: date + kind, title, one-line description. */
export function StreamRow({
  kind,
  title,
  description,
  href,
  date,
}: {
  kind: string;
  title: string;
  description: string;
  href: string;
  date: string;
}) {
  const { datetime, display } = formatContentDate(date);
  return (
    <li className="py-5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <MonoLabel>{kind}</MonoLabel>
        <time dateTime={datetime} className="text-sm text-muted-foreground">
          {display}
        </time>
      </div>
      <h3 className="mt-2 text-lg leading-snug">
        <BrandLink href={href}>{title}</BrandLink>
      </h3>
      <p className="mt-1 max-w-measure text-sm text-muted-foreground">{description}</p>
    </li>
  );
}

/**
 * Contact strip.
 *
 * NOTE — deviation from design.md §1, which states the landing page has no
 * primary CTA ("the hero is navigational cards"). Every variant here adds one
 * brand-filled button because the inbound funnel is the homepage's stated job.
 * Adopting any variant means amending that clause. Still one brand CTA per page.
 */
export function ContactStrip() {
  return (
    <div className="mt-16 flex flex-col gap-4 border-t border-border pt-8 md:mt-24">
      <p className="max-w-measure text-base text-foreground">
        I respond to every human who gets in touch.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="brand">
          <Link href="/contact">Get in touch</Link>
        </Button>
        <SocialLinks />
      </div>
    </div>
  );
}

/** Compact text row of the site's sections — replaces the five equal cards. */
export function SectionIndexRow() {
  return (
    <nav aria-label="Site sections">
      <ul className="flex flex-wrap gap-x-6 gap-y-3">
        {siteConfig.navItems.map((item) => (
          <li key={item.href}>
            <BrandLink href={item.href} className="text-sm">
              {item.label}
            </BrandLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
