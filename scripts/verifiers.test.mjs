/**
 * verifiers.test.mjs (blog-enhanced Task 30, v4)
 *
 * Integration tests for the three new verifier scripts:
 *   - verify-pagefind-no-drafts.mjs
 *   - verify-pagefind-artifact.mjs
 *   - verify-deploy.mjs
 *
 * Vitest's include glob (vitest.config.ts) only covers `src/**`, so this
 * file uses node:test — matching the existing scripts/*.test.mjs convention.
 * Run with: `node --test scripts/verifiers.test.mjs`
 *
 * Each suite spawns the verifier as a subprocess against a real tmpdir
 * fixture (per task §Restrictions — no in-memory fs mocks).
 */
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const noDraftsScript = path.join(__dirname, "verify-pagefind-no-drafts.mjs");
const artifactScript = path.join(__dirname, "verify-pagefind-artifact.mjs");
const deployScript = path.join(__dirname, "verify-deploy.mjs");
const fetchMockLoader = path.join(__dirname, "__fetch-mock-loader.mjs");

/**
 * Build a Pagefind-style tmpdir layout under `root`:
 *   public/pagefind/fragment/<i>.pf_fragment  (uncompressed JSON, one per slug)
 *   content/posts/<slug>.mdx                  (one per post spec)
 *
 * @param {string} root
 * @param {{ slug: string, draft?: boolean, hidden?: boolean, indexed?: boolean }[]} posts
 */
function setupNoDraftsFixture(root, posts) {
  const fragmentDir = path.join(root, "public/pagefind/fragment");
  const postsDir = path.join(root, "content/posts");
  mkdirSync(fragmentDir, { recursive: true });
  mkdirSync(postsDir, { recursive: true });

  let i = 0;
  for (const p of posts) {
    const fm = [
      "---",
      `slug: ${p.slug}`,
      `title: ${p.slug}`,
      `draft: ${p.draft === true}`,
      ...(p.hidden ? ["hiddenFromLists: true"] : []),
      "---",
      "",
      "body",
    ].join("\n");
    writeFileSync(path.join(postsDir, `${p.slug}.mdx`), fm);

    if (p.indexed) {
      const json = JSON.stringify({ url: `/blog/${p.slug}/`, content: "x" });
      writeFileSync(path.join(fragmentDir, `${i}.pf_fragment`), json);
      i += 1;
    }
  }
}

/** @param {string} script @param {string[]} [args] @param {{cwd?: string, env?: NodeJS.ProcessEnv}} [opts] */
function runScript(script, args = [], opts = {}) {
  return spawnSync("node", [script, ...args], {
    encoding: "utf-8",
    cwd: opts.cwd ?? repoRoot,
    env: { ...process.env, ...(opts.env ?? {}) },
  });
}

// ─────────────────────────────────────────────────────────────────
// Suite 1: verify-pagefind-no-drafts.mjs
// ─────────────────────────────────────────────────────────────────
describe("verify-pagefind-no-drafts.mjs", () => {
  /** @type {string[]} */
  const tmpdirs = [];
  const mkTmp = () => {
    const d = mkdtempSync(path.join(os.tmpdir(), "verify-no-drafts-"));
    tmpdirs.push(d);
    return d;
  };
  after(() => {
    for (const d of tmpdirs) rmSync(d, { recursive: true, force: true });
  });

  test("pass: visible+hidden indexed, draft not indexed → exit 0", () => {
    const root = mkTmp();
    setupNoDraftsFixture(root, [
      { slug: "post-a", indexed: true },
      { slug: "post-b", indexed: true },
      { slug: "fixture-search", hidden: true, indexed: true },
      { slug: "draft-post", draft: true, indexed: false },
    ]);
    const r = runScript(noDraftsScript, [], { cwd: root });
    assert.equal(r.status, 0, `stdout=${r.stdout}\nstderr=${r.stderr}`);
    assert.match(r.stdout, /no draft slugs in index/);
  });

  test("fail: draft slug leaks into index → exit !=0 + diagnostic", () => {
    const root = mkTmp();
    setupNoDraftsFixture(root, [
      { slug: "post-a", indexed: true },
      { slug: "fixture-search", hidden: true, indexed: true },
      { slug: "leaky-draft", draft: true, indexed: true },
    ]);
    const r = runScript(noDraftsScript, [], { cwd: root });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /draft leak/);
    assert.match(r.stderr, /leaky-draft/);
  });

  test("fail: empty manifest → non-empty-index assertion fires", () => {
    const root = mkTmp();
    setupNoDraftsFixture(root, [
      { slug: "post-a", indexed: false },
      { slug: "post-b", indexed: false },
    ]);
    const r = runScript(noDraftsScript, [], { cwd: root });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /non-empty assertion failed/);
  });
});

// ─────────────────────────────────────────────────────────────────
// Suite 2: verify-pagefind-artifact.mjs
// ─────────────────────────────────────────────────────────────────
describe("verify-pagefind-artifact.mjs", () => {
  /** @type {string[]} */
  const tmpdirs = [];
  const mkTmp = () => {
    const d = mkdtempSync(path.join(os.tmpdir(), "verify-artifact-"));
    tmpdirs.push(d);
    return d;
  };
  after(() => {
    for (const d of tmpdirs) rmSync(d, { recursive: true, force: true });
  });

  /** Build source + target dirs at the script's expected relative paths. */
  function setupArtifact(root, sourceFiles, targetFiles) {
    const src = path.join(root, "public/pagefind");
    const tgt = path.join(root, ".vercel/output/static/pagefind");
    mkdirSync(src, { recursive: true });
    mkdirSync(tgt, { recursive: true });
    for (const [name, body] of Object.entries(sourceFiles)) {
      const full = path.join(src, name);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, body);
    }
    for (const [name, body] of Object.entries(targetFiles)) {
      const full = path.join(tgt, name);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, body);
    }
  }

  test("pass: source and target identical → exit 0", () => {
    const root = mkTmp();
    const files = { "pagefind.js": "x=1", "fragment/a.pf_fragment": "AAA" };
    setupArtifact(root, files, files);
    const r = runScript(artifactScript, [], { cwd: root });
    assert.equal(r.status, 0, `stdout=${r.stdout}\nstderr=${r.stderr}`);
    assert.match(r.stdout, /OK/);
  });

  test("fail: divergent file content → exit 1 + mismatch diagnostic", () => {
    const root = mkTmp();
    setupArtifact(root, { "pagefind.js": "x=1" }, { "pagefind.js": "x=2" });
    const r = runScript(artifactScript, [], { cwd: root });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /mismatch/);
  });

  test("fail: extra file in target → exit 1 + diff diagnostic", () => {
    const root = mkTmp();
    setupArtifact(root, { "pagefind.js": "x=1" }, { "pagefind.js": "x=1", "extra.js": "y=2" });
    const r = runScript(artifactScript, [], { cwd: root });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /mismatch/);
    assert.match(r.stderr, /extra\.js/);
  });
});

// ─────────────────────────────────────────────────────────────────
// Suite 3: verify-deploy.mjs (with mocked fetch via --import loader)
// ─────────────────────────────────────────────────────────────────
describe("verify-deploy.mjs", () => {
  const deployUrl = "https://example.test";
  const homeUrl = `${deployUrl}/`;
  const entryUrl = `${deployUrl}/pagefind/pagefind-entry.json`;
  const fixtureUrl = `${deployUrl}/blog/fixture-search`;

  /** @param {Record<string, {status:number, body?:string, throw?:string}>} map */
  function runDeploy(map) {
    return spawnSync("node", ["--import", fetchMockLoader, deployScript, deployUrl], {
      encoding: "utf-8",
      cwd: repoRoot,
      env: { ...process.env, FETCH_MOCK: JSON.stringify(map) },
    });
  }

  test("pass: all three checks 200 + valid JSON → exit 0", () => {
    const r = runDeploy({
      [homeUrl]: { status: 200, body: "<html></html>" },
      [entryUrl]: { status: 200, body: '{"version":"1"}' },
      [fixtureUrl]: { status: 200, body: "ok" },
    });
    assert.equal(r.status, 0, `stdout=${r.stdout}\nstderr=${r.stderr}`);
    assert.match(r.stdout, /verification passed/);
  });

  test("fail: home returns 500 → exit 1 + diagnostic naming /", () => {
    const r = runDeploy({
      [homeUrl]: { status: 500 },
      [entryUrl]: { status: 200, body: '{"version":"1"}' },
      [fixtureUrl]: { status: 200, body: "ok" },
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, new RegExp(`${homeUrl.replace(/[/.]/g, "\\$&")}`));
    assert.match(r.stderr, /500/);
  });

  test("fail: pagefind-entry returns 404 → exit 1 + diagnostic", () => {
    const r = runDeploy({
      [homeUrl]: { status: 200, body: "ok" },
      [entryUrl]: { status: 404 },
      [fixtureUrl]: { status: 200, body: "ok" },
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /pagefind-entry\.json/);
    assert.match(r.stderr, /404/);
  });

  test("fail: pagefind-entry 200 but invalid JSON → exit 1 + diagnostic", () => {
    const r = runDeploy({
      [homeUrl]: { status: 200, body: "ok" },
      [entryUrl]: { status: 200, body: "<not-json>" },
      [fixtureUrl]: { status: 200, body: "ok" },
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /invalid JSON/);
  });

  test("fail: fixture-search returns 404 → exit 1 + diagnostic", () => {
    const r = runDeploy({
      [homeUrl]: { status: 200, body: "ok" },
      [entryUrl]: { status: 200, body: '{"v":1}' },
      [fixtureUrl]: { status: 404 },
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /fixture-search/);
    assert.match(r.stderr, /404/);
  });
});
