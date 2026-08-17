import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getVisiblePublishedPosts } from "@/lib/blog";
import { getAllTags, getAllCategories } from "@/lib/blog-taxonomy";
import { getPublishedProjects } from "@/lib/projects";
import { getAllContributions } from "@/lib/contributions";
import { getAllResources } from "@/lib/resources";

const routes = [
  "/",
  "/profile",
  "/projects",
  "/blog",
  "/about",
  "/contact",
  "/colophon",
  "/now",
  "/newsletter",
];

// Latest date in `dates`, or `fallback` when empty. The empty-array guard is
// load-bearing: the launch state of both collections is `[]`, and a bare
// `.reduce` with no initial value throws "Reduce of empty array".
function maxOr(dates: string[], fallback: Date): Date {
  return dates.length ? new Date(dates.reduce((a, b) => (a > b ? a : b))) : fallback;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticEntries = routes.map((route) => ({
    url: new URL(route, siteConfig.url).toString(),
    lastModified: now,
  }));

  const posts = getVisiblePublishedPosts();

  const postEntries = posts.map((post) => ({
    url: new URL(`/blog/${post.slug}`, siteConfig.url).toString(),
    lastModified: new Date(post.updated ?? post.date),
  }));

  // Build taxonomy → max(date) indexes in one pass to avoid O(n*m) walks.
  const tagMax = new Map<string, string>();
  const categoryMax = new Map<string, string>();
  for (const post of posts) {
    for (const tag of post.tags) {
      const cur = tagMax.get(tag);
      if (cur === undefined || post.date > cur) tagMax.set(tag, post.date);
    }
    for (const cat of post.categories) {
      const cur = categoryMax.get(cat);
      if (cur === undefined || post.date > cur) categoryMax.set(cat, post.date);
    }
  }

  const tagEntries = getAllTags().map((tag) => ({
    url: new URL(`/blog/tags/${tag}`, siteConfig.url).toString(),
    lastModified: new Date(tagMax.get(tag) ?? new Date().toISOString()),
  }));

  const categoryEntries = getAllCategories().map((category) => ({
    url: new URL(`/blog/categories/${category}`, siteConfig.url).toString(),
    lastModified: new Date(categoryMax.get(category) ?? new Date().toISOString()),
  }));

  const projectEntries = getPublishedProjects().map((project) => ({
    url: new URL(`/projects/${project.slug}`, siteConfig.url).toString(),
    lastModified: new Date(project.updated ?? project.date),
  }));

  const contributionsEntry = {
    url: new URL("/contributions", siteConfig.url).toString(),
    lastModified: maxOr(
      getAllContributions().map((c) => c.date),
      now,
    ),
  };

  const resourcesEntry = {
    url: new URL("/resources", siteConfig.url).toString(),
    lastModified: maxOr(
      getAllResources().map((r) => r.added),
      now,
    ),
  };

  // Playground is intentionally absent from the sitemap: the routes still
  // render, they are just not advertised to crawlers (matching its removal
  // from navItems and homeIndex in src/config/site.ts).
  return [
    ...staticEntries,
    contributionsEntry,
    resourcesEntry,
    ...postEntries,
    ...tagEntries,
    ...categoryEntries,
    ...projectEntries,
  ];
}
