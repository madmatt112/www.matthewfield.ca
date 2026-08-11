---
id: "d-db7c55e9"
status: "deferred"
title: "Multi-series data-visualization palette remains undecided"
createdAt: "2026-08-09T19:25:58.218Z"
updatedAt: "2026-08-09T19:25:58.218Z"
resolvedAt: null
originSpec: "github-activity"
originPhase: "design"
revisitTrigger: "A second chart is proposed that encodes more than one ordered magnitude — categorical series, a diverging scale, or anything needing two or more hues to distinguish data. Also revisit if chart-1..chart-5 are ever promoted into the active token set, since that would require fixing their light/dark parity first."
tags: ["design-system", "color", "data-viz", "tokens"]
resolution: null
resolvedInSpec: null
supersededBy: null
supersedes: null
---

## Context
The contribution heatmap needed a colour treatment, and steering said "data visualization is out of scope". Rather than resolve the whole data-viz palette question to ship one graphic, the carve-out was scoped as narrowly as possible: one role, alpha only, ordered by luminance, with a measured adjacent-step separation, a non-colour channel, and disclosure when the scale is period-relative. The reserved chart-1..chart-5 tokens were considered and rejected — they are byte-identical across light and dark, so in dark mode chart-5 sits at 1.185:1 against card and the highest-intensity steps would be the least visible. Introducing a real multi-series palette would have meant deciding whether the near-neutral identity gains chromatic range, which is a much larger question than this feature earns.

## Decision Deferred
The project still has no chroma system for distinguishing data series, and no palette for categorical or diverging charts. The github-activity carve-out added to steering design-system.md permits exactly one thing: a single-hue sequential ramp built from one active role at varying alpha, encoding one ordered magnitude. Anything with more than one hue, more than one series, or a diverging scale is still undecided.

## Revisit Criteria
Any spec proposing a chart that is not a single-hue sequential ramp; or any proposal to promote the reserved chart-* tokens; or a decision to introduce chromatic range into the active palette generally.
