import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export function generateMetadata(): Metadata {
  return {
    title: "Slashes",
    robots: { index: false },
  };
}

export default function SlashesPage() {
  return <PlaceholderPage title="Slashes" />;
}
