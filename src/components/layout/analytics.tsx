"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { siteConfig } from "@/config/site";

/** The only host whose traffic belongs in the analytics dashboard. */
export const ANALYTICS_HOST = new URL(siteConfig.url).hostname;

/**
 * The Vercel Hobby plan has no per-environment split: preview deployments,
 * Playwright e2e runs, and any *.vercel.app URL all report into the same
 * dashboard as production traffic. The beacon still loads everywhere so the
 * wiring can be verified on a preview, but only events served from the
 * canonical host are actually sent.
 */
export function isReportableHost(hostname: string): boolean {
  return hostname === ANALYTICS_HOST;
}

export function Analytics() {
  return (
    <VercelAnalytics
      beforeSend={(event) => (isReportableHost(window.location.hostname) ? event : null)}
    />
  );
}
