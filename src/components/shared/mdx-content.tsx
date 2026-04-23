import * as runtime from "react/jsx-runtime";

type MDXContentProps = {
  code: string;
};

// Velite compiles MDX bodies to a function body string that expects the React
// jsx-runtime as arguments[0] and returns { default: Component }. Reconstruct
// the component here so pages can render Velite-sourced MDX directly.
export function MDXContent({ code }: MDXContentProps) {
  const mod = new Function(code)(runtime) as {
    default: React.ComponentType;
  };
  const Component = mod.default;
  return <Component />;
}
