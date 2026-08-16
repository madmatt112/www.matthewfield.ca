#!/usr/bin/env node
// Pagefind crawl orchestrator. Spawns `next start`, mirrors the running site
// into ./out, runs `pagefind --site ./out` against the mirror, and tears
// everything down. Designed to be invoked as `pnpm build:search` after a
// production `next build`.
//
// Design ref: .spec-workflow/specs/blog-enhanced/design.md §"Crawl
// orchestration (v2/v4)" — task blog-enhanced #9.
//
// The mirror step used to shell out to `wget --mirror --adjust-extension`.
// It no longer can: this script runs inside the Vercel build (vercel.json's
// buildCommand) so the deployed site has a search index, and Vercel's Amazon
// Linux 2023 build image ships no wget — the deploy died on `spawn wget
// ENOENT`. Rather than install a system package into the build container, the
// mirror is now a small breadth-first fetch loop below. It reproduces the two
// wget behaviours the rest of the pipeline depends on: the `--adjust-extension`
// file layout (`/blog/foo` → `out/blog/foo.html`), which is what makes Pagefind
// emit `/blog/foo.html` URLs for `site-search.tsx` to strip back to a route,
// and tolerance of a single dead URL (a stale hidden-post slug must not fail
// the whole build).

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Port duplicated in package.json (start script) and lighthouserc.js — keep in sync.
const PORT = 3013;
const READINESS_TIMEOUT_MS = 180_000;
const POLL_INTERVAL_MS = 500;
const MASTER_TIMEOUT_MS = Number(process.env.PAGEFIND_TIMEOUT_MS ?? 600_000);

const OUT_DIR = path.join(repoRoot, "out");
const PAGEFIND_DIR = path.join(repoRoot, "public", "pagefind");
const VELITE_INDEX = path.join(repoRoot, ".velite", "index.js");
const NEXT_BIN = path.join(repoRoot, "node_modules", ".bin", "next");
const PAGEFIND_BIN = path.join(repoRoot, "node_modules", ".bin", "pagefind");

function log(msg) {
  process.stdout.write(`[pagefind] ${msg}\n`);
}

function errlog(msg) {
  process.stderr.write(`[pagefind] ${msg}\n`);
}

/**
 * Fail-fast diagnostic — catches the common "user has `pnpm dev` running"
 * case. NOT a TOCTOU safety claim; the test server closes before `next start`
 * is spawned, so a racing process could still grab the port.
 */
async function assertPortFree(port) {
  await new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", (err) => reject(err));
    srv.listen(port, () => {
      srv.close((closeErr) => (closeErr ? reject(closeErr) : resolve()));
    });
  });
}

async function cleanCrawlOutputs() {
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.rm(PAGEFIND_DIR, { recursive: true, force: true });
}

function startNext() {
  const child = spawn(NEXT_BIN, ["start", "--port", String(PORT)], {
    stdio: "inherit",
    cwd: repoRoot,
  });
  return child;
}

/**
 * SIGTERM the child; escalate to SIGKILL after 5s. Idempotent — safe to call
 * multiple times from signal handlers and finally blocks. Returns a promise
 * that resolves once the child has exited (either after SIGTERM, or after the
 * SIGKILL escalation fires).
 */
function makeChildTerminator(child) {
  let terminatePromise = null;
  return function terminate() {
    if (terminatePromise) return terminatePromise;
    terminatePromise = new Promise((resolve) => {
      if (child.exitCode != null || child.signalCode != null) {
        resolve();
        return;
      }
      child.once("exit", () => resolve());
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }
      setTimeout(() => {
        if (child.exitCode == null && child.signalCode == null) {
          try {
            child.kill("SIGKILL");
          } catch {
            // ignore
          }
        }
      }, 5_000).unref();
    });
    return terminatePromise;
  };
}

async function waitForReady(port) {
  const start = Date.now();
  let lastStatus = "no-response";
  while (Date.now() - start < READINESS_TIMEOUT_MS) {
    try {
      const res = await fetch(`http://localhost:${port}/`, { method: "HEAD" });
      lastStatus = String(res.status);
      if (res.status >= 200 && res.status < 400) return;
    } catch (e) {
      lastStatus = (e instanceof Error ? e.message : String(e)).slice(0, 120);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(
    `next start did not become ready within ${READINESS_TIMEOUT_MS / 1000}s. Last status: ${lastStatus}`,
  );
}

/**
 * Hidden posts (`hiddenFromLists: true`) are deliberately excluded from /blog,
 * sitemap, feed, taxonomy — no crawl can reach them by link-walking from /, so
 * they are enumerated here and seeded into the queue directly. Draft and
 * `excludeFromSearch` posts are filtered out (the latter should not be
 * indexed; the former would not exist in a Build 2 anyway but the explicit
 * filter guards local-dev usage).
 *
 * Velite slugs carry a `posts/` prefix (the collection-relative path); strip
 * it so URLs match the `/blog/[slug]` single-segment route.
 */
async function buildExtraUrls() {
  const mod = await import(pathToFileURL(VELITE_INDEX).href);
  const posts = mod.posts ?? mod.default?.posts ?? [];
  const slugs = posts
    .filter((p) => p.hiddenFromLists === true && !p.draft && p.excludeFromSearch !== true)
    .map((p) => p.slug.replace(/^posts\//, ""));
  const unique = [...new Set(slugs)];
  return unique.map((slug) => `http://localhost:${PORT}/blog/${slug}`);
}

/** Assets Pagefind never reads; skipped so the crawl only walks documents. */
const ASSET_EXTENSION =
  /\.(css|m?js|png|jpe?g|gif|svg|ico|webp|avif|wasm|xml|txt|json|map|woff2?|ttf|pdf)$/i;

/** wget's `--exclude-directories=/_next,/static`. */
const EXCLUDED_PATH = /^\/(_next|static)\//;

/** Runaway guard. The site is ~20 routes; 500 is a bug, not a big site. */
const MAX_PAGES = 500;

/**
 * wget's `--adjust-extension` naming, which the rest of the pipeline is built
 * around: a document path gains `.html` unless it already ends in `/`, in which
 * case it becomes `index.html` inside that directory.
 *
 *   /                 → out/index.html
 *   /blog             → out/blog.html
 *   /blog/            → out/blog/index.html
 *   /blog/some-post   → out/blog/some-post.html
 */
function outPathForPathname(pathname) {
  if (pathname.endsWith("/")) return path.join(OUT_DIR, pathname, "index.html");
  return path.join(OUT_DIR, `${pathname}.html`);
}

/**
 * Same-document link extraction. A regex rather than a DOM parser on purpose:
 * this walks our own statically rendered output, not arbitrary web pages, and
 * adding a parser dependency to make the deploy work would trade one supply
 * problem for another.
 */
function extractHrefs(html) {
  const hrefs = [];
  const anchor = /<a\b[^>]*?\shref=["']([^"']+)["']/gi;
  let match;
  while ((match = anchor.exec(html)) !== null) hrefs.push(match[1]);
  return hrefs;
}

function shouldVisit(url, origin) {
  if (url.origin !== origin) return false;
  if (EXCLUDED_PATH.test(url.pathname)) return false;
  if (ASSET_EXTENSION.test(url.pathname)) return false;
  return true;
}

/**
 * Breadth-first mirror of the running site into OUT_DIR. Seeded with `/` plus
 * the explicitly enumerated hidden-post URLs, which are unreachable by
 * link-walking by design (see buildExtraUrls).
 */
async function mirrorSite(extraUrls) {
  const origin = `http://localhost:${PORT}`;
  const queue = [`${origin}/`, ...extraUrls];
  const seen = new Set();
  let saved = 0;
  let skipped = 0;

  while (queue.length > 0) {
    const next = queue.shift();
    let url;
    try {
      url = new URL(next);
    } catch {
      continue;
    }
    if (seen.has(url.pathname)) continue;
    seen.add(url.pathname);

    if (seen.size > MAX_PAGES) {
      throw new Error(`crawl exceeded ${MAX_PAGES} pages — refusing to continue`);
    }

    let response;
    try {
      response = await fetch(url, { redirect: "follow" });
    } catch (err) {
      // Mirrors wget's exit-8 tolerance: one unreachable URL is a warning.
      skipped += 1;
      errlog(`${url.pathname}: fetch failed (${err instanceof Error ? err.message : err})`);
      continue;
    }

    if (!response.ok) {
      skipped += 1;
      errlog(`${url.pathname}: HTTP ${response.status}; skipping.`);
      continue;
    }

    // A redirect means the document belongs at its final path, not the
    // requested one — record both so neither is fetched twice.
    const finalUrl = new URL(response.url);
    seen.add(finalUrl.pathname);

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) continue;

    const html = await response.text();
    const destination = outPathForPathname(finalUrl.pathname);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, html);
    saved += 1;

    for (const href of extractHrefs(html)) {
      let candidate;
      try {
        candidate = new URL(href, finalUrl);
      } catch {
        continue;
      }
      candidate.hash = "";
      candidate.search = "";
      if (!shouldVisit(candidate, origin)) continue;
      if (seen.has(candidate.pathname)) continue;
      queue.push(candidate.href);
    }
  }

  if (saved === 0) {
    throw new Error("mirror produced no pages — pagefind would index nothing");
  }
  log(`Mirrored ${saved} page(s)${skipped > 0 ? `, skipped ${skipped}` : ""}.`);
}

async function runPagefind() {
  return new Promise((resolve, reject) => {
    const args = ["--site", OUT_DIR, "--output-path", PAGEFIND_DIR];
    const child = spawn(PAGEFIND_BIN, args, { stdio: "inherit", cwd: repoRoot });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`pagefind terminated by signal ${signal}`));
      else if (code === 0) resolve();
      else reject(new Error(`pagefind exited with code ${code}`));
    });
  });
}

async function waitForChildExit(child, timeoutMs) {
  if (child.exitCode != null || child.signalCode != null) return;
  await Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve())),
    sleep(timeoutMs),
  ]);
}

async function pipeline() {
  // 1. Port-conflict guard.
  try {
    await assertPortFree(PORT);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Port ${PORT} is already in use (${reason}). Stop your dev server (\`pnpm dev\`) before running build:search.`,
    );
  }

  // 2. Clean prior crawl output.
  await cleanCrawlOutputs();

  // 3. Spawn next start.
  log(`Starting next on port ${PORT}…`);
  const next = startNext();
  const terminateNext = makeChildTerminator(next);

  const onSigint = async () => {
    try {
      await terminateNext();
    } catch {
      // ignore
    }
    process.exit(130);
  };
  const onSigterm = async () => {
    try {
      await terminateNext();
    } catch {
      // ignore
    }
    process.exit(143);
  };
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);

  try {
    // 4. Readiness poll.
    await waitForReady(PORT);
    log(`next start is ready on port ${PORT}.`);

    // 5a. Enumerate the hidden posts link-walking cannot reach.
    const extraUrls = await buildExtraUrls();
    log(`Seeding ${extraUrls.length} extra URL(s) alongside /.`);

    // 5b. Mirror the running site.
    log(`Mirroring http://localhost:${PORT}/ → ${OUT_DIR}…`);
    await mirrorSite(extraUrls);

    // 6. Run pagefind against the mirrored directory.
    log(`Running pagefind --site ${OUT_DIR} --output-path ${PAGEFIND_DIR}…`);
    await runPagefind();

    log(`Index written to ${PAGEFIND_DIR}/`);
  } finally {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);

    // Tear down next start.
    terminateNext();
    await waitForChildExit(next, 7_000);

    // Remove transient mirror dir; leave public/pagefind/ populated.
    await fs.rm(OUT_DIR, { recursive: true, force: true }).catch(() => {});
  }
}

async function main() {
  const masterTimeout = new Promise((_, reject) => {
    const t = setTimeout(
      () => reject(new Error(`master-timeout after ${MASTER_TIMEOUT_MS}ms`)),
      MASTER_TIMEOUT_MS,
    );
    t.unref();
  });

  try {
    await Promise.race([pipeline(), masterTimeout]);
    process.exit(0);
  } catch (err) {
    errlog(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
