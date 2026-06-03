/**
 * verify-ci-topology.test.mjs
 *
 * Self-tests for scripts/verify-ci-topology.mjs. Runs via `node --test`.
 *
 * Vitest's include pattern (vitest.config.ts) targets `src/**`, so this
 * file lives outside Vitest's scope on purpose — invoke with
 * `node --test scripts/verify-ci-topology.test.mjs`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verify } from "./verify-ci-topology.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixDir = path.join(__dirname, "__fixtures__/ci-topology");

function run(name, opts) {
  const file = path.join(fixDir, name);
  return verify(readFileSync(file, "utf8"), name, opts);
}

test("good.yml passes (0 errors) under PRE phase", () => {
  // good.yml predates the blog-enhanced literals; pin the phase explicitly
  // so the test does not depend on the repo's __ci-topology-state.txt
  // marker (which is PHASE_POST_23.3 after Task 23.3 lands).
  assert.deepEqual(run("good.yml", { phase: "PHASE_PRE_23" }), []);
});

test("real ci.yml passes (0 errors) — default flag off", () => {
  const real = path.join(__dirname, "..", ".github/workflows/ci.yml");
  assert.deepEqual(
    verify(readFileSync(real, "utf8"), "ci.yml", {
      literalsRequired: false,
      phase: "PHASE_PRE_23",
    }),
    [],
  );
});

test("bad-workflow-env.yml — pin (a) workflow-level", () => {
  const errs = run("bad-workflow-env.yml");
  assert.ok(errs.length >= 1, `expected errors, got: ${JSON.stringify(errs)}`);
  assert.ok(
    errs.some((e) => /pin \(a\): workflow-level env contains BLOG_INCLUDE_DRAFTS/.test(e)),
    `expected pin (a) workflow-level diagnostic, got: ${JSON.stringify(errs)}`,
  );
});

test("bad-job-env.yml — pin (a) job-level", () => {
  const errs = run("bad-job-env.yml");
  assert.ok(errs.length >= 1);
  assert.ok(
    errs.some((e) => /pin \(a\): job ".*" env contains BLOG_INCLUDE_DRAFTS/.test(e)),
    `expected pin (a) job-level diagnostic, got: ${JSON.stringify(errs)}`,
  );
});

test("bad-build2-env.yml — pin (b)", () => {
  const errs = run("bad-build2-env.yml");
  assert.ok(
    errs.some((e) => /pin \(b\):.*Build 2 \(production-mode\).*BLOG_INCLUDE_DRAFTS/.test(e)),
    `expected pin (b) diagnostic, got: ${JSON.stringify(errs)}`,
  );
});

test("bad-cleanup-missing-always.yml — pin (c)", () => {
  const errs = run("bad-cleanup-missing-always.yml");
  assert.ok(
    errs.some((e) => /pin \(c\):.*Clean for Build 2.*if: always/.test(e)),
    `expected pin (c) diagnostic, got: ${JSON.stringify(errs)}`,
  );
});

test("bad-sentinel-order.yml — pin (d)", () => {
  const errs = run("bad-sentinel-order.yml");
  assert.ok(
    errs.some((e) => /pin \(d\):.*Touch Build 1 sentinel.*must precede/.test(e)),
    `expected pin (d) diagnostic, got: ${JSON.stringify(errs)}`,
  );
});

test("bad-verify-missing.yml — missing step is fatal", () => {
  const errs = run("bad-verify-missing.yml");
  assert.ok(
    errs.some((e) => /missing step:.*Verify production build \(Build 2\)/.test(e)),
    `expected missing-step diagnostic for verify step, got: ${JSON.stringify(errs)}`,
  );
});

// ---------------------------------------------------------------------
// blog-enhanced (Task 25) — flag-gated literal checks
// ---------------------------------------------------------------------

test("good-enhanced.yml passes when flag is ON", () => {
  const errs = run("good-enhanced.yml", { literalsRequired: true, phase: "PHASE_PRE_23" });
  assert.deepEqual(errs, []);
});

test("bad-missing-pagefind-crawl — passes when flag OFF, fails when flag ON", () => {
  const errsOff = run("bad-missing-pagefind-crawl.yml", {
    literalsRequired: false,
    phase: "PHASE_PRE_23",
  });
  assert.deepEqual(errsOff, []);

  const errsOn = run("bad-missing-pagefind-crawl.yml", {
    literalsRequired: true,
    phase: "PHASE_PRE_23",
  });
  assert.ok(
    errsOn.some((e) => /missing step:.*Pagefind crawl \(Build 2\)/.test(e)),
    `expected missing-step diagnostic for Pagefind crawl, got: ${JSON.stringify(errsOn)}`,
  );
});

test("bad-deploy-before-artifact — enhanced-order fails when flag ON", () => {
  const errs = run("bad-deploy-before-artifact.yml", {
    literalsRequired: true,
    phase: "PHASE_PRE_23",
  });
  assert.ok(
    errs.some(
      (e) =>
        /enhanced-order: step "Verify Pagefind artifact in .vercel\/output".*must follow "Vercel build"/.test(
          e,
        ) ||
        /enhanced-order: step "Vercel deploy \(Build 2\)".*must follow "Verify Pagefind artifact in .vercel\/output"/.test(
          e,
        ),
    ),
    `expected enhanced-order diagnostic for deploy/artifact, got: ${JSON.stringify(errs)}`,
  );
});

test("bad-deploy-wrong-group — enhanced-group fails when flag ON", () => {
  const errs = run("bad-deploy-wrong-group.yml", { literalsRequired: true, phase: "PHASE_PRE_23" });
  assert.ok(
    errs.some((e) => /enhanced-group: step "Vercel deploy \(Build 2\)" found in job/.test(e)),
    `expected enhanced-group diagnostic, got: ${JSON.stringify(errs)}`,
  );
});

test("meta-gate — PHASE_POST_23.3 with flag explicitly =0 fails", () => {
  const real = path.join(__dirname, "..", ".github/workflows/ci.yml");
  const errs = verify(readFileSync(real, "utf8"), "ci.yml", {
    literalsRequired: "0",
    phase: "PHASE_POST_23.3",
    silent: true,
  });
  assert.ok(
    errs.some((e) =>
      /meta-gate: env var BLOG_ENHANCED_CI_LITERALS_REQUIRED is explicitly =0 at PHASE_POST_23\.3/.test(
        e,
      ),
    ),
    `expected meta-gate-explicit-zero diagnostic, got: ${JSON.stringify(errs)}`,
  );
});

test("meta-gate — PHASE_POST_23.3 with flag unset warns but passes", () => {
  const real = path.join(__dirname, "..", ".github/workflows/ci.yml");
  const errs = verify(readFileSync(real, "utf8"), "ci.yml", {
    literalsRequired: undefined,
    phase: "PHASE_POST_23.3",
    silent: true,
  });
  assert.deepEqual(
    errs,
    [],
    `expected no errors when flag unset under PHASE_POST, got: ${JSON.stringify(errs)}`,
  );
});
