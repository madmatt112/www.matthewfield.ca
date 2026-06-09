# Adversarial Analysis — steering/design-system (r5)

**Verdict up front: v5 is converged.** No must-fix structural issue remains. The core v5 bet —
strip *current CI state* out of the gates and restate them as durable standards that point to
`tech.md`/CI for enforcement — is the correct steering altitude and was executed cleanly. Every
codebase claim I could check is accurate. Below are the findings that survive scrutiny; none rise to
must-fix.

## Verification performed (against the actual repo)

- **Active-roles list (Color, lines 63–66) vs. `tokens.css` + `@theme inline` in `globals.css`:**
  exact match. `background/foreground, card, popover, primary, secondary, muted, accent, destructive,
  border, input, ring` are all defined in `tokens.css` (both `:root` and `.dark`) and all mapped in
  the `@theme inline` block. `chart-*`/`sidebar-*` are present in both files but correctly flagged
  "reserved / not active." No mismatch.
- **"near-neutral" (line 86):** accurate. The grey ramp is zero-chroma (`oklch(x 0 0)` throughout),
  while `--destructive` carries chroma (`0.22` light / `0.191` dark) and the *reserved*
  `--sidebar-primary` is chromatic (`0.243 264.376`). "Near-neutral, destructive carries chroma" is
  exactly right.
- **WCAG ratios (≥4.5:1 normal / ≥3:1 large & non-text, lines 153–156):** correct durable WCAG 2
  values, correctly stated as standards. Not altitude creep — left as-is.
- **Governance "Resolved in this pass" (lines 196–198):** holds. `tokens.css` header (lines 1–7) and
  `globals.css` header comment (lines 42–46) both now point to `design-system.md` and explicitly say
  shadcn "was the starting point, not an upstream tracked for parity." The stale
  "regenerate/do-not-hand-edit/byte-align" language is gone. Claim is true.
- **CI delegation (Gates section + Revision History v5):** verified the doc no longer describes
  current CI state. `lighthouserc.js` in fact asserts **four** categories (performance,
  accessibility, best-practices, seo) at ≥0.9 and `lhci.yml` triggers on `deployment_status`
  (deploy-time, not a PR check) — exactly what the v5 revision note says was wrong in v4. The doc no
  longer makes either claim inline, so the prior error is genuinely removed rather than relabeled.

## Top risks / gaps

1. **Performance gate "≥90 target" is the one bar that drifts toward aspiration — Compounding,
   minor.** Every other bar names a falsifiable unit and threshold a reviewer can rule on for one
   screen (contrast ratios, focus presence, keyboard operability). The Performance bar (lines
   168–171) instead says pages "should hold strong Lighthouse scores (a ≥90 target)" and "meet the
   field metrics … LCP, CLS, INP plus a byte-weight budget" — with the actual thresholds delegated to
   `tech.md`/CI. For LCP/CLS/INP/byte-weight this is honest delegation (the numbers genuinely live
   elsewhere and `lighthouserc.js` currently only *placeholders* byte-weight). But "≥90 target" is
   softer than the rest: "should … a target" is not a pass/fail bar the way "≥4.5:1" is. This is the
   only place the standards-vs-aspiration line wobbles. Not must-fix — it is one weak verb, and the
   real enforcement is correctly routed — but if a future pass wants every bar equally testable,
   tightening "should hold … a ≥90 target" to "every gated route meets the Lighthouse category
   minimums defined in `tech.md`/CI" would close it without re-importing CI trivia.

2. **No-FOUC bar references a mechanism the codebase does not currently implement — Novel, minor /
   route-to-tech.md.** The doc states "Theme toggles must not flash (a no-FOUC requirement); the
   implementation mechanism lives in code/`tech.md`" (line 119) and defers "the theme-toggle no-flash
   mechanism" (line 222). The actual `ThemeProvider` in `src/app/layout.tsx` is
   `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>` — it does **not** set
   `disableTransitionOnChange`. The doc is *correct* not to assert the mechanism exists (v5 rightly
   removed that), and stating no-FOUC as a standard is legitimate steering. But there is a live gap
   between the stated standard and the implementation, and the doc points to `tech.md`/code as the
   owner. This is a code/tech.md item, not a steering defect — flagging only so it is not lost: the
   no-flash standard is currently unmet in `layout.tsx`. Do not "fix" this in the steering doc.

3. **`lighthouserc.js` file pointer is accurate but the file it points to is a scaffold —
   Compounding, minor.** The Performance bar cites `tech.md`/CI (`lighthouserc.js`) as where the
   concrete byte-weight budget lives. The pointer makes no claim about the *contents*, so it is not a
   false claim (the v5 bet — pointer, not description — protects it here). However the pointed-at
   `total-byte-weight` assertion is a `TODO_BYTE_WEIGHT_PLACEHOLDER` (2.5 MB, explicitly "SCAFFOLD
   ONLY … to be MEASURED pre-merge"). The doc already covers this honestly under Deferred Decisions
   ("byte-weight assertions … `Deferred: tech.md / CI`"). So the doc is internally consistent and the
   pointer is safe. Noted only to confirm I checked the parenthetical the brief called out: it does
   **not** introduce an implicit false claim.

## Conclusions to challenge / reverse

None. The v5 structural decision (gates = standards + delegation, no CI-state description) is sound
and I would not reverse it. The temptation to re-inline "what CI does today" is exactly the altitude
mistake v4 made; v5's removal is correct and should stay removed.

## What's missing (kept steering-honest; not must-fix)

- Nothing concrete and must-fix-worthy is unaddressed across Components, Typography, Spacing, Tokens,
  Governance, Deferred Decisions, or Voice & Tone after five rounds. The deferrals list is unusually
  complete (print/PDF, i18n/RTL, elevation, data-viz, z-index, token versioning, status roles, CI
  upgrades) and each names where it resolves.
- The two items worth tracking (Performance verb softness, no-FOUC implementation gap) are minor and
  the second belongs to `tech.md`/code, not here. Neither should be fixed by editing the steering
  doc's altitude.

## Convergence judgment

**Converged.** No must-fix. The doc makes no false claim about the codebase, contains no internal
contradiction, and every rule I tested is verifiable and correct. The only residual items are (a) one
soft verb in the Performance bar (minor, optional tightening) and (b) a real but correctly-delegated
no-FOUC implementation gap in `layout.tsx` that is tech.md/code's to close, not steering's. Per the
brief's own instruction — "MINOR-only is not a must-fix … do not escalate to keep the loop alive" —
this round should close.
