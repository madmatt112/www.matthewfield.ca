import { z } from "zod";

import {
  ButtondownError,
  InvalidEmailError,
  TimeoutError,
  subscribeToNewsletter,
} from "@/lib/newsletter";
import { originAllowed } from "@/lib/request-origin";

const MAX_BODY_BYTES = 4 * 1024;
const VENDOR_ERROR_MESSAGE = "Unable to subscribe right now. Please try again in a moment.";
const INVALID_EMAIL_MESSAGE = "That email address doesn't look right.";

const bodySchema = z
  .object({
    email: z.string().trim().email().max(254),
  })
  .strip();

export async function POST(req: Request): Promise<Response> {
  const raw = await req.arrayBuffer();
  if (raw.byteLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Request too large." }, { status: 413 });
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

  // Honeypot, same convention as /api/contact: a bot that fills every field
  // gets a 200 and no subscription, so it has no signal to adapt to.
  if (typeof parsedRecord.url_secondary === "string" && parsedRecord.url_secondary.length > 0) {
    return Response.json({ ok: true }, { status: 200 });
  }

  const result = bodySchema.safeParse(parsedRecord);
  if (!result.success) {
    return Response.json({ error: INVALID_EMAIL_MESSAGE }, { status: 400 });
  }

  try {
    await subscribeToNewsletter(result.data.email);
  } catch (err) {
    if (err instanceof InvalidEmailError) {
      return Response.json({ error: INVALID_EMAIL_MESSAGE }, { status: 400 });
    }
    if (err instanceof TimeoutError) {
      console.warn("buttondown_timeout");
      return Response.json(
        { error: VENDOR_ERROR_MESSAGE },
        { status: 503, headers: { "Retry-After": "60" } },
      );
    }
    if (err instanceof ButtondownError) {
      console.warn("buttondown_error");
      if (err.status === 429) {
        return Response.json(
          { error: "Too many attempts. Please try again shortly." },
          { status: 429, headers: { "Retry-After": "60" } },
        );
      }
      return Response.json({ error: VENDOR_ERROR_MESSAGE }, { status: 502 });
    }
    console.warn("buttondown_unexpected");
    return Response.json({ error: VENDOR_ERROR_MESSAGE }, { status: 502 });
  }

  return Response.json({ ok: true }, { status: 200 });
}
