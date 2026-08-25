import { describe, expect, it } from "vitest";

import { clientIpFromHeaders } from "./client-ip";

function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("clientIpFromHeaders", () => {
  it("prefers x-vercel-forwarded-for, which a proxy on top of Vercel cannot rewrite", () => {
    const h = headers({
      "x-vercel-forwarded-for": "203.0.113.7",
      "x-forwarded-for": "198.51.100.9",
      "x-real-ip": "192.0.2.1",
    });
    expect(clientIpFromHeaders(h)).toBe("203.0.113.7");
  });

  it("falls back through x-forwarded-for to x-real-ip", () => {
    expect(clientIpFromHeaders(headers({ "x-forwarded-for": "198.51.100.9" }))).toBe(
      "198.51.100.9",
    );
    expect(clientIpFromHeaders(headers({ "x-real-ip": "192.0.2.1" }))).toBe("192.0.2.1");
  });

  it("takes the first entry of a forwarding chain — the client, not a hop", () => {
    // Sending a proxy hop as the subscriber IP would be worse than sending
    // nothing: it feeds Buttondown's firewall a wrong but confident answer.
    const h = headers({ "x-forwarded-for": "203.0.113.7, 198.51.100.9, 192.0.2.1" });
    expect(clientIpFromHeaders(h)).toBe("203.0.113.7");
  });

  it("trims whitespace around the entry", () => {
    expect(
      clientIpFromHeaders(headers({ "x-forwarded-for": "  203.0.113.7 , 198.51.100.9" })),
    ).toBe("203.0.113.7");
  });

  it("handles IPv6", () => {
    const h = headers({ "x-vercel-forwarded-for": "2001:db8::1" });
    expect(clientIpFromHeaders(h)).toBe("2001:db8::1");
  });

  it("returns undefined when no header carries an IP", () => {
    expect(clientIpFromHeaders(headers({}))).toBeUndefined();
  });

  it("skips an empty header rather than returning an empty string", () => {
    // An empty string would be serialized as `ip_address: ""`, which is a
    // present-but-meaningless field rather than an omitted one.
    const h = headers({ "x-vercel-forwarded-for": "", "x-forwarded-for": "203.0.113.7" });
    expect(clientIpFromHeaders(h)).toBe("203.0.113.7");
  });

  it("skips a header that is only separators", () => {
    const h = headers({ "x-vercel-forwarded-for": " , ", "x-real-ip": "192.0.2.1" });
    expect(clientIpFromHeaders(h)).toBe("192.0.2.1");
  });
});
