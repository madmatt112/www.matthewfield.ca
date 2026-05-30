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
import { checkHeadings, CANONICAL_HEADINGS } from "./check-authoring-docs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "check-authoring-docs.mjs");
const DOC_REL_PATH = "docs/contributions-and-resources-authoring.md";

const ALL_PRESENT = CANONICAL_HEADINGS.join("\n\n");

function makeTmp() {
  return mkdtempSync(path.join(tmpdir(), "check-authoring-docs-"));
}

function runScript(cwd) {
  return spawnSync(process.execPath, [SCRIPT], { cwd, encoding: "utf8" });
}

function writeDoc(dir, content) {
  mkdirSync(path.join(dir, "docs"), { recursive: true });
  writeFileSync(path.join(dir, DOC_REL_PATH), content);
}

// --- Pure core ---

test("checkHeadings — all headings present → exitCode 0, no missing", () => {
  const result = checkHeadings(ALL_PRESENT);
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.missing, []);
});

test("checkHeadings — one heading missing → non-zero, names it", () => {
  const text = CANONICAL_HEADINGS.slice(1).join("\n\n");
  const result = checkHeadings(text);
  assert.notEqual(result.exitCode, 0);
  assert.deepEqual(result.missing, [CANONICAL_HEADINGS[0]]);
});

test("checkHeadings — zero-byte text → every heading missing, non-zero", () => {
  const result = checkHeadings("");
  assert.notEqual(result.exitCode, 0);
  assert.deepEqual(result.missing, CANONICAL_HEADINGS);
});

// --- CLI ---

test("CLI — all headings present → exit 0, no stdout", () => {
  const dir = makeTmp();
  try {
    writeDoc(dir, ALL_PRESENT);
    const r = runScript(dir);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(r.stdout, "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI — one heading missing → non-zero exit, stdout ::warning::", () => {
  const dir = makeTmp();
  try {
    writeDoc(dir, CANONICAL_HEADINGS.slice(1).join("\n\n"));
    const r = runScript(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /::warning::/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI — doc missing → non-zero exit, stderr, no annotation", () => {
  const dir = makeTmp();
  try {
    const r = runScript(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /author doc not found/);
    assert.doesNotMatch(r.stdout, /::warning::/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI — zero-byte doc → non-zero exit, per-heading warnings", () => {
  const dir = makeTmp();
  try {
    writeDoc(dir, "");
    const r = runScript(dir);
    assert.notEqual(r.status, 0);
    const warningCount = (r.stdout.match(/::warning::/g) || []).length;
    assert.equal(warningCount, CANONICAL_HEADINGS.length);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
