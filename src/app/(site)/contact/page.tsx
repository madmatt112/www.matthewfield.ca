import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export function generateMetadata(): Metadata {
  return {
    title: "Contact",
    robots: { index: false },
  };
}

export default function ContactPage() {
  return <PlaceholderPage title="Contact" />;
}
