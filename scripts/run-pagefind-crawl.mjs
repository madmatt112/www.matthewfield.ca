#!/usr/bin/env node
// Pagefind crawl orchestrator. Spawns `next start`, mirrors the running site
// with `wget`, runs `pagefind --site ./out` against the mirror, and tears
// everything down. Designed to be invoked as `pnpm build:search` after a
// production `next build`.
//
// Design ref: .spec-workflow/specs/blog-enhanced/design.md §"Crawl
// orchestration (v2/v4)" — task blog-enhanced #9.

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
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
 * sitemap, feed, taxonomy — wget cannot find them via link-walking from /. We
 * enumerate them explicitly via wget's `--input-file`. Draft and
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

async function runWget(urlsPath) {
  return new Promise((resolve, reject) => {
    const args = [
      "--quiet",
      "--mirror",
      "--adjust-extension",
      "--no-host-directories",
      `--directory-prefix=${OUT_DIR}`,
      `--input-file=${urlsPath}`,
      "--reject=*.css,*.js,*.png,*.jpg,*.jpeg,*.svg,*.ico,*.webp,*.wasm",
      "--exclude-directories=/_next,/static",
      "--timeout=30",
      "--tries=2",
      `http://localhost:${PORT}/`,
    ];
    const child = spawn("wget", args, { stdio: "inherit", cwd: repoRoot });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      // wget exits 8 on server-error responses (e.g. 404 on a hidden post URL
      // we just enumerated). A single stale slug shouldn't fail the whole
      // pipeline — log a warning and continue so pagefind still indexes the
      // URLs that did mirror successfully.
      if (signal) reject(new Error(`wget terminated by signal ${signal}`));
      else if (code === 0) resolve();
      else if (code === 8) {
        errlog(
          "wget exited 8 (one or more URLs returned a server/4xx response); continuing.",
        );
        resolve();
      } else reject(new Error(`wget exited with code ${code}`));
    });
  });
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

  const urlsPath = path.join(os.tmpdir(), `pagefind-urls-${process.pid}.txt`);
  let urlsFileWritten = false;

  try {
    // 4. Readiness poll.
    await waitForReady(PORT);
    log(`next start is ready on port ${PORT}.`);

    // 5a. Build extraSlugs URL list + write tmp urls-extra file.
    const extraUrls = await buildExtraUrls();
    await fs.writeFile(urlsPath, extraUrls.join("\n") + (extraUrls.length ? "\n" : ""));
    urlsFileWritten = true;
    log(`Wrote ${extraUrls.length} extra URL(s) to ${urlsPath}.`);

    // 5b. Mirror with wget.
    log(`Mirroring http://localhost:${PORT}/ → ${OUT_DIR} via wget…`);
    await runWget(urlsPath);

    // 6. Run pagefind against the mirrored directory.
    log(`Running pagefind --site ${OUT_DIR} --output-path ${PAGEFIND_DIR}…`);
    await runPagefind();

    log(`Index written to ${PAGEFIND_DIR}/`);
  } finally {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);

    // Cleanup tmp urls file (success AND failure path).
    if (urlsFileWritten) {
      await fs.unlink(urlsPath).catch(() => {});
    }

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
