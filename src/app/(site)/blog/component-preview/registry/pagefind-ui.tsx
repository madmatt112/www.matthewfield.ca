import Link from "next/link";

import type { RegistryEntry } from "./index";

// Fixture: a minimal static `.pagefind-ui` element tree that mirrors the
// surfaces the override slice (src/styles/blog/pagefind-ui.css) targets.
// At runtime `@pagefind/default-ui` mounts onto an element the host page
// gives it and emits markup roughly shaped like:
//
//   <div class="pagefind-ui">
//     <form class="pagefind-ui__form">
//       <input class="pagefind-ui__search-input" />
//     </form>
//     <div class="pagefind-ui__drawer">
//       <ol class="pagefind-ui__results">
//         <li class="pagefind-ui__result">
//           <h3 class="pagefind-ui__result-title">
//             <a class="pagefind-ui__result-link" href="…">Sample result</a>
//           </h3>
//         </li>
//       </ol>
//     </div>
//   </div>
//
// We render that shape statically (no Svelte, no hashed class suffixes —
// just the stable BEM-style class names) so the Playwright smoke can
// confirm the override slice's rebound `--pagefind-ui-*` variables flow
// through the package's own selectors and produce site-theme colors in
// both light and dark. CSS-only — no JavaScript hydrator.

const entry: RegistryEntry = {
  kind: "component",
  component: () => (
    <div className="pagefind-ui">
      <form className="pagefind-ui__form" role="search">
        <input
          className="pagefind-ui__search-input"
          type="text"
          placeholder="Search"
          aria-label="Search"
          readOnly
          defaultValue="sample query"
        />
      </form>
      <div className="pagefind-ui__drawer">
        <ol className="pagefind-ui__results">
          <li className="pagefind-ui__result">
            <h3 className="pagefind-ui__result-title">
              <Link
                className="pagefind-ui__result-link"
                href="/blog/sample-result"
              >
                Sample result
              </Link>
            </h3>
            <p className="pagefind-ui__result-excerpt">
              Sample excerpt copy used to verify text color inherits the
              site&apos;s --foreground token via --pagefind-ui-text.
            </p>
          </li>
        </ol>
      </div>
    </div>
  ),
};
export default entry;
