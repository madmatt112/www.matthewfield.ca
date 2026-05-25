import { describe, expect, test } from "vitest";
import { decodeUtf8B64 } from "./clipboard";

/**
 * Round-trip suite for `decodeUtf8B64`.
 *
 * Each case encodes a string to base64 via Node's Buffer (this is the test
 * environment), then decodes via the production `decodeUtf8B64` and asserts
 * the result matches the original byte-for-byte. The non-ASCII cases (b, c, d)
 * would fail if `decodeUtf8B64` used `atob` alone instead of pairing it with
 * `TextDecoder("utf-8")` — that's the contract this suite defends.
 */
describe("decodeUtf8B64 round-trip", () => {
  test("(a) ASCII", () => {
    const original = "hello world";
    const b64 = Buffer.from(original, "utf-8").toString("base64");
    expect(decodeUtf8B64(b64)).toBe(original);
  });

  test("(b) emoji", () => {
    const original = 'console.log("✨")';
    const b64 = Buffer.from(original, "utf-8").toString("base64");
    expect(decodeUtf8B64(b64)).toBe(original);
  });

  test("(c) accented identifiers", () => {
    const original = "const año = 1";
    const b64 = Buffer.from(original, "utf-8").toString("base64");
    expect(decodeUtf8B64(b64)).toBe(original);
  });

  test("(d) CJK", () => {
    const original = "日本語 中文 한국어";
    const b64 = Buffer.from(original, "utf-8").toString("base64");
    expect(decodeUtf8B64(b64)).toBe(original);
  });

  test("(e) tab-indented source", () => {
    const original = "\tfoo()\n\t\tbar()";
    const b64 = Buffer.from(original, "utf-8").toString("base64");
    const decoded = decodeUtf8B64(b64);
    expect(decoded).toBe(original);
    expect(decoded).toContain("\t");
    expect(decoded).toContain("\n");
  });

  test("(f) trailing newlines preserved", () => {
    const original = "line1\nline2\n\n";
    const b64 = Buffer.from(original, "utf-8").toString("base64");
    const decoded = decodeUtf8B64(b64);
    expect(decoded).toBe(original);
    expect(decoded.endsWith("\n\n")).toBe(true);
  });
});
