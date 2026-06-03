/**
 * verify-chosen-path.test.mjs (blog-enhanced Task 25, v4)
 *
 * Runs via `node --test scripts/verify-chosen-path.test.mjs`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readChosenPath, parseDiff, checkChosenPath } from "./verify-chosen-path.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixDir = path.join(__dirname, "__fixtures__/chosen-path");

const load = (name) => readFileSync(path.join(fixDir, name), "utf8");

test("readChosenPath parses HOOK", () => {
  assert.equal(readChosenPath("CHOSEN_PATH: HOOK\n\n..."), "HOOK");
});

test("readChosenPath parses SCRIPT", () => {
  assert.equal(readChosenPath("CHOSEN_PATH: SCRIPT\n"), "SCRIPT");
});

test("readChosenPath returns null on missing directive", () => {
  assert.equal(readChosenPath("# heading\n"), null);
});

test("HOOK compliant diff passes", () => {
  const diff = parseDiff(load("hook-compliant.diff"));
  assert.deepEqual(checkChosenPath("HOOK", diff), []);
});

test("HOOK non-compliant diff fails", () => {
  const diff = parseDiff(load("hook-noncompliant.diff"));
  const errs = checkChosenPath("HOOK", diff);
  assert.ok(errs.length >= 1, `expected errors, got: ${JSON.stringify(errs)}`);
  assert.ok(
    errs.some((e) => /must NOT add scripts\/verify-series-order\.mjs/.test(e)),
    `expected forbidden-script diagnostic, got: ${JSON.stringify(errs)}`,
  );
  assert.ok(
    errs.some((e) => /must NOT modify package\.json scripts\.build/.test(e)),
    `expected forbidden-pkg-build diagnostic, got: ${JSON.stringify(errs)}`,
  );
});

test("SCRIPT compliant diff passes", () => {
  const diff = parseDiff(load("script-compliant.diff"));
  assert.deepEqual(checkChosenPath("SCRIPT", diff), []);
});

test("SCRIPT non-compliant diff fails", () => {
  const diff = parseDiff(load("script-noncompliant.diff"));
  const errs = checkChosenPath("SCRIPT", diff);
  assert.ok(errs.length >= 1, `expected errors, got: ${JSON.stringify(errs)}`);
  assert.ok(
    errs.some((e) => /must add scripts\/verify-series-order\.mjs/.test(e)),
    `expected missing-script diagnostic, got: ${JSON.stringify(errs)}`,
  );
  assert.ok(
    errs.some((e) => /must NOT add a collision-check clause to velite\.config\.ts/.test(e)),
    `expected forbidden-velite-clause diagnostic, got: ${JSON.stringify(errs)}`,
  );
});
