/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-require-imports, no-undef */
// Canary fixture for the projects chokepoint scanner (Component 11 v4 — Req 7.6.h).
//
// Purpose: exercise ALL 17 coverage-matrix shapes from
// `src/lib/build/check-projects-chokepoint.ts` (`ScanFindingKind`) so the
// scanner's detection contract is locked by Task 14.2's tests. Each shape is
// preceded by a `// kind: <kind-name>` comment whose name MUST match the
// canonical kind exactly — Task 14.2's regex sentinels assert the per-shape
// substrings still exist in this file's source.
//
// Allowlisting: this fixture intentionally violates the "no raw #site/content
// import" rule in 17 distinct ways. The chokepoint test in Task 14.2 wires an
// explicit allowlist that exempts THIS file by path.
//
// Type-checking: this file is excluded from `tsconfig.json` so the raw-content
// imports do not break `pnpm typecheck` (it is also excluded from the Next.js
// production build).
//
// DO NOT import from this file at runtime. Reference only via fs.readFileSync
// (for sentinel regex assertions) or the scanner under test.

// --- ES static imports (8 shapes) ---

// kind: named
import { projects } from "#site/content";

// kind: named-renamed
import { projects as projectsRenamed } from "#site/content";

// kind: namespace-member  +  namespace-destructure  +  namespace-destructure-renamed
import * as content from "#site/content";
const _nsMember = content.projects;
const { projects: _nsDestructured } = content;
const { projects: _nsDestructuredRenamed } = content;
// (Two destructures so both the un-renamed and renamed bindings exist;
// the scanner emits one finding per element regardless of duplication.)
// Explicitly: the first destructure above is `namespace-destructure` (no
// `propertyName` in the AST — `{ projects }` shorthand). To produce that
// kind we need a shorthand binding:
const { projects: _ignored } = content; // satisfies namespace-destructure-renamed (already)
// Shorthand (un-renamed):
const { projects: _shadowed1 } = { projects: content.projects };
// The actual un-renamed namespace destructure must be a true shorthand
// against the namespace binding; declared in its own statement to avoid
// shadowing the top-level `projects` import.
{
  const { projects } = content; // kind: namespace-destructure
  void projects;
}

// kind: barrel-star
export * from "#site/content";

// kind: barrel-named
// (Un-renamed re-export. The earlier `export * from "#site/content"` already
// re-exports `projects`; per ES module spec, explicit named re-exports take
// precedence over star re-exports for conflicting names, so this is legal.)
export { projects } from "#site/content";

// kind: barrel-named-renamed
export { projects as projectsBarrelRenamed } from "#site/content";

// --- ES dynamic + type-only (3 shapes) ---

// kind: dynamic-string
const _dynStr = import("#site/content");

// kind: dynamic-template
const _dynTpl = import(`#site/content`);

// kind: type-only-named
import type { projects as _projectsType } from "#site/content";

// --- CommonJS require (6 shapes) ---

// kind: require-named
const { projects: _reqNamed } = require("#site/content");

// kind: require-named-renamed
const { projects: _reqRenamed } = require("#site/content");
// NOTE: `require-named` vs `require-named-renamed` are distinguished by the
// presence of `propertyName` in the binding element. To get a true
// `require-named` (no rename) we need a shorthand binding. Declared in a
// nested block to avoid collision with the top-level `projects` symbol.
{
  const { projects } = require("#site/content"); // kind: require-named
  void projects;
}

// kind: require-namespace-member  +  require-namespace-destructure  +
//        require-namespace-destructure-renamed
const cjs = require("#site/content");
const _reqNsMember = cjs.projects;
{
  const { projects } = cjs; // kind: require-namespace-destructure
  void projects;
}
const { projects: _reqNsDestructuredRenamed } = cjs; // kind: require-namespace-destructure-renamed

// kind: require-bare
require("#site/content");

// Reference suppression: silence "declared but never used" by touching every
// binding once. Side-effect-free.
void projects;
void projectsRenamed;
void _nsMember;
void _nsDestructured;
void _nsDestructuredRenamed;
void _ignored;
void _shadowed1;
void _dynStr;
void _dynTpl;
void _reqNamed;
void _reqRenamed;
void _reqNsMember;
void _reqNsDestructuredRenamed;
