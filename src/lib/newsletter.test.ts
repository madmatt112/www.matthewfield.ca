import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Covers the status→error mapping in subscribeToNewsletter.
 *
 * Why this is worth testing: Buttondown's embed endpoint answers with HTML, not
 * JSON, and its response contract is NOT documented — the mapping below was
 * derived by probing the live endpoint. That makes it exactly the kind of logic
 * that breaks silently when a vendor changes behaviour, and the kind a reader
 * cannot verify by inspection. See design.md § Data Models.
 *
 * fetch is always stubbed. No test here may reach buttondown.com — a real call
 * on a valid address creates a subscriber and sends mail to a stranger.
 */

const ENDPOINT = "https://buttondown.com/api/emails/embed-subscribe/matthewfield";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("subscribeToNewsletter request shape", () => {
  it("posts form-urlencoded email to the embed endpoint without following redirects", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { subscribeToNewsletter } = await import("./newsletter");
    await subscribeToNewsletter("ada@example.com");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    // Not JSON: the endpoint is a form target, not an API.
    expect(init.body).toBe("email=ada%40example.com");
    // Following the success 302 would fetch an HTML page we never read.
    expect(init.redirect).toBe("manual");
  });

  it("url-encodes addresses containing characters that are legal in email but not in a form body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { subscribeToNewsletter } = await import("./newsletter");
    await subscribeToNewsletter("a+b c&d@example.com");

    const [, init] = fetchMock.mock.calls[0];
    // A raw & would split the body into two fields and truncate the address.
    expect(init.body).toBe("email=a%2Bb+c%26d%40example.com");
  });
});

describe("subscribeToNewsletter accepted responses", () => {
  it.each([200, 201, 204, 301, 302, 303, 307])("resolves on status %i", async (status) => {
    // 3xx is the real success path: Buttondown answers a subscribe with a
    // redirect back to the public archive.
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status }));
    vi.stubGlobal("fetch", fetchMock);

    const { subscribeToNewsletter } = await import("./newsletter");
    await expect(subscribeToNewsletter("ada@example.com")).resolves.toBeUndefined();
  });

  it("resolves on an opaqueredirect response, where the runtime reports status 0", async () => {
    // `redirect: "manual"` surfaces a 3xx as an opaque response with status 0
    // in some runtimes and as the real status in others. Both mean accepted,
    // and treating status 0 as a failure would reject every success in one of
    // the two runtimes.
    const fetchMock = vi.fn().mockResolvedValue({ status: 0, type: "opaqueredirect" });
    vi.stubGlobal("fetch", fetchMock);

    const { subscribeToNewsletter } = await import("./newsletter");
    await expect(subscribeToNewsletter("ada@example.com")).resolves.toBeUndefined();
  });
});

describe("subscribeToNewsletter rejected responses", () => {
  it("throws InvalidEmailError on 400, the status Buttondown returns for a bad address", async () => {
    // Verified against the live endpoint: POSTing `not-an-email` returns 400
    // with an HTML error page. This is the one branch a subscriber can act on.
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("<html>Subscription Error</html>", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    const { subscribeToNewsletter, InvalidEmailError } = await import("./newsletter");
    await expect(subscribeToNewsletter("nope")).rejects.toBeInstanceOf(InvalidEmailError);
  });

  it.each([401, 403, 404, 429, 500, 502, 503])(
    "throws ButtondownError carrying status %i",
    async (status) => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status }));
      vi.stubGlobal("fetch", fetchMock);

      const { subscribeToNewsletter, ButtondownError } = await import("./newsletter");
      const promise = subscribeToNewsletter("ada@example.com");
      await expect(promise).rejects.toBeInstanceOf(ButtondownError);
      // The route maps 429 to its own response, so the status must survive.
      await expect(promise).rejects.toMatchObject({ status });
    },
  );

  it("does not swallow a non-abort fetch rejection", async () => {
    // A DNS or TLS failure must surface, not be misreported as a timeout.
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const { subscribeToNewsletter, TimeoutError } = await import("./newsletter");
    const promise = subscribeToNewsletter("ada@example.com");
    await expect(promise).rejects.toBeInstanceOf(TypeError);
    await expect(promise).rejects.not.toBeInstanceOf(TimeoutError);
  });
});

describe("subscribeToNewsletter timeout", () => {
  it("throws TimeoutError when the vendor hangs past 8 seconds", async () => {
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

    const { subscribeToNewsletter, TimeoutError } = await import("./newsletter");
    const promise = subscribeToNewsletter("ada@example.com");
    const expectation = expect(promise).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(8000);
    await expectation;
  });

  it("clears the timer on a fast response so the process is not held open", async () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 302 }));
    vi.stubGlobal("fetch", fetchMock);

    const { subscribeToNewsletter } = await import("./newsletter");
    await subscribeToNewsletter("ada@example.com");

    expect(clearSpy).toHaveBeenCalled();
  });
});
