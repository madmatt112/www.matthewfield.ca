import type { RegistryEntry } from "./index";

// Fixture: emulate the exact `<section data-footnotes>` block that
// `remark-gfm` (enabled in velite.config.ts) emits at the end of a post
// with `[^N]` references. Markup copied from the rendered `bodyHtml` of
// `content/posts/fixture-footnotes.mdx` (see .velite/posts.json) so the
// CSS slice in src/styles/blog/footnotes.css is verified against the real
// output shape. CSS-only slice — no JavaScript component to mount.

const entry: RegistryEntry = {
  kind: "component",
  component: () => (
    <section data-footnotes="" className="footnotes">
      <h2 className="sr-only" id="footnote-label">
        Footnotes
      </h2>
      <ol>
        <li id="user-content-fn-1">
          <p>
            First footnote definition. Renders as item 1 in the footnotes
            section.{" "}
            <a
              href="#user-content-fnref-1"
              data-footnote-backref=""
              aria-label="Back to reference 1"
              className="data-footnote-backref"
            >
              ↩
            </a>
          </p>
        </li>
        <li id="user-content-fn-2">
          <p>
            Second footnote definition. Verifies inline-adjacent references
            resolve independently.{" "}
            <a
              href="#user-content-fnref-2"
              data-footnote-backref=""
              aria-label="Back to reference 2"
              className="data-footnote-backref"
            >
              ↩
            </a>
          </p>
        </li>
        <li id="user-content-fn-3">
          <p>
            Third footnote definition. Last in source, last in the rendered
            list.{" "}
            <a
              href="#user-content-fnref-3"
              data-footnote-backref=""
              aria-label="Back to reference 3"
              className="data-footnote-backref"
            >
              ↩
            </a>
          </p>
        </li>
      </ol>
    </section>
  ),
};
export default entry;
