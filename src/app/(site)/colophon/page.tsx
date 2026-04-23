import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export function generateMetadata(): Metadata {
  return {
    title: "Colophon",
    robots: { index: false },
  };
}

export default function ColophonPage() {
  return <PlaceholderPage title="Colophon" />;
}
