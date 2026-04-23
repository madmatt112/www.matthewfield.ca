import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export function generateMetadata(): Metadata {
  return {
    title: "Sitemap",
    robots: { index: false },
  };
}

export default function SitemapPage() {
  return <PlaceholderPage title="Sitemap" />;
}
