# `projects-empty` fixture

This directory documents the **empty-state test mechanism** for the project
showcase (Req 1.8, Req 2.9 — Component 9 v4).

> There is **no `.json` file in this directory**, and that is intentional.
> An earlier design (v3) proposed a "JSON-with-comments" fixture, but JSON
> has no comment syntax, so that approach was discarded. The current mechanism
> is a **`vi.mock()` of the Velite collection module** — see below.

## What "empty state" means

`getPublishedProjects()` in `src/lib/projects.ts` reads the
`projects` export of `#site/content` (the Velite-generated collection) and
returns a sorted, draft-filtered array. The contract requires that, when the
collection is empty, the function returns `[]` (not `undefined`, not a
throw, not a cached non-empty array from a previous run).

To exercise that contract in isolation, the test file mocks the collection
module at file scope so that `projects` becomes `[]` for the duration of the
test.

## Canonical example

The canonical test lives at `src/lib/projects.empty.test.ts`. The essential
shape is:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted to the top of the file by Vitest's transformer, so
// it must live at file scope — NOT inside a describe / beforeEach block.
vi.mock("#site/content", () => ({
  projects: [] as Array<Record<string, unknown>>,
}));

// Import AFTER the mock is registered so the SUT sees the mocked module.
import { getPublishedProjects } from "@/lib/projects";

describe("getPublishedProjects — empty collection", () => {
  it("returns [] when #site/content exposes no projects", () => {
    expect(getPublishedProjects()).toEqual([]);
  });
});
```

## Why this case lives in its own test file

`vi.mock()` is module-hoisted: calling it inside a `describe` block does
**not** re-mock the module for that block — it would silently conflict with
any file-scoped mock in `projects.test.ts`. Extracting the empty case into
its own file (`projects.empty.test.ts`) guarantees the mock is the only
mock in effect, and the test fails loudly if `getPublishedProjects()` ever
stops handling the empty input correctly.

## Import-graph constraint — why mocking only `projects` is sufficient

The gallery page (`/projects`) consumes the Velite collection **only** via
`src/lib/projects.ts`, which imports a single named export:

```ts
import { projects } from "#site/content";
```

The other collections exposed by `#site/content` — `pages`, `profile`,
`posts` — are **not** referenced anywhere in the projects import graph
(gallery page → `projects.ts` → `#site/content.projects`). Therefore the
mock factory only needs to return `{ projects: [] }`; it does not need to
stub out `pages`, `profile`, or `posts`.

If a future change adds a new consumer of `#site/content` to the projects
import graph (for example, the gallery page starts reading `profile`
directly), this README — and the mock factory in `projects.empty.test.ts`
— must be updated to expose that collection as well. Until then, the
minimal `{ projects: [] }` factory is the correct shape.

## Related files

- `src/lib/projects.ts` — the SUT (`getPublishedProjects`)
- `src/lib/projects.empty.test.ts` — the test that uses this mechanism
- `src/lib/projects.test.ts` — the main test file (uses a different,
  non-empty mock at file scope; do not add the empty case here)
- `velite.config.ts` — defines the `projects` collection exposed by
  `#site/content`
