import type { Metadata } from "next";

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
    <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Sitemap</h1>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Home</h2>
        <ul className="mt-3 space-y-1">
          <li>
            <a href="/" className="text-base text-foreground underline-offset-4 hover:underline">
              Home
            </a>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Sections</h2>
        <ul className="mt-3 space-y-1">
          {siteConfig.navItems.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="text-base text-foreground underline-offset-4 hover:underline"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Slash pages</h2>
        <ul className="mt-3 space-y-1">
          {siteConfig.slashPages.map((page) => (
            <li key={page.href}>
              <a
                href={page.href}
                className="text-base text-foreground underline-offset-4 hover:underline"
              >
                {page.title}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {posts.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">Posts</h2>
          <ul className="mt-3 space-y-1">
            {posts.map((post) => (
              <li key={post.slug}>
                <a
                  href={`/blog/${post.slug}`}
                  className="text-base text-foreground underline-offset-4 hover:underline"
                >
                  {post.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {projects.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">Projects</h2>
          <ul className="mt-3 space-y-1">
            {projects.map((project) => (
              <li key={project.slug}>
                <a
                  href={`/projects/${project.slug}`}
                  className="text-base text-foreground underline-offset-4 hover:underline"
                >
                  {project.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
