import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { formatContentDate } from "@/lib/format-date";

type HeroCardProps = {
  title: string;
  description: string;
  href: string;
  /**
   * Optional "most recent entry" line — currently the newest blog post. Shows a
   * first-time visitor what is actually behind the card instead of only naming
   * the section.
   */
  latest?: { title: string; date: string };
};

export function HeroCard({ title, description, href, latest }: HeroCardProps) {
  const titleId = `hero-card-${href.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "")}`;
  const latestDate = latest ? formatContentDate(latest.date) : null;
  return (
    // aria-labelledby scopes the link's accessible name to the card title, so a
    // long post title below does not become part of it (matches ProjectCard,
    // Req 2.6). Without it, `getByRole("link", { name })` in the landing E2E
    // could match two cards once a post title contains another card's name.
    <Link
      href={href}
      aria-labelledby={titleId}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full transition-colors group-hover:border-foreground/20 group-hover:bg-accent">
        <CardHeader>
          <h3 id={titleId} className="text-lg leading-none font-semibold">
            {title}
          </h3>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {latest && latestDate ? (
          <CardContent>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Latest · <time dateTime={latestDate.datetime}>{latestDate.display}</time>
            </p>
            <p className="mt-1 text-sm text-balance text-foreground">{latest.title}</p>
          </CardContent>
        ) : null}
      </Card>
    </Link>
  );
}
