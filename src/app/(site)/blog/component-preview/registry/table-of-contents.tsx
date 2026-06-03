import { TableOfContents } from "@/components/blog/table-of-contents";
import type { TocEntry } from "@/lib/blog";

import type { RegistryEntry } from "./index";

// Fixture: 5 mixed-depth entries (three depth-2 and two depth-3 nested
// under them) — the per-component Playwright smoke asserts the nav renders,
// depth-3 entries are indented further than depth-2 entries, and the
// theme-parity computed-color delta on the link.
const entries: TocEntry[] = [
  { id: "intro", text: "Introduction", depth: 2 },
  { id: "setup", text: "Setup", depth: 2 },
  { id: "setup-deps", text: "Install dependencies", depth: 3 },
  { id: "usage", text: "Usage", depth: 2 },
  { id: "usage-config", text: "Configuration", depth: 3 },
];

// A single-entry fixture so the Playwright smoke can assert
// TableOfContents renders null when entries.length < 2 (Req 7.9).
const singleEntry: TocEntry[] = [{ id: "only", text: "Only heading", depth: 2 }];

const entry: RegistryEntry = {
  kind: "component",
  component: () => (
    <>
      <div data-testid="toc-multi">
        <TableOfContents entries={entries} />
      </div>
      <div data-testid="toc-single">
        <TableOfContents entries={singleEntry} />
      </div>
    </>
  ),
};
export default entry;
