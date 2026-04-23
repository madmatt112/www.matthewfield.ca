import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export function generateMetadata(): Metadata {
  return {
    title: "Professional Profile",
    robots: { index: false },
  };
}

export default function ProfilePage() {
  return <PlaceholderPage title="Professional Profile" />;
}
