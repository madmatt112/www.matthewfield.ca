# Buttondown email template

Ports this site's design tokens to email-safe CSS, so the newsletter and
matthewfield.ca read as one system. Background and decisions:
`research/newsletter-buttondown-brief.md`.

| File               | What it is                                                           |
| ------------------ | -------------------------------------------------------------------- |
| `custom-css.css`   | Custom CSS over Buttondown's **Modern** template. The ship-now path. |
| `template.html`    | Full HTML email template. Needs the Professional plan.               |
| `preview.html`     | Local preview of `custom-css.css`. Open in a browser.                |
| `welcome-email.md` | Welcome copy. Needs the **Standard** plan, or reuse it on a page.    |

The converter that produced the hex values is `scripts/oklch-to-hex.mjs`.

## Which one to use

Three things checked against Buttondown's docs and the live account on
2026-08-17, two of them corrections to the brief:

- **Custom CSS is on the Basic plan**, not Professional. Only the _full HTML
  template_ needs Professional. So `custom-css.css` is usable as soon as the
  account is on any paid tier.
- **Buttondown templating is Django**, not Liquid — `{% if %}`, `{% for %}`,
  `{{ var|filter }}`, `{# comment #}`.
- **The welcome email needs the Standard plan**, which is a higher tier than
  custom CSS needs. Buttondown treats it as a transactional email, and the free
  plan can only toggle it on and off, not edit it.

**Nothing in this directory is installable on the free plan.** As of 2026-08-17
the account is free, so the email work is parked. The signup on the site is
unaffected and works today — it does not depend on any of this.

Start with `custom-css.css`. It gets ~90% of the design at a fraction of the
risk, because Buttondown's own template keeps handling the parts of email that
are genuinely hard (client resets, the unsubscribe block, forwarding preamble).
Move to `template.html` only if the masthead or footer layout becomes the thing
worth paying for.

## Install

**Custom CSS** — Buttondown → Settings → Design → set template to **Modern**,
paste `custom-css.css` into the CSS box. Modern, not Classic: the class hooks
this file targets (`.newsletter-masthead`, `.subject`, `.colophon`) only exist
in Modern. Under Classic the type ramp still lands but the masthead rules are
inert.

**Full HTML template** — Buttondown → Settings → Design → Email template
(Professional). Read the note under "Open questions" before pasting.

## Preview

```sh
cd email/buttondown && python3 -m http.server 8899
# then open http://localhost:8899/preview.html
```

A `file://` open also works, minus the live Buttondown stylesheet. The preview
loads Buttondown's real Modern CSS first, then ours, so the cascade matches the
inbox — including their `* { color: #000 }` and the `!important` rules these
overrides have to beat. Toggle your OS to dark mode to check that block.

What the preview cannot tell you: how Gmail, Outlook, or Apple Mail actually
render it. A browser supports far more CSS than any inbox.

## Publishing an issue

**Add `"newsletter"` to the post's `tags` in its frontmatter.** That is the whole archive
mechanism, decided 2026-08-17 in place of building one.

```yaml
tags: ["kubernetes", "platform", "newsletter"]
```

`/blog/tags/newsletter` then lists every issue, and the tag page and its sitemap entry are
generated automatically from `getAllTags()`. Verified end to end: tagging a published post and
rebuilding produces `.next/server/app/blog/tags/newsletter.html`. No code was written for this.

An on-site archive fed by the Buttondown API was the original plan. It was dropped because essays
are already canonical as blog posts here, so an archive would have listed the same posts `/blog`
already lists. The tag gives the same browsable index for free.

**Two traps when you verify this yourself:**

- `pnpm build` does **not** re-run velite, so a frontmatter edit will not reach the build. Run
  `npx velite build` first, or the tag silently will not appear. (Recorded as `d-a31e2253` and
  `d-096a531a` — this bit during implementation.)
- `fixture-*` posts are excluded from `getVisiblePublishedPosts()`, so tagging one proves nothing.
  Use a real published post.

## The port

Email clients do not support `oklch()`, so every value is a literal hex derived
from `src/styles/tokens.css`. Re-derive with `node scripts/oklch-to-hex.mjs`,
which also asserts the WCAG ratios — it exits non-zero if a token change drops
a pair below 4.5:1.

| Token                | Light               | Dark                |
| -------------------- | ------------------- | ------------------- |
| `--background`       | `#ffffff`           | `#0a0a0a`           |
| `--foreground`       | `#0a0a0a` (19.80:1) | `#fafafa` (18.97:1) |
| `--muted`            | `#f5f5f5`           | `#262626`           |
| `--muted-foreground` | `#636363` (6.01:1)  | `#ababab` (8.62:1)  |
| `--brand`            | `#9e441d` (6.37:1)  | `#e89960` (8.63:1)  |
| `--border`           | `#e5e5e5`           | `#232323`           |

Ratios are against that theme's `--background`. `--brand` shifts hue between
themes (42° → 55°) because the two values are chosen deliberately as a matched
pair, not auto-derived — design-system.md principle 4. Dark `--border` is
`oklch(1 0 0 / 10%)`, flattened over the background because Outlook renders
translucent borders unreliably.

Two things did not survive the port:

- **Geist** is a webfont; Gmail and Outlook strip `@font-face`. Body text uses
  the system sans stack instead of pretending Geist will arrive.
- **Shiki's dual-theme code highlighting** cannot work in an inbox — it depends
  on a CSS-variable cascade. Code blocks collapse to one flat neutral pair.

Fraunces does survive, partly: Apple Mail renders it, Gmail and Outlook fall
back to Georgia. Both are acceptable readings of the same intent, which is why
the fallback is Georgia and not a sans.

## Testing

Verified so far (browser only, via `preview.html`):

- Every override beats Buttondown's `!important` rules — checked against their
  live stylesheet, not a copy.
- All 36 text elements clear WCAG AA in both light and dark. Lowest passing
  pair is the kicker at 6.01:1 light / 8.62:1 dark.

The account exists (`matthewfield`) but the CSS has not been installed in it,
so none of the below is done. Do all of it before the first real send:

- [ ] Gmail web and Gmail Android. Gmail ignores `prefers-color-scheme` and
      runs its own inversion; check the auto-inverted rendering specifically.
- [ ] Outlook (Windows desktop uses the Word rendering engine — the worst case).
- [ ] Apple Mail macOS and iOS, in dark mode, where Fraunces should render.
- [ ] A forwarded copy. Gmail strips `<style>` on some forward paths, which is
      why `template.html` also inlines its critical styles.
- [ ] A long issue, to confirm Gmail's ~102KB clipping threshold is clear.

## Open questions

**The body placeholder in `template.html` is unverified.** Buttondown documents
every other variable used there (`email.subject`, `email.publish_date`,
`email.absolute_url`, `email.secondary_id`, `unsubscribe_url`,
`manage_subscription_url`, `subscriber.email`) but never names the one that
injects the email body into a custom template. `{{ body }}` is a placeholder
standing in for it. Buttondown's template editor seeds the box with the current
theme's HTML — read the real placeholder out of that and swap it in.

**Newsletter name and description have no documented variables either**, so the
masthead in `template.html` hardcodes "Matthew Field".

**Status-role tokens clip out of sRGB gamut** (`--destructive`, `--success`,
`--warning`, `--info`). No email surface uses them today. If one ever does, take
the clipped hex from the converter rather than inventing a value.
