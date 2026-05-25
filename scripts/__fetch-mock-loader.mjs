/**
 * Test-only preload module. Replaces `globalThis.fetch` with a stub that reads
 * its response map from the `FETCH_MOCK` env var (JSON).
 *
 * FETCH_MOCK shape: { [url: string]: { status: number, body?: string, throw?: string } }
 *
 * Used by verifiers.test.mjs to drive scripts/verify-deploy.mjs through
 * `node --import ./scripts/__fetch-mock-loader.mjs scripts/verify-deploy.mjs <url>`.
 */
const raw = process.env.FETCH_MOCK;
if (raw) {
  /** @type {Record<string, { status: number, body?: string, throw?: string }>} */
  const map = JSON.parse(raw);
  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.url;
    const entry = map[url];
    if (!entry) {
      throw new TypeError(`fetch-mock: no entry for ${url}`);
    }
    if (entry.throw) {
      throw new TypeError(entry.throw);
    }
    const body = entry.body ?? "";
    return {
      status: entry.status,
      async json() {
        return JSON.parse(body);
      },
      async text() {
        return body;
      },
    };
  };
}
