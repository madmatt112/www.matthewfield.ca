import * as runtime from "react/jsx-runtime";

import { isExternalHref } from "@/lib/external-link";

import { NewTabHint } from "./new-tab-hint";

type MDXContentProps = {
  code: string;
};

/** Prose links to other sites open in a new tab; internal ones navigate in place. */
function MDXLink({ href, children, ...props }: React.ComponentPropsWithoutRef<"a">) {
  if (!isExternalHref(href)) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  // rel omits noreferrer on purpose: noopener is what blocks tabnabbing, and
  // keeping the Referer preserves click attribution on outbound links.
  return (
    <a href={href} target="_blank" rel="noopener" {...props}>
      {children}
      <NewTabHint />
    </a>
  );
}

const components = { a: MDXLink };

// Velite compiles MDX bodies to a function body string that expects the React
// jsx-runtime as arguments[0] and returns { default: Component }. Reconstruct
// the component here so pages can render Velite-sourced MDX directly.
export function MDXContent({ code }: MDXContentProps) {
  const mod = new Function(code)(runtime) as {
    default: React.ComponentType<{ components?: Record<string, unknown> }>;
  };
  const Component = mod.default;
  return <Component components={components} />;
}
