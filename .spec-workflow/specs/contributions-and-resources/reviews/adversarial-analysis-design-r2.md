# Adversarial Design Review (round 2) — contributions-and-resources/design.md

Reviewer stance: tear apart the v2 mechanisms, prove/refute every Velite/zod claim against on-disk source. All line citations below are to `node_modules/velite/dist/chunk-4HFW4XPZ.js` (the runtime/zod bundle) or `node_modules/velite/dist/index.js` (the `s` schema namespace), version 0.3.1 (`node_modules/velite/package.json:version`), unless noted.

Verdict up front: **the central loader-as-validator bet holds mechanically** — `safeParse` works, the throw propagates to exit 1, the double-parse does not diverge. But the bet rests on a *false ambient claim* about where Velite runs (`next build` does NOT run Velite at all), and the v2 design introduces at least three concrete new breakages around the chokepoint generalization, the `s.isodate()` transform, and `unrecognized_keys` serialization. Details below.

---

## Attack dimension 1 — The loader-as-authoritative-validator

### 1a. Does `safeParse` exist and run synchronously on a Velite `s.object(...)` schema? — CONFIRMED, with one caveat the design already handles.

- `safeParse` is a real, synchronous method on every `ZodType` (`chunk-4HFW4XPZ.js:34019-34040`). It calls `_parseSync` with `common.async = params?.async ?? false` (line 34023), i.e. **sync by default** — exactly what the loader needs.
- `_parseSync` throws `"Synchronous parse encountered promise."` only if `_parse` returns a Promise (line 34005-34007). Promises arise only from async transforms/refinements.
- The sync gates: a transform throws `"Asynchronous transform encountered during synchronous parse operation"` ONLY if `effect.transform(...)` returns a Promise (line 36886-36887); a refinement throws `"Async refinement encountered during synchronous parse operation"` ONLY if the refinement returns a Promise (line 36844-36845). The design's transforms (`(v) => v.trim()`) and refines (`Date.parse(d) <= BUILD_START_UTC`, `uniqueByKind`) are all synchronous → no throw.
- `superRefine` routes through `_refinement` → the refinement effect path (line 34122-34123, 36838-36873); sync `uniqueByKind` is safe.
- `.pipe()` → `ZodPipeline` exists and is exported (line 33366, getter bound at 34147, `pipe(target)` at 34213). `_parseSync` of a pipeline runs `in._parseSync` then `out._parseSync` (line 37103-37117) — fully sync. The `.transform(trim).pipe(min/max)` idiom composes as the design assumes.

**Confirmed fine.** `safeParse` (sync) is valid for every field the design declares. (The design's own caveat — "switch to `safeParseAsync` if a future field needs an async refine" — is correct.)

### 1b. Does the loader's `throw` propagate to a non-zero exit? — CONFIRMED for `velite build`; the "next build path" claim is FALSE (see 1d).

`VeliteFile.create` calls `meta.data = await loader.load(meta)` with **no try/catch** (`chunk-4HFW4XPZ.js:33315-33324`, throw site at 33320). A synchronous `throw` inside `load` becomes a rejected promise (because `load` is awaited), which propagates: `create` → `load`/`resolve3` (38033) → `build` → the CLI's `build({...}).catch((err) => { logger.error(err.message); ...; process.exit(1); })` (`cli.js`, last block). `err.message` is logged raw and untruncated. The leading `"\n"` + `join("\n")` multi-line message survives intact through `logger.error` (it is a single string argument; no per-line mangling). **Confirmed.**

### 1c. Double-parse divergence (loader validates raw, returns raw, Velite re-parses). — NO divergence, CONFIRMED.

- `file.records` is the loader's returned `{ data }` (`get records() { return this.data.data; }`, chunk:~33266). The loader returns `{ data: parsed }` = the raw array, so Velite re-parses the *same raw entries* the loader validated (`load` at 37998-38031 maps `file.records` element-wise through `schema._parse`).
- Velite parses with `common.async = true` (line 38011), so the SAME schema runs async; the loader runs it sync. Both produce identical issue sets for sync transforms/refines (the async path just wraps results in resolved Promises — same verdict).
- `BUILD_START_UTC` is captured once at schema-module load; both the loader's `safeParse` and Velite's re-parse import the same module → same constant. A long build cannot flip a borderline `added == today` between the two parses. **Confirmed fine.**
- Idempotency: `.trim()` is idempotent; both parses transform the same raw input identically. No field's transform reads mutable module state other than the shared frozen `BUILD_START_UTC`. **No divergence.**

### 1d. Is validation actually run on the `next build` path? — **NEW FALSE CLAIM. `next build` does NOT run Velite at all.** (Novel)

The design states (design.md:31, dimension framing) that the production path "triggers Velite via webpack plugin," and correction #3 (design.md:22) lists "the `next build` path" as one of the invocations that omits `--strict`. **Both are false.**

- `package.json:8` `"build": "next build"` — no velite prefix, no `&&`.
- `next.config.ts` contains **no Velite plugin, no `withVelite`, no webpack hook** (grep for `velite`/`Velite` in `next.config.ts` finds only a doc comment and a runtime `import("./.velite/index.js")`). `next build` consumes the pre-existing `.velite/` JSON; it never invokes Velite's `build()`.
- `.velite/` is produced ONLY by: `postinstall: velite build` (`package.json:18`), `velite dev` (dev script), and the explicit CI step `pnpm exec velite build` (`ci.yml:117-119`).

**Why the conclusion still survives:** the loader throw DOES fire — during `postinstall` (which runs in CI at `ci.yml:42-43 pnpm install --frozen-lockfile`, *before* Lint) and during the explicit `Velite build (for Build 2)` step (`ci.yml:119`). So a malformed entry still hard-fails CI. **But the design's stated mechanism is wrong**, and the wrongness matters:
  - The first failure point is `postinstall`, not "Build 2". If `postinstall` fails, CI dies at the install step with the loader's message — fine, but the design never says this is where it surfaces.
  - **Build 1** (`ci.yml:94-95 pnpm build` with drafts) reads whatever `.velite/` `postinstall` produced. If `postinstall` somehow succeeded with stale JSON (e.g., a cached `node_modules`/`.velite` in a non-frozen scenario, or local dev where the author edits YAML and runs `next build` without re-running velite), **`next build` ships the stale/unvalidated JSON**. The CI `--frozen-lockfile` + fresh checkout makes this safe in CI, but the design's claim that the loader guards "the production path (which triggers Velite via webpack plugin)" is a hallucinated mechanism. The real guarantee comes from `postinstall` + the explicit Build-2 `velite build`, which the design should cite instead.

This is the v2 analogue of the round-1 dominant finding: the design read the library capability (loader throw → exit 1) correctly but mis-stated the *invocation path*. **Demand:** correct the design to say the loader runs under `velite build` (postinstall + Build-2 step), NOT under `next build`, and confirm CI's `velite build` precedes Build 2 (it does, `ci.yml:117` before `:121`).

---

## Attack dimension 2 — `formatZodIssues` and the error contract

### 2a. Enum members via `issue.options` — CONFIRMED present, but incomplete for non-string values. (Compounding)

- A non-member STRING produces `code: invalid_enum_value` with `options: expectedValues` and `received: ctx.data` (`chunk-4HFW4XPZ.js:36663-36667`). So `issue.options` is correct and the design's dimension-2 claim holds for the common case.
- **Gap:** a non-string value (`kind: 42`, `kind: true`, `kind: null`) takes the *other* branch (line 36647-36655): `code: invalid_type`, `expected: <joined values>`, `received: ctx.parsedType` — **no `options` field**. So `formatZodIssues`'s "enum members from `issue.options`" yields `undefined`/empty, and error scenario #5 (design.md:420-422, "Closed-enum typo → lists valid members") silently drops the member list for non-string enum inputs. The contract (requirements §5 item 5) says enum failures SHALL list members; a YAML `kind: 42` would not. The design must either (a) also read `expected`/`issue.expected` for the `invalid_type`-on-enum case, or (b) explicitly scope "enum members listed" to string inputs. **Under-specified.**

### 2b. `.strict()` `unrecognized_keys` — issue exists, but the serialization rules do NOT cover it. (Novel)

- `.strict()` raises `code: unrecognized_keys` with `keys: extraKeys` and `status.dirty()` (`chunk-4HFW4XPZ.js:35595-35602`). `safeParse` surfaces it (dirty → `success: false` via `handleResult`). The issue's `path` is the object's path (no key appended). Known-key list is introspectable from `schema.shape` (ZodObject `_getCached()` reads `_def.shape()`, line 35553/35567) — so "did you mean" nearest-key match is buildable.
- **But the contract's item-4 "offending value" serialization (design.md:221, requirements §4) does NOT apply to `unrecognized_keys`:** that issue has **no single offending value** — it has a `keys` ARRAY and no `received`. The design's `serializeValue(v)` (quote strings / bare numbers / truncate) has no defined behavior for "the offending thing is a *key name*, possibly several." Error scenario #3 (design.md:412-414) shows `unknown key 'repoURL' (did you mean 'repoUrl'?)` — but that is a *separate* format the design never reconciles with the value-serialization rules. **Two unspecified sub-cases:** (i) `keys` with length > 1 (e.g. two stray keys), and (ii) which schema's `shape` to introspect when the unrecognized key is on a *nested* object (`links[2]` has a stray key) — the issue path tells you the object, but the design's "nearest-key match against the schema's known keys" hand-waves *which* schema (top-level vs `contributionLinkSchema`). The design must specify: walk the schema by `issue.path` to find the right ZodObject, then nearest-key over that object's `.shape` keys, and define multi-key output.

### 2c. Locator chooser reading `issue.path[0]` — ambiguous exactly where the design claims it works. (Compounding)

The contract (requirements §item 2) wants: identifier (`repo`/`title`) IF the identifier parsed as non-empty-after-trim AND the failing field is NON-identifier; else `entry[<n>]`.

- For a nested failure `links[2].kind`, `issue.path = ["links", 2, "kind"]`, `issue.path[0] === "links"` → non-identifier → use `repo`. Works.
- For a top-level `repo` failure, `issue.path = ["repo"]`, `issue.path[0] === "repo"` → identifier itself failed → must fall back to `entry[n]`. The design's rule (design.md:219 "the identifier-field-vs-other check reads `issue.path[0]`") *can* express this, but the design never states the fallback when `repo` is the bad field — and critically, **when `repo` is malformed you cannot use it as the locator** (it's the thing that's wrong). The design says "the entry's repo... when that identifier parsed as a non-empty trimmed string" — but `repo` is validated by a regex, not trim; a `repo` that is present-but-regex-invalid (`"not a repo"`) *is* a non-empty string, yet using it as the locator while *also* reporting it as the failing field is confusing/circular. The "non-empty after trim" gate (requirements §item 2) does not distinguish "repo present but invalid" from "repo valid." **The design must pin: if `issue.path[0]` is the identifier field, always use `entry[<n>]` regardless of the raw value.** As written it's under-specified at exactly the boundary the prompt flagged.
- Note the loader, not Velite, assigns the locator — and the loader has the whole `entry` and `index` in hand (design.md:219). So the *capability* exists; only the *rule* is fuzzy. This reverses v1's "impossible" claim correctly (per memory), but the reversal substitutes a vague rule.

### 2d. Value serialization order and non-string/compound values — partially specified. (Compounding)

- Order (escape `\n` THEN truncate to 80 with `…` inside the quote) is stated (design.md:221). Bare numbers/booleans/null stated.
- **Uncovered:** the offending value for an `invalid_type` on `links` itself (e.g. `links: "pr"` when an array is expected, or `links: {}`) is a non-scalar. `serializeValue` has no rule for objects/arrays. Requirements §item 4 only enumerates strings / numbers-booleans-null / multiline-strings. A `links: { kind: pr }` (object instead of array) → `invalid_type`, `received: "object"`, and the "offending value" is an object — the design renders it how? `[object Object]`? `JSON.stringify`? Unspecified. Same for `links` array containing a non-object element. The unit-test list (design.md:437) tests scalars and multiline only — it does not test the compound-value case, so it would pass while leaving the hole.

---

## Attack dimension 3 — Generalizing the chokepoint scanner

### 3a. Generalization breaks the existing tests' call signature AND the pinned 17-sentinel canary. (Recurring — round-1 flagged scanner parity; v2's fix introduces the breakage)

- `runChokepointScan(filePath)` is hardcoded to `PROJECTS_NAME = "projects"` (`src/lib/build/check-projects-chokepoint.ts:45`) and takes ONE argument. `projects.test.ts` calls `runChokepointScan(CANARY_PATH)` (line 330) and `runChokepointScan(filePath)` (line 464) with no symbol arg. If the design generalizes the signature to `runChokepointScan(filePath, symbols)` or `(filePath, symbol)`, **every existing call site breaks** unless the symbol param defaults to `["projects"]`. The design (design.md:245) says "generalize ... from a single `PROJECTS_NAME` constant to a list of guarded symbols" but does NOT pin a backward-compatible default. Concrete breakage: `projects.test.ts:330,464` and `Case 8` group assertions fail to compile/run. **Must specify a default-preserving signature.**
- **The 17-sentinel pin is hard-coded to `projects`:** `projects.test.ts:411-413` asserts `expect(SENTINELS).toHaveLength(17)`, and every sentinel regex is literally `/.../projects/.../` (lines 372-408). These are *line-presence* checks on the canary. Extending the canary with `contributions`/`resources` shapes does NOT break these 17 (they still match their lines), BUT if the design adds NEW sentinels for the new symbols into THIS list, the `toHaveLength(17)` assertion fails. If it adds them to the new test files, see 3c.

### 3b. Per-symbol allowlist mapping is under-specified — risk of `src/lib/contributions.ts` being allowed to import `projects`. (Novel)

- The scanner reports findings for a symbol regardless of file; the ALLOWLIST (which files may legitimately import a given symbol) lives in the TEST (`PRODUCTION_ALLOWLIST`, `projects.test.ts:312-318`), as a flat list of file paths, not a symbol→file map. The current allowlist exempts `src/lib/projects.ts` for ALL findings (`isViolation` at line 462-465 checks `!PRODUCTION_ALLOWLIST.includes(rel) && scan(file).length > 0`).
- The design (design.md:245-246) says each guarded symbol needs "its authorized-helper allowlist (`projects`→`src/lib/projects.ts`; `contributions`→`src/lib/contributions.ts`)" but the EXISTING allowlist structure is symbol-agnostic. If the design keeps a single flat allowlist, then `src/lib/contributions.ts` (allowlisted) would be allowed to import the `projects` symbol too — a hole. The design asserts a symbol→allowlist map exists but never specifies the data structure or how `isViolation` becomes symbol-aware. **Under-specified; the prompt's exact worry is real.**

### 3c. Extending the canary trips the canary↔regex paired-merge gate — the design never mentions it. (Novel — the design omits a CI gate it will break)

There is a CI gate `scripts/verify-canary-regex-pair.mjs` (run at `ci.yml:85-86`) that tracks the PAIR `["src/__fixtures__/chokepoint-canary.ts", "src/lib/projects.test.ts"]` and **fails if a commit touches one but not the other** (`TRACKED_SET`, the strict-subset rule). The design plans to (a) extend the canary fixture AND (b) put the new scanner tests in `src/lib/contributions.test.ts` / `resources.test.ts` (design.md:245). If the canary changes but `projects.test.ts` does NOT, the paired-merge gate fires with a strict-subset violation → CI red. The design's CI-topology section (design.md:340) mentions `verify-ci-topology.mjs` as the acceptance gate but **never mentions `verify-canary-regex-pair.mjs`**, which is the gate that actually breaks. **Concrete:** editing `chokepoint-canary.ts:52` (adding `export * ... contributions` shapes) without a same-commit edit to `projects.test.ts` → `verify-canary-regex-pair.mjs` exit 1. The design must either (i) keep the new sentinels in `projects.test.ts` (co-edit the pair), or (ii) extend `TRACKED_SET` to include the new test files (an edit to the gate the design doesn't list).

### 3d. eslint canary exemption covers new symbols — actually fine. (one line)

`chokepoint-canary.ts` is in the eslint exemption (`eslint.config.mjs:43`) with `"no-restricted-imports": "off"` (line 48) — the rule is OFF entirely for that file, so adding `contributions`/`resources` import shapes won't trip eslint even after they're added to `importNames`. The prompt's worry here is moot. (But the design should *state* this rather than leave it implicit.)

---

## Attack dimension 4 — Schema/field details

### 4a. `s.isodate()` TRANSFORMS to a full ISO datetime — the design treats it as date-only. (Novel, real behavioral bug)

`index.js:140`:
```js
var isodate = () => stringType()
  .refine((value) => !isNaN(Date.parse(value)), "Invalid date string")
  .transform((value) => new Date(value).toISOString());
```
Consequences the design does not account for:
1. **`s.isodate()` does NOT validate ISO-8601 shape** — it accepts ANYTHING `Date.parse` accepts (`"March 5, 2026"`, `"2026/05/28"`, `"Tue May 28 2026"` all pass). The design and author doc promise "ISO 8601 date" and document a "UTC midnight" wall-clock caveat that only holds for `YYYY-MM-DD` inputs. A non-ISO-but-parseable string slips through and is silently rewritten. Requirements 1.2/4.2 say "ISO 8601 date"; `s.isodate()` does not enforce that. **Mismatch between promised and actual validation.**
2. **The stored/emitted value is a full datetime string**, e.g. `"2026-05-28T00:00:00.000Z"`, NOT the author's `2026-05-28`. So:
   - `formatContentDate(iso)` returns `datetime: "2026-05-28T00:00:00.000Z"` → the `<time dateTime>` attribute carries a full timestamp (cosmetic, acceptable, but not what the design's data-model section "ISO 8601 date" implies).
   - The sitemap `maxOr(contributions.map(c => c.date), now)` compares full datetimes lexicographically — still correct, but the design's "most recent `date`" now has midnight-UTC granularity.
3. **The `added` future-date refine sees the TRANSFORMED value.** Design.md:207 `added: s.isodate().refine((d) => Date.parse(d) <= BUILD_START_UTC)`. Because `s.isodate()` already transforms, `d` is the post-transform full ISO string. `Date.parse` of that works, so the refine functions — BUT a date-only `added: 2026-05-28` becomes `2026-05-28T00:00:00.000Z`; comparing midnight-UTC `<= Date.now()` means an author setting today's date (UTC) passes only after UTC-midnight has elapsed for that day — which is precisely the wall-clock failure mode the requirements acknowledge, so this is consistent. **No break here, but the design must state the refine runs on the transformed datetime, not the raw input.**
4. **Type/`_output`:** `s.isodate()._output` is `string` (the transform's return). Fine for the `Contribution["date"]: string` type.

**Net:** `s.isodate()` exists (refuting any doubt it might be `s.date`), but it is a *transforming, lax-parsing* helper, and the design's mental model ("ISO 8601 date, date-only, UTC midnight") is only partially accurate. The author doc's "ISO 8601" promise is unenforced. Demand: either add a regex pre-check (`s.string().regex(/^\d{4}-\d{2}-\d{2}$/).pipe(s.isodate())` or similar) to actually enforce date-only ISO, or document that any `Date.parse`-able string is accepted and rewritten.

### 4b. `BUILD_START_UTC` captured once and shared — CONFIRMED fine (see 1c). The loader and Velite both import the same schema module constant.

### 4c. `trimmed()` + `.pipe` — CONFIRMED (see 1a). `ZodPipeline` present, `.transform().pipe()` composes sync.

### 4d. Empty-array vs null vs `[]` — CONFIRMED fine.

`yaml.parse("[]")` → `[]` → not null, `Array.isArray` true → `parsed.forEach` over zero entries → `messages.length === 0` → returns `{ data: [] }`. `meta.data?.data == null` (chunk:33321) → `[].== null` is false → no "no data loaded" failure → Velite iterates zero records → emits `[]`. No off-by-one. The envelope state table (design.md:157-164) is accurate against `yaml.parse` semantics and the loader code.

---

## Attack dimension 5 — Cross-cutting

### 5a. The design's bundled-zod vs project-zod ambiguity — worth a line. (Novel)

`package.json:32` declares `zod: ^4.4.3` as a direct dependency, but the schemas use `s` from `velite`, which is **Velite's own bundled zod (v3-shaped: `_parse`/`ZodEffects`/`invalid_enum_value` with `options`)**, NOT the top-level zod 4.x. All `formatZodIssues` introspection (`issue.options`, `issue.keys`, `issue.received`, `issue.code` strings) must be written against the **bundled** zod's issue shapes (verified above), not zod 4 (which renamed/restructured several issue fields). If the implementer imports `zod` directly anywhere in `content-error-format.ts` for types, they'll type against the wrong version. The design should pin: error-format types come from `velite`'s `s`, never the top-level `zod`.

### 5b. Internal contradiction: design still says "next build is the production path that triggers Velite via webpack plugin." (see 1d) — must be removed.

### 5c. No leftover v1 "Velite-native source/file.message delivers the contract" claim — CLEAN. The design (design.md:214-216) explicitly retracts the v1 native-message path and routes everything through `formatZodIssues`. Internally consistent on that point.

### 5d. Requirement coverage — one observable contradiction. (Compounding)

- Req 1.1 / 4.1 literally pin `schema: s.array(s.object({...}).strict()).min(0)` and "built-in `yaml_default` loader, no `loaders` override required" (requirements.md:86-88, 181-184). The design correctly overrides this (corrections #1, #2, #3) — but this is a *requirements-mechanism contradiction the design acknowledges and justifies* (design.md:14-28). Acceptable as a documented deviation, but note the requirements doc's Introduction (requirements.md:10, 16) and Reqs 1.8/4.7/7.4 still assert "the built-in YAML loader" and "no new lint rule / no rule edit is required." The design contradicts ALL of these (custom loader + eslint edit + new AST-scanner generalization). The design flags the lint contradiction (design.md:232-247) but does NOT explicitly flag that Req 1.8/4.7's "no new lint rule" and the Introduction's "built-in yaml_default loader" are now false. **List these as additional acknowledged deviations** so the requirements↔design delta is complete.
- Req 6.1 says sitemap lists both as "static URLs"; the design moves them to computed-`lastModified` entries (design.md:307-318). Req 6.2 demands `lastModified` derived from max `date`/`added`. The design satisfies 6.2; the word "static" in 6.1 is loose. No real conflict.

### 5e. Lib modules in BOTH eslint exemption AND scanner allowlist — design lists eslint but is vague on scanner. (Compounding with 3b)

`src/lib/contributions.ts` / `resources.ts` import the real collection at module load and need: (i) eslint exemption (design.md:242 lists them — good), AND (ii) inclusion in the *symbol-specific* scanner allowlist (design.md:245-246 asserts but doesn't structure — see 3b). The design lists them for eslint but the scanner-allowlist plumbing is the under-specified part. Confirmed the prompt's concern.

---

## Top 5 risks / gaps

1. **`next build` does not run Velite — the design's stated guarantee path is fictional.** (Novel) The loader-validator only runs under `velite build` (postinstall + `ci.yml:117-119`), never under `next build` (`package.json:8`, `next.config.ts` has no Velite plugin). The conclusion (CI hard-fails on bad YAML) survives via `postinstall` + the explicit Build-2 `velite build` step, but the design's correction-#3 prose ("the `next build` path... triggers Velite via webpack plugin") is a false claim-as-fact that must be rewritten to cite the real invocation points. *Failure scenario:* a reviewer trusts the webpack-plugin claim; an author edits YAML and runs `next build` locally → stale `.velite/` ships with no validation, contradicting the design's promise.

2. **Generalized scanner breaks the existing `projects` guard's call signature and the 17-sentinel pin.** (Recurring) `runChokepointScan(filePath)` is single-arg, `projects`-hardcoded (`check-projects-chokepoint.ts:45`); `projects.test.ts:330,464` call it positionally; `:411-413` pins exactly 17 `projects`-literal sentinels. Generalizing without a `["projects"]`-default signature and without a symbol→allowlist map breaks compilation and Case 8/11. *Failure scenario:* implementer changes the signature → `projects.test.ts` fails to typecheck/run, and/or a flat allowlist lets `contributions.ts` import `projects` undetected.

3. **Extending the canary fixture trips `verify-canary-regex-pair.mjs`, a CI gate the design never mentions.** (Novel) `ci.yml:85` runs the paired-merge gate over `{chokepoint-canary.ts, projects.test.ts}`; the design plans to edit the canary but place new tests in `contributions.test.ts`/`resources.test.ts` (design.md:245), creating a strict-subset → exit 1. *Failure scenario:* the implementing PR edits the canary, CI fails at "Verify canary↔regex-list paired-merge" with no design guidance on the fix.

4. **`s.isodate()` is a lax-parsing, value-rewriting transform — not the date-only ISO validator the design assumes.** (Novel) `index.js:140` accepts any `Date.parse`-able string and rewrites it to a full UTC datetime. The author-doc "ISO 8601 date" / "UTC midnight" contract is unenforced; non-ISO inputs slip through silently rewritten. *Failure scenario:* author writes `date: March 5 2026` → passes, stored as `"2026-03-05T..."`, never flagged, contradicting Req 1.2/4.2's "ISO 8601 date."

5. **`formatZodIssues` is under-specified for the non-scalar and `unrecognized_keys` cases.** (Compounding) `unrecognized_keys` has a `keys` array and no `received` (chunk:35598-35599) — the value-serialization rules (design.md:221) don't cover key-name(s); nested-object key introspection (which `.shape`?) is hand-waved (3b/2b). `invalid_type`-on-enum has no `options` (chunk:36647-36655) so the enum-member list silently drops for non-string inputs (2a). Non-scalar offending values (`links: {}`) have no `serializeValue` rule (2d). *Failure scenario:* `repoURL:` typo with a sibling stray key, or `kind: 42`, produces a message that omits the contract-required member list or renders `[object Object]`.

## Top 3 conclusions to challenge / reverse

1. **REVERSE the "next build path triggers Velite" framing.** Source: `package.json:8` + absence of any plugin in `next.config.ts`. The validation guarantee comes from `postinstall: velite build` and the explicit `ci.yml:117-119` step, full stop.

2. **CHALLENGE "generalize the scanner ... reusing the canary, with new colocated tests."** Source: `verify-canary-regex-pair.mjs` TRACKED_SET + `projects.test.ts:411-413` 17-pin + single-arg signature at `check-projects-chokepoint.ts:45`. Either co-edit `projects.test.ts` with the canary (and grow the 17-pin), or expand `TRACKED_SET`; and pin a backward-compatible signature + symbol→allowlist map. As written the generalization is not safe to implement.

3. **CHALLENGE "`s.isodate()` ... future-dated permitted / date-only / UTC midnight" mental model.** Source: `index.js:140` — it's `.refine(Date.parse-ok).transform(toISOString)`, lax and rewriting. The design must add a real ISO-date regex gate or document the lax acceptance + rewrite.

## What's missing before this design is safe to implement

- Correct the invocation-path claim (dimension 1d / risk 1): cite `postinstall` + Build-2 `velite build` as the loader's run points; drop the webpack-plugin assertion.
- Pin the generalized scanner's **signature** (default `["projects"]`) and **symbol→allowlist data structure**, and state how Case 8/9/11 + the 17-sentinel pin migrate (risk 2 / 3b).
- Add `verify-canary-regex-pair.mjs` to the acceptance-gate list and decide the co-edit strategy (risk 3).
- Add a real ISO-date validator in front of `s.isodate()` OR document the lax-parse/rewrite behavior and reconcile the author doc (risk 4 / 4a).
- Fully specify `formatZodIssues` for: `unrecognized_keys` (multi-key, nested-object `.shape` selection), `invalid_type`-on-enum (member list from `expected`), and non-scalar offending values (risk 5 / 2a/2b/2d). Add unit tests for each.
- Pin that error-format types/introspection use Velite's bundled `s`/zod, never top-level `zod ^4.4.3` (5a).
- Add the remaining requirements-deviation acknowledgements (Introduction's "built-in yaml_default loader," Req 1.8/4.7's "no new lint rule") to the deviation list for a complete requirements↔design delta (5d).

### Confirmed-fine (one line each, no further action)
- `safeParse` sync works on all declared fields incl. `.transform().pipe()`, `superRefine` (1a).
- Loader `throw` → exit 1 under `velite build` (1b); no try/catch at chunk:33320.
- No double-parse divergence; `BUILD_START_UTC` shared and stable (1c/4b).
- Loader user-prepend resolution order (chunk:37908), `single:false`→`[]` type (chunk:37937), default non-strict (chunk:37909) — all accurate.
- Empty/`[]`/null envelope table accurate (4d).
- eslint canary exemption (`off`) already covers new symbols (3d).
- `issue.options` carries enum members for the string-non-member case (2a, partial).
