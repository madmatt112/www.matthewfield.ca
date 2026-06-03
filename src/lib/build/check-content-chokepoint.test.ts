// check-content-chokepoint.test.ts — scanner self-test for the CONTENT
// chokepoint (Component 11 v4 — Reqs 1.8, 4.7, 7.4). Parallel to and
// INDEPENDENT of projects.test.ts Cases 8-11: it drives the Task 8 scanner
// (`runContentChokepointScan`) against the Task 9 canary
// (`src/__fixtures__/content-chokepoint-canary.ts`) and OWNS that canary's
// regex sentinels (paired with Task 11's gate
// scripts/verify-content-canary-regex-pair.mjs).
//
// Two-symbol contract: every shape is asserted for BOTH `contributions` and
// `resources`, and the allowlist is PER-SYMBOL — `contributions.ts` importing
// `resources` (and vice-versa) is a violation (cross-symbol isolation).
//
// Sentinel discipline (mirrors projects.test.ts): expected import shapes are
// expressed ONLY as anchored RegExp literals tested against the canary source
// read via `fs.readFileSync`. We never write inline import-shaped strings the
// scanner's own AST walk would flag — this test file is path-exempt, but we
// keep the discipline so the assertions stay shape-specific, not count-only.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  runContentChokepointScan,
  DEFAULT_CONTENT_ALLOWLIST,
  type ContentScanFindingKind,
  type ContentSymbol,
} from "@/lib/build/check-content-chokepoint";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const CANARY_REL = "src/__fixtures__/content-chokepoint-canary.ts";
const CANARY_PATH = path.join(REPO_ROOT, CANARY_REL);

// ===========================================================================
// Case 8 — Scanner kind-coverage against the canary (both symbols)
//
// The canary is path-exempt in DEFAULT_CONTENT_PATH_EXEMPT, so we scan it with
// an EMPTY pathExempt + EMPTY allowlist to see every raw finding it contains.
// Every one of the 17 kinds must appear, and each MUST be present for BOTH
// `contributions` and `resources`. Removing any shape from the canary, or any
// kind from the scanner's detection, breaks at least one assertion.
// ===========================================================================
describe("runContentChokepointScan — canary kind coverage, both symbols (Case 8)", () => {
  const ALL_KINDS: readonly ContentScanFindingKind[] = [
    "named",
    "named-renamed",
    "namespace-member",
    "namespace-destructure",
    "namespace-destructure-renamed",
    "barrel-star",
    "barrel-named",
    "barrel-named-renamed",
    "dynamic-string",
    "dynamic-template",
    "type-only-named",
    "require-named",
    "require-named-renamed",
    "require-namespace-member",
    "require-namespace-destructure",
    "require-namespace-destructure-renamed",
    "require-bare",
  ];
  const SYMBOLS: readonly ContentSymbol[] = ["contributions", "resources"];

  // Scan with no path-exemption and no allowlist so the canary's intentional
  // violations all surface.
  const findings = runContentChokepointScan(CANARY_PATH, {
    repoRoot: REPO_ROOT,
    allowlist: { contributions: [], resources: [] },
    pathExempt: [],
  });

  it("emits at least one finding (canary is not silently skipped)", () => {
    expect(findings.length).toBeGreaterThan(0);
  });

  for (const symbol of SYMBOLS) {
    for (const kind of ALL_KINDS) {
      it(`flags kind "${kind}" for symbol "${symbol}"`, () => {
        const matched = findings.some((f) => f.symbol === symbol && f.kind === kind);
        expect(
          matched,
          `no finding for symbol "${symbol}" kind "${kind}" — canary shape missing or scanner detection regressed`,
        ).toBe(true);
      });
    }
  }

  it("catches the `import * as c; c.contributions` namespace-member shape", () => {
    const matched = findings.some(
      (f) => f.symbol === "contributions" && f.kind === "namespace-member",
    );
    expect(matched).toBe(true);
  });

  it("catches the namespace-member shape for resources too", () => {
    const matched = findings.some((f) => f.symbol === "resources" && f.kind === "namespace-member");
    expect(matched).toBe(true);
  });
});

// ===========================================================================
// Case 9 — Canary regex sentinels (pinned literal regexes, both symbols)
//
// Each regex is anchored on the canonical canary line. This test OWNS these
// sentinels: failure means the canary was edited without updating this list
// (paired with scripts/verify-content-canary-regex-pair.mjs, Task 11). Shapes
// are expressed ONLY as RegExp literals tested against fs-read source — never
// as inline import-shaped strings.
// ===========================================================================
describe("canary regex sentinels — pinned shapes, both symbols (Case 9)", () => {
  const canarySource = fs.readFileSync(CANARY_PATH, "utf-8");

  // [label, pinned regex]. Order follows ContentScanFindingKind. Each shape in
  // the canary carries both `contributions` and `resources`, so most sentinels
  // assert both names on their canonical line.
  const SENTINELS: ReadonlyArray<readonly [string, RegExp]> = [
    // ES static imports (8 shapes)
    ["named", /^import \{ contributions, resources \} from "#site\/content";$/m],
    [
      "named-renamed",
      /^  contributions as contributionsRenamed,\n  resources as resourcesRenamed,$/m,
    ],
    ["namespace-member-contributions", /^const _nsContributions = content\.contributions;$/m],
    ["namespace-member-resources", /^const _nsResources = content\.resources;$/m],
    [
      "namespace-destructure",
      /^  const \{ contributions, resources \} = content; \/\/ kind: namespace-destructure$/m,
    ],
    [
      "namespace-destructure-renamed",
      /^const \{ contributions: _nsContribRenamed, resources: _nsResRenamed \} = content; \/\/ kind: namespace-destructure-renamed$/m,
    ],
    ["barrel-star", /^export \* from "#site\/content";$/m],
    ["barrel-named", /^export \{ contributions, resources \} from "#site\/content";$/m],
    [
      "barrel-named-renamed",
      /^  contributions as contributionsBarrelRenamed,\n  resources as resourcesBarrelRenamed,$/m,
    ],
    // ES dynamic + type-only (3 shapes)
    ["dynamic-string", /^const _dynStr = import\("#site\/content"\);$/m],
    ["dynamic-template", /^const _dynTpl = import\(`#site\/content`\);$/m],
    [
      "type-only-named",
      /^  contributions as _contributionsType,\n  resources as _resourcesType,$/m,
    ],
    // CommonJS require (6 shapes)
    [
      "require-named",
      /^  const \{ contributions, resources \} = require\("#site\/content"\); \/\/ kind: require-named$/m,
    ],
    [
      "require-named-renamed",
      /^const \{ contributions: _reqContribRenamed, resources: _reqResRenamed \} =\n  require\("#site\/content"\);$/m,
    ],
    [
      "require-namespace-member-contributions",
      /^const _reqNsContributions = cjs\.contributions;$/m,
    ],
    ["require-namespace-member-resources", /^const _reqNsResources = cjs\.resources;$/m],
    [
      "require-namespace-destructure",
      /^  const \{ contributions, resources \} = cjs; \/\/ kind: require-namespace-destructure$/m,
    ],
    [
      "require-namespace-destructure-renamed",
      /^const \{ contributions: _reqNsContribRenamed, resources: _reqNsResRenamed \} = cjs; \/\/ kind: require-namespace-destructure-renamed$/m,
    ],
    ["require-bare", /^require\("#site\/content"\);$/m],
  ];

  it("declares exactly 19 sentinels (17 shapes; namespace-member split per symbol)", () => {
    expect(SENTINELS).toHaveLength(19);
  });

  for (const [label, regex] of SENTINELS) {
    it(`matches the canary line for "${label}"`, () => {
      expect(
        regex.test(canarySource),
        `canary regex sentinel for "${label}" did not match — canary likely edited without updating this list (see Task 11 / verify-content-canary-regex-pair)`,
      ).toBe(true);
    });
  }
});

// ===========================================================================
// Case 11 — Per-symbol allowlist self-test (cross-symbol isolation)
//
// The PRODUCTION allowlist is per-symbol:
//   { contributions: ["src/lib/contributions.ts"], resources: ["src/lib/resources.ts"] }
// To exercise it without depending on the real (not-yet-created) helper files,
// we write synthetic files under a temp repo-root at the authorized helper
// PATHS and scan them with DEFAULT_CONTENT_ALLOWLIST. This proves:
//   - the authorized helper importing ITS OWN symbol is NOT flagged;
//   - the authorized helper importing the OTHER symbol IS flagged (isolation);
//   - the canary path is NOT flagged (path-exempt).
// ===========================================================================
describe("content chokepoint per-symbol allowlist self-test (Case 11)", () => {
  let tmpRoot: string;
  let contribHelperPath: string; // <tmp>/src/lib/contributions.ts
  let resourceHelperPath: string; // <tmp>/src/lib/resources.ts
  let outsiderPath: string; // <tmp>/src/components/Outsider.ts

  // Helper: a file is a violation iff the scanner emits >=1 finding for it
  // under the production allowlist. (The scanner itself applies the per-symbol
  // allowlist + path-exempt filtering, so a clean array means "no violation".)
  const isViolation = (filePath: string): boolean =>
    runContentChokepointScan(filePath, {
      repoRoot: tmpRoot,
      allowlist: DEFAULT_CONTENT_ALLOWLIST,
    }).length > 0;

  // Did the scanner flag a SPECIFIC symbol for this file?
  const flagsSymbol = (filePath: string, symbol: ContentSymbol): boolean =>
    runContentChokepointScan(filePath, {
      repoRoot: tmpRoot,
      allowlist: DEFAULT_CONTENT_ALLOWLIST,
    }).some((f) => f.symbol === symbol);

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "content-chokepoint-"));
    fs.mkdirSync(path.join(tmpRoot, "src", "lib"), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, "src", "components"), { recursive: true });

    contribHelperPath = path.join(tmpRoot, "src", "lib", "contributions.ts");
    resourceHelperPath = path.join(tmpRoot, "src", "lib", "resources.ts");
    outsiderPath = path.join(tmpRoot, "src", "components", "Outsider.ts");

    // contributions.ts imports BOTH symbols. `contributions` is allowlisted
    // for this path; `resources` is NOT (cross-symbol isolation).
    fs.writeFileSync(
      contribHelperPath,
      'import { contributions, resources } from "#site/content";\n' +
        "export { contributions, resources };\n",
      "utf-8",
    );
    // resources.ts imports BOTH symbols. `resources` allowlisted; `contributions` not.
    fs.writeFileSync(
      resourceHelperPath,
      'import { contributions, resources } from "#site/content";\n' +
        "export { contributions, resources };\n",
      "utf-8",
    );
    // A non-allowlisted file importing a guarded symbol — the discriminator.
    fs.writeFileSync(
      outsiderPath,
      'import { contributions } from "#site/content";\n' + "export { contributions };\n",
      "utf-8",
    );
  });

  afterAll(() => {
    if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("DEFAULT_CONTENT_ALLOWLIST is per-symbol (contributions/resources disjoint)", () => {
    expect(DEFAULT_CONTENT_ALLOWLIST.contributions).toEqual(["src/lib/contributions.ts"]);
    expect(DEFAULT_CONTENT_ALLOWLIST.resources).toEqual(["src/lib/resources.ts"]);
  });

  it("contributions.ts MAY import `contributions` (own symbol allowlisted)", () => {
    expect(flagsSymbol(contribHelperPath, "contributions")).toBe(false);
  });

  it("contributions.ts CANNOT import `resources` (cross-symbol isolation)", () => {
    expect(flagsSymbol(contribHelperPath, "resources")).toBe(true);
    expect(isViolation(contribHelperPath)).toBe(true);
  });

  it("resources.ts MAY import `resources` (own symbol allowlisted)", () => {
    expect(flagsSymbol(resourceHelperPath, "resources")).toBe(false);
  });

  it("resources.ts CANNOT import `contributions` (cross-symbol isolation)", () => {
    expect(flagsSymbol(resourceHelperPath, "contributions")).toBe(true);
    expect(isViolation(resourceHelperPath)).toBe(true);
  });

  it("a non-allowlisted file with a raw #site/content import IS a violation (discriminator)", () => {
    const rel = path.relative(tmpRoot, outsiderPath).split(path.sep).join("/");
    // Sanity: the outsider is genuinely outside both per-symbol allowlists.
    expect(DEFAULT_CONTENT_ALLOWLIST.contributions).not.toContain(rel);
    expect(DEFAULT_CONTENT_ALLOWLIST.resources).not.toContain(rel);
    expect(isViolation(outsiderPath)).toBe(true);
  });

  it("the canary path is NOT flagged under the default path-exempt list", () => {
    // Default options apply DEFAULT_CONTENT_PATH_EXEMPT, which exempts the
    // canary. repoRoot is the real REPO_ROOT here so the rel path matches.
    const findings = runContentChokepointScan(CANARY_PATH, {
      repoRoot: REPO_ROOT,
    });
    expect(findings).toHaveLength(0);
  });
});
