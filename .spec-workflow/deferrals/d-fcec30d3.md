---
id: "d-fcec30d3"
status: "deferred"
title: "Two sibling Lighthouse runs-logs falsely claim a CI cadence gate that does not exist"
createdAt: "2026-08-07T17:37:52.845Z"
updatedAt: "2026-08-07T17:37:52.845Z"
resolvedAt: null
originSpec: "profile-resume"
originPhase: "implementation"
revisitTrigger: "Any work on project-showcase or contributions-and-resources, or any decision to wire Lighthouse into CI — at which point the claim becomes true and the docs need no change, or stays false and they do."
tags: ["documentation", "ci", "performance", "lighthouse", "cross-spec"]
resolution: null
resolvedInSpec: null
supersededBy: null
supersedes: null
---

## Context
Found by the task 23 reviewer, who noticed the new runs-log had echoed the claim from its siblings. Verified independently: grep for `lhci|lighthouse` across `.github/` returns zero matches, `ci.yml` has no Lighthouse step, and neither `scripts/check-lighthouse-cadence.mjs` nor `scripts/check-contributions-resources-lighthouse-cadence.mjs` is invoked from `package.json`, any workflow, or `.githooks/pre-commit`. The cadence scripts exist and exit non-zero correctly — they are simply never run. The docs describe CI wiring that was planned in their specs' tasks but never landed. This is the same class of hazard task 22 and task 23 were both explicitly instructed to avoid: describing developer-run tooling as an enforced gate. A reader trusting these docs believes performance regressions are caught automatically when nothing checks them.

## Decision Deferred
Left uncorrected. `docs/projects-showcase-lighthouse-runs.md:7` and `docs/contributions-and-resources-lighthouse-runs.md:8` each state that "the CI cadence step fires red and a new run entry MUST be added below before the build can go green again". No such CI step exists. Only the new `docs/profile-resume-lighthouse-runs.md` was corrected (commit 4f5790e), because the other two belong to already-Complete specs.

## Revisit Criteria
Either wire the two cadence scripts into `.github/workflows/ci.yml` so the docs become accurate, or correct both docs' headers to say the scripts are developer-run. Do not leave the discrepancy standing — the whole value of a cadence script is that someone believes it runs.
