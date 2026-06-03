import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mail", () => {
  class TimeoutError extends Error {
    constructor() {
      super("timed out");
      this.name = "TimeoutError";
    }
  }
  class ResendError extends Error {
    status: number;
    constructor(status: number) {
      super(`status ${status}`);
      this.name = "ResendError";
      this.status = status;
    }
  }
  return {
    sendContactEmail: vi.fn().mockResolvedValue(undefined),
    testIdForwardingAllowed: () =>
      process.env.NODE_ENV !== "production" || process.env.E2E_TEST_ID_ALLOWED === "1",
    TimeoutError,
    ResendError,
  };
});

const baseBody = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "A message that is well over ten characters long.",
};

type LogSpy = ReturnType<typeof vi.spyOn>;

let warnSpy: LogSpy;
let errorSpy: LogSpy;
let logSpy: LogSpy;
let infoSpy: LogSpy;

function assertNoUserInputLogged(body: {
  name: string;
  email: string;
  message: string;
  source?: string;
}) {
  const spies = [warnSpy, errorSpy, logSpy, infoSpy];
  const haystack = spies
    .flatMap((spy) => spy.mock.calls.flat())
    .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
    .join("\n");
  expect(haystack).not.toContain(body.name);
  expect(haystack).not.toContain(body.email);
  expect(haystack).not.toContain(body.message);
  if (body.source) {
    expect(haystack).not.toContain(body.source);
  }
}

function makeRequest(
  body: unknown,
  init?: RequestInit & { rawBody?: string | ArrayBuffer | Uint8Array },
) {
  const payload =
    init?.rawBody !== undefined
      ? init.rawBody
      : typeof body === "string"
        ? body
        : JSON.stringify(body);
  return new Request("https://matthewfield.ca/api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://matthewfield.ca",
      ...(init?.headers as Record<string, string> | undefined),
    },
    body: payload as BodyInit,
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://matthewfield.ca");
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(async () => {
  const { sendContactEmail } = await import("@/lib/mail");
  (sendContactEmail as ReturnType<typeof vi.fn>).mockReset();
  (sendContactEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/contact — body size cap", () => {
  it("returns 413 when the request body exceeds 32 KB", async () => {
    const { POST } = await import("./route");
    const { sendContactEmail } = await import("@/lib/mail");
    const oversize = "x".repeat(32 * 1024 + 1);
    const res = await POST(makeRequest(undefined, { rawBody: oversize }));
    expect(res.status).toBe(413);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Message is too long. Please shorten and try again.");
    expect(sendContactEmail).not.toHaveBeenCalled();
  });
});

describe("POST /api/contact — origin check", () => {
  it("continues when Origin matches NEXT_PUBLIC_SITE_URL", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest(baseBody, { headers: { origin: "https://matthewfield.ca" } }),
    );
    expect(res.status).toBe(200);
  });

  it("returns 403 when Origin is a foreign host", async () => {
    const { POST } = await import("./route");
    const { sendContactEmail } = await import("@/lib/mail");
    const res = await POST(makeRequest(baseBody, { headers: { origin: "https://evil.example" } }));
    expect(res.status).toBe(403);
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it("continues when Origin matches the *.vercel.app wildcard", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest(baseBody, { headers: { origin: "https://preview-abc.vercel.app" } }),
    );
    expect(res.status).toBe(200);
  });

  it("continues when Origin is a localhost URL", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(baseBody, { headers: { origin: "http://localhost:3013" } }));
    expect(res.status).toBe(200);
  });

  it("continues when Origin is the literal 'null' (Lockdown Mode / sandboxed iframe)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(baseBody, { headers: { origin: "null" } }));
    expect(res.status).toBe(200);
  });

  it("continues when Origin is empty/whitespace", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(baseBody, { headers: { origin: "   " } }));
    expect(res.status).toBe(200);
  });

  it("continues when Origin is malformed/unparseable", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(baseBody, { headers: { origin: "::::not a url::::" } }));
    expect(res.status).toBe(200);
  });

  it("continues when Origin matches the request's own Host (same-origin, env unset)", async () => {
    // A custom/preview host that is neither siteConfig.url nor *.vercel.app —
    // only the same-origin Host check can allow it. Proves the form works on
    // any serving host without NEXT_PUBLIC_SITE_URL being set.
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest(baseBody, {
        headers: { origin: "https://custom.example", host: "custom.example" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("continues when Origin matches siteConfig.url host (env unset, no Host header)", async () => {
    // The committed source of truth must allow the production origin even when
    // NEXT_PUBLIC_SITE_URL is unset and no Host header is present.
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest(baseBody, { headers: { origin: "https://www.matthewfield.ca" } }),
    );
    expect(res.status).toBe(200);
  });

  it("returns 403 when a foreign Origin is sent to our Host (CSRF, env unset)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const { POST } = await import("./route");
    const { sendContactEmail } = await import("@/lib/mail");
    const res = await POST(
      makeRequest(baseBody, {
        headers: { origin: "https://evil.example", host: "custom.example" },
      }),
    );
    expect(res.status).toBe(403);
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it("continues when both Origin and Referer are absent", async () => {
    const { POST } = await import("./route");
    const req = new Request("https://matthewfield.ca/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(baseBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/contact — JSON and shape guards", () => {
  it("returns 400 on malformed JSON", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest(undefined, { rawBody: "{not-json" }));
    expect(res.status).toBe(400);
  });

  it.each([
    ["null", "null"],
    ["array", "[]"],
    ["string", '"hello"'],
    ["number", "42"],
  ])("returns 400 when body is a non-plain-object: %s", async (_label, raw) => {
    const { POST } = await import("./route");
    const { sendContactEmail } = await import("@/lib/mail");
    const res = await POST(makeRequest(undefined, { rawBody: raw }));
    expect(res.status).toBe(400);
    expect(sendContactEmail).not.toHaveBeenCalled();
  });
});

describe("POST /api/contact — honeypot", () => {
  it("returns 200 silently without calling sendContactEmail when url_secondary is populated", async () => {
    const { POST } = await import("./route");
    const { sendContactEmail } = await import("@/lib/mail");
    const res = await POST(makeRequest({ ...baseBody, url_secondary: "spam" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(sendContactEmail).not.toHaveBeenCalled();
  });
});

describe("POST /api/contact — zod validation", () => {
  it("returns 400 with errors.name when name is empty", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ ...baseBody, name: "" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { errors: Record<string, string> };
    expect(body.errors.name).toBeTypeOf("string");
  });

  it("returns 400 with errors.email when email is invalid", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ ...baseBody, email: "not-an-email" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { errors: Record<string, string> };
    expect(body.errors.email).toBeTypeOf("string");
  });

  it("returns 400 with errors.message when message is too short", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ ...baseBody, message: "short" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { errors: Record<string, string> };
    expect(body.errors.message).toBeTypeOf("string");
  });
});

describe("POST /api/contact — happy path", () => {
  it("returns 200 and calls sendContactEmail once with the normalized source", async () => {
    const { POST } = await import("./route");
    const { sendContactEmail } = await import("@/lib/mail");
    const res = await POST(makeRequest({ ...baseBody, source: "profile" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(sendContactEmail).toHaveBeenCalledTimes(1);
    const call = (sendContactEmail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.source).toBe("profile");
    expect(call.name).toBe(baseBody.name);
    expect(call.email).toBe(baseBody.email);
    expect(call.message).toBe(baseBody.message);
  });

  it("normalizes an unknown source value to undefined", async () => {
    const { POST } = await import("./route");
    const { sendContactEmail } = await import("@/lib/mail");
    const res = await POST(makeRequest({ ...baseBody, source: "garbage" }));
    expect(res.status).toBe(200);
    const call = (sendContactEmail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.source).toBeUndefined();
  });
});

describe("POST /api/contact — testId forwarding", () => {
  it("forwards a string testId from the raw body into sendContactEmail", async () => {
    const { POST } = await import("./route");
    const { sendContactEmail } = await import("@/lib/mail");
    const res = await POST(makeRequest({ ...baseBody, testId: "case-99" }));
    expect(res.status).toBe(200);
    const call = (sendContactEmail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.testId).toBe("case-99");
  });

  it("passes testId as undefined when its value is non-string", async () => {
    const { POST } = await import("./route");
    const { sendContactEmail } = await import("@/lib/mail");
    const res = await POST(makeRequest({ ...baseBody, testId: 42 }));
    expect(res.status).toBe(200);
    const call = (sendContactEmail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.testId).toBeUndefined();
  });

  it("suppresses a string testId when NODE_ENV is production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("E2E_TEST_ID_ALLOWED", "");
    const { POST } = await import("./route");
    const { sendContactEmail } = await import("@/lib/mail");
    const res = await POST(makeRequest({ ...baseBody, testId: "case-99" }));
    expect(res.status).toBe(200);
    const call = (sendContactEmail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.testId).toBeUndefined();
  });

  it("forwards a string testId under NODE_ENV=production when E2E_TEST_ID_ALLOWED=1", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("E2E_TEST_ID_ALLOWED", "1");
    const { POST } = await import("./route");
    const { sendContactEmail } = await import("@/lib/mail");
    const res = await POST(makeRequest({ ...baseBody, testId: "case-99" }));
    expect(res.status).toBe(200);
    const call = (sendContactEmail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.testId).toBe("case-99");
  });
});

describe("POST /api/contact — vendor error mapping and logging discipline", () => {
  it("returns 503 with Retry-After: 60 on TimeoutError and logs only 'resend_timeout'", async () => {
    const mail = await import("@/lib/mail");
    (mail.sendContactEmail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new mail.TimeoutError(),
    );

    const { POST } = await import("./route");
    const body = { ...baseBody, source: "contact" as const };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("60");

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toBe("resend_timeout");
    assertNoUserInputLogged(body);
  });

  it("returns 502 on ResendError and logs only 'resend_4xx_5xx'", async () => {
    const mail = await import("@/lib/mail");
    (mail.sendContactEmail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new mail.ResendError(500),
    );

    const { POST } = await import("./route");
    const body = { ...baseBody, source: "profile" as const };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(502);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toBe("resend_4xx_5xx");
    assertNoUserInputLogged(body);
  });

  it("returns 502 on an unexpected error and logs only 'resend_unexpected'", async () => {
    const mail = await import("@/lib/mail");
    (mail.sendContactEmail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("boom"));

    const { POST } = await import("./route");
    const body = { ...baseBody, source: "contact" as const };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(502);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toBe("resend_unexpected");
    assertNoUserInputLogged(body);

    const json = (await res.json()) as { error: string };
    expect(json.error).not.toContain(body.name);
    expect(json.error).not.toContain(body.email);
    expect(json.error).not.toContain(body.message);
    expect(json.error).not.toContain(body.source);
  });
});
