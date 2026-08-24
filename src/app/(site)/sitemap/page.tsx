import type { Metadata } from "next";
import Link from "next/link";

import { SectionKicker } from "@/components/shared/section-kicker";
import { siteConfig } from "@/config/site";
import { getVisiblePublishedPosts } from "@/lib/blog";
import { getPublishedProjects } from "@/lib/projects";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  return {
    title: "Sitemap",
    description: "A human-readable index of every page, post, and project on matthewfield.ca.",
    robots: { index: false },
  };
}

export default function SitemapPage() {
  const posts = getVisiblePublishedPosts();
  const projects = getPublishedProjects();

  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-16 md:py-24">
      <SectionKicker label="sitemap" />
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Sitemap</h1>

      <section className="mt-10">
        <h2 className="font-display text-3xl tracking-tight">Home</h2>
        <ul className="mt-3 space-y-1">
          <li>
            <Link href="/" className="text-base text-brand underline-offset-4 hover:underline">
              Home
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-3xl tracking-tight">Sections</h2>
        <ul className="mt-3 space-y-1">
          {siteConfig.navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-base text-brand underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-3xl tracking-tight">Slash pages</h2>
        <ul className="mt-3 space-y-1">
          {siteConfig.slashPages.map((page) => (
            <li key={page.href}>
              <Link
                href={page.href}
                className="text-base text-brand underline-offset-4 hover:underline"
              >
                {page.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {posts.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-3xl tracking-tight">Posts</h2>
          <ul className="mt-3 space-y-1">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-base text-brand underline-offset-4 hover:underline"
                >
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {projects.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-3xl tracking-tight">Projects</h2>
          <ul className="mt-3 space-y-1">
            {projects.map((project) => (
              <li key={project.slug}>
                <Link
                  href={`/projects/${project.slug}`}
                  className="text-base text-brand underline-offset-4 hover:underline"
                >
                  {project.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
