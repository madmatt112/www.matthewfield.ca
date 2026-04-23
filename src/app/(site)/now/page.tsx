import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export function generateMetadata(): Metadata {
  return {
    title: "Now",
    robots: { index: false },
  };
}

export default function NowPage() {
  return <PlaceholderPage title="Now" />;
}
