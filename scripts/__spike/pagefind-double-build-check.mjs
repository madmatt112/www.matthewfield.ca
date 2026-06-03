#!/usr/bin/env node
// Task 0 spike: validate the v3+v4 Pagefind crawl mechanism BEFORE
// implementing blog-enhanced. Implements the 13-step shell-script spike
// from design.md §"Pre-implementation pipeline spike (v4 — Task 0,
// REWRITTEN per r3 P0 #3)" as a re-runnable Node ESM script.
//
// Acceptance criteria (all six must hold):
//   1. unlinked page reachable via direct URL
//   2. unlinked page NOT in link-walk crawl (canary check)
//   3. --input-file retrieves the unlinked page
//   4. --adjust-extension produces .html files from extensionless URLs
//   5. Pagefind index contains the canary phrase
//   6. master-timeout smoke test exits non-zero within budget
//
// Deviation from design: rather than running `pnpm build` + `next start`
// (slow, fragile against the in-flight blog-core typecheck), we serve a
// minimal static fixture directory with a tiny Node http server. The
// spike's job is to validate the pipeline mechanism (wget flags +
// Pagefind index behaviour), not to validate blog-core's build. The
// fixture includes:
//   - /            — root index linking to /blog/ and /spike-extensionless
//   - /blog/       — extensionless directory-index URL
//   - /spike-extensionless — true extensionless LEAF URL; only saved as
//     `spike-extensionless.html` when --adjust-extension is set
//     (this is what actually proves the flag is doing its job)
//   - /__spike/unlinked.html — present on disk, NOT linked from anywhere
//     (validates --input-file)

import { spawnSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..", "..");
const SITE_PORT = 3013;
const HANG_PORT = 3099;
const FIXTURE_DIR = path.join(REPO_ROOT, "public", "__spike");
const SITE_DIR = path.join(REPO_ROOT, "public", "__spike-site");
// WGET_OUT lives under os.tmpdir() so a re-run never clobbers the repo-root
// `out/` directory that `next export` writes to.
const WGET_OUT = path.join(os.tmpdir(), `spike-wget-${process.pid}`);
const PF_OUT = "/tmp/pf-spike";
const URLS_FILE = "/tmp/spike-urls.txt";

// ---------------------------------------------------------------------------
// Transcript capture (also used for SPIKE-CHECKSUM).
// ---------------------------------------------------------------------------
const transcript = [];
function log(line) {
  const s = String(line);
  transcript.push(s);
  process.stdout.write(s + "\n");
}
function logErr(line) {
  const s = String(line);
  transcript.push(s);
  process.stderr.write(s + "\n");
}

function runBash(label, cmd) {
  log(`$ ${label}`);
  const r = spawnSync("bash", ["-c", cmd], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  if (r.stdout) log(r.stdout.trimEnd());
  if (r.stderr) logErr(r.stderr.trimEnd());
  log(`(exit=${r.status})`);
  return r;
}

// ---------------------------------------------------------------------------
// Minimal static server for the spike (deviation from `pnpm build`).
// ---------------------------------------------------------------------------
function buildFixtureSite() {
  rmSync(SITE_DIR, { recursive: true, force: true });
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
  mkdirSync(path.join(SITE_DIR, "blog"), { recursive: true });
  mkdirSync(path.join(SITE_DIR, "__spike"), { recursive: true });
  mkdirSync(FIXTURE_DIR, { recursive: true });

  writeFileSync(
    path.join(SITE_DIR, "index.html"),
    `<!DOCTYPE html><html><head><title>Spike Root</title></head>
<body><h1>Spike Root</h1>
<p>This page links to <a href="/blog/">blog index</a>
and to <a href="/spike-extensionless">a true extensionless leaf URL</a>.</p>
</body></html>\n`,
  );

  // Extensionless directory-index URL — served at /blog/. wget produces
  // `blog/index.html` for this regardless of --adjust-extension, so it
  // does NOT by itself prove the flag is working.
  writeFileSync(
    path.join(SITE_DIR, "blog", "index.html"),
    `<!DOCTYPE html><html><head><title>Blog Index</title></head>
<body><article data-pagefind-body>
<h1>Blog Index</h1>
<p>Linked from root. Does not mention the canary.</p>
</article></body></html>\n`,
  );

  // True extensionless LEAF URL — served at /spike-extensionless (no
  // trailing slash). wget only produces `spike-extensionless.html` for
  // this when `--adjust-extension` is set; without the flag, wget saves
  // it as the extensionless name `spike-extensionless`. This is what
  // makes criterion 4 a real test of the flag.
  writeFileSync(
    path.join(SITE_DIR, "spike-extensionless.html"),
    `<!DOCTYPE html><html><head><title>Spike Extensionless</title></head>
<body><article data-pagefind-body>
<h1>Spike Extensionless Leaf</h1>
<p>Served at /spike-extensionless with Content-Type text/html. wget
needs --adjust-extension to save this as spike-extensionless.html.</p>
</article></body></html>\n`,
  );

  // The UNLINKED page — present on disk but no link points to it.
  // Mirror the design's exact canary phrase.
  writeFileSync(
    path.join(FIXTURE_DIR, "unlinked.html"),
    `<!DOCTYPE html>
<html><head><title>Spike Unlinked</title></head>
<body><article data-pagefind-body>
  <h1>Spike Unlinked Test</h1>
  <p>SPIKE-UNLINKED-CANARY-PHRASE — if this appears in Pagefind, the
  --input-file mechanism works correctly.</p>
</article></body></html>\n`,
  );
}

function startStaticServer(port) {
  // The server runs in a CHILD process. The parent uses spawnSync to drive
  // wget/pagefind, which blocks the parent's event loop — so an in-process
  // http.createServer would refuse connections during those calls. The
  // child binds to 127.0.0.1 explicitly to match wget's resolution order.
  const roots = JSON.stringify([SITE_DIR, path.join(REPO_ROOT, "public")]);
  const childSrc = `
    const http = require('node:http');
    const fs = require('node:fs');
    const path = require('node:path');
    const roots = ${roots};
    const server = http.createServer((req, res) => {
      let urlPath = (req.url || '/').split('?')[0];
      const candidates = [];
      if (urlPath.endsWith('/')) {
        candidates.push(urlPath + 'index.html');
      } else {
        candidates.push(urlPath);
        candidates.push(urlPath + '/index.html');
        candidates.push(urlPath + '.html');
      }
      for (const root of roots) {
        for (const cand of candidates) {
          const full = path.join(root, cand);
          if (!full.startsWith(root)) continue;
          if (fs.existsSync(full) && fs.statSync(full).isFile()) {
            const body = fs.readFileSync(full);
            const ext = path.extname(full).toLowerCase();
            const type = ext === '.html'
              ? 'text/html; charset=utf-8'
              : 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': type });
            res.end(body);
            return;
          }
        }
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404');
    });
    server.listen(${port}, '127.0.0.1', () => process.stdout.write('READY\\n'));
  `;
  const child = spawn("node", ["-e", childSrc], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", (b) => logErr(`[server] ${b.toString().trimEnd()}`));
  return child;
}

async function waitForReady(url, timeoutMs = 10_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

function waitForChildReady(child, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    let buf = "";
    const t = setTimeout(() => reject(new Error("child server did not signal READY")), timeoutMs);
    child.stdout.on("data", (b) => {
      buf += b.toString();
      if (buf.includes("READY")) {
        clearTimeout(t);
        resolve();
      }
    });
    child.once("exit", (code) => {
      clearTimeout(t);
      reject(new Error(`child server exited early code=${code}`));
    });
  });
}

// ---------------------------------------------------------------------------
// Cleanup (always runs).
// ---------------------------------------------------------------------------
function cleanup(server) {
  log("--- cleanup ---");
  try {
    if (server && typeof server.kill === "function") server.kill("SIGTERM");
    else if (server && typeof server.close === "function") server.close();
  } catch (e) {
    logErr(`server close: ${e.message}`);
  }
  for (const p of [WGET_OUT, PF_OUT, URLS_FILE, FIXTURE_DIR, SITE_DIR]) {
    try {
      rmSync(p, { recursive: true, force: true });
      log(`rm -rf ${p}`);
    } catch (e) {
      logErr(`cleanup ${p}: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main spike.
// ---------------------------------------------------------------------------
const results = {
  c1_direct_url: null,
  c2_link_walk_canary: null,
  c3_input_file_retrieved: null,
  c4_adjust_extension: null,
  c5_pagefind_canary: null,
  c6_master_timeout: null,
};
let pagefindVersion = null;
let server;

async function main() {
  log(`# Pagefind v3-mechanism spike — ${new Date().toISOString()}`);
  log(`# Repo: ${REPO_ROOT}`);
  log("# DEVIATION: serving a minimal static fixture via Node http rather than");
  log("# `pnpm build` + `next start`, because the working tree has in-flight");
  log("# blog-core changes that may not typecheck cleanly. The spike validates");
  log("# the pipeline mechanism (wget + pagefind), not blog-core's build.");

  // Step 1 (deviation): build minimal fixture site, not pnpm build.
  log("--- Step 1 (deviation): build fixture site ---");
  buildFixtureSite();
  log(`Fixture written to ${SITE_DIR} and ${FIXTURE_DIR}`);

  // Step 2: unlinked page already written by buildFixtureSite().
  log("--- Step 2: unlinked page in place ---");
  log(`exists: ${existsSync(path.join(FIXTURE_DIR, "unlinked.html"))}`);

  // Step 3: spawn server (in a child process so the parent's spawnSync
  // calls don't block the server's event loop), wait for readiness.
  log("--- Step 3: start static server on 3013 ---");
  server = startStaticServer(SITE_PORT);
  await waitForChildReady(server);
  const ready = await waitForReady(`http://127.0.0.1:${SITE_PORT}/`);
  if (!ready) throw new Error("server did not become ready");
  log("server ready");

  // Step 4: direct URL reachability of the unlinked page (criterion 1).
  log("--- Step 4: direct URL reachability ---");
  const direct = await fetch(`http://localhost:${SITE_PORT}/__spike/unlinked.html`);
  const directBody = await direct.text();
  results.c1_direct_url = direct.ok && directBody.includes("SPIKE-UNLINKED-CANARY-PHRASE");
  log(
    results.c1_direct_url
      ? "PASS: unlinked page reachable via direct URL."
      : "FAIL: unlinked page not reachable via direct URL.",
  );

  // Step 5: link-walk crawl should NOT find the unlinked page (criterion 2).
  log("--- Step 5: link-walk crawl (canary should be invisible) ---");
  rmSync(WGET_OUT, { recursive: true, force: true });
  runBash(
    "wget link-walk",
    [
      "wget --quiet --mirror --adjust-extension --no-host-directories",
      `--directory-prefix=${WGET_OUT}`,
      '--reject="*.css,*.js,*.png,*.jpg,*.jpeg,*.svg,*.ico,*.webp,*.wasm"',
      "--exclude-directories=/_next,/static",
      "--timeout=30 --tries=2",
      `http://localhost:${SITE_PORT}/`,
    ].join(" "),
  );
  const walkedUnlinked = existsSync(path.join(WGET_OUT, "__spike", "unlinked.html"));
  results.c2_link_walk_canary = !walkedUnlinked;
  log(
    results.c2_link_walk_canary
      ? "PASS: unlinked page is not in link-walk output."
      : "FAIL: unlinked page reached via link-walk (spike setup is invalid).",
  );

  // Step 6+7: --input-file should retrieve the unlinked page (criterion 3).
  log("--- Step 6-7: --input-file retrieval ---");
  writeFileSync(URLS_FILE, `http://localhost:${SITE_PORT}/__spike/unlinked.html\n`);
  rmSync(WGET_OUT, { recursive: true, force: true });
  runBash(
    "wget --input-file",
    [
      "wget --quiet --mirror --adjust-extension --no-host-directories",
      `--directory-prefix=${WGET_OUT}`,
      `--input-file=${URLS_FILE}`,
      '--reject="*.css,*.js,*.png,*.jpg,*.jpeg,*.svg,*.ico,*.webp,*.wasm"',
      "--exclude-directories=/_next,/static",
      "--timeout=30 --tries=2",
      `http://localhost:${SITE_PORT}/`,
    ].join(" "),
  );
  results.c3_input_file_retrieved = existsSync(path.join(WGET_OUT, "__spike", "unlinked.html"));
  log(
    results.c3_input_file_retrieved
      ? "PASS: --input-file retrieved the unlinked page."
      : "FAIL: --input-file did not retrieve the unlinked page.",
  );

  // Step 8: --adjust-extension produced .html files (criterion 4).
  log("--- Step 8: --adjust-extension produced .html files ---");
  const htmlFiles = [];
  function walk(d) {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".html")) htmlFiles.push(p);
    }
  }
  walk(WGET_OUT);
  // True test of --adjust-extension: the extensionless LEAF URL
  // /spike-extensionless must be saved as spike-extensionless.html.
  // Without --adjust-extension wget would save it as `spike-extensionless`
  // (no .html), so the presence of the .html file specifically proves the
  // flag is doing its job. The /blog/ directory-index check is incidental.
  const extLeafHtml = htmlFiles.some((f) => f.endsWith(`${path.sep}spike-extensionless.html`));
  const blogIndex = htmlFiles.some((f) => f.endsWith(path.join("blog", "index.html")));
  results.c4_adjust_extension = htmlFiles.length > 0 && extLeafHtml && blogIndex;
  log(`html files in mirror: ${htmlFiles.length}`);
  log(`  ${htmlFiles.join("\n  ")}`);
  log(`spike-extensionless.html present: ${extLeafHtml}`);
  log(`blog/index.html present: ${blogIndex}`);
  log(
    results.c4_adjust_extension
      ? "PASS: --adjust-extension produced .html files from extensionless URLs."
      : "FAIL: --adjust-extension did not produce .html for extensionless leaf URL.",
  );

  // Step 9: run pagefind. Per parent instructions: package.json has no
  // pagefind devDependency yet, so jq returns empty; fall back to
  // pnpm dlx pagefind@latest and record the resolved version.
  log("--- Step 9: run pagefind ---");
  const pinned = spawnSync("jq", ["-r", '.devDependencies.pagefind // ""', "package.json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  const pinnedVer = (pinned.stdout || "").trim();
  log(`jq -r .devDependencies.pagefind => "${pinnedVer}"`);
  let pfCmd;
  if (pinnedVer) {
    pfCmd = `pnpm dlx pagefind@${pinnedVer}`;
  } else {
    pfCmd = `pnpm dlx pagefind@latest`;
  }
  log(`pagefind command: ${pfCmd}`);
  // Get resolved version via --version first (forces install of the tarball).
  const verRes = spawnSync("bash", ["-c", `${pfCmd} --version`], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  log((verRes.stdout || "").trim());
  if (verRes.stderr) logErr((verRes.stderr || "").trim());
  const verMatch = (verRes.stdout || "").match(/pagefind\s+v?([0-9]+\.[0-9]+\.[0-9]+)/i);
  pagefindVersion = verMatch ? verMatch[1] : (verRes.stdout || "").trim() || "unknown";
  log(`Resolved Pagefind version: ${pagefindVersion}`);

  rmSync(PF_OUT, { recursive: true, force: true });
  runBash("pagefind index build", `${pfCmd} --site ${WGET_OUT} --output-path ${PF_OUT}`);

  // Step 10: canary phrase in pagefind index (criterion 5).
  // Pagefind v1.x stores fragments as gzip-compressed .pf_fragment files;
  // decompress before grepping.
  log("--- Step 10: canary phrase in pagefind index ---");
  let canaryFound = false;
  try {
    const fragDir = path.join(PF_OUT, "fragment");
    const names = readdirSync(fragDir);
    log(`fragment count: ${names.length}`);
    for (const name of names) {
      const raw = readFileSync(path.join(fragDir, name));
      let text;
      // Gzip magic = 0x1f 0x8b.
      if (raw[0] === 0x1f && raw[1] === 0x8b) {
        text = gunzipSync(raw).toString("utf-8");
      } else {
        text = raw.toString("utf-8");
      }
      if (text.includes("SPIKE-UNLINKED-CANARY-PHRASE")) {
        canaryFound = true;
        log(`  canary found in ${name}`);
        break;
      }
    }
  } catch (e) {
    logErr(`could not read pagefind fragments: ${e.message}`);
  }
  results.c5_pagefind_canary = canaryFound;
  log(
    canaryFound
      ? "PASS: canary phrase found in pagefind index."
      : "FAIL: canary phrase not in pagefind index.",
  );

  // Step 11: master-timeout smoke test (criterion 6).
  log("--- Step 11: master-timeout smoke test ---");
  // Start an in-process hung server, then run a bounded fetch that MUST
  // exit non-zero inside the 3000ms budget. We use a separate Node child
  // to ensure clean termination.
  const hangServer = http
    .createServer(() => {
      /* never respond */
    })
    .listen(HANG_PORT);
  const budgetMs = 3000;
  const t0 = Date.now();
  const childCode = `
    const c = setTimeout(() => { console.error('TIMEOUT'); process.exit(2); }, ${budgetMs});
    fetch('http://localhost:${HANG_PORT}/').then(() => {
      clearTimeout(c); process.exit(0);
    }).catch(() => { clearTimeout(c); process.exit(0); });
  `;
  const r = spawnSync("node", ["-e", childCode], {
    encoding: "utf8",
    timeout: budgetMs + 2000,
  });
  const elapsed = Date.now() - t0;
  hangServer.close();
  log(`master-timeout child exit=${r.status} elapsed=${elapsed}ms`);
  if (r.stdout) log(r.stdout.trimEnd());
  if (r.stderr) logErr(r.stderr.trimEnd());
  results.c6_master_timeout = r.status !== 0 && elapsed <= budgetMs + 1000;
  log(
    results.c6_master_timeout
      ? "PASS: master timeout smoke test completed."
      : "FAIL: master timeout did not exit non-zero within budget.",
  );

  // Step 12: cleanup happens in finally().

  // Step 13: aggregate.
  log("--- Step 13: aggregate results ---");
  for (const [k, v] of Object.entries(results)) {
    log(`  ${v ? "PASS" : "FAIL"}  ${k}`);
  }
  const allPassed = Object.values(results).every(Boolean);
  if (allPassed) {
    log("All v3 spike assertions PASSED");
  } else {
    log("SPIKE FAILED — at least one criterion did not pass.");
  }
  return allPassed;
}

let exitCode = 1;
try {
  const ok = await main();
  exitCode = ok ? 0 : 1;
} catch (e) {
  logErr(`SPIKE ERROR: ${e.stack || e.message}`);
  exitCode = 1;
} finally {
  cleanup(server);
  // Emit checksum LAST so it includes everything before it. The line
  // itself is excluded from the hash (it's the digest of everything up
  // to but not including itself).
  const body = transcript.join("\n");
  const checksum = createHash("sha256").update(body).digest("hex");
  process.stdout.write(`SPIKE-CHECKSUM=${checksum}\n`);
  process.stdout.write(`SPIKE-PAGEFIND-VERSION=${pagefindVersion}\n`);
  process.exit(exitCode);
}
