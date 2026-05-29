# Adversarial Design Review (round 3) — contributions-and-resources/design.md

You are a principal engineer with deep, hands-on Velite 0.3.1, zod (v3-shaped internals), Next.js App Router, ESLint flat config, and GitHub Actions experience. This design has survived two prior adversarial rounds and been revised twice. Your job is to find what still breaks — not to bless it. Two prior rounds repeatedly caught the same anti-pattern: **the author states behavioral claims as verified fact that turn out false, especially about the wiring/invocation layer (what runs, where, and in what order).** Hunt that pattern relentlessly. A v3 that "looks done" is the most dangerous kind.

**Prove or refute every behavioral claim against on-disk source.** Open `node_modules/velite/dist/chunk-4HFW4XPZ.js`, `node_modules/velite/dist/index.js`, the actual scripts, and the CI YAML. Run a throwaway Velite build if it settles a question. Do NOT reason about what a library "probably" does.

Read first:
- Target: `.spec-workflow/specs/contributions-and-resources/design.md`
- Requirements: `.spec-workflow/specs/contributions-and-resources/requirements.md`
- Steering: `.spec-workflow/steering/tech.md`, `structure.md`
- Code: `velite.config.ts`, `next.config.ts`, `package.json`, `.github/workflows/ci.yml`, `src/lib/projects.ts`, `src/lib/projects.test.ts`, `src/lib/build/check-projects-chokepoint.ts`, `src/__fixtures__/chokepoint-canary.ts`, `scripts/verify-canary-regex-pair.mjs`, `scripts/verify-ci-topology.mjs`, `scripts/check-lighthouse-cadence.mjs`, `src/app/sitemap.ts`, `eslint.config.mjs`
- Velite internals: `node_modules/velite/dist/chunk-4HFW4XPZ.js`, `index.js`

## Prior Review Context

Full cumulative record: `reviews/adversarial-memory-design.md`; raw analyses: `reviews/adversarial-analysis-design.md` (r1), `…-r2.md` (r2). Summary:
- **r1 (dominant):** Velite runs non-strict → zod issues only warn and ship. Fixed in v2 by making the custom loader the authoritative validator (its `throw` exits non-zero).
- **r2:** (1) v2 falsely claimed `next build` runs Velite via a webpack plugin — it does NOT (`postinstall: velite build` + `ci.yml:117` are the real run-points); (2) generalizing the projects chokepoint scanner would break it; (3) editing the projects canary trips `verify-canary-regex-pair.mjs`; (4) `s.isodate()` is lax + rewriting; (5) `formatZodIssues` under-specified for enum-non-string / unrecognized_keys / non-scalar / identifier-itself-failed.

v3 responses to verify: corrected the run-points prose; switched to a SEPARATE scanner (`check-content-chokepoint.ts`) + SEPARATE canary + symbol→allowlist map + additive TRACKED_SET registration; added `isoDate() = s.string().regex(/^\d{4}-\d{2}-\d{2}$/).pipe(s.isodate())`; hardened `formatZodIssues` (schema-walk member derivation, unrecognized_keys multi-key/nested-shape, non-scalar serialization, locator fallback, bundled-zod pinning); expanded the deviation list.

**Classify each finding: Novel / Compounding / Recurring (escalate severity for recurring).** Do NOT re-litigate the r1/r2 "confirmed-fine" lists (safeParse sync, loader-throw→exit-1, no double-parse divergence, resolution order, single:false→[], envelope table, eslint canary `off` exemption, issue.options for string enum) unless v3 changed something touching them. Spend effort on whether v3's FIXES are themselves correct.

## Attack dimension 1 — Did v3 actually purge the claim-as-fact anti-pattern?

- Re-read the corrected "Where Velite actually runs" prose. Verify EVERY assertion: `package.json:8` bare `next build`; `next.config.ts` has no plugin; `postinstall: velite build`; `ci.yml:42-43` install runs postinstall; `ci.yml:117-119` velite build precedes `ci.yml:121-123` Build 2; Build 1 (`ci.yml:94-95`) consumes postinstall output. Find any remaining overclaim or any ordering that is actually wrong.
- **Hunt the install-time failure claim:** the design says a malformed entry fails at `postinstall` during `pnpm install --frozen-lockfile`. Confirm `postinstall` actually runs `velite build` in CI's install step AND that a loader `throw` there fails the *install step* (non-zero) — or does pnpm treat a failing `postinstall` lifecycle script as non-fatal under some flag? Check whether `ignore-scripts`, `--frozen-lockfile`, or `.npmrc` settings change postinstall behavior. If postinstall failures are swallowed, the FIRST hard-fail is actually the explicit Build-2 velite build — does the design's prose survive that correction?
- Scan the whole document for any other unverified behavioral assertion about Velite/zod/CI introduced or left in v3.

## Attack dimension 2 — `isoDate()` composition

The design defines `isoDate() = s.string().regex(/^\d{4}-\d{2}-\d{2}$/).pipe(s.isodate())`.

- Verify `.pipe()` semantics in the bundled zod: does the LEFT schema's output feed the RIGHT schema's input, and does `_output` of the whole become `s.isodate()`'s output (`string`, the `toISOString()` result)? Confirm against `ZodPipeline` source (`chunk-4HFW4XPZ.js` around 37082-37117).
- Does the regex run BEFORE `s.isodate()`'s `refine`+`transform`? Trace `ZodPipeline._parse`: it parses `in` first, then `out`. So a non-`YYYY-MM-DD` string is rejected by the regex before `s.isodate()` ever transforms — confirm. But also: `s.string().regex(...)` validates the RAW string; then `s.isodate()` re-runs `s.string()` + `Date.parse` refine + transform on that same raw string. Is there any double-application or any case where the regex passes but `Date.parse` fails (e.g. `2026-13-45` matches `\d{4}-\d{2}-\d{2}` but is not a real date)? **Verify `2026-13-45` / `2026-02-30` behavior** — does `Date.parse("2026-02-30")` reject or roll over? If `Date.parse` rolls over (`2026-02-30` → `2026-03-02`), the regex+isodate combo SILENTLY ACCEPTS AND REWRITES an impossible date. Test this empirically. This would be a real, novel hole the design's "regex gate enforces ISO date" claim misses.
- Confirm `s.isodate()` is exported on Velite's `s` namespace (not `s.isoDate`/`s.date`) and that the design's lowercase usage is right.

## Attack dimension 3 — `formatZodIssues` schema-walk feasibility

v3 says enum members come from "walking the schema along `issue.path` to the failing field's `ZodEnum` and reading its `_def.values`," and unrecognized-key "did you mean" walks to the correct nested `ZodObject` and reads `.shape`.

- Verify you can actually traverse a Velite `s.object({...})` by a path like `["links", 2, "kind"]` to reach the `ZodEnum`. `s.object(...)` is a `ZodObject` (`.shape`/`_def.shape()`); `links` is `ZodArray` (`._def.type` is the element schema); the element is `ZodObject` with `.shape.kind` = the enum. But the design's fields use `.transform().pipe()` wrappers (`ZodPipeline`, `ZodEffects`) — does walking hit a `ZodEffects`/`ZodPipeline` node where `.shape`/`_def.values` is NOT directly present, requiring unwrapping (`._def.schema`, `._def.in`/`._def.out`)? Identify every wrapper the walk must unwrap (`ZodOptional` for `language`/`label`, `ZodEffects` for trimmed fields, `ZodPipeline` for `isoDate`) and confirm the design acknowledges the unwrapping, or flag it as under-specified.
- `_def.values` vs `_def.values`/`enum`/`options`: confirm the exact property holding a `ZodEnum`'s members in the bundled zod. If it's `._def.values` (array) vs `.enum` (object) vs `.options`, the design's named property must match.
- The `kind` enum is `s.enum([...])` directly (no wrapper) but `category` likewise — confirm neither is wrapped. But `links` is `s.array(linkSchema).min(1).max(5).superRefine(...)` — walking to `links[2].kind` must descend through the array's `superRefine`/`ZodEffects` wrapper (a `.superRefine` returns a `ZodEffects`!). So `links` is a `ZodEffects` wrapping a `ZodArray`. Does the design's walk unwrap that? This is the precise feasibility crack — verify.

## Attack dimension 4 — The separate scanner + TRACKED_SET edit

- v3 adds the new canary↔test pair to `verify-canary-regex-pair.mjs` TRACKED_SET. Read that script: is TRACKED_SET a frozen array the design proposes to edit, and does the gate's logic, ON THE INTRODUCING PR (which creates both new files together), pass — or does the strict-subset rule fire if, say, only some tracked files are "present"/"touched"? Trace the present/touched logic against the scenario "PR adds 2 brand-new files both in the same commit." Confirm no chicken-and-egg failure.
- Does adding entries to TRACKED_SET interact with `verify-ci-topology.mjs` or the existing projects-pair tracking? Confirm the projects pair still works after the array grows.
- The new scanner `check-content-chokepoint.ts` lives under `src/lib/build/`. Does anything (eslint, the projects scanner, tsconfig includes, the chokepoint scan ITSELF) scan `src/lib/build/*` and would the new scanner file (which references the literal strings "contributions"/"resources" and maybe imports nothing from `#site/content`) trip its own or the projects guard? Check whether `src/lib/build/check-projects-chokepoint.ts` is itself in any allowlist and whether the new file needs equivalent treatment.
- Symbol→allowlist map: the design says `contributions.ts` may import `contributions` but not `resources`. Confirm the design specifies how the scanner reports a finding (the symbol + file) and how the test maps symbol→allowed-files. Is there a gap where the canary fixture itself (which imports BOTH symbols) would be flagged unless exempted in the new scanner's allowlist?

## Attack dimension 5 — Residual gaps and requirement coverage

- Re-cross-check every requirement number against v3. Did any v3 edit (isoDate normalization, loader validation, separate scanner) introduce a NEW contradiction with a requirement or its acceptance test? Specifically: Req 2.4/5.4 reference `date`/`added` rendering and sort — does the normalized full-datetime emission break any acceptance assertion that expects the author's `YYYY-MM-DD` to round-trip?
- The sitemap `maxOr` now operates on full-datetime strings. Confirm the design's sitemap section is consistent with the normalized emission (no leftover "date-only" assumption).
- `formatContentDate(iso)` returns `{ datetime: iso, display }`. With `iso` now a full datetime, does `display` (via `Intl.DateTimeFormat en-CA` date parts) still render the intended calendar day, and does `datetime` carrying a full timestamp violate any requirement about the `<time>` element? Check Req 2.4.
- Any remaining under-specification that would force the implementer to make an un-reviewed decision (the kind that becomes the next bug).

## Deliverables

Conclude with:
- **Top 5 risks/gaps**, each tagged Novel/Compounding/Recurring, each with a concrete failure scenario and file:line evidence.
- **Top 3 conclusions to challenge or reverse**, grounded in source you read.
- **What's missing** before this design is safe to implement.

Be specific and concrete. Cite source for every behavioral claim — especially the `isoDate()` impossible-date case, the schema-walk-through-`ZodEffects` feasibility, and the postinstall-failure behavior. If something is genuinely fine now, say so in one line and move on. No praise padding.

Write your complete analysis to: `.spec-workflow/specs/contributions-and-resources/reviews/adversarial-analysis-design-r3.md`
