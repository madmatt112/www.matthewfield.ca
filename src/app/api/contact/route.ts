import { z } from "zod";

import { ResendError, TimeoutError, sendContactEmail } from "@/lib/mail";

const MAX_BODY_BYTES = 32 * 1024;
const VENDOR_ERROR_MESSAGE =
  "Unable to send message. Please try again or use an alternative method.";

const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().email().max(254),
    message: z.string().trim().min(10).max(5000),
  })
  .strip();

const sourceSchema = z.enum(["profile", "contact"]).optional().catch(undefined);

function isAcceptedHost(host: string): boolean {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      if (new URL(siteUrl).host === host) return true;
    } catch {
      // ignore malformed env
    }
  }
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && host === vercelUrl) return true;
  if (host.endsWith(".vercel.app")) return true;
  try {
    const url = new URL(`http://${host}`);
    if (url.hostname === "localhost") return true;
  } catch {
    // ignore
  }
  return false;
}

function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  if (origin) {
    try {
      return isAcceptedHost(new URL(origin).host);
    } catch {
      return false;
    }
  }
  if (referer) {
    try {
      return isAcceptedHost(new URL(referer).host);
    } catch {
      return false;
    }
  }
  return true;
}

function firstFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in out)) {
      out[field] = issue.message;
    }
  }
  return out;
}

export async function POST(req: Request): Promise<Response> {
  const raw = await req.arrayBuffer();
  if (raw.byteLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload too large." }, { status: 413 });
  }

  if (!originAllowed(req)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const parsedRecord = parsed as Record<string, unknown>;

  if (typeof parsedRecord.url_secondary === "string" && parsedRecord.url_secondary.length > 0) {
    return Response.json({ ok: true }, { status: 200 });
  }

  const result = bodySchema.safeParse(parsedRecord);
  if (!result.success) {
    return Response.json({ errors: firstFieldErrors(result.error) }, { status: 400 });
  }

  const source = sourceSchema.parse(parsedRecord.source);
  const testId = typeof parsedRecord.testId === "string" ? parsedRecord.testId : undefined;

  try {
    await sendContactEmail({ ...result.data, source, testId });
  } catch (err) {
    if (err instanceof TimeoutError) {
      console.warn("resend_timeout");
      return Response.json(
        { error: VENDOR_ERROR_MESSAGE },
        { status: 503, headers: { "Retry-After": "60" } },
      );
    }
    if (err instanceof ResendError) {
      console.warn("resend_4xx_5xx");
      return Response.json({ error: VENDOR_ERROR_MESSAGE }, { status: 502 });
    }
    throw err;
  }

  return Response.json({ ok: true }, { status: 200 });
}
