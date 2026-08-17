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
 *   It also keeps the subscriber on matthewfield.ca. Buttondown's endpoint
 *   answers a successful subscribe with a 302 to buttondown.com, which would
 *   bounce a visitor off the site — the opposite of the "site is the front
 *   door" decision in research/newsletter-buttondown-brief.md.
 *
 * The endpoint is public and unauthenticated (it is designed to be embedded in
 * a page), so there is no API key here and nothing secret to leak.
 */
const BUTTONDOWN_USERNAME = "matthewfield";

const EMBED_ENDPOINT = `https://buttondown.com/api/emails/embed-subscribe/${BUTTONDOWN_USERNAME}`;

/** Public referral link Buttondown asks embedders to display. */
export const BUTTONDOWN_REFERRAL_URL = `https://buttondown.com/refer/${BUTTONDOWN_USERNAME}`;

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

/** Buttondown failed for a reason the subscriber cannot act on. */
export class ButtondownError extends Error {
  status: number;
  constructor(status: number, message = `Buttondown responded with status ${status}`) {
    super(message);
    this.name = "ButtondownError";
    this.status = status;
  }
}

/**
 * Subscribe an address to the newsletter.
 *
 * Buttondown's embed endpoint answers with HTML, not JSON, so the status code
 * is the only thing worth reading:
 *   2xx / 3xx — accepted (success is a 302 back to the public archive)
 *   400       — the address was rejected (verified: returns an HTML error page)
 *   429       — rate limited
 *   other     — treat as a vendor failure
 */
export async function subscribeToNewsletter(email: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(EMBED_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email }).toString(),
        // Do not chase the success redirect to buttondown.com — the status is
        // all we need, and following it wastes a round trip on an HTML page.
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new TimeoutError();
      }
      throw err;
    }

    // `redirect: "manual"` surfaces 3xx as an opaqueredirect (status 0) in some
    // runtimes and as the real status in others. Both mean accepted.
    if (response.status === 0 || response.type === "opaqueredirect") return;
    if (response.status < 400) return;
    if (response.status === 400) throw new InvalidEmailError();
    throw new ButtondownError(response.status);
  } finally {
    clearTimeout(timer);
  }
}
