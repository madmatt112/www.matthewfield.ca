import { SeriesNavigator } from "@/components/blog/series-navigator";

import type { RegistryEntry } from "./index";

const posts = [
  { slug: "fixture-series-1", title: "Part 1", seriesOrder: 1 },
  { slug: "fixture-series-2", title: "Part 2", seriesOrder: 2 },
  { slug: "fixture-series-3", title: "Part 3", seriesOrder: 3 },
];

const entry: RegistryEntry = {
  kind: "component",
  component: () => (
    <SeriesNavigator
      posts={posts}
      currentSlug="fixture-series-2"
      seriesName="Fixture Series"
    />
  ),
};
export default entry;
