// Chokepoint scanner for the `contributions` and `resources` collections
// (Component 11 v4 — Reqs 1.8, 4.7, 7.4 — "Chokepoint enforcement — Layer 2").
//
// This is a SEPARATE scanner from `check-projects-chokepoint.ts`. That file's
// signature and pinned 17-sentinel test are FROZEN; this module copies its
// structure and AST walk but does NOT import or modify it. The two scanners
// evolve independently so a future single-collection change can never disturb
// the other's pinned test.
//
// Threat model: defends against ACCIDENTAL import of the Velite-emitted
// `contributions` / `resources` symbols from `#site/content` outside their
// authorized chokepoint helper modules (`src/lib/contributions.ts` and
// `src/lib/resources.ts` respectively) in a single-author repo. The allowlist
// is PER-SYMBOL: `contributions.ts` importing `resources` is a violation, and
// vice-versa (cross-symbol isolation).
//
// Algorithm:
//   1. Read the file via `fs.readFileSync`.
//   2. Parse via the TypeScript compiler API into a SourceFile AST.
//   3. Walk the AST detecting the 17 coverage-matrix shapes (per symbol).
//   4. Drop any finding whose file is path-exempt, or whose symbol's import is
//      from a file in that symbol's authorized-helper allowlist.
//   5. Return one `ContentScanFinding` per surviving violation; empty array on
//      no findings.
//
// `isContentSpecifier` policy: exact equality `=== "#site/content"`.
// Sub-path imports (e.g. `#site/content/foo`) are intentionally OUT OF SCOPE.
//
// The 17 shapes (kind names are the canonical discriminator), each detected
// independently for BOTH the `contributions` and `resources` symbols:
//   ES static imports (8):
//     1. named                              — import { contributions } from "#site/content"
//     2. named-renamed                      — import { contributions as c } from "#site/content"
//     3. namespace-member                   — import * as c from "#site/content"; c.contributions
//     4. namespace-destructure              — const { contributions } = c (c bound to ns import)
//     5. namespace-destructure-renamed      — const { contributions: x } = c
//     6. barrel-star                        — export * from "#site/content"
//     7. barrel-named                       — export { contributions } from "#site/content"
//     8. barrel-named-renamed               — export { contributions as c } from "#site/content"
//   ES dynamic + type-only (3):
//     9. dynamic-string                     — import("#site/content")
//    10. dynamic-template                   — import(`#site/content`)  (no expressions)
//    11. type-only-named                    — import type { contributions } from "#site/content"
//   CommonJS require (6):
//    12. require-named                      — const { contributions } = require("#site/content")
//    13. require-named-renamed              — const { contributions: c } = require("#site/content")
//    14. require-namespace-member           — const c = require("#site/content"); c.contributions
//    15. require-namespace-destructure      — const c = require(...); const { contributions } = c
//    16. require-namespace-destructure-renamed — const c = require(...); const { contributions: x } = c
//    17. require-bare                       — require("#site/content")  (any other shape)

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const CONTENT_SPECIFIER = "#site/content";

export type ContentScanFindingKind =
  | "named"
  | "named-renamed"
  | "namespace-member"
  | "namespace-destructure"
  | "namespace-destructure-renamed"
  | "barrel-star"
  | "barrel-named"
  | "barrel-named-renamed"
  | "dynamic-string"
  | "dynamic-template"
  | "type-only-named"
  | "require-named"
  | "require-named-renamed"
  | "require-namespace-member"
  | "require-namespace-destructure"
  | "require-namespace-destructure-renamed"
  | "require-bare";

/** The collection symbols this scanner guards. */
export type ContentSymbol = "contributions" | "resources";

const CONTENT_SYMBOLS: readonly ContentSymbol[] = ["contributions", "resources"];

/**
 * Per-symbol authorized-helper allowlist: each symbol maps to the list of
 * repo-relative (POSIX) file paths permitted to import it from `#site/content`.
 * Because it is per-symbol, an import of `resources` inside
 * `src/lib/contributions.ts` is a violation (and vice-versa).
 */
export type ContentChokepointAllowlist = Record<ContentSymbol, readonly string[]>;

export interface ContentScanFinding {
  /** Which collection symbol was imported. */
  symbol: ContentSymbol;
  kind: ContentScanFindingKind;
  node: ts.Node;
}

/**
 * Exact-equality check for the `#site/content` specifier. Sub-path imports
 * (e.g. `#site/content/foo`) are intentionally out of scope.
 */
function isContentSpecifier(text: string): boolean {
  return text === CONTENT_SPECIFIER;
}

/** Returns the string value of a StringLiteral or no-substitution template. */
function literalSpecifier(node: ts.Expression | undefined): string | null {
  if (!node) return null;
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

/**
 * Detects whether a CallExpression is `require(<specifier>)` with a single
 * literal-string specifier matching `#site/content`.
 */
function isRequireCallOfContent(node: ts.CallExpression): boolean {
  if (!ts.isIdentifier(node.expression)) return false;
  if (node.expression.text !== "require") return false;
  if (node.arguments.length !== 1) return false;
  const spec = literalSpecifier(node.arguments[0]);
  return spec !== null && isContentSpecifier(spec);
}

/** Returns the matched `ContentSymbol` for a name, or null. */
function asContentSymbol(name: string): ContentSymbol | null {
  return (CONTENT_SYMBOLS as readonly string[]).includes(name)
    ? (name as ContentSymbol)
    : null;
}

/** Normalize a path to repo-relative POSIX form for allowlist comparison. */
function toRepoRelativePosix(filePath: string, repoRoot: string): string {
  return path.relative(repoRoot, path.resolve(filePath)).split(path.sep).join("/");
}

export interface ContentChokepointScanOptions {
  /**
   * Repo root used to resolve `filePath` to the repo-relative POSIX form that
   * the allowlist and path-exempt entries are expressed in. Defaults to
   * `process.cwd()`.
   */
  repoRoot?: string;
  /**
   * Per-symbol authorized-helper allowlist. A finding for a symbol is dropped
   * when the scanned file is in that symbol's allowlist.
   */
  allowlist?: ContentChokepointAllowlist;
  /**
   * Files that are exempt for ALL symbols (repo-relative POSIX). The new canary
   * fixture (Task 9) and this scanner's own test file are path-exempted here —
   * true parity with the projects scanner, which allowlists both its canary and
   * `projects.test.ts`.
   */
  pathExempt?: readonly string[];
}

/**
 * Default per-symbol authorized-helper allowlist:
 *   { contributions: ["src/lib/contributions.ts"], resources: ["src/lib/resources.ts"] }
 */
export const DEFAULT_CONTENT_ALLOWLIST: ContentChokepointAllowlist = {
  contributions: ["src/lib/contributions.ts"],
  resources: ["src/lib/resources.ts"],
};

/**
 * Default path-exempt list: the canary fixture (Task 9) and this scanner's own
 * test file. Both carry intentional violations for both symbols and must not be
 * flagged.
 */
export const DEFAULT_CONTENT_PATH_EXEMPT: readonly string[] = [
  "src/__fixtures__/content-chokepoint-canary.ts",
  "src/lib/build/check-content-chokepoint.test.ts",
];

/**
 * Walks the SourceFile AST detecting the 17 chokepoint-violation shapes for
 * BOTH the `contributions` and `resources` symbols, then filters by the
 * per-symbol allowlist and the path-exempt list. Returns one
 * `ContentScanFinding` per surviving violation; empty array means no
 * violations. Pure function aside from the initial file read.
 */
export function runContentChokepointScan(
  filePath: string,
  options: ContentChokepointScanOptions = {},
): ContentScanFinding[] {
  const repoRoot = options.repoRoot ?? process.cwd();
  const allowlist = options.allowlist ?? DEFAULT_CONTENT_ALLOWLIST;
  const pathExempt = options.pathExempt ?? DEFAULT_CONTENT_PATH_EXEMPT;

  const relPath = toRepoRelativePosix(filePath, repoRoot);

  // Path-exempt files are skipped entirely for all symbols.
  if (pathExempt.includes(relPath)) return [];

  const source = fs.readFileSync(filePath, "utf-8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );

  const findings: ContentScanFinding[] = [];

  // Track local identifiers bound to namespace imports / require results so we
  // can detect subsequent `.contributions` / `.resources` member access and
  // destructuring.
  const namespaceImportBindings = new Set<string>(); // ES `import * as X`
  const requireNamespaceBindings = new Set<string>(); // CJS `const X = require(...)`

  // First pass: collect import / require declarations and emit findings.
  function visitImports(node: ts.Node): void {
    // --- ES static imports ---
    if (ts.isImportDeclaration(node)) {
      const spec = literalSpecifier(node.moduleSpecifier);
      if (spec !== null && isContentSpecifier(spec)) {
        const clause = node.importClause;
        const isTypeOnly = clause?.isTypeOnly === true;

        if (clause?.namedBindings) {
          const nb = clause.namedBindings;

          // import * as X from "#site/content"
          if (ts.isNamespaceImport(nb)) {
            namespaceImportBindings.add(nb.name.text);
            // Not a finding until a guarded symbol is referenced via member or
            // destructure.
          }

          // import { contributions } / { contributions as c } / type { ... }
          if (ts.isNamedImports(nb)) {
            for (const element of nb.elements) {
              const importedName = element.propertyName?.text ?? element.name.text;
              const symbol = asContentSymbol(importedName);
              if (symbol === null) continue;
              const renamed = element.propertyName !== undefined;
              if (isTypeOnly || element.isTypeOnly) {
                findings.push({ symbol, kind: "type-only-named", node: element });
              } else if (renamed) {
                findings.push({ symbol, kind: "named-renamed", node: element });
              } else {
                findings.push({ symbol, kind: "named", node: element });
              }
            }
          }
        }
      }
    }

    // --- ES barrel re-exports ---
    if (ts.isExportDeclaration(node)) {
      const spec = literalSpecifier(node.moduleSpecifier);
      if (spec !== null && isContentSpecifier(spec)) {
        // export * from "#site/content"  /  export * as ns from "#site/content"
        // A star re-export forwards EVERY symbol, so it is a finding for both.
        if (!node.exportClause || ts.isNamespaceExport(node.exportClause)) {
          for (const symbol of CONTENT_SYMBOLS) {
            findings.push({ symbol, kind: "barrel-star", node });
          }
        } else if (ts.isNamedExports(node.exportClause)) {
          // export { contributions } / { contributions as c } from "#site/content"
          for (const element of node.exportClause.elements) {
            const exportedSource = element.propertyName?.text ?? element.name.text;
            const symbol = asContentSymbol(exportedSource);
            if (symbol === null) continue;
            const renamed = element.propertyName !== undefined;
            findings.push({
              symbol,
              kind: renamed ? "barrel-named-renamed" : "barrel-named",
              node: element,
            });
          }
        }
      }
    }

    // --- CommonJS require declarations: const X = require("#site/content") ---
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!decl.initializer) continue;
        if (!ts.isCallExpression(decl.initializer)) continue;
        if (!isRequireCallOfContent(decl.initializer)) continue;

        const name = decl.name;
        if (ts.isIdentifier(name)) {
          // const c = require("#site/content")  — no finding yet; track binding.
          requireNamespaceBindings.add(name.text);
        } else if (ts.isObjectBindingPattern(name)) {
          // const { contributions } / { contributions: x } = require("#site/content")
          let matchedAny = false;
          for (const el of name.elements) {
            const propName = el.propertyName
              ? ts.isIdentifier(el.propertyName)
                ? el.propertyName.text
                : null
              : ts.isIdentifier(el.name)
                ? el.name.text
                : null;
            if (propName === null) continue;
            const symbol = asContentSymbol(propName);
            if (symbol === null) continue;
            matchedAny = true;
            const renamed = el.propertyName !== undefined;
            findings.push({
              symbol,
              kind: renamed ? "require-named-renamed" : "require-named",
              node: el,
            });
          }
          if (!matchedAny) {
            // Destructuring require(...) without touching a guarded symbol — not
            // a violation; the namespace value is discarded.
          }
        } else {
          // Array binding etc. — fall back to require-bare for both symbols.
          for (const symbol of CONTENT_SYMBOLS) {
            findings.push({ symbol, kind: "require-bare", node: decl });
          }
        }
      }
    }

    ts.forEachChild(node, visitImports);
  }

  visitImports(sourceFile);

  // Second pass: references depending on the bindings collected above
  // (namespace member access, namespace destructure) plus dynamic import() and
  // bare require() calls anywhere in the file.
  function visitReferences(node: ts.Node): void {
    // import("#site/content") and import(`#site/content`) — forwards everything.
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = node.arguments[0];
      if (arg) {
        if (ts.isStringLiteral(arg) && isContentSpecifier(arg.text)) {
          for (const symbol of CONTENT_SYMBOLS) {
            findings.push({ symbol, kind: "dynamic-string", node });
          }
        } else if (
          ts.isNoSubstitutionTemplateLiteral(arg) &&
          isContentSpecifier(arg.text)
        ) {
          for (const symbol of CONTENT_SYMBOLS) {
            findings.push({ symbol, kind: "dynamic-template", node });
          }
        }
      }
    }

    // require("#site/content") bare (not part of a tracked variable init).
    if (ts.isCallExpression(node) && isRequireCallOfContent(node)) {
      const parent = node.parent;
      const isVarInit =
        parent &&
        ts.isVariableDeclaration(parent) &&
        parent.initializer === node;
      if (!isVarInit) {
        for (const symbol of CONTENT_SYMBOLS) {
          findings.push({ symbol, kind: "require-bare", node });
        }
      }
    }

    // X.contributions / X.resources where X is a namespace-import / require
    // binding. eslint `importNames` cannot catch this shape.
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression)
    ) {
      const symbol = asContentSymbol(node.name.text);
      if (symbol !== null) {
        if (namespaceImportBindings.has(node.expression.text)) {
          findings.push({ symbol, kind: "namespace-member", node });
        } else if (requireNamespaceBindings.has(node.expression.text)) {
          findings.push({ symbol, kind: "require-namespace-member", node });
        }
      }
    }

    // const { contributions } = X  /  const { contributions: x } = X  where X is
    // a tracked namespace binding.
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer &&
      ts.isIdentifier(node.initializer)
    ) {
      const sourceName = node.initializer.text;
      const fromImport = namespaceImportBindings.has(sourceName);
      const fromRequire = requireNamespaceBindings.has(sourceName);
      if (fromImport || fromRequire) {
        for (const el of node.name.elements) {
          const propName = el.propertyName
            ? ts.isIdentifier(el.propertyName)
              ? el.propertyName.text
              : null
            : ts.isIdentifier(el.name)
              ? el.name.text
              : null;
          if (propName === null) continue;
          const symbol = asContentSymbol(propName);
          if (symbol === null) continue;
          const renamed = el.propertyName !== undefined;
          if (fromImport) {
            findings.push({
              symbol,
              kind: renamed
                ? "namespace-destructure-renamed"
                : "namespace-destructure",
              node: el,
            });
          } else {
            findings.push({
              symbol,
              kind: renamed
                ? "require-namespace-destructure-renamed"
                : "require-namespace-destructure",
              node: el,
            });
          }
        }
      }
    }

    ts.forEachChild(node, visitReferences);
  }

  visitReferences(sourceFile);

  // Per-symbol allowlist filter: a finding is dropped when the scanned file is
  // in that symbol's authorized-helper allowlist. Cross-symbol imports survive
  // (e.g. `contributions.ts` importing `resources` is NOT allowlisted for
  // `resources`).
  return findings.filter(
    (finding) => !allowlist[finding.symbol].includes(relPath),
  );
}
