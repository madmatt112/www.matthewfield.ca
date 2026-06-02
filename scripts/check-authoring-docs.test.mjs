/**
 * check-authoring-docs.test.mjs
 *
 * Self-tests for scripts/check-authoring-docs.mjs. Runs via `node --test`.
 *
 * Vitest's include pattern targets `src/**`, so this file lives outside
 * Vitest's scope on purpose — invoke with
 * `node --test scripts/check-authoring-docs.test.mjs`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import {
  checkHeadings,
  CANONICAL_HEADINGS,
  SLASH_PAGES_HEADINGS,
  AUTHORING_DOCS,
} from "./check-authoring-docs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "check-authoring-docs.mjs");

const SUBJECT_REL = "docs/slash-pages-authoring.md";
const subjectHeadings = SLASH_PAGES_HEADINGS;

function makeTmp() {
  return mkdtempSync(path.join(tmpdir(), "check-authoring-docs-"));
}

function runScript(cwd) {
  return spawnSync(process.execPath, [SCRIPT], { cwd, encoding: "utf8" });
}

function writeDocs(dir, overrides = {}) {
  for (const { path: rel, headings } of AUTHORING_DOCS) {
    const content = rel in overrides ? overrides[rel] : headings.join("\n\n");
    const abs = path.join(dir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
}

// --- Pure core ---

test("checkHeadings — all headings present → exitCode 0, no missing", () => {
  const ALL_PRESENT = CANONICAL_HEADINGS.join("\n\n");
  const result = checkHeadings(ALL_PRESENT, CANONICAL_HEADINGS);
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.missing, []);
});

test("checkHeadings — one heading missing → non-zero, names it", () => {
  const text = CANONICAL_HEADINGS.slice(1).join("\n\n");
  const result = checkHeadings(text, CANONICAL_HEADINGS);
  assert.notEqual(result.exitCode, 0);
  assert.deepEqual(result.missing, [CANONICAL_HEADINGS[0]]);
});

test("checkHeadings — zero-byte text → every heading missing, non-zero", () => {
  const result = checkHeadings("", CANONICAL_HEADINGS);
  assert.notEqual(result.exitCode, 0);
  assert.deepEqual(result.missing, CANONICAL_HEADINGS);
});

// --- CLI ---

test("CLI — all docs present, all headings present → exit 0, no ::warning::", () => {
  const dir = makeTmp();
  try {
    writeDocs(dir, {});
    const r = runScript(dir);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.doesNotMatch(r.stdout, /::warning::/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI — one heading missing in subject doc (sibling full) → non-zero, ::warning:: contains subject path", () => {
  const dir = makeTmp();
  try {
    writeDocs(dir, {
      [SUBJECT_REL]: subjectHeadings.slice(1).join("\n\n"),
    });
    const r = runScript(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /::warning::/);
    assert.ok(
      r.stdout.includes(SUBJECT_REL),
      `expected stdout to contain "${SUBJECT_REL}", got: ${r.stdout}`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI — no docs written → non-zero, 'author doc not found' stderr line per doc, no ::warning::", () => {
  const dir = makeTmp();
  try {
    const r = runScript(dir);
    assert.notEqual(r.status, 0);
    const notFoundLines = r.stderr
      .split("\n")
      .filter((l) => l.includes("author doc not found"));
    assert.equal(
      notFoundLines.length,
      AUTHORING_DOCS.length,
      `expected ${AUTHORING_DOCS.length} not-found lines, got ${notFoundLines.length}: ${r.stderr}`,
    );
    assert.doesNotMatch(r.stdout, /::warning::/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI — zero-byte subject doc (sibling full) → non-zero, warningCount === subjectHeadings.length", () => {
  const dir = makeTmp();
  try {
    writeDocs(dir, { [SUBJECT_REL]: "" });
    const r = runScript(dir);
    assert.notEqual(r.status, 0);
    const warningCount = (r.stdout.match(/::warning::/g) || []).length;
    assert.equal(
      warningCount,
      subjectHeadings.length,
      `expected ${subjectHeadings.length} warnings, got ${warningCount}`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
