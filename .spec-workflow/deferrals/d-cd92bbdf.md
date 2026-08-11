---
id: "d-cd92bbdf"
status: "deferred"
title: "Future-date rejection fails with Zod's generic message instead of a named one"
createdAt: "2026-08-11T15:30:49.807Z"
updatedAt: "2026-08-11T15:30:49.807Z"
resolvedAt: null
originSpec: "github-activity"
originPhase: "implementation"
revisitTrigger: "Next time content schemas or build-error messages are worked on — fix github-activity, resources and reading together."
tags: ["content-schema", "diagnostics", "cross-cutting", "polish"]
resolution: null
resolvedInSpec: null
supersededBy: null
supersedes: null
---

## Context
Surfaced by the github-activity spec's end-to-end verification. The build correctly REJECTS the record, so this is a diagnostic-quality gap, not a correctness bug. It was left alone deliberately: the bare .refine() matches the established pattern in resources-schema.ts:23 and reading-schema.ts:21, which produce the same generic message, and task 3's reviewer had already noted the message is undescriptive. Fixing only github-activity would make it inconsistent with its two siblings; fixing all three is a small cross-cutting change that belongs in its own pass rather than smuggled into a feature spec. Task 3's tests pin the future-date case by the ABSENCE of the two isoDate() messages rather than by its own text, so adding a message will not redden them, but they should be tightened to assert the new text when it lands.

## Decision Deferred
Not fixed. A future-dated entry in content/github-activity.yaml fails the build with Zod's generic 'entry[364]: date = "2099-01-01" - Invalid input' rather than a message naming the BUILD_START_UTC rule, because the .refine() in src/lib/build/github-activity-schema.ts:35 carries no message option. Contrast the sibling isoDate() failures, which say "is not a valid date; use the YYYY-MM-DD format." and "is not a real calendar date."

## Revisit Criteria
A future-dated entry in any of the three collections should fail with a message naming the future-date rule, not "Invalid input". Add a message option to each .refine() and tighten the corresponding schema tests to assert it.
