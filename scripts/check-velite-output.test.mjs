/**
 * check-velite-output.test.mjs
 *
 * Self-tests for scripts/check-velite-output.mjs. Runs via `node --test`.
 *
 * Vitest's include pattern targets `src/**`, so this file lives outside
 * Vitest's scope on purpose — invoke with
 * `node --test scripts/check-velite-output.test.mjs`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { verifyCiWiring, checkProjectsShape } from "./check-velite-output.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixDir = path.join(__dirname, "__fixtures__/check-velite");
const SCRIPT = path.join(__dirname, "check-velite-output.mjs");

function makeTmp() {
  return mkdtempSync(path.join(tmpdir(), "check-velite-"));
}

function runScript(cwd) {
  return spawnSync(process.execPath, [SCRIPT], { cwd, encoding: "utf8" });
}

test("good-ci.yml — 2 matching steps → exit 0", () => {
  const result = verifyCiWiring(path.join(fixDir, "good-ci.yml"));
  assert.equal(result.exitCode, 0, `diagnostic: ${result.diagnostic}`);
  assert.equal(result.ok, true);
});

test("bad-only-one-step.yml — 1 matching step → non-zero with `expected 2, got 1`", () => {
  const result = verifyCiWiring(path.join(fixDir, "bad-only-one-step.yml"));
  assert.notEqual(result.exitCode, 0);
  assert.equal(result.ok, false);
  assert.match(result.diagnostic, /expected 2, got 1/);
});

test("bad-three-steps.yml — 3 matching steps → non-zero with `expected 2, got 3`", () => {
  const result = verifyCiWiring(path.join(fixDir, "bad-three-steps.yml"));
  assert.notEqual(result.exitCode, 0);
  assert.equal(result.ok, false);
  assert.match(result.diagnostic, /expected 2, got 3/);
});

test("checkProjectsShape — empty array passes", () => {
  const result = checkProjectsShape([]);
  assert.equal(result.exitCode, 0);
  assert.match(result.diagnostic, /0 entries \(0 drafts, 0 published\)/);
});

test("checkProjectsShape — valid entries pass with counts", () => {
  const result = checkProjectsShape([
    { slug: "a", title: "A", date: "2026-01-01", draft: false },
    { slug: "b", title: "B", date: "2026-01-02", draft: true },
  ]);
  assert.equal(result.exitCode, 0);
  assert.match(result.diagnostic, /2 entries \(1 drafts, 1 published\)/);
});

test("checkProjectsShape — non-array fails", () => {
  const result = checkProjectsShape({ not: "array" });
  assert.notEqual(result.exitCode, 0);
  assert.match(result.diagnostic, /not an array/);
});

test("checkProjectsShape — entry missing required key fails with index", () => {
  const result = checkProjectsShape([
    { slug: "a", title: "A", date: "2026-01-01", draft: false },
    { slug: "b", title: "B", date: "2026-01-02" }, // missing `draft`
  ]);
  assert.notEqual(result.exitCode, 0);
  assert.match(result.diagnostic, /index 1/);
  assert.match(result.diagnostic, /draft/);
});

test("checkProjectsShape — entry with wrong type for `draft` fails with index", () => {
  const result = checkProjectsShape([
    { slug: "a", title: "A", date: "2026-01-01", draft: "false" },
  ]);
  assert.notEqual(result.exitCode, 0);
  assert.match(result.diagnostic, /index 0/);
  assert.match(result.diagnostic, /draft/);
  assert.match(result.diagnostic, /expected boolean/);
});

test("CLI default-mode — valid .velite/projects.json → exit 0 with OK stdout", () => {
  const dir = makeTmp();
  try {
    mkdirSync(path.join(dir, ".velite"));
    writeFileSync(
      path.join(dir, ".velite/projects.json"),
      JSON.stringify([
        { slug: "a", title: "A", date: "2026-01-01", draft: false },
        { slug: "b", title: "B", date: "2026-01-02", draft: true },
      ]),
    );
    const r = runScript(dir);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /\[check-velite-output\] OK — \d+ entries/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI default-mode — missing .velite/projects.json → non-zero exit, stderr mentions absent", () => {
  const dir = makeTmp();
  try {
    const r = runScript(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /\.velite\/projects\.json is absent/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI default-mode — malformed entry → non-zero exit, stderr names entry index", () => {
  const dir = makeTmp();
  try {
    mkdirSync(path.join(dir, ".velite"));
    writeFileSync(
      path.join(dir, ".velite/projects.json"),
      JSON.stringify([
        { slug: "a", title: "A", date: "2026-01-01", draft: false },
        { slug: "b", title: "B", date: "2026-01-02" }, // missing draft
      ]),
    );
    const r = runScript(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /index 1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
