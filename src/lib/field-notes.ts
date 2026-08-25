import { getVisiblePublishedPosts, type Post } from "@/lib/blog";

/**
 * The tag that marks a blog post as a Field Notes newsletter issue.
 *
 * Velite enforces kebab-case on every tag (velite.config.ts:151), so this is
 * `field-notes` rather than "Field Notes". The tag is deliberately public: it
 * renders at /blog/tags/field-notes, which doubles as the on-site archive.
 */
export const FIELD_NOTES_TAG = "field-notes";

/**
 * Buttondown's RSS-to-email automation takes the email subject from the feed
 * item's <title>, so the prefix has to be applied on this side. Changing it
 * changes the subject line of every future issue.
 */
export function fieldNotesSubject(title: string): string {
  return `Field Notes: ${title}`;
}

/**
 * Posts that belong in the Field Notes feed, newest first.
 *
 * Inherits every exclusion getVisiblePublishedPosts() applies — drafts,
 * fixtures, and hiddenFromLists posts — so a draft carrying the tag cannot
 * reach a subscriber.
 */
export function getFieldNotesPosts(): Post[] {
  return getVisiblePublishedPosts().filter((post) => post.tags.includes(FIELD_NOTES_TAG));
}
