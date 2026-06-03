#!/usr/bin/env node
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const mockEntry = path.join(repoRoot, "e2e", "fixtures", "mock-resend.mjs");

function allocatePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (!addr || typeof addr === "string") {
        srv.close();
        reject(new Error("failed to allocate ephemeral port"));
        return;
      }
      const port = addr.port;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

function buildUnderTestEnv() {
  // The webServer runs `next start` under NODE_ENV=test (set below) so the
  // R1 security gate (`NODE_ENV !== 'production'`) stays OPEN during e2e.
  // Next 16 throws NoFallbackError when a production build is served by a
  // non-production server, so the build must run under the SAME NODE_ENV as
  // the start. We (re)build here with NODE_ENV=test to keep them consistent.
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["build"], {
      stdio: "inherit",
      cwd: repoRoot,
      env: { ...process.env, NODE_ENV: "test", BLOG_INCLUDE_DRAFTS: "1" },
    });
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`build terminated by signal ${signal}`));
      else if (code !== 0) reject(new Error(`build exited with code ${code}`));
      else resolve();
    });
    child.once("error", reject);
  });
}

function startMock(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [mockEntry], {
      env: { ...process.env, MOCK_PORT: String(port) },
      stdio: ["ignore", "pipe", "inherit"],
    });

    let buffer = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`mock-resend did not print READY within 5000ms (port ${port})`));
    }, 5000);

    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      if (buffer.includes("READY")) {
        clearTimeout(timer);
        resolve(child);
      }
    });

    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`mock-resend exited before READY (code=${code}, signal=${signal})`));
    });

    child.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function main() {
  try {
    await buildUnderTestEnv();
  } catch (err) {
    process.stderr.write(`run-e2e: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  const port = await allocatePort();

  let mock;
  try {
    mock = await startMock(port);
  } catch (err) {
    process.stderr.write(`run-e2e: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  process.env.NODE_ENV = "test";
  process.env.RESEND_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.RESEND_API_KEY = "test-key";
  process.env.RESEND_FROM = "onboarding@resend.dev";
  process.env.RESEND_TO = "test@example.com";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3013";
  // Opens the R1 testId gate at request runtime. `next build` inlines
  // NODE_ENV as "production" in the server bundle, so the NODE_ENV check alone
  // can never open the gate for a built artifact; this runtime-read flag does.
  // Set ONLY here (never in any real deployment).
  process.env.E2E_TEST_ID_ALLOWED = "1";

  let cleaned = false;
  const killMock = () => {
    if (cleaned) return;
    cleaned = true;
    if (mock && mock.exitCode === null && mock.signalCode === null) {
      try {
        mock.kill("SIGTERM");
      } catch {
        // ignore
      }
    }
  };

  process.on("exit", killMock);
  process.on("SIGINT", () => {
    killMock();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    killMock();
    process.exit(143);
  });

  const extraArgs = process.argv.slice(2);
  const playwright = spawn(
    "pnpm",
    ["exec", "playwright", "test", "--config=e2e/playwright.config.ts", ...extraArgs],
    { stdio: "inherit", cwd: repoRoot },
  );

  playwright.on("exit", (code, signal) => {
    killMock();
    if (signal) {
      process.exit(1);
    } else {
      process.exit(code ?? 0);
    }
  });

  playwright.on("error", (err) => {
    process.stderr.write(`run-e2e: failed to spawn playwright: ${err.message}\n`);
    killMock();
    process.exit(1);
  });
}

main().catch((err) => {
  process.stderr.write(
    `run-e2e: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
