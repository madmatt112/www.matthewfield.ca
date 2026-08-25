import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "@/styles/globals.css";
import { Analytics } from "@/components/layout/analytics";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { siteConfig } from "@/config/site";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | matthewfield.ca`,
  },
  description: siteConfig.description,
  // OG/Twitter images are served by the metadata-file convention
  // (src/app/opengraph-image.tsx + twitter-image.tsx), so no manual
  // openGraph.images override is needed here.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
        {/*
         * Vercel Web Analytics. The beacon is served same-origin from
         * /_vercel/insights, so the site CSP (script-src 'self',
         * connect-src 'self') needs no third-party allowance.
         *
         * Pageviews, referrers, countries, and devices only — custom
         * events via track() are a Pro-plan feature and are deliberately
         * not wired up. Revisit if the account moves off Hobby.
         *
         * The beacon loads everywhere so the wiring can be verified on a
         * preview URL, but the wrapper's beforeSend filter drops events
         * that are not served from the canonical host — Hobby has no
         * per-environment split, so previews and e2e runs would otherwise
         * mix into the production dashboard.
         */}
        <Analytics />
      </body>
    </html>
  );
}
