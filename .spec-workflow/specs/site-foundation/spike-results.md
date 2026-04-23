# CSS Isolation Spike — Outcome (Task 14)

**Source of truth for test results:** `e2e/spike-summary.txt` (task 13 output).
**Fixtures:** `src/app/(playground)/spike/page.tsx`, `src/app/(playground)/spike/spike-overlays.tsx`.
**Isolation plumbing:** `src/app/(playground)/layout.tsx`, `src/styles/playground.css`, `@layer playground` declaration in `src/styles/globals.css`.
**Bundlers verified:** Next.js 16.2.2 Webpack production build (PORT=3100, `pnpm start`) and Turbopack dev (PORT=3200, `pnpm dev`). Dates captured 2026-04-15 / 2026-04-16.

---

## Graduated outcome: **(b) viable with restrictions**

Same-page CSS isolation via an `all: initial` reset container plus an `@layer playground` token re-declaration is viable and will be used by spec 8 (playground). Two restrictions apply, neither of which warrants switching to an iframe or to document-level isolation:

1. **Typography re-establishment is currently broken inside `@layer playground`.** The `.playground-container` reset (`all: initial`, unlayered) wins over the layered `font-family` / `font-size` / `line-height` / `color` declarations on the same selector because unlayered rules beat layered rules on the same element. Custom properties are unaffected (CSS `all` excludes custom properties by spec). See mitigation M1.
2. **shadcn/ui overlay wrappers portal to `document.body` by default.** No wrapper forwards a `container` prop. Containment is possible but requires a per-overlay choice between two tiers. See mitigation M2.

Outcome is **not** (a) because M1 is a real gap, and **not** (c) because the custom-property path (the load-bearing half of the strategy for shadcn components) works cleanly and the mitigations are local.

---

## Test evidence (from `e2e/spike-summary.txt`)

All seven spike tests pass under both bundlers. Key reads:

| Fixture | Property | Observed | Source |
|---|---|---|---|
| `spike-plain-div-target` | `color` | `rgb(255, 0, 0)` | inline style (fixture sanity) |
| `spike-ac2-inherit-target` (no inline, no classes) | `font-family` | does NOT contain `Geist` / any host-declared family — observed `"Times New Roman"` on this CI | R11 AC2 anchor: site globals blocked at container boundary |
| `spike-tailwind-div-target` | `background-color` ≈ `lab(54.1736 13.3369 -74.6839)`; `padding` = 16px; `font-size`/`line-height` = 18/28px | Tailwind utilities (`bg-blue-500`, `p-4`, `text-lg`) resolve inside `@layer playground` | R11 AC4 |
| `playground-container` (light baseline) | `--background` ≈ `lab(100% 0 0)`, `--foreground` ≈ `lab(2.75381% 0 0)`, `--primary` ≈ `lab(7.78201% -.0000149012 0)`, `--primary-foreground` ≈ `lab(98.26% 0 0)` | matches `tokens.css :root` after `playground.css` re-declaration | R11 AC3 |
| `playground-container` after `html.dark` toggle | same four readings | container stays light when host is dark | R11 AC5 |
| `spike-token-access-target` (descendant with `var(--primary)` inline) | `background-color` ≈ `lab(7.78201% -.0000149012 0)`, `color` ≈ `lab(98.26% 0 0)`, `border-radius` = 10px; inherited tokens equal light baseline pre/post dark toggle | proves the layered re-declaration actively wins against `:root.dark` inheritance, not sympathetic-match | R11 AC3 |
| `spike-button-token-target` (shadcn `<Button>` with `var(--primary)` inline) | same as above on the actual Button component path | R11 AC3 at component path — independent of task 15's `@theme` block | R11 AC3 |
| `spike-shadcn-button-target` (default Button, utility classes only) | `padding` 16px / 8px, `font-size` 14px, `font-family` does NOT contain `Geist` or `ui-sans-serif` (broken-state marker) | see M1 | R11 AC3 — full bg/color verification deferred to task 15 (`@theme` block) |

Webpack prod vs. Turbopack dev: 15-property comparison table in `e2e/spike-summary.txt:137-153` shows zero divergence. R11 AC5 satisfied empirically under both bundlers.

---

## Mitigations

### M1 — Typography re-establishment bug (spec 8 must fix before building playground items)

**Problem.** `.playground-container` sits in two places in `src/styles/playground.css`:
- an unlayered rule block (lines 14-20) that applies `all: initial; isolation: isolate; display: block; box-sizing: border-box; unicode-bidi: normal`;
- a layered rule block inside `@layer playground` (lines 22-77) that re-declares typography and tokens.

The layer ordering itself is set in `src/styles/globals.css:4`: `@layer playground;` is declared *before* `@import "tailwindcss"`, so `playground` sits below Tailwind's `base` / `components` / `utilities` layers in the cascade. That ordering is preserved by both Webpack (production) and Turbopack (dev), which is why Tailwind utilities (`bg-blue-500`, `p-4`, etc.) correctly win against `@layer playground` declarations on the same selector in both bundlers — the 15-property comparison table in `e2e/spike-summary.txt:137-153` shows zero divergence.

Unlayered rules beat layered rules on the same element for non-custom-property declarations. The intended `ui-sans-serif, system-ui, …` stack never materializes; descendants inherit the CSS initial serif (`"Times New Roman"` on this CI environment; other distros may report Liberation Serif / DejaVu Serif). Container `color` is `CanvasText` (serializes `rgb(0, 0, 0)`) from the reset, not from the layer.

**Why this is captured as passing tests.** The current Test 2 in `e2e/tests/playground-isolation.test.ts` asserts the font-family *does NOT* contain `ui-sans-serif`. That assertion is a broken-state marker — it pins the bug so any future fix (or silent regression) becomes immediately visible. When spec 8 fixes the playground stylesheet, Test 2 will need to flip to asserting that the playground stack *does* appear.

**Fix options for spec 8.** Either is acceptable; pick whichever fits the final playground.css structure:

- **(Preferred) Unlayered re-establishment.** Move the typography block out of `@layer playground` into a second unlayered rule on `.playground-container`, declared *after* the reset. Keep the custom-property re-declarations where they are — they work correctly inside the layer. This keeps the token path layered (so shadcn utilities can compete with Tailwind's own layers) while giving typography the specificity it needs.
- **Higher-specificity layered selector.** Keep the layer, but target the container with a selector whose specificity beats the unlayered reset (e.g., `html .playground-container { … }` or a compound that doesn't change semantics). Relies on specificity beating layer-order, which is legal but subtler than option 1.

**Test-file fallout when M1 lands.** `HOST_FONT_FAMILY_FRAGMENTS` at `e2e/tests/playground-isolation.test.ts:97` has already been narrowed to `["Geist"]` — the earlier `Geist` / `Arial` / `Helvetica` list (flagged in review-13 v8) was tightened in response so it no longer overlaps with the playground's own `ui-sans-serif, …, Helvetica Neue, Arial, sans-serif` stack. The remaining test change when spec 8 fixes `playground.css`: `INTENDED_PLAYGROUND_FONT_FRAGMENT = "ui-sans-serif"` at `e2e/tests/playground-isolation.test.ts:103` is used with `not.toContain` at line 243 as the broken-state marker on the shadcn Button fixture (Test 2). After the fix, invert that assertion to `toContain("ui-sans-serif")` and remove the "broken-state marker" comment block above the constant. The host-leak guard using `HOST_FONT_FAMILY_FRAGMENTS` is independent of the fix and should stay.

### M2 — Overlay containment matrix (spec 8 decides per playground item)

Every shadcn/ui overlay Content wrapper hardcodes its Portal without forwarding a `container` prop. Default behavior: portal escapes to `document.body`, which sits outside `.playground-container` and therefore outside the isolation boundary. Verified in `src/app/(playground)/spike/spike-overlays.tsx`.

| shadcn component | Default portal target | Containment path | Tier |
|---|---|---|---|
| Dialog | `document.body` | `DialogPortal` (exported) accepts `container` prop | 1 |
| DropdownMenu | `document.body` | `DropdownMenuPortal` (exported) accepts `container` prop | 1 |
| Popover | `document.body` | drop to `PopoverPrimitive.Portal` (no exported wrapper) | 2 |
| Tooltip | `document.body` | drop to `TooltipPrimitive.Portal` (no exported wrapper) | 2 |
| Select | `document.body` | drop to `SelectPrimitive.Portal` (no exported wrapper) | 2 |

The `Contained Dialog` branch in the spike fixture proves the container-prop pattern keeps the portal inside `.playground-container`.

**Decision rule for spec 8.** For each playground item that mounts an overlay:
- If the overlay's visual style needs playground-scoped tokens (i.e., must render against the playground's light tokens even when the host site is dark), apply the Tier 1 or Tier 2 containment wrapper.
- If the overlay is fine rendering against the host site's live theme (e.g., a generic tooltip that should match whatever the user has selected), accept the `document.body` escape — tokens will resolve from `:root` / `:root.dark` as normal. This is the simpler default and should be preferred unless there's a concrete reason to contain.

---

## Items spec 8 inherits from site-foundation

These site-foundation artifacts are intentionally shared with spec 8 (playground) and should be extended in place rather than replaced:

- `src/styles/globals.css` — `@layer playground` declaration; spec 8 does not need to modify this.
- `src/styles/playground.css` — token re-declaration is correct; typography block needs the M1 fix.
- `src/app/(playground)/layout.tsx` — `.playground-container` wrapper; the `all: initial` reset should stay exactly as it is.
- `src/app/(playground)/spike/` — the spike fixture can remain as a regression test harness, or spec 8 may remove it once the playground's own items provide equivalent coverage.
- `e2e/tests/playground-isolation.test.ts` — regression suite; expect updates when M1 is fixed (see "Test-file fallout" above) and re-runs after task 16 ships next-themes (the `applyDarkMode` helper currently writes localStorage redundantly; see `e2e/spike-summary.txt:365-386` for the re-audit procedure).

No site-foundation artifact needs to be removed or rewritten. Outcome (c) contingency instructions are therefore not triggered.

---

## Recommendation for spec 8 playground architecture

Proceed with same-page isolation using `.playground-container` + `@layer playground`. Land the M1 typography fix as the first task that touches `playground.css`. Choose overlay containment tier per playground item; default to accepting the `document.body` escape unless a concrete visual-token requirement demands containment. Re-run `e2e/tests/playground-isolation.test.ts` after task 16 (next-themes integration) to confirm the dark-mode assertions survive the new hydration path; adjust `applyDarkMode` per the procedure in `e2e/spike-summary.txt:388-398` (dev-mode verification steps) and the task 16 follow-up in `e2e/spike-summary.txt:365-386` if the next-themes mount race introduces flake.
