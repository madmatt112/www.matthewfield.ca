import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Covers the request shape and the response→error mapping in
 * subscribeToNewsletter.
 *
 * Why this is worth testing: the `ip_address` field is the whole reason this
 * module moved off Buttondown's public embed endpoint. Dropping it does not
 * fail any build or throw at runtime — it silently reverts to the behaviour
 * that got real subscribers firewalled on 2026-08-24. Only a test that asserts
 * the field is on the wire can catch that regression.
 *
 * fetch is always stubbed. No test here may reach buttondown.com — a real call
 * on a valid address creates a subscriber and sends mail to a stranger.
 */

const ENDPOINT = "https://api.buttondown.com/v1/subscribers";
const KEY = "test-buttondown-key";

function jsonError(status: number, code?: string): Response {
  return new Response(JSON.stringify(code ? { code } : {}), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
  vi.stubEnv("BUTTONDOWN_API_KEY", KEY);
  vi.stubEnv("BUTTONDOWN_BASE_URL", "");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("subscribeToNewsletter request shape", () => {
  it("posts the email and the visitor IP as JSON to the authenticated endpoint", async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () =>
      Promise.resolve(new Response(null, { status: 201 })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { subscribeToNewsletter } = await import("./newsletter");

    await subscribeToNewsletter("reader@example.com", "203.0.113.7");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Token ${KEY}`);
    expect(JSON.parse(init.body as string)).toEqual({
      email_address: "reader@example.com",
      ip_address: "203.0.113.7",
    });
  });

  it("omits ip_address entirely when no IP is available", async () => {
    // Sending `ip_address: null` or "" would be worse than omitting it —
    // Buttondown falls back to the caller's IP only when the key is absent.
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () =>
      Promise.resolve(new Response(null, { status: 201 })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { subscribeToNewsletter } = await import("./newsletter");

    await subscribeToNewsletter("reader@example.com");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({ email_address: "reader@example.com" });
    expect("ip_address" in body).toBe(false);
  });

  it("does not send a `type`, so Buttondown's double opt-in stays on", async () => {
    // A subscriber created with type: "regular" skips the confirmation email.
    // That would silently turn a double opt-in list into a single opt-in one.
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () =>
      Promise.resolve(new Response(null, { status: 201 })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { subscribeToNewsletter } = await import("./newsletter");

    await subscribeToNewsletter("reader@example.com", "203.0.113.7");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect("type" in body).toBe(false);
  });

  it("refuses to call Buttondown at all when the API key is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("BUTTONDOWN_API_KEY", "");
    const { subscribeToNewsletter } = await import("./newsletter");

    await expect(subscribeToNewsletter("reader@example.com", "203.0.113.7")).rejects.toThrow(
      /BUTTONDOWN_API_KEY/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("subscribeToNewsletter response mapping", () => {
  it("resolves on 201", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 201 })),
    );
    const { subscribeToNewsletter } = await import("./newsletter");
    await expect(
      subscribeToNewsletter("reader@example.com", "203.0.113.7"),
    ).resolves.toBeUndefined();
  });

  it("throws InvalidEmailError only for the email_invalid code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonError(400, "email_invalid")),
    );
    const { subscribeToNewsletter, InvalidEmailError } = await import("./newsletter");
    await expect(subscribeToNewsletter("nope@", "203.0.113.7")).rejects.toBeInstanceOf(
      InvalidEmailError,
    );
  });

  it("throws AlreadySubscribedError for subscriber_already_exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonError(400, "subscriber_already_exists")),
    );
    const { subscribeToNewsletter, AlreadySubscribedError } = await import("./newsletter");
    await expect(subscribeToNewsletter("reader@example.com", "203.0.113.7")).rejects.toBeInstanceOf(
      AlreadySubscribedError,
    );
  });

  it("does NOT blame the address for an unrecognised 400", async () => {
    // The regression this guards: a firewall block also arrives as a 400, and
    // the previous implementation told the person their email was malformed.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonError(400, "firewall_blocked")),
    );
    const { subscribeToNewsletter, InvalidEmailError, ButtondownError } =
      await import("./newsletter");
    const err = await subscribeToNewsletter("reader@example.com", "203.0.113.7").catch((e) => e);
    expect(err).not.toBeInstanceOf(InvalidEmailError);
    expect(err).toBeInstanceOf(ButtondownError);
    expect((err as InstanceType<typeof ButtondownError>).code).toBe("firewall_blocked");
  });

  it("does not blame the address for a 400 with an unparseable body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>nope</html>", { status: 400 })),
    );
    const { subscribeToNewsletter, InvalidEmailError, ButtondownError } =
      await import("./newsletter");
    const err = await subscribeToNewsletter("reader@example.com", "203.0.113.7").catch((e) => e);
    expect(err).not.toBeInstanceOf(InvalidEmailError);
    expect(err).toBeInstanceOf(ButtondownError);
  });

  it("preserves the status on a rate limit so the route can answer 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonError(429)),
    );
    const { subscribeToNewsletter, ButtondownError } = await import("./newsletter");
    const err = await subscribeToNewsletter("reader@example.com", "203.0.113.7").catch((e) => e);
    expect(err).toBeInstanceOf(ButtondownError);
    expect((err as InstanceType<typeof ButtondownError>).status).toBe(429);
  });

  it("does not swallow a non-abort fetch rejection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    const { subscribeToNewsletter } = await import("./newsletter");
    await expect(subscribeToNewsletter("reader@example.com", "203.0.113.7")).rejects.toThrow(
      /network down/,
    );
  });
});

describe("subscribeToNewsletter timeout", () => {
  it("throws TimeoutError when the vendor hangs past 8 seconds", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => {
              const err = new Error("aborted");
              err.name = "AbortError";
              reject(err);
            });
          }),
      ),
    );
    const { subscribeToNewsletter, TimeoutError } = await import("./newsletter");

    const promise = subscribeToNewsletter("reader@example.com", "203.0.113.7");
    const assertion = expect(promise).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(8000);
    await assertion;
  });
});
