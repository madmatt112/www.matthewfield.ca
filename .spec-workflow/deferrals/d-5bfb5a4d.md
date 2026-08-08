---
id: "d-5bfb5a4d"
status: "deferred"
title: "Nine repo scripts have fragile entrypoint guards (space-in-path and/or symlink)"
createdAt: "2026-08-07T17:00:40.383Z"
updatedAt: "2026-08-07T17:00:40.383Z"
resolvedAt: null
originSpec: "profile-resume"
originPhase: "implementation"
revisitTrigger: "Any of these scripts is invoked through a symlink, from a path containing a space, or from a wrapper/monorepo tool that resolves paths differently — or any of them is newly wired into CI."
tags: ["tooling", "scripts", "ci", "silent-failure"]
resolution: null
resolvedInSpec: null
supersededBy: null
supersedes: null
---

## Context
Surfaced while fixing a round-2 review finding on task 22. A guard written as a bare `import.meta.url` comparison silently no-ops — exit 0, no output — when the script is invoked through a symlink or from a path containing a space. Silent exit 0 is the worst failure mode for a verifier: it reads as "passed". The common `fileURLToPath(import.meta.url)` form fixes the space case but NOT the symlink case, because `import.meta.url` is realpath-resolved while `process.argv[1]` is not; `realpathSync` on argv[1] is required for both. Affected: `check-authoring-docs`, `check-playground-css`, `check-velite-output`, `verify-canary-regex-pair`, `verify-content-canary-regex-pair`, `verify-paired-merge` carry the symlink hole; `verify-chosen-path`, `verify-ci-topology`, `verify-task-dependencies` carry both. `check-authoring-docs.mjs` is the sharpest risk since it genuinely runs in CI (ci.yml:32-33).

## Decision Deferred
Only `scripts/verify-requirements-coverage.mjs` was hardened. Its entrypoint guard now uses `realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)`. The other nine scripts were left as-is because task 22's scope was the two verifier scripts.

## Revisit Criteria
Apply the same `realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)` guard across all nine, ideally via one shared helper so the pattern has a single definition. Prioritise `check-authoring-docs.mjs`, which already runs in CI.
