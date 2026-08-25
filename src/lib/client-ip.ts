/**
 * The visitor's public IP, read from the platform's forwarding headers.
 *
 * WHY THIS EXISTS: /api/newsletter proxies the subscribe call server-side (see
 * src/lib/newsletter.ts for why). Without forwarding the visitor's IP onward,
 * Buttondown sees this deployment's egress IP for every subscriber, reads the
 * repeat activity from one datacenter address as bot traffic, and firewalls
 * legitimate people. Buttondown's own docs call this out: if `ip_address` is
 * absent "and API calls come from a limited set of IPs, the firewall may
 * interpret the repeat activity from those IPs as suspicious and block the
 * corresponding subscribers."
 *
 * TRUST: these headers are only trustworthy because Vercel overwrites
 * `x-forwarded-for` and explicitly does NOT forward externally supplied values,
 * precisely to prevent IP spoofing. On any host without that property a client
 * could forge the header. `x-vercel-forwarded-for` is preferred because
 * `x-forwarded-for` can still be rewritten by a proxy layered on top of Vercel.
 */
const IP_HEADERS = ["x-vercel-forwarded-for", "x-forwarded-for", "x-real-ip"] as const;

export function clientIpFromHeaders(headers: Headers): string | undefined {
  for (const name of IP_HEADERS) {
    const raw = headers.get(name);
    if (!raw) continue;
    // The header is a comma-separated chain; the client is the first entry.
    const first = raw.split(",")[0]?.trim();
    if (first) return first;
  }
  return undefined;
}
