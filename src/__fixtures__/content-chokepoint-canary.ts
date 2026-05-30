/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-require-imports, no-undef */
// Canary fixture for the CONTENT chokepoint scanner (Component 11 v4 — Reqs 1.8,
// 4.7, 7.4). Parallel to `src/__fixtures__/chokepoint-canary.ts` (the projects
// canary) but exercises the `contributions` AND `resources` symbols.
//
// Purpose: exercise the import shapes that
// `src/lib/build/check-content-chokepoint.ts` (`ContentScanFindingKind`)
// detects, for BOTH guarded symbols, so the scanner's detection contract is
// locked by Task 10's tests. Each shape is preceded by a `// kind: <kind-name>`
// comment whose name MUST match the canonical kind exactly — Task 10's regex
// sentinels (paired with Task 11's gate) assert the per-shape substrings still
// exist in this file's source.
//
// Allowlisting: this fixture intentionally violates the "no raw #site/content
// import of contributions/resources" rule in many distinct ways. It is exempt in
// THREE places (Req 1.9 — all three land in ONE commit):
//   (i)   `tsconfig.json` `exclude` — so the raw-content imports do not break
//         `pnpm typecheck` (also keeps it out of the Next.js production build);
//   (ii)  `eslint.config.mjs` `no-restricted-imports: off` file list;
//   (iii) the scanner's `DEFAULT_CONTENT_PATH_EXEMPT` (handled in Task 8).
//
// DO NOT import from this file at runtime. Reference only via fs.readFileSync
// (for sentinel regex assertions) or the scanner under test.

// --- ES static imports (8 shapes) ---

// kind: named
import { contributions, resources } from "#site/content";

// kind: named-renamed
import {
  contributions as contributionsRenamed,
  resources as resourcesRenamed,
} from "#site/content";

// kind: namespace-member
import * as content from "#site/content";
const _nsContributions = content.contributions;
const _nsResources = content.resources;

// kind: namespace-destructure  +  namespace-destructure-renamed
{
  const { contributions, resources } = content; // kind: namespace-destructure
  void contributions;
  void resources;
}
const { contributions: _nsContribRenamed, resources: _nsResRenamed } = content; // kind: namespace-destructure-renamed

// kind: barrel-star
export * from "#site/content";

// kind: barrel-named
export { contributions, resources } from "#site/content";

// kind: barrel-named-renamed
export {
  contributions as contributionsBarrelRenamed,
  resources as resourcesBarrelRenamed,
} from "#site/content";

// --- ES dynamic + type-only (3 shapes) ---

// kind: dynamic-string
const _dynStr = import("#site/content");

// kind: dynamic-template
const _dynTpl = import(`#site/content`);

// kind: type-only-named
import type {
  contributions as _contributionsType,
  resources as _resourcesType,
} from "#site/content";

// --- CommonJS require (6 shapes) ---

// kind: require-named
{
  const { contributions, resources } = require("#site/content"); // kind: require-named
  void contributions;
  void resources;
}

// kind: require-named-renamed
const { contributions: _reqContribRenamed, resources: _reqResRenamed } =
  require("#site/content");

// kind: require-namespace-member  +  require-namespace-destructure  +
//        require-namespace-destructure-renamed
const cjs = require("#site/content");
const _reqNsContributions = cjs.contributions;
const _reqNsResources = cjs.resources;
{
  const { contributions, resources } = cjs; // kind: require-namespace-destructure
  void contributions;
  void resources;
}
const { contributions: _reqNsContribRenamed, resources: _reqNsResRenamed } = cjs; // kind: require-namespace-destructure-renamed

// kind: require-bare
require("#site/content");

// Reference suppression: silence "declared but never used" by touching every
// binding once. Side-effect-free.
void contributions;
void resources;
void contributionsRenamed;
void resourcesRenamed;
void _nsContributions;
void _nsResources;
void _nsContribRenamed;
void _nsResRenamed;
void _dynStr;
void _dynTpl;
void _reqContribRenamed;
void _reqResRenamed;
void _reqNsContributions;
void _reqNsResources;
void _reqNsContribRenamed;
void _reqNsResRenamed;
