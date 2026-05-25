import { expect, test, type Page } from "@playwright/test";

// Per design §"`blog-pagefind-failure-matrix.test.ts` (NEW, Build 2)" — this
// suite proves that the Req 1.4 v3 rollback (graceful unavailable surface)
// holds across the realistic Pagefind failure modes:
//
//   (a) /pagefind/pagefind.js → 404
//   (b) /pagefind/pagefind-entry.json → 404
//   (d) strict CSP blocks dynamic import of the pagefind runtime
//
// All three resolve to the SAME unavailable-state assertion:
//   - "Search is temporarily unavailable" copy
//   - anchor to /blog
//   - aria-live polite "Search index could not be loaded." message
//
// Build gating: the suite is meaningful only against Build 2 (probe-based,
// matching `blog-search.test.ts`). For case (a) and (b) we *force* the 404
// via route.fulfill regardless of upstream presence, but we still want the
// real `pnpm start` route topology in place; running against Build 1's
// `next dev` would surface a different shape and not test what we claim.

const TRIGGER_SELECTOR = "[data-search-trigger]";
const DIALOG_SELECTOR = '[data-slot="dialog-content"]';
const UNAVAILABLE_COPY = "Search is temporarily unavailable.";
const ARIA_LIVE_COPY = "Search index could not be loaded.";

let pagefindAvailable: boolean | null = null;

test.beforeAll(async ({ request, baseURL }) => {
  try {
    const resp = await request.get(`${baseURL}/pagefind/pagefind-entry.json`);
    pagefindAvailable = resp.ok();
  } catch {
    pagefindAvailable = false;
  }
});

test.beforeEach(({ page }) => {
  test.skip(
    pagefindAvailable === false,
    "Pagefind index not present — Build 1 (this suite runs in Build 2 only).",
  );
  // Hard-fail any test that surfaces an uncaught page error. The dialog
  // must never throw — failures route through React state to the
  // unavailable surface per Req 1.9a.
  page.on("pageerror", (err) => {
    throw new Error(`Uncaught page error: ${err.message}`);
  });
});

async function assertUnavailableSurface(page: Page) {
  const dialog = page.locator(DIALOG_SELECTOR);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(UNAVAILABLE_COPY)).toBeVisible();
  // The /blog anchor inside the dialog body.
  const blogLink = dialog.locator('a[href="/blog"]');
  await expect(blogLink).toHaveCount(1);
  // The aria-live region is sr-only; assert presence + text content rather
  // than visibility.
  const liveRegion = dialog.locator('[aria-live="polite"]');
  await expect(liveRegion).toHaveText(ARIA_LIVE_COPY);
}

test.describe("blog pagefind failure matrix (Build 2)", () => {
  test("(a) pagefind.js 404 → unavailable surface", async ({ page }) => {
    await page.route("**/pagefind/pagefind.js", (route) =>
      route.fulfill({ status: 404, body: "" }),
    );
    await page.goto("/blog");
    await page.locator(TRIGGER_SELECTOR).click();
    await assertUnavailableSurface(page);
  });

  test("(b) pagefind-entry.json 404 → unavailable surface", async ({ page }) => {
    await page.route("**/pagefind/pagefind-entry.json", (route) =>
      route.fulfill({ status: 404, body: "" }),
    );
    await page.goto("/blog");
    await page.locator(TRIGGER_SELECTOR).click();
    await assertUnavailableSurface(page);
  });

  test("(d) strict CSP (script-src 'self') → unavailable surface", async ({
    page,
  }) => {
    // Inject a strict CSP via <meta http-equiv> before any document scripts
    // run. The pagefind runtime is loaded via dynamic import from
    // /pagefind/pagefind.js which is same-origin ('self') — but Pagefind
    // also fetches WASM and JSON chunks that, depending on bundling, can
    // be blocked by a script-src 'self' policy without 'wasm-unsafe-eval'.
    // Regardless of which sub-resource trips first, the component's
    // try/catch must route to the unavailable surface.
    await page.addInitScript(() => {
      const meta = document.createElement("meta");
      meta.setAttribute("http-equiv", "Content-Security-Policy");
      meta.setAttribute("content", "script-src 'self'");
      // Insert as early as possible so the policy applies to subsequent
      // dynamic imports triggered by the dialog open.
      const insert = () => {
        const head = document.head ?? document.documentElement;
        head.insertBefore(meta, head.firstChild);
      };
      if (document.head) insert();
      else document.addEventListener("DOMContentLoaded", insert, { once: true });
    });
    await page.goto("/blog");
    await page.locator(TRIGGER_SELECTOR).click();
    await assertUnavailableSurface(page);
  });
});
