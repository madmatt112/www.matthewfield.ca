import { getVisiblePublishedPosts, type Post } from "@/lib/blog";

export function getAllTags(): string[] {
  const set = new Set<string>();
  for (const p of getVisiblePublishedPosts()) for (const t of p.tags) set.add(t);
  return [...set].sort();
}

export function getAllCategories(): string[] {
  const set = new Set<string>();
  for (const p of getVisiblePublishedPosts()) for (const c of p.categories) set.add(c);
  return [...set].sort();
}

export function getPostsByTag(tag: string): Post[] {
  return getVisiblePublishedPosts().filter((p) => p.tags.includes(tag));
}

export function getPostsByCategory(category: string): Post[] {
  return getVisiblePublishedPosts().filter((p) => p.categories.includes(category));
}
