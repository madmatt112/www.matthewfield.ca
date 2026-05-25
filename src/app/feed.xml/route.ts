import { Feed } from "feed";
import { siteConfig } from "@/config/site";
import { getVisiblePublishedPosts } from "@/lib/blog";

export const dynamic = "force-static";

export function GET(): Response {
  const feedUrl = new URL("/feed.xml", siteConfig.url).toString();
  const blogUrl = new URL("/blog", siteConfig.url).toString();
  const year = new Date().getFullYear();

  const feed = new Feed({
    id: blogUrl,
    title: "Matthew Field — Blog",
    description: siteConfig.description,
    link: blogUrl,
    language: siteConfig.language,
    copyright: `© ${year} Matthew Field`,
    feedLinks: { rss: feedUrl },
  });

  for (const post of getVisiblePublishedPosts()) {
    const link = new URL(`/blog/${post.slug}`, siteConfig.url).toString();
    const cats = [...new Set([...post.tags, ...post.categories])].map((name) => ({ name }));
    feed.addItem({
      title: post.title,
      link,
      guid: link,
      description: post.description,
      content: post.bodyHtml,
      date: new Date(post.date),
      category: cats,
    });
  }

  return new Response(feed.rss2(), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
