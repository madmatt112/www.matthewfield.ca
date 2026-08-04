import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { formatContentDate } from "@/lib/format-date";

import { realPosts, realProjects } from "../_shared/data";
import {
  BrandLink,
  ContactStrip,
  LabHero,
  LabPage,
  LabSection,
  MonoLabel,
  SectionIndexRow,
} from "../_shared/parts";

export const metadata: Metadata = {
  title: "Mockup C — Featured work",
  robots: { index: false, follow: false },
};

/**
 * Variant C — "Featured work, asymmetric".
 *
 * Breaks the uniform five-card grid: one large featured project carrying its
 * cover art, with a stacked column of secondary items beside it. Flat + hairline
 * surfaces per design.md §4 (no `shadow-sm`), brand reserved for links.
 */
export default function MockupC() {
  const projects = realProjects();
  // Deliberate pick, not "newest": the newest project is this site, whose cover
  // is a screenshot of the very homepage being replaced. Rudder is the strongest
  // infra credential. Real implementation would use the `featured` frontmatter flag.
  const featured =
    projects.find((project) => project.featured) ??
    projects.find((project) => project.slug === "rudder") ??
    projects[0];
  const secondary = projects.filter((project) => project.slug !== featured?.slug).slice(0, 2);
  const [newestPost] = realPosts();

  return (
    <LabPage>
      <LabHero>
        <p className="max-w-measure text-lg text-foreground">
          Platform and infrastructure engineer. I build reliable distributed systems, the developer
          platforms that run on them, and the tooling that keeps both honest.
        </p>
      </LabHero>

      <LabSection kicker="work" heading="Selected work">
        <div className="grid gap-6 lg:grid-cols-3">
          {featured ? (
            <article className="overflow-hidden rounded-lg border border-border lg:col-span-2">
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                <Image
                  src={featured.cover.src}
                  alt=""
                  width={featured.cover.width}
                  height={featured.cover.height}
                  placeholder={featured.cover.blurDataURL ? "blur" : "empty"}
                  blurDataURL={featured.cover.blurDataURL}
                  priority
                  sizes="(min-width: 1024px) 66vw, 100vw"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-3 p-6">
                <MonoLabel>project</MonoLabel>
                <h3 className="font-display text-2xl tracking-tight">
                  <BrandLink href={`/projects/${featured.slug}`}>{featured.title}</BrandLink>
                </h3>
                <p className="max-w-measure text-base text-muted-foreground">{featured.summary}</p>
                <ul className="flex flex-wrap gap-2">
                  {featured.tags.slice(0, 5).map((tag) => (
                    <li
                      key={tag}
                      className="rounded-md border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ) : null}

          <div className="flex flex-col gap-6">
            {newestPost ? (
              <article className="flex flex-col gap-2 rounded-lg border border-border p-6">
                <MonoLabel>latest writing</MonoLabel>
                <h3 className="text-lg leading-snug">
                  <BrandLink href={`/blog/${newestPost.slug}`}>{newestPost.title}</BrandLink>
                </h3>
                <time
                  dateTime={formatContentDate(newestPost.date).datetime}
                  className="text-sm text-muted-foreground"
                >
                  {formatContentDate(newestPost.date).display}
                </time>
                <p className="text-sm text-muted-foreground">{newestPost.description}</p>
              </article>
            ) : null}

            {secondary.map((project) => (
              <article
                key={project.slug}
                className="flex flex-col gap-2 rounded-lg border border-border p-6"
              >
                <MonoLabel>project</MonoLabel>
                <h3 className="text-lg leading-snug">
                  <BrandLink href={`/projects/${project.slug}`}>{project.title}</BrandLink>
                </h3>
                <p className="text-sm text-muted-foreground">{project.summary}</p>
              </article>
            ))}
          </div>
        </div>

        <p className="mt-6 text-sm">
          <Link href="/projects" className="text-brand underline-offset-4 hover:underline">
            All projects
          </Link>
        </p>
      </LabSection>

      <LabSection kicker="sections" heading="Sections" headingHidden>
        <SectionIndexRow />
      </LabSection>

      <ContactStrip />
    </LabPage>
  );
}
