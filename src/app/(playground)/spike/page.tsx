import { Button } from "@/components/ui/button";

import { SpikeOverlays } from "./spike-overlays";

export default function SpikePage() {
  return (
    <main>
      <h1>CSS Isolation Spike</h1>

      <section data-testid="spike-plain-div">
        <div style={{ color: "red", fontFamily: "serif" }} data-testid="spike-plain-div-target">
          Plain div with inline conflicting styles (color:red, font-family:serif).
        </div>
      </section>

      <section data-testid="spike-shadcn-button">
        <Button data-testid="spike-shadcn-button-target">shadcn/ui Button</Button>
      </section>

      <section data-testid="spike-tailwind-div">
        <div className="bg-blue-500 p-4 text-lg" data-testid="spike-tailwind-div-target">
          Tailwind utilities (bg-blue-500, p-4, text-lg).
        </div>
      </section>

      {/* R11 AC3: a descendant of .playground-container reaches the
          re-established shadcn/ui tokens via var() references. If the
          @layer playground rules didn't apply to the container, every
          var() below would resolve to the site-scoped :root value (or
          to initial after the reset), producing visibly different
          computed style readings. */}
      <section data-testid="spike-token-access">
        <div
          data-testid="spike-token-access-target"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            borderRadius: "var(--radius)",
            padding: "1rem",
          }}
        >
          Re-established token access via var() references.
        </div>
      </section>

      {/* R11 AC2 — controlled test for style isolation. A descendant
          without any inline overrides: if site globals leaked past the
          container reset, this element would render with the host's
          declared values. The spike test asserts the computed value
          does NOT include any host-site family (e.g. Geist). */}
      <section data-testid="spike-ac2-inherit">
        <div data-testid="spike-ac2-inherit-target">
          No inline overrides — inherits from the playground container.
        </div>
      </section>

      {/* R11 AC3 — Button-shaped fixture that consumes re-established
          tokens via var() inline styles. Proves the shadcn Button
          component path (not just any div) renders with the playground
          container's re-declared --primary / --primary-foreground rather
          than the :root values. Decouples AC3 from task 15's @theme
          utility wiring while still exercising the actual component
          AC3 names. */}
      <section data-testid="spike-button-token">
        <Button
          data-testid="spike-button-token-target"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          Button styled via tokens
        </Button>
      </section>

      <SpikeOverlays />
    </main>
  );
}
