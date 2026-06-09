import { StatusCallout } from "@/components/shared/status-callout";

import type { RegistryEntry } from "./index";

// Renders every StatusCallout tone nested inside a `card` surface — the
// deepest legal nest per design §1 (status text on its `/10` tint composited
// over `card`, max nesting depth 2). Used by visual-design-axe.test.ts to
// assert zero color-contrast violations on the composited tint in both themes.
const entry: RegistryEntry = {
  kind: "component",
  component: () => (
    <div className="rounded-lg border bg-card p-6 text-card-foreground">
      <div className="flex flex-col gap-4">
        <StatusCallout tone="success">
          Your message has been sent. Thanks for reaching out.
        </StatusCallout>
        <StatusCallout tone="warning">
          This action cannot be undone once confirmed.
        </StatusCallout>
        <StatusCallout tone="info">
          This profile reflects the most recent available information.
        </StatusCallout>
        <StatusCallout tone="error">
          Something went wrong sending your message. Please try again.
        </StatusCallout>
      </div>
    </div>
  ),
};
export default entry;
