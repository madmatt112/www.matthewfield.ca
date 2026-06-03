// @vitest-environment node
import { s } from "velite";
import { describe, expect, it } from "vitest";

import { contributionEntrySchema } from "./contributions-schema";
import {
  buildFieldPath,
  chooseLocator,
  formatEnumMembers,
  formatZodIssues,
  serializeValue,
  walkToField,
} from "./content-error-format";
import { resourceEntrySchema } from "./resources-schema";

/**
 * Each clause (a)-(g) of the Shared Build-Time Error-Message Contract gets its
 * own dedicated top-level `describe` block so a reviewer can grep that all seven
 * exist. All issue-shape introspection runs against velite's bundled v3 zod.
 */

describe("(a) serializeValue — quoting/bare/JSON + escape + truncation", () => {
  it("quotes strings", () => {
    expect(serializeValue("my title")).toBe('"my title"');
  });

  it("renders numbers, booleans, and null bare", () => {
    expect(serializeValue(42)).toBe("42");
    expect(serializeValue(true)).toBe("true");
    expect(serializeValue(null)).toBe("null");
  });

  it("renders objects/arrays via compact JSON.stringify", () => {
    // non-scalar links value: {}
    expect(serializeValue({})).toBe("{}");
    expect(serializeValue({ a: 1, b: "x" })).toBe('{"a":1,"b":"x"}');
    expect(serializeValue([1, 2, 3])).toBe("[1,2,3]");
  });

  it("escapes \\n BEFORE truncation", () => {
    expect(serializeValue("line1\nline2")).toBe('"line1\\nline2"');
  });

  it("truncates a long string to 80 chars with … inside the closing quote", () => {
    const result = serializeValue("a".repeat(200));
    expect(result.length).toBe(80);
    expect(result.startsWith('"')).toBe(true);
    expect(result.endsWith('…"')).toBe(true);
  });

  it("truncates a long compound value with … after the JSON", () => {
    const result = serializeValue({ note: "z".repeat(200) });
    expect(result.length).toBe(80);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("(b) field-path builder — bracket-and-dot form", () => {
  it("brackets numeric segments and dot-joins string segments", () => {
    expect(buildFieldPath(["links", 2, "kind"])).toBe("links[2].kind");
  });

  it("handles a leading string segment without a leading dot", () => {
    expect(buildFieldPath(["repo"])).toBe("repo");
  });

  it("handles a leading numeric segment", () => {
    expect(buildFieldPath([0, "kind"])).toBe("[0].kind");
  });
});

describe("(c) locator chooser — repo/title vs entry[n]", () => {
  it("uses the identifier value when a non-identifier field fails", () => {
    const issue = { code: "too_small", path: ["description"] };
    expect(chooseLocator(issue, { repo: "owner/name" }, 3, "repo")).toBe("owner/name");
  });

  it("uses entry[n] when the identifier itself failed", () => {
    const issue = { code: "invalid_string", path: ["repo"] };
    expect(chooseLocator(issue, { repo: "bad repo" }, 3, "repo")).toBe("entry[3]");
  });

  it("uses entry[n] when the identifier is empty/whitespace after trim", () => {
    const issue = { code: "too_small", path: ["description"] };
    expect(chooseLocator(issue, { repo: "   " }, 5, "repo")).toBe("entry[5]");
  });

  it("trims the identifier value", () => {
    const issue = { code: "too_small", path: ["title"] as (string | number)[] };
    // failing field is the identifier (title) for resources → entry[n]
    expect(chooseLocator(issue, { title: "  My Title  " }, 2, "title")).toBe("entry[2]");
    // failing field is NOT the identifier → trimmed identifier
    const other = { code: "invalid_url", path: ["url"] as (string | number)[] };
    expect(chooseLocator(other, { title: "  My Title  " }, 2, "title")).toBe("My Title");
  });
});

describe("(d) formatEnumMembers — invalid_enum_value AND invalid_type", () => {
  it("finds members for an invalid_enum_value (bad string kind)", () => {
    const result = contributionEntrySchema.safeParse({
      repo: "owner/name",
      repoUrl: "https://example.com",
      title: "A valid title",
      description: "x".repeat(40),
      date: "2026-05-28",
      links: [{ kind: "nope", url: "https://example.com" }],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const enumIssue = result.error.issues.find((i) => i.path.includes("kind"));
    expect(enumIssue?.code).toBe("invalid_enum_value");
    const members = formatEnumMembers(contributionEntrySchema, enumIssue!.path);
    expect(members).toEqual(["pr", "commit", "issue", "release", "writeup", "discussion"]);
  });

  it("finds members for an invalid_type on an enum (non-string kind: 42)", () => {
    const result = contributionEntrySchema.safeParse({
      repo: "owner/name",
      repoUrl: "https://example.com",
      title: "A valid title",
      description: "x".repeat(40),
      date: "2026-05-28",
      links: [{ kind: 42, url: "https://example.com" }],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const typeIssue = result.error.issues.find((i) => i.path.includes("kind"));
    expect(typeIssue?.code).toBe("invalid_type");
    const members = formatEnumMembers(contributionEntrySchema, typeIssue!.path);
    expect(members).toEqual(["pr", "commit", "issue", "release", "writeup", "discussion"]);
  });

  it("finds members on the resources category enum", () => {
    const result = resourceEntrySchema.safeParse({
      title: "A title",
      url: "https://example.com",
      description: "x".repeat(30),
      category: "not-a-category",
      added: "2020-01-01",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const issue = result.error.issues.find((i) => i.path.includes("category"));
    const members = formatEnumMembers(resourceEntrySchema, issue!.path);
    expect(members).toEqual(["devops-tools", "blogs-and-feeds", "reading", "fun-stuff"]);
  });
});

describe("(e) schema-walk + unwrap table", () => {
  it("traverses ['links',0,'kind'] through ZodEffects→ZodArray→ZodObject→.shape.kind and FINDS the members", () => {
    // This is the REAL production path: links uses superRefine (ZodEffects) over
    // an array (ZodArray) of objects (ZodObject) whose `kind` is a ZodEnum.
    const node = walkToField(contributionEntrySchema, ["links", 0, "kind"]);
    expect(node?._def?.typeName).toBe("ZodEnum");

    const members = formatEnumMembers(contributionEntrySchema, ["links", 0, "kind"]);
    // Asserts the members are FOUND, NOT the defensive [] fallback.
    expect(members.length).toBeGreaterThan(0);
    expect(members).toEqual(["pr", "commit", "issue", "release", "writeup", "discussion"]);
  });

  it("omits the member list (no throw) when the walk hits an unexpected node", () => {
    // A path that doesn't exist in the schema → fallback, never throws.
    const members = formatEnumMembers(contributionEntrySchema, ["nonexistent", "x"]);
    expect(members).toEqual([]);
  });

  it("[SYNTHETIC / DEFENSIVE — NOT a production path] traverses a ZodPipeline _def.out wrapping an object", () => {
    // The ZodPipeline _def.out/_def.in unwrap-table row is unreachable for the
    // two real schemas (their trimmed() pipelines wrap leaf strings; the walk
    // never descends through them). This SYNTHETIC fixture — a pipeline wrapping
    // an object — exercises the defensive row only.
    const objectStage = s.object({ kind: s.enum(["x", "y", "z"]) });
    const syntheticPipeline = objectStage.pipe(s.object({ kind: s.enum(["x", "y", "z"]) }));

    const members = formatEnumMembers(syntheticPipeline as never, ["kind"]);
    expect(members).toEqual(["x", "y", "z"]);
  });
});

describe("(f) unrecognized_keys did-you-mean", () => {
  it("suggests the nearest key against the correct object's .shape", () => {
    const result = contributionEntrySchema.safeParse({
      repo: "owner/name",
      repoURL: "https://example.com", // stray: meant repoUrl
      title: "A valid title",
      description: "x".repeat(40),
      date: "2026-05-28",
      links: [{ kind: "pr", url: "https://example.com" }],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const lines = formatZodIssues(result.error.issues as never, {
      basename: "contributions.yaml",
      entry: { repo: "owner/name", repoURL: "https://example.com" },
      index: 0,
      schema: contributionEntrySchema as never,
    });
    expect(lines.some((l) => l.includes("unknown key 'repoURL' (did you mean 'repoUrl'?)"))).toBe(
      true,
    );
  });

  it("matches a nested stray key under links[2] against the link object's shape", () => {
    const links = [
      { kind: "pr", url: "https://a.example.com" },
      { kind: "commit", url: "https://b.example.com" },
      { kind: "issue", url: "https://c.example.com", lable: "typo" }, // stray: meant label
    ];
    const result = contributionEntrySchema.safeParse({
      repo: "owner/name",
      repoUrl: "https://example.com",
      title: "A valid title",
      description: "x".repeat(40),
      date: "2026-05-28",
      links,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const unrec = result.error.issues.find((i) => i.code === "unrecognized_keys");
    expect(unrec?.path).toEqual(["links", 2]);

    const lines = formatZodIssues([unrec as never], {
      basename: "contributions.yaml",
      entry: { repo: "owner/name", links },
      index: 0,
      schema: contributionEntrySchema as never,
    });
    expect(lines[0]).toContain("unknown key 'links[2].lable' (did you mean 'label'?)");
  });
});

describe("(g) Hint: appender", () => {
  it("appends hints on their own Hint:-prefixed lines, capped at three", () => {
    const result = contributionEntrySchema.safeParse({
      repo: "owner/name",
      repoUrl: "https://example.com",
      title: "A valid title",
      description: "x".repeat(40),
      date: "2026-05-28",
      links: [{ kind: "nope", url: "https://example.com" }],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const lines = formatZodIssues(result.error.issues as never, {
      basename: "contributions.yaml",
      entry: { repo: "owner/name" },
      index: 0,
      schema: contributionEntrySchema as never,
      hints: () => ["map GitLab MRs to pr", "two", "three", "four"],
    });
    const block = lines.find((l) => l.includes("Hint: "));
    expect(block).toBeDefined();
    const hintLines = block!.split("\n").filter((l) => l.startsWith("Hint: "));
    expect(hintLines.length).toBe(3); // capped at three
    expect(hintLines[0]).toBe("Hint: map GitLab MRs to pr");
    // each hint is on its own line
    expect(block!.split("\n")[0].startsWith("Hint: ")).toBe(false);
  });
});
