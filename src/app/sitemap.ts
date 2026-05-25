import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getVisiblePublishedPosts } from "@/lib/blog";
import { getAllTags, getAllCategories } from "@/lib/blog-taxonomy";

const routes = [
  "/",
  "/profile",
  "/projects",
  "/contributions",
  "/blog",
  "/resources",
  "/playground",
  "/about",
  "/contact",
  "/colophon",
  "/now",
  "/sitemap",
  "/slashes",
];

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

  return [...staticEntries, ...postEntries, ...tagEntries, ...categoryEntries];
}
