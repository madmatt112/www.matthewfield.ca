import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export function generateMetadata(): Metadata {
  return {
    title: "Projects",
    robots: { index: false },
  };
}

export default function ProjectsPage() {
  return <PlaceholderPage title="Projects" />;
}
