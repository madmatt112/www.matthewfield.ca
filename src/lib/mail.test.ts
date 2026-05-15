import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const baseInput = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "Counting machines and analytical engines.",
} as const;

type LogSpy = ReturnType<typeof vi.spyOn>;

let warnSpy: LogSpy;
let errorSpy: LogSpy;
let logSpy: LogSpy;
let infoSpy: LogSpy;

function assertLogsScrubbed(input: {
  name: string;
  email: string;
  message: string;
  source?: string;
  testId?: string;
}) {
  const spies = [warnSpy, errorSpy, logSpy, infoSpy];
  const haystack = spies
    .flatMap((spy) => spy.mock.calls.flat())
    .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
    .join("\n");
  expect(haystack).not.toContain(input.name);
  expect(haystack).not.toContain(input.email);
  expect(haystack).not.toContain(input.message);
  if (input.source) {
    expect(haystack).not.toContain(input.source);
  }
  if (input.testId) {
    expect(haystack).not.toContain(input.testId);
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv("RESEND_API_KEY", "re_live_key");
  vi.stubEnv("RESEND_BASE_URL", "https://stub.example/v1");
  vi.stubEnv("RESEND_FROM", "no-reply@matthewfield.ca");
  vi.stubEnv("RESEND_TO", "matthew@matthewfield.ca");
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendContactEmail subject and payload", () => {
  it.each([
    ["profile" as const, "Contact form submission from profile"],
    ["contact" as const, "Contact form submission from contact"],
    [undefined, "Contact form submission from unspecified"],
  ])(
    "uses subject %s → %s and includes name/email/source/message in text; html unset; reply_to bare",
    async (source, expectedSubject) => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);

      const { sendContactEmail } = await import("./mail");
      const input = { ...baseInput, source };
      await sendContactEmail(input);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://stub.example/v1/emails");
      expect(init.method).toBe("POST");

      const body = JSON.parse(init.body as string);
      expect(body.subject).toBe(expectedSubject);
      expect(body.reply_to).toBe(baseInput.email);
      expect(body.html).toBeUndefined();
      expect(body.text).toContain(baseInput.name);
      expect(body.text).toContain(baseInput.email);
      expect(body.text).toContain(baseInput.message);
      expect(body.text).toContain(source ?? "unspecified");

      assertLogsScrubbed({ ...input, source: source ?? "unspecified" });
    },
  );
});

describe("sendContactEmail testId forwarding", () => {
  it("sets X-Test-Id header when input.testId is a string", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { sendContactEmail } = await import("./mail");
    const input = { ...baseInput, source: "contact" as const, testId: "case-42" };
    await sendContactEmail(input);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Test-Id"]).toBe("case-42");

    assertLogsScrubbed({ ...input, source: "contact", testId: input.testId });
  });

  it("omits X-Test-Id header when input.testId is undefined", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { sendContactEmail } = await import("./mail");
    const input = { ...baseInput, source: "profile" as const };
    await sendContactEmail(input);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Test-Id"]).toBeUndefined();
    expect(Object.keys(headers)).not.toContain("X-Test-Id");

    assertLogsScrubbed({ ...input, source: "profile" });
  });
});

describe("sendContactEmail timeout", () => {
  it("rejects with TimeoutError when fetch hangs past 9 seconds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init.signal!.addEventListener("abort", () => {
            const err = new Error("The operation was aborted.");
            err.name = "AbortError";
            reject(err);
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { sendContactEmail, TimeoutError } = await import("./mail");
    const input = { ...baseInput, source: "contact" as const };
    const promise = sendContactEmail(input);
    const expectation = expect(promise).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(9000);
    await expectation;

    assertLogsScrubbed({ ...input, source: "contact" });
  });
});

describe("getResendClient env-tuple cache", () => {
  it("rebuilds client when RESEND_BASE_URL changes between calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    vi.stubEnv("RESEND_BASE_URL", "https://first.example");
    const { sendContactEmail } = await import("./mail");
    const input = { ...baseInput, source: "profile" as const };
    await sendContactEmail(input);
    expect(fetchMock.mock.calls[0][0]).toBe("https://first.example/emails");

    vi.stubEnv("RESEND_BASE_URL", "https://second.example");
    await sendContactEmail(input);
    expect(fetchMock.mock.calls[1][0]).toBe("https://second.example/emails");

    assertLogsScrubbed({ ...input, source: "profile" });
  });
});

describe("getResendClient sanity guard", () => {
  it("throws when test-key is paired with the production Resend base URL", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_BASE_URL", "https://api.resend.com");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { sendContactEmail } = await import("./mail");
    const input = { ...baseInput, source: "contact" as const };
    await expect(sendContactEmail(input)).rejects.toThrow(/Refusing to send/);
    expect(fetchMock).not.toHaveBeenCalled();

    assertLogsScrubbed({ ...input, source: "contact" });
  });
});
