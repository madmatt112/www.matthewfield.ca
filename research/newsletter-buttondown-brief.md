# Buttondown newsletter — handoff brief

Origin: Claude Code session in `~/repo/microsaas-system`, 2026-08-17 (self-employment / content-system work). This file is the context bridge — read it before starting newsletter work in this repo.

## Decisions already made (don't relitigate)

- **matthew-field.ca is the front door.** Essays are canonical on this site; the newsletter drives attention to it, not the other way around.
- **Platform: Buttondown.** Chosen for indie ethics, custom email CSS, full HTML templates on the Professional plan, and an API that lets signup + archive live on this site. **Substack and X are excluded on ethical grounds (ownership/leadership)** — never propose either. Short-form distribution is Bluesky (manual), with Threads + LinkedIn cross-posts later via Eden's scheduler (its plan currently lacks scheduling — undecided upgrade).
- **Mossfoot Digital** is the publisher label for products, not the audience brand.
- **Content drafting rule:** any copy meant for humans (welcome email, signup blurbs, essay text) must be drafted with the `/human-prose` skill. Code and templates are exempt.

## The work to spin off

1. **Email template for Buttondown.** Port this site's design tokens (`src/styles/tokens.css`) to email-safe CSS:
   - Convert OKLCH tokens to hex (email clients don't support oklch). Brand accent is `oklch(0.5 0.13 42)` — warm sienna.
   - Font stacks with graceful fallback: `Fraunces, Georgia, serif` for display (Gmail/Outlook strip web fonts and will show Georgia; Apple Mail renders Fraunces), system sans for body in place of Geist.
   - Test against Gmail's old CSS subset; expect dark-mode auto-inversion weirdness in clients.
   - Buttondown docs: custom CSS at docs.buttondown.com/customizing-email-design; full HTML templates are Professional-plan.
2. **Signup form on this site** via the Buttondown API (embed or a small route). Placement TBD — likely footer + a `/newsletter` page.
3. **Archive decision:** on-site "past issues" page fed by the API vs. Buttondown-hosted archive with ported CSS (their archive pages support full modern CSS including oklch). On-site fits the front-door decision better.
4. **Welcome email copy** — `/human-prose` required.

## Blockers / user steps

- No Buttondown account exists yet (as of 2026-08-17). Account creation and plan choice (Professional needed for full HTML templates) are Matthew's calls.

## Related context elsewhere

- `~/repo/microsaas-system` — the micro-SaaS knowledge system (Roadmap, case studies); one of the products/content sources this newsletter will draw on. Its `CLAUDE.md` and `README.md` explain the system.
- Eden workspace (via Eden MCP, workspace `43cb7357-742d-4696-8e66-9453bc180aed`): "Brand HQ" board holds the North star doc with the full decision log; "Swipe File" holds Dan Koe outlier analysis (essay-first cadence rationale).
- The micro-SaaS system's site pages already echo this site's design language (Fraunces + hue-42 accent lifted to copper for dark mode) — a precedent for the token-porting exercise.
