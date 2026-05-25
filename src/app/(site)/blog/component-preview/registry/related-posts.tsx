import { RelatedPosts } from "@/components/blog/related-posts";
import type { RelatedPostMeta } from "@/lib/blog";

import type { RegistryEntry } from "./index";

const posts: RelatedPostMeta[] = [
  {
    slug: "fixture-related-1",
    title: "Fixture Related Post 1",
    description: "First sample related post for the preview fixture.",
    date: "2026-01-01",
  },
  {
    slug: "fixture-related-2",
    title: "Fixture Related Post 2",
    description: "Second sample related post for the preview fixture.",
    date: "2026-01-02",
  },
  {
    slug: "fixture-related-3",
    title: "Fixture Related Post 3",
    description: "Third sample related post for the preview fixture.",
    date: "2026-01-03",
  },
];

const entry: RegistryEntry = {
  kind: "component",
  component: () => <RelatedPosts posts={posts} />,
};
export default entry;
