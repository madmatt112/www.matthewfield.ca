import { siteConfig } from "@/config/site";
import { ogContentType, ogSize, renderSiteCard } from "@/lib/og-card";

// Build-time site-wide Open Graph image. Posts and projects carry their own
// card in their [slug] segment; every other page inherits this one.
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = ogSize;
export const contentType = ogContentType;

export default function OpenGraphImage() {
  return renderSiteCard();
}
