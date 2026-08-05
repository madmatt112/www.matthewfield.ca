import Link from "next/link";

import { SectionKicker } from "@/components/shared/section-kicker";
import { formatContentDate } from "@/lib/format-date";
import { getHomeStream, HOME_STREAM_KIND_LABEL } from "@/lib/home-stream";

const ITEM_COUNT = 3;

function Row({
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
        <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          {kind}
        </span>
        <time dateTime={datetime} className="text-sm text-muted-foreground">
          {display}
        </time>
      </div>
      <h3 className="mt-2 text-lg leading-snug">
        <Link href={href} className="text-brand underline-offset-4 hover:underline">
          {title}
        </Link>
      </h3>
      <p className="mt-1 max-w-measure text-sm text-muted-foreground">{description}</p>
    </li>
  );
}

/**
 * Recent activity of any kind — writing, projects, open source — newest first,
 * so the landing page shows the work rather than linking to the sections that
 * hold it. Derived from content, so it stays current without being edited.
 */
export function RecentWork() {
  const items = getHomeStream(ITEM_COUNT);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="recent-work-heading" className="mt-16 md:mt-24">
      <div className="flex flex-col gap-3">
        <SectionKicker label="latest" />
        <h2 id="recent-work-heading" className="font-display text-3xl tracking-tight">
          Recent work
        </h2>
      </div>
      <ul className="mt-8 divide-y divide-border">
        {items.map((item) => (
          <Row
            key={item.href + item.title}
            kind={HOME_STREAM_KIND_LABEL[item.kind]}
            title={item.title}
            description={item.description}
            href={item.href}
            date={item.date}
          />
        ))}
      </ul>
      <p className="mt-6 text-sm">
        <Link href="/blog" className="text-brand underline-offset-4 hover:underline">
          All writing
        </Link>
      </p>
    </section>
  );
}
