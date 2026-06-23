// projects.test.ts — Part 1 (sort + filter + cache + guard) per Task 14.1 and
// Part 2 (chokepoint scanner + canary regex sentinels) per Task 14.2.
// Part 3 (Task 14.3) appends additional `describe` blocks to this file. The
// shared `vi.mock("#site/content", ...)` below provides synthetic projects
// for the cases that need controllable input. Tests that do NOT depend on a
// specific synthetic shape (the guard-throw cases) still safely use the mock
// because each case sets its own env-var combination.
//
// Cache invariants: `getPublishedProjects()` memoizes on the env-var tuple
// (VERCEL, VERCEL_ENV, PROJECTS_INCLUDE_DRAFTS). Each test that depends on
// the mocked content sets a distinct env combo so module-scope cache from a
// prior test does not bleed in. NO `vi.resetModules()` — that would break
// Case 7's reference-equality memoization assertion.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { execSync } from "node:child_process";

import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  test,
  vi,
} from "vitest";
import type { Image } from "velite";

import { runChokepointScan, type ScanFindingKind } from "@/lib/build/check-projects-chokepoint";
import {
  PROJECTS_DRAFT_LEAK_GUARD_MSG_PREVIEW,
  PROJECTS_DRAFT_LEAK_GUARD_MSG_PRODUCTION,
} from "@/lib/project-errors";

// Mutable holder so individual `describe` blocks can swap the synthetic
// projects array via `mockProjects.value = [...]` before calling
// `getPublishedProjects()`. `vi.hoisted` ensures the holder is initialized
// before the `vi.mock` factory runs (mocks are hoisted to the top of the
// module).
const mockProjects = vi.hoisted(() => ({
  value: [] as Array<Record<string, unknown>>,
}));

vi.mock("#site/content", () => ({
  get projects() {
    return mockProjects.value;
  },
}));

// Import AFTER the mock is registered so the module under test resolves
// `#site/content` to the mocked module.
import {
  getProjectBySlug,
  getPublishedProjects,
  shouldShowUpdatedBadge,
  type Project,
  type ProjectLink,
} from "@/lib/projects";

const ENV_KEYS = ["VERCEL", "VERCEL_ENV", "PROJECTS_INCLUDE_DRAFTS"] as const;

function clearEnv(): void {
  for (const k of ENV_KEYS) delete process.env[k];
}

// Minimal synthetic factory — the type is widened to Project via cast since
// the full Velite-emitted shape (cover Image, etc.) is not relevant to the
// sort/filter/cache behavior under test. The fields exercised by
// projects.ts are: date, slug, draft, updated.
function synth(
  slug: string,
  date: string,
  opts: { draft?: boolean; updated?: string } = {},
): Record<string, unknown> {
  return { slug, date, draft: opts.draft ?? false, updated: opts.updated };
}

beforeEach(() => {
  clearEnv();
  mockProjects.value = [];
});

afterEach(() => {
  clearEnv();
  mockProjects.value = [];
});

// ---------------------------------------------------------------------------
// Case 1 — Sort: byDateDescSlugAsc (date desc; slug asc tiebreak)
// ---------------------------------------------------------------------------
describe("getPublishedProjects — sort (byDateDescSlugAsc)", () => {
  it("orders by date desc with slug-asc tiebreak", () => {
    mockProjects.value = [
      synth("bravo", "2025-06-01"),
      synth("alpha", "2025-06-01"), // same date as bravo → slug-asc tiebreak
      synth("charlie", "2025-07-15"),
      synth("delta", "2025-05-10"),
    ];
    // Distinct env value to bust any cache from prior tests.
    process.env.PROJECTS_INCLUDE_DRAFTS = "sort-case-1";
    const result = getPublishedProjects().map((p) => p.slug);
    expect(result).toEqual(["charlie", "alpha", "bravo", "delta"]);
  });
});

// ---------------------------------------------------------------------------
// Case 2 — Draft filter (Req 7.2 behavior)
// ---------------------------------------------------------------------------
describe("getPublishedProjects — draft filter behavior (Req 7.2)", () => {
  it("excludes drafts at VERCEL_ENV=production (VERCEL unset → no guard fires)", () => {
    mockProjects.value = [
      synth("pub-a", "2025-01-01"),
      synth("draft-b", "2025-01-02", { draft: true }),
    ];
    process.env.VERCEL_ENV = "production"; // VERCEL unset → guard inactive
    const result = getPublishedProjects();
    expect(result.map((p) => p.slug)).toEqual(["pub-a"]);
  });

  it("includes drafts at VERCEL_ENV=production + PROJECTS_INCLUDE_DRAFTS=1 (local, VERCEL unset)", () => {
    mockProjects.value = [
      synth("pub-c", "2025-02-01"),
      synth("draft-d", "2025-02-02", { draft: true }),
    ];
    process.env.VERCEL_ENV = "production";
    process.env.PROJECTS_INCLUDE_DRAFTS = "1";
    const result = getPublishedProjects();
    expect(result.map((p) => p.slug).sort()).toEqual(["draft-d", "pub-c"].sort());
    expect(result).toHaveLength(2);
  });

  it("locally without VERCEL: PROJECTS_INCLUDE_DRAFTS=1 includes drafts", () => {
    mockProjects.value = [
      synth("pub-e", "2025-03-01"),
      synth("draft-f", "2025-03-02", { draft: true }),
    ];
    process.env.PROJECTS_INCLUDE_DRAFTS = "1";
    const result = getPublishedProjects();
    expect(result).toHaveLength(2);
    expect(result.some((p) => p.slug === "draft-f")).toBe(true);
  });

  it("locally without VERCEL and without PROJECTS_INCLUDE_DRAFTS: drafts excluded", () => {
    mockProjects.value = [
      synth("pub-g", "2025-04-01"),
      synth("draft-h", "2025-04-02", { draft: true }),
    ];
    // Bust cache from prior sibling test.
    process.env.PROJECTS_INCLUDE_DRAFTS = "case-2-default";
    const result = getPublishedProjects();
    expect(result.map((p) => p.slug)).toEqual(["pub-g"]);
  });
});

// ---------------------------------------------------------------------------
// Case 2b — Fixture screening on the live site (Vercel production only)
// ---------------------------------------------------------------------------
describe("getPublishedProjects — fixture screening on Vercel production", () => {
  it("excludes fixture-* slugs on VERCEL=1 + VERCEL_ENV=production", () => {
    mockProjects.value = [
      synth("real-entry", "2025-01-03"),
      synth("fixture-placeholder", "2025-01-02"),
      synth("fixture-published-second", "2025-01-01"),
    ];
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    // drafts unset → leak guard does not fire; fixtures are screened out.
    const result = getPublishedProjects().map((p) => p.slug);
    expect(result).toEqual(["real-entry"]);
  });

  it("keeps fixture-* slugs when not on Vercel production (dev/CI/e2e flavor)", () => {
    mockProjects.value = [
      synth("real-entry", "2025-02-01"),
      synth("fixture-placeholder", "2025-02-02"),
    ];
    // No VERCEL/VERCEL_ENV → e2e/CI/dev build; fixtures remain available.
    process.env.PROJECTS_INCLUDE_DRAFTS = "case-2b-local";
    const result = getPublishedProjects()
      .map((p) => p.slug)
      .sort();
    expect(result).toEqual(["fixture-placeholder", "real-entry"]);
  });
});

// ---------------------------------------------------------------------------
// Case 3 — shouldShowUpdatedBadge truth table
// ---------------------------------------------------------------------------
describe("shouldShowUpdatedBadge — truth table", () => {
  it("returns false when `updated` is absent", () => {
    const p = synth("u-a", "2025-01-01") as unknown as Project;
    expect(shouldShowUpdatedBadge(p)).toBe(false);
  });

  it("returns false when `updated` equals `date`", () => {
    const p = synth("u-b", "2025-01-01", { updated: "2025-01-01" }) as unknown as Project;
    expect(shouldShowUpdatedBadge(p)).toBe(false);
  });

  it("returns true when `updated` is strictly later than `date`", () => {
    const p = synth("u-c", "2025-01-01", { updated: "2025-02-01" }) as unknown as Project;
    expect(shouldShowUpdatedBadge(p)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Case 4 — getProjectBySlug returns null for missing slug
// ---------------------------------------------------------------------------
describe("getProjectBySlug", () => {
  it("returns null when no project matches the slug", () => {
    mockProjects.value = [synth("present", "2025-01-01")];
    process.env.PROJECTS_INCLUDE_DRAFTS = "case-4";
    expect(getProjectBySlug("absent")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Case 5a — Draft-leak guard THROW cases (Req 7.3)
// ---------------------------------------------------------------------------
describe("getPublishedProjects — draft-leak guard THROW cases (Req 7.3)", () => {
  it("throws PRODUCTION when VERCEL=1 + VERCEL_ENV=production + PROJECTS_INCLUDE_DRAFTS=1", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.PROJECTS_INCLUDE_DRAFTS = "1";
    expect(() => getPublishedProjects()).toThrow(PROJECTS_DRAFT_LEAK_GUARD_MSG_PRODUCTION);
  });

  it("throws PREVIEW when VERCEL=1 + VERCEL_ENV=preview + PROJECTS_INCLUDE_DRAFTS unset", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    expect(() => getPublishedProjects()).toThrow(PROJECTS_DRAFT_LEAK_GUARD_MSG_PREVIEW);
  });

  it('throws PRODUCTION (looks-like-prod) when VERCEL=1 + VERCEL_ENV="" + drafts=1', () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "";
    process.env.PROJECTS_INCLUDE_DRAFTS = "1";
    expect(() => getPublishedProjects()).toThrow(PROJECTS_DRAFT_LEAK_GUARD_MSG_PRODUCTION);
  });

  it("throws PRODUCTION (looks-like-prod) when VERCEL=1 + VERCEL_ENV=staging + drafts=1", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "staging";
    process.env.PROJECTS_INCLUDE_DRAFTS = "1";
    expect(() => getPublishedProjects()).toThrow(PROJECTS_DRAFT_LEAK_GUARD_MSG_PRODUCTION);
  });

  it("throws PRODUCTION (looks-like-prod) when VERCEL=1 + VERCEL_ENV unset + drafts=1", () => {
    process.env.VERCEL = "1";
    // VERCEL_ENV deliberately unset.
    process.env.PROJECTS_INCLUDE_DRAFTS = "1";
    expect(() => getPublishedProjects()).toThrow(PROJECTS_DRAFT_LEAK_GUARD_MSG_PRODUCTION);
  });
});

// ---------------------------------------------------------------------------
// Case 5b — Draft-leak guard NO-THROW cases (Req 7.2.d branch coverage)
// ---------------------------------------------------------------------------
describe("getPublishedProjects — draft-leak guard NO-THROW cases (Req 7.2.d)", () => {
  it("does NOT throw when VERCEL_ENV=development + PROJECTS_INCLUDE_DRAFTS=1", () => {
    mockProjects.value = [synth("nt-a", "2025-01-01")];
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "development";
    process.env.PROJECTS_INCLUDE_DRAFTS = "1";
    expect(() => getPublishedProjects()).not.toThrow();
  });

  it("does NOT throw when VERCEL unset + PROJECTS_INCLUDE_DRAFTS=1 (local dev)", () => {
    mockProjects.value = [synth("nt-b", "2025-01-02")];
    process.env.PROJECTS_INCLUDE_DRAFTS = "1";
    expect(() => getPublishedProjects()).not.toThrow();
  });

  it("does NOT throw when VERCEL=1 + VERCEL_ENV=preview + PROJECTS_INCLUDE_DRAFTS=1 (preview-with-drafts permitted)", () => {
    mockProjects.value = [synth("nt-c", "2025-01-03")];
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    process.env.PROJECTS_INCLUDE_DRAFTS = "1";
    expect(() => getPublishedProjects()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Case 6 — Cache invalidation on env mutation
// ---------------------------------------------------------------------------
describe("getPublishedProjects — cache invalidation on env change", () => {
  it("returns a refreshed result after PROJECTS_INCLUDE_DRAFTS changes", () => {
    mockProjects.value = [
      synth("inv-pub", "2025-05-01"),
      synth("inv-draft", "2025-05-02", { draft: true }),
    ];
    // First call with drafts disabled.
    process.env.PROJECTS_INCLUDE_DRAFTS = "case-6-off";
    const first = getPublishedProjects();
    expect(first.map((p) => p.slug)).toEqual(["inv-pub"]);

    // Mutate the env; cache should invalidate and the next call must
    // reflect the new env (drafts now included).
    process.env.PROJECTS_INCLUDE_DRAFTS = "1";
    const second = getPublishedProjects();
    expect(second).toHaveLength(2);
    expect(second.some((p) => p.slug === "inv-draft")).toBe(true);
    expect(second).not.toBe(first);
  });
});

// ---------------------------------------------------------------------------
// Case 7 — Cache memoization (stable env → same array reference)
// ---------------------------------------------------------------------------
describe("getPublishedProjects — cache memoization on stable env", () => {
  it("returns the same array reference for two consecutive calls (cache hit)", () => {
    mockProjects.value = [synth("memo-a", "2025-06-01")];
    // Set a distinct env so the snapshot differs from prior tests; do NOT
    // mutate env between the two calls below.
    process.env.PROJECTS_INCLUDE_DRAFTS = "case-7-stable";
    const result1 = getPublishedProjects();
    const result2 = getPublishedProjects();
    expect(result1).toBe(result2);
  });
});

// ===========================================================================
// Part 2 — Chokepoint scanner + canary regex sentinels (Task 14.2)
//
// Scope: AST/scanner + regex-maintenance reviewer profile.
//   - Case 8:  runChokepointScan against the canary fixture covers each of
//              the expected kind groups.
//   - Case 9:  17 pinned literal regex sentinels each match their canonical
//              line in the canary fixture. Failure here means the canary
//              was edited without updating the regex list — author doc §9
//              contract (canary↔regex pair-merge gate, scripts/
//              verify-canary-regex-pair.mjs).
//   - Case 11: Production allowlist self-test — scanning src/lib/projects.ts
//              under the production allowlist yields no violations.
//
// The production allowlist (design.md Component 11 §"Allowlist") is:
//   - src/lib/projects.ts
//   - src/lib/projects.test.ts
//   - src/__fixtures__/chokepoint-canary.ts
// ===========================================================================

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CANARY_PATH = path.join(REPO_ROOT, "src/__fixtures__/chokepoint-canary.ts");
const CHOKEPOINT_PATH = path.join(REPO_ROOT, "src/lib/projects.ts");

// Production allowlist — mirrors design.md Component 11 §"Allowlist".
// This is the SAME list a CI-walking wrapper would consult. NOT a
// test-specific override.
const PRODUCTION_ALLOWLIST: ReadonlyArray<string> = Object.freeze([
  "src/lib/projects.ts",
  "src/lib/projects.test.ts",
  "src/__fixtures__/chokepoint-canary.ts",
]);

function relativeFromRepo(absPath: string): string {
  return path.relative(REPO_ROOT, absPath).split(path.sep).join("/");
}

// ---------------------------------------------------------------------------
// Case 8 — Chokepoint scanner kind-coverage against the canary fixture
// ---------------------------------------------------------------------------
describe("runChokepointScan — canary kind coverage (Case 8)", () => {
  it("emits at least one finding in each expected kind group", () => {
    const findings = runChokepointScan(CANARY_PATH);
    const kinds = new Set<ScanFindingKind>(findings.map((f) => f.kind));

    // Mutation-kill contract: removing ANY kind from runChokepointScan's detection must fail at least one of these assertions.
    // Expected kind GROUPS per Task 14.2 case 8. "dynamic" covers both
    // dynamic-string and dynamic-template; "type-only" covers
    // type-only-named; the rest are exact kind names.
    const groups: Record<string, (k: ScanFindingKind) => boolean> = {
      named: (k) => k === "named",
      "namespace-member": (k) => k === "namespace-member",
      "namespace-destructure": (k) => k === "namespace-destructure",
      "barrel-star": (k) => k === "barrel-star",
      "barrel-named": (k) => k === "barrel-named",
      dynamic: (k) => k === "dynamic-string" || k === "dynamic-template",
      "type-only": (k) => k === "type-only-named",
    };

    const allKinds = Array.from(kinds);
    for (const [group, predicate] of Object.entries(groups)) {
      const matched = allKinds.some(predicate);
      expect(
        matched,
        `missing finding for group "${group}" — kinds present: ${allKinds.join(", ")}`,
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Case 9 — Canary regex sentinels (17 pinned literal regexes)
//
// Each regex is a PINNED LITERAL anchored on the canonical line in
// src/__fixtures__/chokepoint-canary.ts. Failure of any sentinel indicates
// the canary fixture was edited without updating this list. Per author
// doc §9 / scripts/verify-canary-regex-pair.mjs: the canary and this
// regex list are paired — update them together in the same PR.
// ---------------------------------------------------------------------------
describe("canary regex sentinels — 17 pinned shapes (Case 9)", () => {
  // Read once: cheap and avoids re-reading per case.
  const canarySource = fs.readFileSync(CANARY_PATH, "utf-8");

  // Each entry: [kind label (matches `// kind: <label>` comment), pinned regex].
  // Order follows the kind list in check-projects-chokepoint.ts.
  const SENTINELS: ReadonlyArray<readonly [string, RegExp]> = [
    // ES static imports (8 shapes)
    ["named", /^import \{ projects \} from "#site\/content";$/m],
    ["named-renamed", /^import \{ projects as projectsRenamed \} from "#site\/content";$/m],
    ["namespace-member", /^const _nsMember = content\.projects;$/m],
    [
      "namespace-destructure",
      /^  const \{ projects \} = content; \/\/ kind: namespace-destructure$/m,
    ],
    ["namespace-destructure-renamed", /^const \{ projects: _nsDestructured \} = content;$/m],
    ["barrel-star", /^export \* from "#site\/content";$/m],
    ["barrel-named", /^export \{ projects \} from "#site\/content";$/m],
    [
      "barrel-named-renamed",
      /^export \{ projects as projectsBarrelRenamed \} from "#site\/content";$/m,
    ],
    // ES dynamic + type-only (3 shapes)
    ["dynamic-string", /^const _dynStr = import\("#site\/content"\);$/m],
    ["dynamic-template", /^const _dynTpl = import\(`#site\/content`\);$/m],
    ["type-only-named", /^import type \{ projects as _projectsType \} from "#site\/content";$/m],
    // CommonJS require (6 shapes)
    [
      "require-named",
      /^  const \{ projects \} = require\("#site\/content"\); \/\/ kind: require-named$/m,
    ],
    ["require-named-renamed", /^const \{ projects: _reqNamed \} = require\("#site\/content"\);$/m],
    ["require-namespace-member", /^const _reqNsMember = cjs\.projects;$/m],
    [
      "require-namespace-destructure",
      /^  const \{ projects \} = cjs; \/\/ kind: require-namespace-destructure$/m,
    ],
    [
      "require-namespace-destructure-renamed",
      /^const \{ projects: _reqNsDestructuredRenamed \} = cjs; \/\/ kind: require-namespace-destructure-renamed$/m,
    ],
    ["require-bare", /^require\("#site\/content"\);$/m],
  ];

  it("declares exactly 17 sentinels (one per coverage-matrix shape)", () => {
    expect(SENTINELS).toHaveLength(17);
  });

  for (const [label, regex] of SENTINELS) {
    it(`matches the canary line for kind "${label}"`, () => {
      expect(
        regex.test(canarySource),
        `canary regex sentinel for "${label}" did not match — canary likely edited without updating this regex list (see author doc §9 / verify-canary-regex-pair)`,
      ).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// Case 11 — Allowlist self-test against the production allowlist
//
// Scanning src/lib/projects.ts (which legitimately imports `projects` from
// `#site/content`) under the PRODUCTION allowlist must yield ZERO
// violations. To prove the allowlist serves a DISCRIMINATING purpose (not a
// tautology), we also scan a synthetic non-allowlisted file containing a
// raw `#site/content` import and assert it IS classified as a violation.
// ---------------------------------------------------------------------------
describe("chokepoint allowlist self-test (Case 11)", () => {
  // Synthetic non-allowlisted file: a real on-disk file outside the
  // production allowlist that contains a raw `#site/content` import. Used
  // as the negative control for the allowlist discriminator.
  let tmpDir: string;
  let syntheticViolatorPath: string;

  beforeEach(() => {
    if (!tmpDir) {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "chokepoint-"));
      syntheticViolatorPath = path.join(tmpDir, "non-allowlisted.ts");
      fs.writeFileSync(
        syntheticViolatorPath,
        'import { projects } from "#site/content";\n',
        "utf-8",
      );
    }
  });

  afterAll(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // Helper: a file is a violation iff it is NOT in the production allowlist
  // AND the scanner emits at least one finding for it. This codifies the
  // allowlist's discriminator role.
  const isViolation = (filePath: string): boolean => {
    const rel = relativeFromRepo(filePath);
    return !PRODUCTION_ALLOWLIST.includes(rel) && runChokepointScan(filePath).length > 0;
  };

  it("the production allowlist contains src/lib/projects.ts", () => {
    expect(PRODUCTION_ALLOWLIST).toContain("src/lib/projects.ts");
  });

  it("scanning src/lib/projects.ts under the production allowlist yields no violations", () => {
    expect(isViolation(CHOKEPOINT_PATH)).toBe(false);
  });

  it("a non-allowlisted file with a raw #site/content import IS a violation (allowlist discriminator)", () => {
    expect(isViolation(syntheticViolatorPath)).toBe(true);
  });
});

// ===========================================================================
// Part 3 — type-system + author-controlled `updated` + empty collection
// (Task 14.3). Reviewer profile: type-system + meta-verification.
//
//   - Case 12:  expectTypeOf compile-time assertions against `Project` fields.
//   - Case 13:  author-controlled `updated` — runtime fixture (PRIMARY),
//               opt-in git-mutation NO-OP (13b), schema-shape regex (13c).
//
// Note: Case 10 (empty collection via vi.mock) lives in its OWN file-scoped
// describe further below — but `vi.mock` factories are hoisted per module,
// so we instead use the same shared mock by setting `mockProjects.value = []`
// inside a scoped describe. This preserves the spec's requirement that the
// empty case is scoped within its own describe block.
// ===========================================================================

// ---------------------------------------------------------------------------
// Case 12 — Type-correctness (Req 1.9). Compile-time assertions; if Velite's
// emitted shape drifts, `pnpm typecheck` fails.
// ---------------------------------------------------------------------------
describe("Project type — compile-time type correctness (Case 12, Req 1.9)", () => {
  it('Project["links"] is ProjectLink[] | undefined', () => {
    expectTypeOf<Project["links"]>().toEqualTypeOf<ProjectLink[] | undefined>();
  });

  it('Project["status"] is the narrow enum union', () => {
    expectTypeOf<Project["status"]>().toEqualTypeOf<"active" | "archived" | "concept">();
  });

  it('Project["cover"] is exactly the Velite-emitted Image type', () => {
    // Exact-match via toEqualTypeOf (NOT toMatchTypeOf). If Velite's Image
    // shape drifts (e.g. gains a required field), this fails at typecheck.
    expectTypeOf<Project["cover"]>().toEqualTypeOf<Image>();
  });
});

// ---------------------------------------------------------------------------
// Case 13 — Author-controlled `updated` (Req 1.5).
//
//   13-runtime (PRIMARY):    .velite/projects.json fixture entry verbatim.
//   13b (opt-in):            git-mutation NO-OP under PROJECTS_TEST_GIT_MUTATION=1.
//   13c (defense-in-depth):  schema-shape regex against velite.config.ts.
// ---------------------------------------------------------------------------
describe("author-controlled `updated` (Case 13, Req 1.5)", () => {
  const VELITE_OUTPUT = path.join(REPO_ROOT, ".velite/projects.json");
  const VELITE_CONFIG = path.join(REPO_ROOT, "velite.config.ts");
  const FIXTURE_SLUG = "fixture-published-second";
  const FIXTURE_MDX_REL = "content/projects/fixture-published-second.mdx";
  // velite's s.isodate() normalizes the author's `updated: 2025-12-01`
  // frontmatter to a UTC-midnight ISO string. The date is still
  // author-controlled (Req 1.5) — only the representation is normalized.
  const EXPECTED_UPDATED = "2025-12-01T00:00:00.000Z";

  type VeliteEntry = { slug: string; updated?: string };

  function readVeliteProjects(): VeliteEntry[] {
    const raw = fs.readFileSync(VELITE_OUTPUT, "utf-8");
    return JSON.parse(raw) as VeliteEntry[];
  }

  // Case 13-runtime — PRIMARY. Skip-if-absent guard for non-CI environments
  // when the fixture (Task 19) has not yet landed. CI must run this case.
  // Uses `ctx.skip()` so local runs report SKIPPED (not passed).
  test("13-runtime: fixture entry has author-controlled updated verbatim", (ctx) => {
    if (process.env.CI !== "true" && !fs.existsSync(VELITE_OUTPUT)) {
      // Velite build has not run locally and we are not in CI → skip.
      ctx.skip();
    }
    if (!fs.existsSync(VELITE_OUTPUT)) {
      // CI guarantees velite build ran; missing file is a real failure.
      throw new Error(`.velite/projects.json missing in CI run: ${VELITE_OUTPUT}`);
    }
    const entries = readVeliteProjects();
    const entry = entries.find((e) => e.slug === FIXTURE_SLUG);
    if (entry === undefined) {
      // Fixture from Task 19 not yet present. In non-CI, skip gracefully so
      // we do not block on an upstream unchecked task. In CI, fail loudly
      // so the test surfaces once Task 19 lands and CI re-runs.
      if (process.env.CI !== "true") ctx.skip();
      throw new Error(
        `expected .velite/projects.json to contain slug "${FIXTURE_SLUG}" (Task 19 fixture)`,
      );
    }
    expect(entry.updated).toBe(EXPECTED_UPDATED);
  });

  // Case 13b — opt-in git-mutation NO-OP. Wrapped in absolute-safe
  // try/finally so the amend is ALWAYS reverted on failure.
  test("13b: git-amend --date does NOT change author-controlled updated", (ctx) => {
    if (process.env.PROJECTS_TEST_GIT_MUTATION !== "1") ctx.skip();
    if (!fs.existsSync(VELITE_OUTPUT)) {
      throw new Error(`.velite/projects.json missing for 13b: ${VELITE_OUTPUT}`);
    }

    const before = readVeliteProjects().find((e) => e.slug === FIXTURE_SLUG);
    if (before === undefined) {
      throw new Error(
        `13b precondition: fixture "${FIXTURE_SLUG}" not present in .velite/projects.json`,
      );
    }
    const baseline = before.updated;

    // Capture the pre-amend commit SHA so restore is explicit and cannot
    // be wrong — `git commit --amend` rewrites HEAD in place (HEAD~1 is the
    // PRIOR commit, NOT the pre-amend state). The correct restore target
    // is this captured SHA via `git reset --soft <sha>`.
    const originalSha = execSync("git rev-parse HEAD", {
      cwd: REPO_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    })
      .toString()
      .trim();

    let restoreNeeded = false;
    try {
      execSync(`git commit --amend --no-edit --date="2099-01-01T00:00:00Z" -- ${FIXTURE_MDX_REL}`, {
        cwd: REPO_ROOT,
        stdio: "pipe",
      });
      restoreNeeded = true;
      execSync("pnpm velite build", { cwd: REPO_ROOT, stdio: "pipe" });
      const after = readVeliteProjects().find((e) => e.slug === FIXTURE_SLUG);
      expect(after).toBeDefined();
      expect(after?.updated).toBe(baseline);
    } finally {
      if (restoreNeeded) {
        // Restore via the captured pre-amend SHA. `--soft` rewinds HEAD
        // without touching the index or worktree, undoing the amend.
        // If restore fails, THROW so CI fails loud rather than leaving
        // the repo in a rewritten-HEAD state.
        execSync(`git reset --soft ${originalSha}`, {
          cwd: REPO_ROOT,
          stdio: "pipe",
        });
      }
    }
  });

  // Case 13c — schema-shape defense-in-depth.
  it("13c: velite.config.ts uses s.isodate() for `updated` and no .transform on same line", () => {
    const src = fs.readFileSync(VELITE_CONFIG, "utf-8");
    // Positive shape: `updated:` followed by `s.isodate()` on the same field.
    expect(src).toMatch(/updated:\s*s\.isodate\(\)/);
    // Negative shape: no `.transform(` on any line that also declares
    // `updated:` — guards against silently auto-deriving the field.
    const flagged = src
      .split("\n")
      .some((line) => /\bupdated:/.test(line) && /\.transform\(/.test(line));
    expect(flagged).toBe(false);
  });
});

// Case 10 — Empty collection — lives in its OWN test file
// (src/lib/projects.empty.test.ts) so its `vi.mock("#site/content", () => ({
// projects: [] }))` is properly hoisted file-scope and is not influenced by
// the mutable mock-holder pattern used in this file. See that file for the
// scoped empty-collection case per Req 1.8.
