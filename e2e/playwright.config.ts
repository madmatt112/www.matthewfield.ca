import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3013);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  // Explicit testMatch (per blog-enhanced Task 35 v4 pin): ensures the
  // per-component Playwright smokes under `e2e/tests/component-preview/`
  // (Tasks 18.1–18.8) are picked up by `pnpm test:e2e` in CI. Playwright's
  // default glob would also match these, but we pin the pattern so a future
  // glob narrowing cannot silently drop them.
  testMatch: ["**/*.test.ts", "component-preview/**/*.test.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    // BLOG_INCLUDE_DRAFTS=1 is REQUIRED for the component-preview routes
    // (and fixture-* blog posts) to resolve under the draft-leak guard.
    // Without this, Build 1 e2e tests targeting `/blog/fixture-*` and the
    // `/blog/component-preview/[name]` registry return 404 (Task 35 v4 pin).
    env: {
      ...process.env,
      BLOG_INCLUDE_DRAFTS: "1",
    },
  },
});
