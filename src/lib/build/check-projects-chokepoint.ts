// Chokepoint scanner for the `projects` collection (Component 11 v4 — Req 7.4).
//
// Threat model: defends against ACCIDENTAL import of the Velite-emitted
// `projects` symbol from `#site/content` outside the chokepoint module
// `src/lib/projects.ts` in a single-author repo. Out-of-scope shapes
// (alias-through-local, computed-string specifier, sub-path imports) are
// documented for transparency in author doc §9; they are NOT a bypass menu
// and reviewers will reject them.
//
// Algorithm:
//   1. Read the file via `fs.readFileSync`.
//   2. Parse via the TypeScript compiler API into a SourceFile AST.
//   3. Walk the AST detecting the 17 coverage-matrix shapes listed below.
//   4. Return one `ScanFinding` per violation; empty array on no findings.
//
// `isContentSpecifier` policy: exact equality `=== "#site/content"`.
// Sub-path imports (e.g. `#site/content/foo`) are intentionally OUT OF SCOPE.
//
// The 17 shapes (kind names are the canonical discriminator):
//   ES static imports (8):
//     1. named                              — import { projects } from "#site/content"
//     2. named-renamed                      — import { projects as p } from "#site/content"
//     3. namespace-member                   — import * as c from "#site/content"; c.projects
//     4. namespace-destructure              — const { projects } = c (c bound to ns import)
//     5. namespace-destructure-renamed      — const { projects: p } = c
//     6. barrel-star                        — export * from "#site/content"
//     7. barrel-named                       — export { projects } from "#site/content"
//     8. barrel-named-renamed               — export { projects as p } from "#site/content"
//   ES dynamic + type-only (3):
//     9. dynamic-string                     — import("#site/content")
//    10. dynamic-template                   — import(`#site/content`)  (no expressions)
//    11. type-only-named                    — import type { projects } from "#site/content"
//   CommonJS require (6):
//    12. require-named                      — const { projects } = require("#site/content")
//    13. require-named-renamed              — const { projects: p } = require("#site/content")
//    14. require-namespace-member           — const c = require("#site/content"); c.projects
//    15. require-namespace-destructure      — const c = require(...); const { projects } = c
//    16. require-namespace-destructure-renamed — const c = require(...); const { projects: p } = c
//    17. require-bare                       — require("#site/content")  (any other shape)

import fs from "node:fs";
import ts from "typescript";

const CONTENT_SPECIFIER = "#site/content";
const PROJECTS_NAME = "projects";

export type ScanFindingKind =
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

export interface ScanFinding {
  kind: ScanFindingKind;
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
 * literal-string specifier matching `#site/content`. Returns the specifier
 * text shape for distinguishing string vs. template (not currently used —
 * `require` accepts only string literals at runtime anyway).
 */
function isRequireCallOfContent(node: ts.CallExpression): boolean {
  if (!ts.isIdentifier(node.expression)) return false;
  if (node.expression.text !== "require") return false;
  if (node.arguments.length !== 1) return false;
  const spec = literalSpecifier(node.arguments[0]);
  return spec !== null && isContentSpecifier(spec);
}

/**
 * Walks the SourceFile AST detecting the 17 chokepoint-violation shapes.
 * Returns one ScanFinding per detected shape; empty array means no
 * violations. Pure function aside from the initial file read.
 */
export function runChokepointScan(filePath: string): ScanFinding[] {
  const source = fs.readFileSync(filePath, "utf-8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );

  const findings: ScanFinding[] = [];

  // Track local identifiers bound to namespace imports / require results so
  // we can detect subsequent `.projects` member access and destructuring.
  // The binding identifier name -> the node where it was introduced.
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
            // Namespace imports themselves are not a finding until the
            // `projects` symbol is referenced via member or destructure.
          }

          // import { projects } from "#site/content"
          // import { projects as p } from "#site/content"
          // import type { projects } from "#site/content"
          if (ts.isNamedImports(nb)) {
            for (const element of nb.elements) {
              const importedName = element.propertyName?.text ?? element.name.text;
              if (importedName !== PROJECTS_NAME) continue;
              const renamed = element.propertyName !== undefined;
              if (isTypeOnly || element.isTypeOnly) {
                findings.push({ kind: "type-only-named", node: element });
              } else if (renamed) {
                findings.push({ kind: "named-renamed", node: element });
              } else {
                findings.push({ kind: "named", node: element });
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
        // export * from "#site/content"
        if (!node.exportClause) {
          findings.push({ kind: "barrel-star", node });
        } else if (ts.isNamespaceExport(node.exportClause)) {
          // export * as ns from "#site/content"  — treat as barrel-star.
          findings.push({ kind: "barrel-star", node });
        } else if (ts.isNamedExports(node.exportClause)) {
          // export { projects } from "#site/content"
          // export { projects as p } from "#site/content"
          for (const element of node.exportClause.elements) {
            const exportedSource = element.propertyName?.text ?? element.name.text;
            if (exportedSource !== PROJECTS_NAME) continue;
            const renamed = element.propertyName !== undefined;
            findings.push({
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
          // const { projects } = require("#site/content")
          // const { projects: p } = require("#site/content")
          let matched = false;
          for (const el of name.elements) {
            const propName = el.propertyName
              ? ts.isIdentifier(el.propertyName)
                ? el.propertyName.text
                : null
              : ts.isIdentifier(el.name)
                ? el.name.text
                : null;
            if (propName !== PROJECTS_NAME) continue;
            matched = true;
            const renamed = el.propertyName !== undefined;
            findings.push({
              kind: renamed ? "require-named-renamed" : "require-named",
              node: el,
            });
          }
          if (!matched) {
            // Destructuring require(...) without touching `projects` — not a
            // violation; nothing to track because the namespace value is
            // discarded.
          }
        } else {
          // Array binding etc. — fall back to require-bare.
          findings.push({ kind: "require-bare", node: decl });
        }
      }
    }

    ts.forEachChild(node, visitImports);
  }

  visitImports(sourceFile);

  // Second pass: detect references that depend on the bindings collected above
  // (namespace member access, namespace destructure) plus dynamic import() and
  // bare require() calls anywhere in the file.
  function visitReferences(node: ts.Node): void {
    // import("#site/content") and import(`#site/content`)
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = node.arguments[0];
      if (arg) {
        if (ts.isStringLiteral(arg) && isContentSpecifier(arg.text)) {
          findings.push({ kind: "dynamic-string", node });
        } else if (ts.isNoSubstitutionTemplateLiteral(arg) && isContentSpecifier(arg.text)) {
          findings.push({ kind: "dynamic-template", node });
        }
      }
    }

    // require("#site/content") bare (not part of a tracked variable init).
    if (ts.isCallExpression(node) && isRequireCallOfContent(node)) {
      const parent = node.parent;
      const isVarInit = parent && ts.isVariableDeclaration(parent) && parent.initializer === node;
      if (!isVarInit) {
        findings.push({ kind: "require-bare", node });
      }
    }

    // X.projects where X is a namespace-import binding.
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.name.text === PROJECTS_NAME
    ) {
      if (namespaceImportBindings.has(node.expression.text)) {
        findings.push({ kind: "namespace-member", node });
      } else if (requireNamespaceBindings.has(node.expression.text)) {
        findings.push({ kind: "require-namespace-member", node });
      }
    }

    // const { projects } = X  /  const { projects: p } = X  where X is a tracked
    // namespace binding.
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
          if (propName !== PROJECTS_NAME) continue;
          const renamed = el.propertyName !== undefined;
          if (fromImport) {
            findings.push({
              kind: renamed ? "namespace-destructure-renamed" : "namespace-destructure",
              node: el,
            });
          } else {
            findings.push({
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

  return findings;
}
