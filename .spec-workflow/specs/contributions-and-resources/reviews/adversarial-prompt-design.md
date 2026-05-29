# Adversarial Design Review — contributions-and-resources/design.md

You are a principal engineer with deep, hands-on Velite, Next.js App Router, and zod experience, brought in to tear apart a design document before it is committed to. Your job is to find every weakness, infeasibility, and unverified claim — not to validate. Assume the author is confident and possibly wrong. Where the design claims to *correct* the approved requirements based on reading library internals, that is exactly where you should be most skeptical: verify those claims against the actual source on disk, because a wrong "correction" is worse than the original error.

Read these first:
- The target: `.spec-workflow/specs/contributions-and-resources/design.md`
- The approved requirements it must satisfy: `.spec-workflow/specs/contributions-and-resources/requirements.md`
- The steering docs: `.spec-workflow/steering/tech.md`, `structure.md`, `product.md`
- The actual code the design cites: `velite.config.ts`, `src/lib/projects.ts`, `src/lib/blog.ts`, `src/lib/format-date.ts`, `src/app/sitemap.ts`, `src/app/(site)/projects/page.tsx`, `eslint.config.mjs`, `scripts/check-lighthouse-cadence.mjs`, `scripts/warn-no-pagefind.mjs`, `.github/workflows/ci.yml`, `package.json`
- The Velite internals the design's two "corrections" depend on: `node_modules/velite/dist/chunk-4HFW4XPZ.js` (the design cites specific line numbers — verify them) and `node_modules/velite/dist/index.d.ts`

You have read access to the whole repo and node_modules. Use it. Do not take the design's citations on faith — open the files and confirm.

## Attack dimension 1 — The Velite "correction #1" (per-entry schema vs array schema)

The design overrides the requirements' pinned `schema: s.array(s.object({...}).strict()).min(0)` with a bare per-entry `s.object({...}).strict()`, claiming Velite 0.3.1 iterates the YAML array element-by-element and applies the schema to each element.

- Verify against `chunk-4HFW4XPZ.js` that `file.records` is the raw parsed value and that `load` iterates arrays element-wise (`isArr ? file.records : [file.records]`). Confirm the cited behavior is real, not hallucinated.
- Challenge the type-generation claim: does `single:false` + a per-entry object schema actually generate `Contribution[]`, or does it generate something else? What if `single` defaulting is not what the design assumes?
- The design drops `.min(0)`. Confirm an empty array `[]` actually survives the loader AND produces an empty collection without error. Trace the exact path for `[]`.
- Does the design's per-entry schema break the requirements' acceptance criteria anywhere (e.g., does any Req text assume the schema object is literally `s.array(...)` in a way a test would assert)?

## Attack dimension 2 — The Velite "correction #2" (custom loader for empty-payload)

The design replaces the requirements' "collection-level transform" with a custom `defineLoader` that throws named errors, claiming `VeliteFile.create` fails on null data before any schema/transform runs.

- Verify the `meta.data?.data == null` fail path and its message string against source. Confirm a thrown error inside `loader.load` actually propagates and fails the build (not swallowed, not turned into a per-file warning that lets the build continue).
- The custom loader uses `test: /\.(ya?ml)$/` and relies on being resolved *before* the built-in `yaml_default`. Verify the loader resolution order in source (`loaders: [...loadedConfig.loaders ?? [], ...loaders]` and the `.find()` call). If the built-in is found first, the whole correction collapses — check it.
- The loader imports `yaml` and calls `yaml.parse`. Is `yaml` a direct dependency of this repo, or only transitively via Velite? If it is not in `package.json`, importing it from `src/lib/build/` is a hidden dependency risk. Check `package.json`.
- The loader applies to ALL `.yaml`/`.yml` files under `content/`. Are there any other YAML files this would now intercept and break? What about YAML files elsewhere that Velite scans?
- Does throwing a raw `Error` from the loader produce a *usable* CI diagnostic, or does Velite wrap/truncate it? Does the build actually exit non-zero?

## Attack dimension 3 — The error-message contract and the dropped repo/title locator

The design claims Velite natively supplies file name + `[index].field.path` + custom message, and on that basis drops the requirements' "prefer repo/title as locator" rule.

- Verify the `source` construction (`issue.path.map(...)`) and `file.message` prepend against source. Does the resulting string actually contain the file basename, or the full absolute path (which would be noisy)? Does it contain `[3].links[2].kind` form or something else?
- The Shared Build-Time Error-Message Contract (requirements) is extremely prescriptive: ordering of fields, value serialization (quote/bare/`\n`-escape/80-char truncate with `…` inside the quote), enum-member list, `Hint:` lines. Can a per-field zod `errorMap` actually emit all of this, given it only sees the failing value and not the file or index? Where does the design put each contract element, and is that placement actually reachable? Identify any contract element that has NO home in the design.
- Is dropping the repo/title locator genuinely harmless, or does any requirement/test depend on it? Is the justification ("zod errorMap can't see siblings") actually true, or could a top-level `.superRefine` on the entry object see all fields and produce the preferred locator?
- `uniqueByKind` is described as a `superRefine` on `links`. Confirm a `superRefine` issue routes through the same `source`/`file.message` machinery and produces a contract-conformant message.

## Attack dimension 4 — Chokepoint lint edit and other config edits

The design extends `eslint.config.mjs` `no-restricted-imports` to add `contributions`/`resources` to `importNames` and adds lib+test files to the exemption allowlist.

- Verify the current rule really is `posts`-only and the exemption is a file allowlist (not a glob). Confirm `src/lib/projects.ts` is currently unguarded and the design's premise is correct.
- Does adding `contributions`/`resources` to `importNames` break `velite.config.ts` (which imports schemas, not the collections) or any existing file? Does it break the new `src/lib/build/*` modules if they import anything from `#site/content`?
- The exemption adds `src/lib/contributions.test.ts` / `resources.test.ts`. But what about the route files, components, or sitemap — could any legitimately need the import and now be blocked? Conversely, is the chokepoint actually enforced for the *components* (which receive data via props, so should be fine) — confirm no component imports `#site/content`.
- Is there a canary/sentinel test (like `projects.test.ts` Case 8-11 chokepoint scanner) that the design fails to account for? If the existing tests assert the exact allowlist contents, the design's edit would break them silently.

## Attack dimension 5 — Sitemap, cadence script, CI wiring

- The sitemap edit removes two routes from the static array and adds computed entries. Verify the current `sitemap.ts` shape and that `getAllContributions`/`getAllResources` are safe to call there (no draft guards, no env coupling). Does `maxOr` over ISO date strings actually sort correctly as strings? Edge: empty collection → fallback to `now` — confirm.
- The new cadence script reads `.velite/contributions.json` + `.velite/resources.json`. Confirm these files exist at the CI step's position (after Build 2) and that their shape is a plain array (so `.length` works). What if a collection is empty — is the JSON `[]` or absent? Trace `outputData` (`if (data == null) return`) — does an empty collection emit a file at all? If the file is absent, the script's read will throw.
- The author-doc check is wired "after Lint, before Build 1." But `.velite/*.json` does not exist before Build 1. Confirm the author-doc check does NOT depend on `.velite` (it shouldn't — it reads `docs/`). Confirm the cadence check is correctly placed after Build 2 where `.velite` exists.
- CI step naming/ordering: does inserting steps risk breaking the "Verify CI topology" / "paired-merge" guard steps (ci.yml:77-91) that assert specific step structure? Check those guards.

## Attack dimension 6 — Rendering, accessibility, and gaps

- The `contrib-<n>` id uses the sorted-output index. The requirements disclaim anchor stability, but confirm the design's index assignment matches Req 2.4 ("sort first, then assign") and that the empty-state branch doesn't collide ids (`empty-state-heading` vs `page-heading`).
- `<ul role="list">` — is `role="list"` redundant/harmful, and does the design's `aria-labelledby` wiring actually produce the announced behavior the requirements claim?
- Multi-link rail with `role="group"` + `aria-labelledby` pointing at the card's `<h2>` — verify this is valid ARIA and that the `<h2>` id is unique per card.
- Identify missing error paths or unhandled states: what happens if `language` is an empty string after the optional passes? What if two resources have identical title+url+added? What if a category in YAML is valid but has zero entries (Req 5.6 says omit — confirm the helper does)? What if `links` has a valid kind but a `label` that is whitespace-only?
- Is anything in the requirements simply not designed at all? Cross-check every Req number against the design and list any Req with no corresponding design element.

## Deliverables

Conclude your analysis with:
- **Top 5 risks/gaps**, each with a concrete failure scenario (not an abstract worry).
- **Top 3 conclusions to challenge or reverse**, with specific reasoning grounded in the source you read.
- **What's missing** — work that must be done before this design is safe to implement.

Be specific and concrete. Cite file:line evidence from the actual source for every claim about Velite/eslint/CI behavior — especially when confirming or refuting the design's two "corrections." If something is actually fine, say so in one line and move on. Do not pad with praise.

Write your complete analysis to: `.spec-workflow/specs/contributions-and-resources/reviews/adversarial-analysis-design.md`
