import { ShareBar } from "@/components/blog/share-bar";

import type { RegistryEntry } from "./index";

const entry: RegistryEntry = {
  kind: "component",
  component: () => (
    <ShareBar
      title="Fixture Post Title"
      description="Fixture description for the share bar preview."
      url="https://example.com/blog/test-post"
    />
  ),
};
export default entry;
