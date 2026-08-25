/**
 * Buttondown newsletter subscription.
 *
 * WHY THIS IS PROXIED SERVER-SIDE rather than posting straight to Buttondown
 * from the browser, which is what Buttondown's own embed snippet does:
 *
 *   The site CSP (next.config.ts) sets `connect-src 'self'` AND
 *   `form-action 'self'`. Buttondown's snippet is a cross-origin form POST, so
 *   the browser blocks it before a request is made — and a client-side fetch to
 *   buttondown.com is blocked by the same policy. Proxying keeps both
 *   directives untouched.
 *
 *   It also keeps the subscriber on matthewfield.ca. Buttondown's embed
 *   endpoint answers a successful subscribe with a 302 to buttondown.com, which
 *   would bounce a visitor off the site — the opposite of the "site is the
 *   front door" decision in research/newsletter-buttondown-brief.md.
 *
 * WHY THE AUTHENTICATED API RATHER THAN THE PUBLIC EMBED ENDPOINT:
 *
 *   The embed endpoint has no way to declare who the subscriber actually is, so
 *   proxying it meant Buttondown attributed every signup to this deployment's
 *   egress IP. Its firewall read the repeat activity from a single datacenter
 *   address as bot traffic and started blocking real people — observed
 *   2026-08-24, two `firewall.blocked` events from 54.211.84.12 (AWS us-east-1)
 *   with `risk_score: 0.5`.
 *
 *   `POST /v1/subscribers` takes an `ip_address` field, and Buttondown uses it
 *   "rather than the IP address from which the API call is made". That restores
 *   the signal the firewall needs. It costs an API key, which is why this module
 *   now reads one — the embed endpoint deliberately needed none.
 *
 * DOUBLE OPT-IN is preserved by omitting `type`: a subscriber created without
 * it defaults to `unactivated` and is sent a confirmation email.
 */
const BUTTONDOWN_DEFAULT_BASE_URL = "https://api.buttondown.com";

/** Public referral link Buttondown asks embedders to display. */
export const BUTTONDOWN_REFERRAL_URL = "https://buttondown.com/refer/matthewfield";

const TIMEOUT_MS = 8000;

export class TimeoutError extends Error {
  constructor(message = "Buttondown request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

/** Buttondown rejected the address itself — surface this to the subscriber. */
export class InvalidEmailError extends Error {
  constructor(message = "Buttondown rejected the email address") {
    super(message);
    this.name = "InvalidEmailError";
  }
}

/** The address is already on the list. Not a failure — see the route handler. */
export class AlreadySubscribedError extends Error {
  constructor(message = "That address is already subscribed") {
    super(message);
    this.name = "AlreadySubscribedError";
  }
}

/** Buttondown failed for a reason the subscriber cannot act on. */
export class ButtondownError extends Error {
  status: number;
  /** Buttondown's machine-readable error code, when the body carried one. */
  code: string | undefined;
  constructor(status: number, code?: string, message?: string) {
    super(message ?? `Buttondown responded with status ${status}${code ? ` (${code})` : ""}`);
    this.name = "ButtondownError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Read the `code` out of an error body without letting a malformed or non-JSON
 * response mask the status we already have.
 */
async function errorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "code" in body) {
      const code = (body as { code: unknown }).code;
      if (typeof code === "string") return code;
    }
  } catch {
    // Non-JSON or truncated body — the status alone still classifies it.
  }
  return undefined;
}

/**
 * Subscribe an address to the newsletter.
 *
 * @param email     the address to subscribe
 * @param ipAddress the visitor's IP, from src/lib/client-ip.ts. Optional so the
 *                  function still works off-platform, but omitting it in a
 *                  deployment is what caused the firewall blocks described
 *                  above — pass it.
 */
export async function subscribeToNewsletter(email: string, ipAddress?: string): Promise<void> {
  const apiKey = process.env.BUTTONDOWN_API_KEY ?? "";
  const baseUrl = process.env.BUTTONDOWN_BASE_URL || BUTTONDOWN_DEFAULT_BASE_URL;

  // Fail loudly rather than silently dropping a subscriber. A signup that
  // returns success without reaching Buttondown is worse than a visible error:
  // the person believes they are on the list and never hears from us again.
  if (apiKey === "") {
    throw new Error("Refusing to subscribe: BUTTONDOWN_API_KEY is not set");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v1/subscribers`, {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        // `type` is deliberately absent — see the double opt-in note above.
        body: JSON.stringify({
          email_address: email,
          ...(ipAddress ? { ip_address: ipAddress } : {}),
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new TimeoutError();
      }
      throw err;
    }

    if (response.status < 400) return;

    const code = await errorCode(response);

    // Only claim the address is bad when Buttondown says so. The previous
    // implementation mapped every 400 to InvalidEmailError, which told people
    // whose signup was firewalled that their own email was malformed.
    if (code === "email_invalid") throw new InvalidEmailError();
    if (code === "subscriber_already_exists") throw new AlreadySubscribedError();
    throw new ButtondownError(response.status, code);
  } finally {
    clearTimeout(timer);
  }
}
