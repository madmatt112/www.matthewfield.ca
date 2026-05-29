# Adversarial Design Review (round 2) — contributions-and-resources/design.md

You are a principal engineer with deep, hands-on Velite 0.3.1, zod, Next.js App Router, and ESLint-flat-config experience. A design document has just been revised after a first adversarial round. Your job is to tear apart the **revised** design — especially the new mechanisms it introduced to fix the first round — not to validate. The biggest risk in a v2 is that a fix for one problem quietly introduces a worse one, or rests on a new unverified claim. Be most skeptical exactly where the design says "verified," "confirmed," or "guaranteed."

You have full read access to the repo and `node_modules`. **Do not take any claim about Velite/zod/eslint/CI behavior on faith — open the source and confirm.** Prove or refute by reading `node_modules/velite/dist/chunk-4HFW4XPZ.js` (and running a throwaway build if useful), not by reasoning about what a library "probably" does.

Read first:
- Target: `.spec-workflow/specs/contributions-and-resources/design.md`
- Requirements it must satisfy: `.spec-workflow/specs/contributions-and-resources/requirements.md`
- Steering: `.spec-workflow/steering/tech.md`, `structure.md`
- Code cited: `velite.config.ts`, `src/lib/projects.ts`, `src/lib/projects.test.ts`, `src/lib/build/check-projects-chokepoint.ts`, `src/__fixtures__/chokepoint-canary.ts`, `eslint.config.mjs`, `scripts/check-velite-output.mjs`, `scripts/check-lighthouse-cadence.mjs`, `scripts/verify-ci-topology.mjs`, `src/app/sitemap.ts`, `.github/workflows/ci.yml`, `package.json`
- Velite internals: `node_modules/velite/dist/chunk-4HFW4XPZ.js`

## Prior Review Context

The first round (full record in `reviews/adversarial-memory-design.md`, raw analysis in `reviews/adversarial-analysis-design.md`) found one dominant issue and several smaller ones. The dominant finding: **Velite runs non-strict in this repo, so zod validation issues only warn and ship the bad entry** — v1's "every violation is a CI-blocking build error" was false. v2's response was to promote the custom YAML loader to the **authoritative validator**: it `safeParse`s each entry against the shared schema, formats issues via a new `formatZodIssues`, and `throw`s (throws exit non-zero). Other v1 fixes: `formatZodIssues` replaces the unbuildable `makeContentErrorMap(file)`; the loader now owns the entire error-contract string (basename + bracket-form path); the chokepoint AST scanner (`check-projects-chokepoint.ts`) is generalized to cover the new collections; `label` is trimmed; `verify-ci-topology` is an acceptance gate.

**Classify every finding you report as one of:**
- **Novel** — not raised in round 1.
- **Compounding** — deepens or extends a round-1 finding.
- **Recurring** — a round-1 issue the v2 design failed to actually resolve (escalate severity).

**Do NOT re-litigate** the round-1 "confirmed-fine" list (corrections #1/#2 mechanics, `yaml` is a dependency, cadence JSON always exists, sitemap `maxOr`, a11y wiring, line citations) **unless v2 changed something that touches it.** Spend your effort on the new v2 mechanisms below.

## Attack dimension 1 — The loader-as-authoritative-validator (the central v2 bet)

The design now has the custom loader call `schema.safeParse(entry)` per element and `throw` an aggregated multi-line message on failure, returning the RAW array on success; Velite then re-parses that raw array (non-strict) for output + types.

- **Does `safeParse` even exist and work on a Velite `s.object(...)` schema?** Confirm the bundled zod exposes `.safeParse` (sync) on the schema objects Velite's `s` produces. Check whether any field the design uses (`s.isodate`, `.transform().pipe()`, `.refine`, `.superRefine`) forces *async* parsing — if so, `safeParse` throws "Asynchronous ... encountered during synchronous parse" and the whole mechanism breaks. Verify against `chunk-4HFW4XPZ.js` (search for that error string and the `_parseSync`/`_parseAsync` gates).
- **Double-parse divergence:** the loader validates the raw entry, returns raw, and Velite re-parses. Is `.transform((v)=>v.trim()).pipe(min/max)` idempotent and safe across two independent parses? Does Velite's re-parse of the RAW (untrimmed) data produce the same pass/fail verdict the loader reached — e.g., could a value pass the loader's trim-then-length but the design forget that Velite re-parses raw too (it will, identically — but confirm there's no field where the loader and Velite disagree)? Is there ANY field whose transform is not idempotent or whose refine reads module-load state (`BUILD_START_UTC`) that could differ between the loader pass and the Velite pass?
- **Does the thrown multi-line `Error("\n" + messages.join("\n"))` actually surface usefully?** Trace how Velite/CLI prints a thrown loader error (`logger.error(err.message)` + `process.exit(1)`). Does a leading newline / multi-line message render intact, or get mangled? Does `next build` (the production path, which triggers Velite via webpack plugin, NOT `velite build`) propagate the loader throw to a non-zero `next build` exit, or could the webpack-plugin path swallow it? This matters: CI Build 2 is `pnpm build` (`next build`), not `velite build`.
- **Is validation actually run on the `next build` path at all?** Confirm whether `next build` re-runs Velite (and thus the loader) or whether it reads a stale `.velite/` from a prior `velite build`. If the loader only runs under `velite build` and `next build` reads cached JSON, a bad entry committed without a fresh `velite build` could still ship. Check the Velite next/webpack integration and the CI sequence (ci.yml:117-123).

## Attack dimension 2 — `formatZodIssues` and the error contract

- **Enum members:** confirm the bundled zod's `invalid_enum_value` issue actually carries the valid options (`issue.options` vs `issue.received` — names differ across zod versions). If the design reads `issue.options` but the bundled zod calls it something else, the enum-member list is empty. Verify against source.
- **`unrecognized_keys`:** confirm `.strict()` produces an `unrecognized_keys` issue with the offending key(s) accessible, and that `safeParse` surfaces it (not just `.parse`). The "did you mean 'repoUrl'?" requires the schema's known-key list — is that introspectable from the schema object at loader time, or does the design hand-wave it?
- **Locator chooser:** the design reads `issue.path[0]` to decide identifier-field-vs-other. But for a top-level field failure (e.g. `repo` itself invalid), `issue.path` is `["repo"]` and the locator should fall back to `entry[n]`. For a nested failure (`links[2].kind`), `issue.path` is `["links",2,"kind"]`. Does the design's "read `issue.path[0]`" rule actually produce the contract's intended behavior in both cases, including when `repo`/`title` themselves are the malformed field (so can't be used as a locator)? Find the ambiguity.
- **Value serialization:** the contract requires `\n`-escape THEN 80-char truncate with `…` inside the closing quote. Does the design specify this order unambiguously, and does it handle non-string offending values (numbers/booleans/null rendered bare)? Is there a value type (e.g. a nested object/array as the offending value for an `invalid_type` on `links`) the serialization rules don't cover?

## Attack dimension 3 — Generalizing the chokepoint scanner

The design generalizes `check-projects-chokepoint.ts` from a single `PROJECTS_NAME` to a list of guarded symbols, extends the canary, and adds per-collection tests.

- **Does this break the existing `projects` guard?** Read `check-projects-chokepoint.ts` and `projects.test.ts` Cases 8-11 (esp. the pinned allowlist at ~312-317 and the 17-shape canary assertions). If the scanner is generalized, will the existing `projects` tests still pass unchanged, or does generalization change the function signature / allowlist semantics they depend on? Identify the exact breakage if any.
- **Per-symbol allowlist:** each guarded symbol needs its own authorized-helper allowlist (`projects`→`src/lib/projects.ts`; `contributions`→`src/lib/contributions.ts`; etc.). Does the design specify how the generalized scanner maps symbol→allowlist, or does it leave a single shared allowlist that would wrongly let `src/lib/contributions.ts` import `projects`? Find the under-specification.
- **Canary fixture:** `src/__fixtures__/chokepoint-canary.ts` is itself in the eslint off-allowlist and is scanned. Extending it with `contributions`/`resources` import shapes — does that fixture now trip the eslint `no-restricted-imports` rule (since it would contain `import { contributions } from "#site/content"`), and is the fixture in the exemption list? Check whether the design accounts for the fixture needing exemption for the NEW symbols too.

## Attack dimension 4 — Schema/field details and remaining gaps

- **`s.isodate()` semantics:** confirm what `s.isodate()` actually accepts and emits (date-only? datetime? does it coerce/transform?). The `added` refine compares `Date.parse(d) <= BUILD_START_UTC`. If `s.isodate()` transforms the value before the refine sees it, or accepts full datetimes, does the future-date rejection still hold? Does `s.isodate()` even exist in Velite 0.3.1's `s`, or is it `s.isodate` vs `s.date` vs `s.string().datetime()`? Verify.
- **`BUILD_START_UTC` captured at module load:** in the loader-as-validator design, the refine runs during the loader's `safeParse` AND again during Velite's re-parse. Both read the same module-load constant, so consistent — but confirm the constant is captured once and shared, and that a long build (loader at T0, re-parse at T0+Δ) can't flip a borderline `added == today` entry between the two parses.
- **`trimmed()` helper + `.pipe`:** confirm `ZodPipeline`/`.pipe` exists in the bundled zod and that `.transform().pipe(...)` composes as the design assumes (the output of `.transform` feeds `.pipe`'s input schema). If `.pipe` isn't present, the trim-then-length idiom collapses.
- **Empty-array vs absent file vs `[]` once more, but only re: the loader change:** the loader now does `yaml.parse(...) ?? []` for unmanaged files but throws for managed null. Confirm the managed `[]` literal path: `yaml.parse("[]")` → `[]` → not null → not non-array → `parsed.forEach` over zero entries → returns `{data: []}`. Confirm no off-by-one where an empty managed array is mistaken for null.

## Attack dimension 5 — Cross-cutting consistency and anything v2 missed

- Cross-check every requirement number against v2. List any Req with no design element, or any v2 change that now contradicts a requirement (e.g., did promoting validation into the loader change any observable behavior a Req or its acceptance test pins?).
- Does the design still claim anywhere (leftover from v1) that Velite-native `source`/`file.message` delivers the contract, contradicting the new loader-owns-it model? Find internal contradictions between sections.
- The design says test files use `vi.mock("#site/content")` and so don't need eslint exemption. But `src/lib/contributions.ts`/`resources.ts` import the REAL collection at module load — confirm they're in the exemption and that the lib modules don't also need the generalized scanner's allowlist (they do — confirm the design lists them in BOTH the eslint exemption AND the scanner allowlist).
- Any new unverified "as fact" claim introduced in v2 (per the round-1 pattern). Name each and demand evidence.

## Deliverables

Conclude with:
- **Top 5 risks/gaps**, each tagged Novel/Compounding/Recurring, each with a concrete failure scenario (cite file:line evidence).
- **Top 3 conclusions to challenge or reverse**, grounded in source you actually read.
- **What's missing** before this design is safe to implement.

Be specific and concrete. Cite source evidence for every behavioral claim — especially confirming or refuting the loader-as-validator bet and the `next build` propagation path. If something is genuinely fine now, say so in one line and move on. No praise padding.

Write your complete analysis to: `.spec-workflow/specs/contributions-and-resources/reviews/adversarial-analysis-design-r2.md`
