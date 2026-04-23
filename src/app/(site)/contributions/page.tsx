import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export function generateMetadata(): Metadata {
  return {
    title: "Contributions",
    robots: { index: false },
  };
}

export default function ContributionsPage() {
  return <PlaceholderPage title="Contributions" />;
}
