import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export function generateMetadata(): Metadata {
  return {
    title: "Resources",
    robots: { index: false },
  };
}

export default function ResourcesPage() {
  return <PlaceholderPage title="Resources" />;
}
