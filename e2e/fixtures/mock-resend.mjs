import http from "node:http";

const PORT = Number(process.env.MOCK_PORT);
if (!Number.isFinite(PORT) || PORT <= 0) {
  process.stderr.write("mock-resend: MOCK_PORT env var is required\n");
  process.exit(1);
}

const DEFAULT_BUCKET = "__untagged__";
/** @type {Map<string, Array<{ testId: string, body: unknown }>>} */
const buckets = new Map();
let counter = 0;

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

    if (req.method === "POST" && url.pathname === "/emails") {
      const testId =
        (req.headers["x-test-id"] && String(req.headers["x-test-id"])) || DEFAULT_BUCKET;
      const body = await readJsonBody(req);
      const bucket = buckets.get(testId) ?? [];
      bucket.push({ testId, body });
      buckets.set(testId, bucket);
      counter += 1;
      return send(res, 200, { id: `mock-${counter}` });
    }

    if (req.method === "POST" && url.pathname === "/__reset") {
      const testId = url.searchParams.get("testId");
      if (testId) {
        buckets.delete(testId);
      } else {
        buckets.clear();
      }
      return send(res, 200, { ok: true });
    }

    if (req.method === "GET" && url.pathname === "/__state") {
      const testId = url.searchParams.get("testId");
      const calls = testId ? (buckets.get(testId) ?? []) : [];
      return send(res, 200, { calls });
    }

    return send(res, 404, { error: "not_found" });
  } catch (err) {
    return send(res, 500, { error: String(err) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write("READY\n");
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
