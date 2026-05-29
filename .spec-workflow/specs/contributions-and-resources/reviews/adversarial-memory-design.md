# Adversarial Review Memory — design
Last updated: 2026-05-28 (after v2 review, prepping v3 review)

## Round 2 Findings (against v2) — all addressed in v3
### Accepted (fixed in v3)
- **`next build` does not run Velite (r2 #1, Novel, REPEAT of r1's claim-as-fact anti-pattern):** v2 falsely said the production path triggers Velite via a webpack plugin. Reality: `next.config.ts` has no plugin; `.velite/` comes from `postinstall: velite build` + the explicit `ci.yml:117` step before Build 2. The hard-fail guarantee survives (postinstall on fresh checkout + Build-2 velite build), but the mechanism was misstated. **v3 fix:** corrected the run-points prose; cited postinstall + ci.yml:117-123.
- **Generalizing the chokepoint scanner breaks the projects guard (r2 #2, Recurring):** single-arg `projects`-hardcoded signature, 17-sentinel pin (`projects.test.ts:411-413`), flat symbol-agnostic allowlist. **v3 fix:** switched to a SEPARATE parallel scanner `check-content-chokepoint.ts` + separate canary `content-chokepoint-canary.ts` + symbol→allowlist map; projects infra untouched.
- **Extending the canary trips `verify-canary-regex-pair.mjs` (r2 #3, Novel):** TRACKED_SET frozen to the projects pair. **v3 fix:** separate canary; additively register the new canary↔test pair in TRACKED_SET (named as a gate the impl edits).
- **`s.isodate()` is lax + rewriting (r2 #4, Novel, real):** accepts any Date.parse-able string, transforms to full UTC datetime; doesn't enforce ISO-date-only. **v3 fix:** `isoDate() = s.string().regex(/^\d{4}-\d{2}-\d{2}$/).pipe(s.isodate())`; documented normalized full-datetime emission in data model.
- **`formatZodIssues` under-specified (r2 #5, Compounding):** enum members absent for non-string input (invalid_type, no `options`); `unrecognized_keys` has `keys` array/no `received`/nested-shape ambiguity; non-scalar offending values unhandled; locator fuzzy when identifier itself fails. **v3 fix:** schema-walk member derivation; unrecognized_keys multi-key + nested `.shape` "did you mean"; serializeValue handles objects/arrays via compact JSON; locator always `entry[n]` when `issue.path[0]` is the identifier; pinned bundled-zod introspection.
- **Bundled-zod vs zod ^4.4.3 (r2 5a, Novel):** **v3 fix:** pinned that error-format introspection uses Velite's `s`, never top-level `zod`.
- **Incomplete deviation list (r2 5d, Compounding):** **v3 fix:** added Introduction's "built-in yaml_default", Req 1.8/4.7 "no new lint rule" to the explicit deviation list.

### Confirmed-fine by r2 (do NOT re-litigate)
- `safeParse` sync works on all declared fields incl. `.transform().pipe()` + `superRefine` (no async throw).
- Loader `throw` → exit 1 under `velite build` (no try/catch at chunk:33320).
- No double-parse divergence; `BUILD_START_UTC` shared/stable.
- Loader resolution order (chunk:37908), `single:false`→`[]` (chunk:37937), non-strict default — accurate.
- Empty/`[]`/null envelope table accurate.
- eslint canary exemption (rule `off`) already covers new symbols.
- `issue.options` carries enum members for the string-non-member case.

## Round 2 Patterns
- The claim-as-fact anti-pattern RECURRED (the `next build`/webpack-plugin assertion). v3 must contain ZERO unverified behavioral claims — every Velite/zod/CI assertion must trace to a cited line or be hedged.
- Recurring theme across r1+r2: the design keeps mis-modeling the **invocation/wiring layer** (where/when code runs) even when the **library capability** is read correctly. r3 should probe wiring/ordering claims hardest.

## Guidance for v3 review (round 3)
- Hunt for ANY remaining claim-as-fact, especially about CI step ordering, what runs at install vs build, and the new separate-scanner wiring.
- Scrutinize the NEW `isoDate()` (`.regex().pipe(s.isodate())` — does `.pipe` into a transforming schema compose; does the regex run before or after; does `_output` stay `string`).
- Scrutinize the schema-walk helpers in `formatZodIssues` (can you actually walk a Velite `s.object` by `issue.path` to a nested `ZodObject`/`ZodEnum` and read `.shape`/`_def.values` in the bundled zod).
- Check the new TRACKED_SET edit doesn't itself violate the paired-merge gate on the introducing PR.
- Confirm no NEW requirement coverage gap introduced by v3's edits.

---

# (below: prior round, kept for history)
Last updated: 2026-05-28 (after v1 review, prepping v2 review)

## Cumulative Findings Summary

### Accepted (addressed in v2)
- **Non-strict build-failure gap (r1 Top Risk #1, the dominant finding):** Velite only throws on zod issues in strict mode (`chunk-4HFW4XPZ.js:38055`); repo runs non-strict, so violations only warn and ship. v1's "every malformed entry is a CI-blocking build error" was false. **v2 fix:** promoted the custom YAML loader to authoritative validator — it `safeParse`s each entry and `throw`s on failure (throws exit non-zero, verified), scoped to the two new YAML files. Rejected global `strict: true` (cross-spec blast radius on posts/projects).
- **`makeContentErrorMap(file)` unbuildable (r1 #4):** schema/errorMap built once at config load; zod never passes `file`. **v2 fix:** replaced with loader-side `formatZodIssues(issues, {basename, entry, index})`.
- **Format-string mismatch (r1 #3):** `file.message` prepends absolute path (not basename); `source` renders mid-path indices as `.2.` not `[2]`. **v2 fix:** loader formats the entire contract string itself (basename + bracket-form path), bypassing Velite's native message path.
- **`.strict()` unknown-key had no contract home (r1 #2):** `unrecognized_keys` raised by object, not field. **v2 fix:** `safeParse` surfaces it; `formatZodIssues` renders `unknown key '...' (did you mean ...)`.
- **Chokepoint parity + `import * as` hole (r1 #5):** `projects` is guarded by an AST scanner (`check-projects-chokepoint.ts`) + 17-shape canary, NOT eslint; eslint `importNames` can't catch namespace access. **v2 fix:** generalize the scanner to cover `contributions`/`resources`, extend the canary, plus the eslint edit. Removed test files from the eslint allowlist (they use `vi.mock`).
- **`label` not trimmed (r1 dim 6):** whitespace-only label renders blank. **v2 fix:** `label` uses the shared `trimmed()` helper.
- **verify-ci-topology not run (r1 #5):** **v2 fix:** added as an implementation acceptance gate.
- **Meta-description 50-160 bound not pinned (r1 dim 6):** **v2 fix:** length assertion in lib test.
- **Future-YAML coupling undocumented (r1 dim 2):** **v2 fix:** coupling note added.

### Rejected / Reversed
- **"repo/title locator impossible without duplicating schema" (v1's own claim, r1 challenged it):** r1 correctly noted a top-level `.superRefine` (or the loader) sees the whole entry. v2 **reverses** v1's claim and now delivers the repo/title-preferred locator in `formatZodIssues` (which has the whole entry).

### Confirmed-fine by r1 (no action; do not re-litigate)
- Correction #1 (per-entry schema, element-wise iteration, `Contribution[]` type, `[]`/missing-file → `[]`). Empirically verified.
- Correction #2 (custom loader resolves before built-in, throws propagate to exit 1). Empirically verified.
- `yaml` is a direct devDependency (`package.json`).
- No collateral YAML files exist; cadence-script JSON always exists as `[]` (the "absent file → throw" worry was unfounded — `outputData` only skips on null, arrays never null).
- Sitemap `maxOr` string-max + `now` fallback is correct.
- a11y wiring (`role="list"`, `aria-labelledby`, `role="group"`, unique `<h2>` ids) valid.
- All v1 `chunk-4HFW4XPZ.js` line citations accurate.

## Patterns & Themes
- r1's dominant theme: the design read **library internals** correctly but missed that the **repo's configuration** (non-strict) nullified the guarantee. Lesson: verify the runtime/config path, not just the library capability.
- Second theme: v1 stated several things **as verified fact that didn't hold** (bracket-form output, repo/title impossibility, makeContentErrorMap signature). v2 must avoid introducing new such claims — especially around the NEW loader-as-validator mechanism.

## Guidance for Next (v2) Review — focus areas
- **The new loader-as-validator mechanism is the prime attack surface.** Does `schema.safeParse(entry)` actually work on a Velite `s.object(...)` schema (zod method present? any async refine forcing `safeParseAsync`?)? Does the loader's `throw` of a multi-line aggregated message survive to a usable CI diagnostic? Does returning RAW (untransformed) data from the loader, then letting Velite re-parse, actually apply `.transform()` trims correctly and idempotently — or does the double-parse cause divergence (e.g., a transform that isn't idempotent, or a refine that behaves differently on re-parse)?
- **The generalized chokepoint scanner:** does generalizing `check-projects-chokepoint.ts` from a single symbol to a list risk breaking the EXISTING `projects` guard or its pinned allowlist test (`projects.test.ts:312-317`)? Is extending the shared canary fixture safe?
- **`formatZodIssues` completeness:** can it actually read `issue.options` for enum members and detect `unrecognized_keys` from `safeParse` output in the bundled zod version? Is the "did you mean" nearest-key match specified well enough to build?
- **New claims-as-fact:** scrutinize any v2 assertion about Velite/zod behavior that isn't backed by a cited line or empirical test.
- **Do NOT re-litigate the confirmed-fine list above** unless v2 changed something that touches it.
