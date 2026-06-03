// @vitest-environment node
import { describe, expect, it } from "vitest";

import { contributionEntrySchema } from "./contributions-schema";
import { makeContentYamlLoader } from "./content-yaml-loader";
import { resourceEntrySchema } from "./resources-schema";

/**
 * Loader unit tests. Velite's runtime breaks under jsdom, so this suite runs in
 * the node environment (matching the sibling build tests). Each test calls
 * `makeContentYamlLoader({...}).load(fakeVFile)` with synthetic YAML contents.
 *
 * The named envelope error strings MUST match the design verbatim.
 */

const schemas = {
  "contributions.yaml": contributionEntrySchema,
  "resources.yaml": resourceEntrySchema,
};

/** Minimal VFile stub: the loader reads only `.path` and `.toString()`. */
function fakeVFile(path: string, contents: string) {
  return { path, toString: () => contents } as unknown as Parameters<
    ReturnType<typeof makeContentYamlLoader>["load"]
  >[0];
}

/** A schema-valid single contribution entry (rendered as a one-item YAML list). */
const VALID_CONTRIBUTION = `
- repo: octocat/hello-world
  repoUrl: https://github.com/octocat/hello-world
  title: A real contribution title
  description: This description is long enough to satisfy the thirty character minimum bound.
  date: "2026-05-28"
  links:
    - kind: pr
      url: https://github.com/octocat/hello-world/pull/1
`;

const VALID_RESOURCE = `
- title: A Resource
  url: https://example.com/resource
  description: A description with at least twenty chars.
  category: devops-tools
  added: "2026-05-28"
`;

describe("makeContentYamlLoader — passthrough for unmanaged YAML", () => {
  it("returns parsed data for a basename not in the map", () => {
    const loader = makeContentYamlLoader(schemas);
    const result = loader.load(fakeVFile("/content/other.yaml", "- a\n- b\n"));
    expect(result).toEqual({ data: ["a", "b"] });
  });

  it("passes through null as an empty list for unmanaged YAML", () => {
    const loader = makeContentYamlLoader(schemas);
    const result = loader.load(fakeVFile("/content/other.yaml", ""));
    expect(result).toEqual({ data: [] });
  });
});

describe("makeContentYamlLoader — valid managed payload", () => {
  it("returns { data } for a valid contributions list", () => {
    const loader = makeContentYamlLoader(schemas);
    const result = loader.load(fakeVFile("/content/contributions.yaml", VALID_CONTRIBUTION));
    expect(result.data).toHaveLength(1);
    expect(result.data[0].repo).toBe("octocat/hello-world");
  });

  it("returns { data } for a valid resources list", () => {
    const loader = makeContentYamlLoader(schemas);
    const result = loader.load(fakeVFile("/content/resources.yaml", VALID_RESOURCE));
    expect(result.data).toHaveLength(1);
    expect(result.data[0].category).toBe("devops-tools");
  });

  it("returns an empty list for the explicit [] literal", () => {
    const loader = makeContentYamlLoader(schemas);
    const result = loader.load(fakeVFile("/content/contributions.yaml", "[]\n"));
    expect(result).toEqual({ data: [] });
  });
});

describe("makeContentYamlLoader — envelope errors (verbatim messages)", () => {
  const emptyMessage =
    "contributions.yaml is empty or null. To represent zero entries, write the explicit empty list literal: []";

  it("throws the named empty/null error for a zero-byte file", () => {
    const loader = makeContentYamlLoader(schemas);
    expect(() => loader.load(fakeVFile("/content/contributions.yaml", ""))).toThrow(emptyMessage);
  });

  it("throws the named empty/null error for the `~` literal", () => {
    const loader = makeContentYamlLoader(schemas);
    expect(() => loader.load(fakeVFile("/content/contributions.yaml", "~\n"))).toThrow(
      emptyMessage,
    );
  });

  it("throws the named empty/null error for the `null` literal", () => {
    const loader = makeContentYamlLoader(schemas);
    expect(() => loader.load(fakeVFile("/content/contributions.yaml", "null\n"))).toThrow(
      emptyMessage,
    );
  });

  it("throws the must-be-a-list error for a top-level mapping", () => {
    const loader = makeContentYamlLoader(schemas);
    expect(() => loader.load(fakeVFile("/content/resources.yaml", "title: not a list\n"))).toThrow(
      "resources.yaml must be a top-level YAML list. Found a object. Write entries as a list ('- ...') or the empty list literal: []",
    );
  });

  it("throws the must-be-a-list error for a top-level scalar", () => {
    const loader = makeContentYamlLoader(schemas);
    expect(() => loader.load(fakeVFile("/content/resources.yaml", "42\n"))).toThrow(
      "resources.yaml must be a top-level YAML list. Found a number. Write entries as a list ('- ...') or the empty list literal: []",
    );
  });
});

describe("makeContentYamlLoader — per-entry contract violations", () => {
  function loadContrib(yaml: string) {
    return () =>
      makeContentYamlLoader(schemas).load(fakeVFile("/content/contributions.yaml", yaml));
  }
  function loadResource(yaml: string) {
    return () => makeContentYamlLoader(schemas).load(fakeVFile("/content/resources.yaml", yaml));
  }

  it("throws a contract message for a bad enum kind", () => {
    const fn = loadContrib(VALID_CONTRIBUTION.replace("kind: pr", "kind: merge-request"));
    expect(fn).toThrow(/contributions\.yaml/);
    expect(fn).toThrow(/links\[0\]\.kind/);
    // enum members are listed
    expect(fn).toThrow(/pr, commit, issue, release, writeup, discussion/);
  });

  it("throws a contract message for an oversize field", () => {
    const fn = loadContrib(
      VALID_CONTRIBUTION.replace("title: A real contribution title", `title: ${"x".repeat(200)}`),
    );
    expect(fn).toThrow(/contributions\.yaml/);
    expect(fn).toThrow(/title/);
  });

  it("throws a contract message for an unknown key (.strict())", () => {
    const fn = loadContrib(`${VALID_CONTRIBUTION}  repoURL: https://example.com\n`);
    expect(fn).toThrow(/unknown key/);
    expect(fn).toThrow(/did you mean 'repoUrl'/);
  });

  it("throws a contract message for a duplicate kind", () => {
    const fn = loadContrib(`
- repo: octocat/hello-world
  repoUrl: https://github.com/octocat/hello-world
  title: A real contribution title
  description: This description is long enough to satisfy the thirty character minimum bound.
  date: "2026-05-28"
  links:
    - kind: pr
      url: https://github.com/octocat/hello-world/pull/1
    - kind: pr
      url: https://github.com/octocat/hello-world/pull/2
`);
    expect(fn).toThrow(/contributions\.yaml/);
  });

  it("throws a contract message for a whitespace-only label", () => {
    const fn = loadContrib(
      VALID_CONTRIBUTION.replace(
        "    - kind: pr\n      url:",
        '    - kind: pr\n      label: "   "\n      url:',
      ),
    );
    expect(fn).toThrow(/contributions\.yaml/);
    expect(fn).toThrow(/label/);
  });

  it("throws a contract message for a future-dated `added`", () => {
    const fn = loadResource(VALID_RESOURCE.replace('added: "2026-05-28"', 'added: "2999-01-01"'));
    expect(fn).toThrow(/resources\.yaml/);
    expect(fn).toThrow(/added/);
  });

  it("throws a contract message for a calendar-invalid `date` (no RangeError)", () => {
    const fn = loadContrib(VALID_CONTRIBUTION.replace('date: "2026-05-28"', 'date: "2026-02-30"'));
    expect(fn).toThrow(/contributions\.yaml/);
    expect(fn).toThrow(/date/);
    // The thrown error is a contract message, never a bare RangeError.
    expect(fn).not.toThrow(/Invalid time value/);
  });
});
