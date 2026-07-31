import { siteConfig } from "@/config/site";

const SITE_HOST = new URL(siteConfig.url).hostname.replace(/^www\./, "");

/**
 * True for links that leave the site and should open in a new tab. Relative
 * paths and in-page anchors resolve against the site origin so they stay
 * internal, and non-web schemes (mailto:, tel:) are left alone — handing those
 * to a new tab just leaves an empty one behind.
 */
export function isExternalHref(href: string | undefined): boolean {
  if (!href) return false;
  let url: URL;
  try {
    url = new URL(href, siteConfig.url);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return url.hostname.replace(/^www\./, "") !== SITE_HOST;
}
