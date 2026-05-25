import { SeriesBadge } from "@/components/blog/series-badge";

import type { RegistryEntry } from "./index";

const entry: RegistryEntry = {
  kind: "component",
  component: () => <SeriesBadge series="Fixture Series" order={1} total={3} />,
};
export default entry;
