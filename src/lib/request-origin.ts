import { siteConfig } from "@/config/site";

/**
 * Same-origin (CSRF) check shared by the site's write endpoints.
 *
 * Extracted from src/app/api/contact/route.ts, which was its sole home until
 * /api/newsletter needed the identical check. It is a security control, so a
 * second copy was the wrong answer: two copies drift, and the drift is silent.
 *
 * The check is deliberately permissive about *absent* signals and strict about
 * *wrong* ones — a browser that suppresses Origin must still be able to submit
 * a form, while a browser sending a foreign Origin must not.
 */

/**
 * Is `host` an origin we trust to submit to this deployment?
 *
 * @param host     host from the request's Origin or Referer
 * @param selfHost the request's own Host header, when present
 */
export function isAcceptedHost(host: string, selfHost?: string | null): boolean {
  // Same-origin: a request whose Origin/Referer host equals the host it was
  // actually sent to (its own Host header) is trusted. This is the canonical
  // CSRF check — a cross-origin attacker's browser still sends the target's
  // Host (which it cannot override), so its foreign Origin won't match. It is
  // robust to apex/www/preview/custom domains without requiring
  // NEXT_PUBLIC_SITE_URL to be set to the exact serving host.
  if (selfHost && host === selfHost) return true;

  // Committed source of truth for the production origin — does not depend on a
  // runtime env var being present in the deploy.
  try {
    if (new URL(siteConfig.url).host === host) return true;
  } catch {
    // ignore malformed config
  }

  // Optional per-environment override (e.g. a non-default preview host).
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

/**
 * Should this request be allowed to perform a write?
 *
 * Precedence is Origin, then Referer, then allow. The fall-through to `true`
 * when neither header is present is intentional: some privacy browsers strip
 * both, and rejecting them would break the form for real people while stopping
 * no attacker — a cross-site form POST from a browser always carries one.
 */
export function originAllowed(req: Request): boolean {
  const rawOrigin = req.headers.get("origin")?.trim();
  // Treat `null`, empty/whitespace, and unparseable Origin values as absent.
  // Lockdown Mode, privacy browsers, and sandboxed iframes send `Origin: null`.
  const origin = rawOrigin && rawOrigin !== "null" ? rawOrigin : null;
  const referer = req.headers.get("referer");
  const selfHost = req.headers.get("host");

  if (origin) {
    try {
      return isAcceptedHost(new URL(origin).host, selfHost);
    } catch {
      // An unparseable Origin is treated as absent, not as hostile.
      return true;
    }
  }

  if (referer) {
    try {
      return isAcceptedHost(new URL(referer).host, selfHost);
    } catch {
      // An unparseable Referer IS rejected, unlike an unparseable Origin.
      // Asymmetric on purpose: a request that supplied a Referer and no Origin
      // has already shown it sends navigation context, so a garbled one is a
      // stronger signal than a missing one. Preserved verbatim from the
      // original contact-route implementation — the contract its tests pin.
      return false;
    }
  }

  return true;
}
