import { describe, expect, it } from "vitest";

import { FIELD_NOTES_TAG, fieldNotesSubject, getFieldNotesPosts } from "./field-notes";
import { getVisiblePublishedPosts } from "./blog";

describe("FIELD_NOTES_TAG", () => {
  it("is kebab-case, so velite's tag validator accepts it", () => {
    // velite.config.ts:151 rejects any tag not matching this pattern at build
    // time. A tag that fails here could never be applied to a post at all.
    expect(FIELD_NOTES_TAG).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
});

describe("fieldNotesSubject", () => {
  it("prefixes the post title", () => {
    expect(fieldNotesSubject("Increasing my luck surface area")).toBe(
      "Field Notes: Increasing my luck surface area",
    );
  });

  it("prefixes exactly once", () => {
    // Pins the behaviour for the case where the prefix is later moved into
    // Buttondown's own subject template and the two would otherwise stack.
    expect(fieldNotesSubject("Field Notes: something")).toBe("Field Notes: Field Notes: something");
  });
});

describe("getFieldNotesPosts", () => {
  it("returns only posts carrying the tag", () => {
    for (const post of getFieldNotesPosts()) {
      expect(post.tags).toContain(FIELD_NOTES_TAG);
    }
  });

  it("is a subset of the visible published posts", () => {
    // The feed must inherit every exclusion the blog lists apply — drafts,
    // fixtures, hiddenFromLists. A draft that reached a subscriber could not
    // be recalled.
    const visible = new Set(getVisiblePublishedPosts().map((p) => p.slug));
    for (const post of getFieldNotesPosts()) {
      expect(visible.has(post.slug)).toBe(true);
    }
  });

  it("stays newest-first", () => {
    const dates = getFieldNotesPosts().map((p) => p.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});
