# Task Review Memory — Task 19 (site-foundation)
Last updated: 2026-04-21T20:55 (after v2 review)

## Cumulative Findings Summary

### Still Present (recurring/compounding in latest review)
- (none)

### Addressed (present earlier, not found in latest)
- v1 [warning] Desktop primary navigation lacks <nav> landmark (src/components/layout/nav.tsx) — fixed by wrapping DesktopNav's <ul> in `<nav aria-label="Primary">` at nav.tsx:29
- v1 [info] Mobile header element order differs from spec (src/components/layout/header.tsx) — fixed by reordering children to title → DesktopNav → ThemeToggle → MobileNav; visibility classes produce correct visual order at each breakpoint
- v1 [info/hygiene] SheetContent missing description triggers Radix a11y warning (src/components/layout/nav.tsx) — fixed by adding visually-hidden SheetDescription at nav.tsx:74

### New in Latest Review (v2)
- (none)

## Patterns & Themes
- v1 findings clustered around accessibility/landmark semantics and strict ordering adherence; the v2 implementation addressed each one with a minimal, targeted change rather than rewriting the components.
- Splitting Nav into DesktopNav and MobileNav was a clean way to solve the spec's mobile element-order requirement without duplicating ThemeToggle or resorting to Tailwind ordering tricks.
- Restriction adherence has been solid throughout: only nav.tsx carries "use client"; header.tsx, footer.tsx, and (site)/layout.tsx are server components; hamburger retains all three required ARIA attributes.

## Guidance for Next Review
- If future iterations touch this area, sanity-check: (1) aria-current on active link, (2) Sheet closes on link click via setOpen(false), (3) MobileNav wrapper still lg:hidden and DesktopNav still hidden lg:block so landmarks don't duplicate at any breakpoint, (4) ThemeToggle remains un-gated by viewport classes.
- Well-covered — can be de-prioritized: semantic landmark placement, ARIA attributes on hamburger, client/server component boundary, mobile element order, Radix Dialog labelling completeness.
- Worth a light touch if revisited: the inner mobile nav uses `aria-label="Mobile"` which describes viewport rather than purpose — not a finding (only one landmark is exposed to AT at a time because the other is display:none or unmounted), but aligning it with DesktopNav's "Primary" would be more idiomatic.
