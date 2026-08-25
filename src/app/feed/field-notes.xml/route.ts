import { Feed } from "feed";
import { siteConfig } from "@/config/site";
import { FIELD_NOTES_TAG, fieldNotesSubject, getFieldNotesPosts } from "@/lib/field-notes";

export const dynamic = "force-static";

/*
 * The Field Notes newsletter feed.
 *
 * This is src/app/feed.xml/route.ts narrowed to one tag. It exists to be
 * consumed by Buttondown's RSS-to-email automation, which polls it every ~30
 * minutes and creates a DRAFT issue per new item — it does not send. See
 * research/field-notes-auto-newsletter.md for the full design.
 *
 * Two things here are load-bearing for that automation and are not stylistic:
 *   - The item <title> carries the "Field Notes: " prefix, because Buttondown
 *     derives the email subject from it.
 *   - `content` carries the full post body, because the decision was to mail
 *     the whole post rather than an excerpt and a link.
 *
 * The feed is also public and useful on its own, so it stays valid RSS 2.0 and
 * is checked by scripts/validate-feed.mjs alongside /feed.xml.
 */
export function GET(): Response {
  const feedUrl = new URL("/feed/field-notes.xml", siteConfig.url).toString();
  const archiveUrl = new URL(`/blog/tags/${FIELD_NOTES_TAG}`, siteConfig.url).toString();
  const year = new Date().getFullYear();

  const feed = new Feed({
    id: archiveUrl,
    title: "Field Notes — Matthew Field",
    description: "Essays from matthewfield.ca, sent as the Field Notes newsletter.",
    link: archiveUrl,
    language: siteConfig.language,
    copyright: `© ${year} Matthew Field`,
    feedLinks: { rss: feedUrl },
  });

  for (const post of getFieldNotesPosts()) {
    const link = new URL(`/blog/${post.slug}`, siteConfig.url).toString();
    const cats = [...new Set([...post.tags, ...post.categories])].map((name) => ({ name }));
    feed.addItem({
      title: fieldNotesSubject(post.title),
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
