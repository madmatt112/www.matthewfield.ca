import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export function generateMetadata(): Metadata {
  return {
    title: "Blog",
    robots: { index: false },
  };
}

export default function BlogPage() {
  return <PlaceholderPage title="Blog" />;
}
