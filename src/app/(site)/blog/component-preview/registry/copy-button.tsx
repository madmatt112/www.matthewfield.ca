import { CopyButton } from "@/components/blog/copy-button";

import type { RegistryEntry } from "./index";

// Fixture: emulate what `rehype-copy-button.ts` (Task 15) emits into the
// post HTML — a `.code-block-wrapper > pre + button[data-copy-button]`
// shape — then mount the hydrator below it. The hydrator queries
// `[data-copy-button]` on mount and attaches click handlers; clicking
// decodes `data-copy-source` and writes to the clipboard.
//
// `data-copy-source` here is the base64 of `console.log("hello");\n`
// (the trailing newline matches what rehype-copy-button emits via
// hast-util-to-text with whitespace:"pre"). The Playwright smoke
// decodes navigator.clipboard.readText() and asserts the round-trip.
//
// `#copy-status` is the aria-live region targeted by
// `announceCopyStatus` from clipboard.ts (Task 17). Without it the
// announcement is a silent no-op; the smoke asserts the live region
// updates after a click.

const SAMPLE_SOURCE = 'console.log("hello");\n';
// Pre-computed: btoa('console.log("hello");\n') in a Node shell.
const SAMPLE_SOURCE_B64 = "Y29uc29sZS5sb2coImhlbGxvIik7Cg==";

const entry: RegistryEntry = {
  kind: "component",
  component: () => (
    <>
      <div className="code-block-wrapper" data-code-block="">
        <pre>
          <code>{SAMPLE_SOURCE}</code>
        </pre>
        <button
          type="button"
          data-copy-button=""
          data-copy-source={SAMPLE_SOURCE_B64}
          data-pagefind-ignore="all"
          aria-label="Copy code to clipboard"
        />
      </div>
      <div id="copy-status" role="status" aria-live="polite" className="sr-only" />
      <CopyButton />
    </>
  ),
};
export default entry;
