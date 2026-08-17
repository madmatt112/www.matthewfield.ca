---
id: "d-5abe889e"
status: "deferred"
title: "Authoring doc still offers \"widen the refresh window\" as a staleness remedy the automation makes impossible"
createdAt: "2026-08-14T21:53:37.549Z"
updatedAt: "2026-08-14T22:13:30.408Z"
resolvedAt: null
originSpec: "github-activity-sync"
originPhase: "implementation"
revisitTrigger: "Revisit on either countable event: (1) the next spec or task that edits docs/contributions-and-resources-authoring.md for any reason — the fix is one sentence and the file will already be open; or (2) the first time someone reports a coverage warning on content/github-activity.yaml and asks what to do about it, which is the moment the stale remedy actually gets followed. Also revisit if PULL_RANGE_DAYS is ever changed, since the line's premise would need rewriting regardless."
tags: ["documentation", "req-12", "stale-remedy", "authoring-docs", "github-activity-sync"]
resolution: null
resolvedInSpec: null
supersededBy: null
supersedes: null
---

## Context
Found by the independent reviewer of task 15 while reading the revised section as the reader Req 12 exists to protect — someone who might follow a manual procedure a robot is already performing. Req 12's stated purpose is exactly that. The line is a residual manual remedy: following it now means editing a span the automation resets on the next weekly run, and Component 2's record-count check (b) blocks any payload whose length is not exactly PULL_RANGE_DAYS, so a hand-widened window is rejected by the gate rather than silently accepted. Not actioned in task 15 because its Success clauses are a closed criterion-keyed checklist that this line is not on, and every one of the 20 criteria was independently verified — an unrequested edit would have invalidated that verification for no in-scope benefit.</context>
<parameter name="revitTrigger">placeholder

## Decision Deferred
`docs/contributions-and-resources-authoring.md:565` tells a reader hitting a coverage warning to "widen the refresh window and it goes away". That remedy predates the sync automation, which fixes the pull span at PULL_RANGE_DAYS = 364 and rewrites the payload weekly. Task 15 revised the surrounding section but left this line untouched because it fell outside the task's criterion-keyed checklist, and adding an unrequested edit to a criterion-verified document was the larger risk.

## Revisit Criteria
The next edit to docs/contributions-and-resources-authoring.md, or the first reported coverage warning on content/github-activity.yaml, or any change to PULL_RANGE_DAYS.
