/**
 * check-playground-css.test.mjs
 *
 * Self-tests for scripts/check-playground-css.mjs. Runs via `node --test`.
 *
 * Vitest's include pattern targets `src/**`, so this file lives outside
 * Vitest's scope on purpose — invoke with
 * `node --test scripts/check-playground-css.test.mjs`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { checkCss, PLAYGROUND_DIR } from "./check-playground-css.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "check-playground-css.mjs");

const CLEAN_MODULE = `.root {
  font-family: Georgia, serif;
  color: #6b1f1f;
}

h1 {
  margin: 0;
}
`;

function makeTmp() {
  return mkdtempSync(path.join(tmpdir(), "check-playground-css-"));
}

function writeModule(dir, contents) {
  const abs = path.join(dir, PLAYGROUND_DIR, "sample", "styles.module.css");
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, contents);
}

function runScript(cwd) {
  return spawnSync(process.execPath, [SCRIPT], { cwd, encoding: "utf8" });
}

// --- Pure core ---

test("checkCss — clean module → ok, no violations", () => {
  const result = checkCss(CLEAN_MODULE);
  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test("checkCss — forbidden constructs named only in a comment → ok", () => {
  const result = checkCss(
    `/* No :global, no global @import, no composes … from global here. */\n.root { color: red; }`,
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test("checkCss — :global → not ok", () => {
  const result = checkCss(`:global(.host) { color: red; }`);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.includes(":global")));
});

test("checkCss — global @import → not ok", () => {
  const result = checkCss(`@import "../theme.css";\n.root { color: red; }`);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.includes("@import")));
});

test("checkCss — @import url(...) global form → not ok", () => {
  const result = checkCss(`@import url("../theme.css");`);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.includes("@import")));
});

test("checkCss — @import of a *.module.css → ok", () => {
  const result = checkCss(`@import "./shared.module.css";\n.root {}`);
  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test("checkCss — composes … from global → not ok", () => {
  const result = checkCss(`.root { composes: btn from global; }`);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.includes("composes")));
});

// --- CLI ---

test("CLI — clean module → exit 0, no ::warning::", () => {
  const dir = makeTmp();
  try {
    writeModule(dir, CLEAN_MODULE);
    const r = runScript(dir);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.doesNotMatch(r.stdout, /::warning::/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI — :global module → non-zero, ::warning::", () => {
  const dir = makeTmp();
  try {
    writeModule(dir, `:global(.host) { color: red; }`);
    const r = runScript(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /::warning::/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI — global @import module → non-zero, ::warning::", () => {
  const dir = makeTmp();
  try {
    writeModule(dir, `@import "../theme.css";\n.root {}`);
    const r = runScript(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /::warning::/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI — composes … from global module → non-zero, ::warning::", () => {
  const dir = makeTmp();
  try {
    writeModule(dir, `.root { composes: btn from global; }`);
    const r = runScript(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /::warning::/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
