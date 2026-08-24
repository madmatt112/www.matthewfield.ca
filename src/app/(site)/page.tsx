import type { Metadata } from "next";

import { ContactStrip } from "@/components/home/contact-strip";
import { HomeHero } from "@/components/home/home-hero";
import { HomeIndex } from "@/components/home/home-index";
import { RecentWork } from "@/components/home/recent-work";

export function generateMetadata(): Metadata {
  return {
    title: "Home",
  };
}

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-20 pb-16 md:pt-28 md:pb-24">
      <HomeHero />
      <RecentWork />
      <HomeIndex />
      <ContactStrip />
    </div>
  );
}
