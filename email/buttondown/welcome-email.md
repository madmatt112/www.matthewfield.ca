# Welcome email

Paste the body below into Buttondown → Settings → Emails → Welcome email. It sends once, after a
subscriber clicks the double opt-in confirmation link, so it is talking to someone already confirmed.
Do not repeat the confirmation instruction here.

The subject line is set in the same screen.

Drafted with the `/human-prose` skill, per the drafting rule in
`research/newsletter-buttondown-brief.md`: all human-facing copy goes through it, code and templates
are exempt. Rewrite it through the skill rather than editing it ad hoc, or it will drift back toward
sounding generated.

**Subject:** What you just signed up for

---

Thanks for subscribing. Here's what this actually is, so you can bail now if it isn't what you
wanted.

I write about platform and infrastructure engineering. Mostly Kubernetes and whatever developers end
up building on top of it. Some of it is war stories, like the Azure VM that refused to boot because
Packer captured a Gen 2 build and `New-AzImageConfig` quietly defaults to Gen 1 when you don't pass
`-HyperVGeneration`. Some of it is opinions about how platform teams should work.

The cadence is irregular on purpose. You might get two in a month, then nothing for six weeks. I'd
rather skip than pad.

Everything I send also goes up on [matthewfield.ca](https://www.matthewfield.ca). The site is the
real home for it. Email just saves you checking.

The unsubscribe link sits at the bottom of every email, this one included. One click, no exit survey.

Matthew
