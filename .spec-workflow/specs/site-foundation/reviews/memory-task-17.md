# Task Review Memory — Task 17 (site-foundation)
Last updated: 2026-04-21T20:24:00Z (after v2 review)

## Cumulative Findings Summary

### Still Present (recurring/compounding in latest review)
_None_

### Addressed (present earlier, not found in latest)
- v1 [info] Icon sizing may be overridden by Button's descendant-SVG rule (src/components/layout/theme-toggle.tsx) — now uses `size-5` which matches `[class*='size-']` and bypasses the Button override.
- v1 [info] DropdownMenuItem uses onClick instead of Radix-idiomatic onSelect (src/components/layout/theme-toggle.tsx) — all three items now use `onSelect`.
- v1 [info, hygiene] Implementation log misattributes lucide-react installation (task-17_2026-04-20T2212 log) — user elected to leave the historical log as-is; the new log (task-17_2026-04-21T2022) documents the deferral. Not re-raised.

### New in Latest Review (v2)
_None_

## Patterns & Themes
- All three v1 findings were info-level polish notes (CSS specificity, convention alignment, log provenance), not functional defects. Two were addressed with minimal, targeted edits (5+/5− LOC); the third was a non-code historical log issue deliberately deferred.
- Implementation continues to match the shadcn canonical theme-toggle pattern. The Moon icon's `absolute` positioning relies on the Button's layout without an explicit `relative` class — this is the upstream shadcn pattern and was not flagged in v1; not flagged here either, though it remains a pattern worth verifying visually if/when the component is mounted in the layout and exercised in both light and dark mode.

## Guidance for Next Review
- If another iteration occurs, re-verify in a browser: (a) both icon states render centered inside the icon Button (Moon's `absolute` positioning with no `relative` ancestor), and (b) the dropdown opens via keyboard (Enter/Space/ArrowDown) and selection propagates via `onSelect`.
- De-prioritize: icon sizing CSS specificity (resolved), Radix handler convention (resolved), log provenance (user-deferred).
- Integration into the site layout/header is out of scope for task 17 — do not flag its absence here; watch for it in the integration task.
