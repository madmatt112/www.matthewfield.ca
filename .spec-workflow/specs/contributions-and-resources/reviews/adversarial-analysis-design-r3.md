# Adversarial Design Analysis (round 3) — contributions-and-resources/design.md

Reviewer profile: principal eng, Velite 0.3.1 / zod (v3-shaped) / Next App Router / GHA.
Every behavioral claim below was proved or refuted against on-disk source in
`node_modules/velite/dist/{chunk-4HFW4XPZ.js,index.js,cli.js}` and reproduced
empirically against the installed Velite 0.3.1 where a runtime question existed.
Throwaway probes were run inside the repo (so `velite` resolves) and deleted.

The dominant prior anti-pattern — **behavioral claim stated as verified fact that
is actually false, especially at the wiring/validation layer** — recurs in v3 in
its single most load-bearing new mechanism: `isoDate()`. That is the headline.

---

## VERDICT UP FRONT

v3 fixed the run-points prose (r2 finding 1) and the separate-scanner /
TRACKED_SET design (r2 finding 2/3) correctly. But the **`isoDate()` helper that
v3 introduced to fix r2 finding 4 is itself broken in two distinct, empirically
confirmed ways**, and the `formatZodIssues` schema-walk (r2 finding 5) is
under-specified in exactly the way the prompt predicted. The "regex gate enforces
ISO date" claim is false. This design is NOT safe to implement as written.

---

## Attack dimension 1 — claim-as-fact purge (run-points & install-time failure)

### 1a. "Where Velite actually runs" prose — VERIFIED CORRECT. (Recurring class, now fixed.)
Checked every assertion in design.md:24:
- `package.json:8` is bare `next build` — TRUE (`"build": "next build"`).
- `next.config.ts` has no Velite/webpack plugin; only a runtime `await import("./.velite/index.js")` in `headers()` (next.config.ts:123) — TRUE.
- `postinstall: velite build` — TRUE (`package.json:18`).
- `ci.yml:42-43` install runs postinstall — TRUE.
- `ci.yml:117-119` `pnpm exec velite build` precedes `ci.yml:121-123` Build 2 — TRUE.
- Build 1 (`ci.yml:94-95`) consumes postinstall output — TRUE.

One omission worth recording (not an overclaim, a gap): **Vercel's** `buildCommand`
(`vercel.json`) is `… && pnpm build` — i.e. `next build`, NOT `velite build`. So in
production-deploy on Vercel, the loader's hard-fail fires ONLY at Vercel's
dependency-install `postinstall`, never at the build command. The design's
"postinstall is the real run-point" framing happens to cover this, but the design
never states the Vercel build command doesn't run Velite. Minor.

### 1b. Install-time hard-fail claim — VERIFIED CORRECT.
- No `.npmrc` in repo and none in `~` (so no `ignore-scripts=true`, no
  `enable-pre-post-scripts` override). Verified.
- Empirically: a `package.json` with `postinstall: node -e "process.exit(1)"`
  run under `pnpm install --frozen-lockfile` → **`ELIFECYCLE … exit code 1`,
  process exit 1**. A passing postinstall → exit 0. So a loader `throw` during
  postinstall DOES fail the install step non-zero. The design's claim survives.
- CLI catch path verified in `dist/cli.js`:
  `build({…}).catch(err => { logger.error(err.message); if (values.debug) throw err; process.exit(1) })`.
  So a loader throw exits 1 and prints `err.message` only (no stack unless `--debug`).

**Caveat the design should state but doesn't:** `logger.error(err.message)` prints
ONLY `.message`. For a normal `throw new Error(<contract string>)` this is fine.
But see finding 2b — for the `isoDate` RangeError case the message is the bare
`"Invalid time value"`, with none of the contract context.

---

## Attack dimension 2 — `isoDate()` composition — TWO NOVEL HOLES (both reproduced)

`isoDate() = s.string().regex(/^\d{4}-\d{2}-\d{2}$/).pipe(s.isodate())`.
`s.isodate()` is (`dist/index.js:140`):
`stringType().refine(v => !isNaN(Date.parse(v)), "Invalid date string").transform(v => new Date(v).toISOString())`.

Pipe semantics (`ZodPipeline._parse`, chunk:37117) confirmed: LEFT (regex string)
parses first, output feeds RIGHT (`s.isodate()`); whole `_output` is the
`toISOString()` string. The design's type/order claims about `.pipe()` are correct.
**But the design's behavioral conclusion — "the regex gate enforces ISO date" — is
false**, because `\d{4}-\d{2}-\d{2}` is a *shape* gate, not a *validity* gate, and
`s.isodate()`'s validity layer is broken for the regex-passing-but-invalid cases:

### 2a. NOVEL — impossible-but-rollover-able dates are SILENTLY ACCEPTED and REWRITTEN.
Reproduced against the FULL entry schema (exactly what the loader's `safeParse` sees):
```
entry.safeParse({ repo:"a/b", date:"2026-02-30" })
  => { success:true, data:{ repo:"a/b", date:"2026-03-02T00:00:00.000Z" } }
```
`Date.parse("2026-02-30")` is NOT NaN — JS rolls Feb 30 over to **Mar 2**. The regex
matches, the `!isNaN(Date.parse)` refine passes, the transform rewrites it. Same for
`2026-04-31` → `2026-05-01`, `2026-02-29` (non-leap) → `2026-03-01`. The author's
calendar-impossible date is silently coerced to a different real date and shipped.
This directly contradicts design.md:220 ("the regex gate enforces date-only ISO
shape first, then `s.isodate()` confirms parseability and normalizes") and the
data-model note "regex-gated" (design.md:392, 410). **Evidence:** probe output
`"2026-02-30" => OK -> "2026-03-02T00:00:00.000Z"`; engine line `dist/index.js:140`.

### 2b. NOVEL — `YYYY-MM-DD`-shaped but unparseable dates crash `safeParse` with an UNCAUGHT `RangeError`.
Reproduced against the full entry schema:
```
entry.safeParse({ repo:"a/b", date:"2026-13-45" })   // THREW: RangeError - Invalid time value
```
Mechanism (traced in `chunk-4HFW4XPZ.js`):
- `s.isodate()` = `ZodEffects(transform)` wrapping `ZodEffects(refinement)` wrapping `ZodString`.
- For `"2026-13-45"`: regex passes. `Date.parse("2026-13-45")` is `NaN`, so the
  refinement's predicate is false → it calls `addIssue` (default severity), which
  sets parse status to **"dirty", NOT "aborted"** (refinement branch, chunk:36837-36859:
  `executeRefinement(inner.value); return { status: status.value, value: inner.value }`).
- The OUTER transform effect (chunk:36876) only short-circuits on
  `base.status === "aborted"` — a "dirty" status does NOT stop it. So it runs
  `effect.transform("2026-13-45")` = `new Date("2026-13-45").toISOString()` →
  **`RangeError: Invalid time value`**.
- `safeParse` (chunk:34019-34039) calls `_parseSync` with **no try/catch** and
  returns `handleResult` only for the non-throwing path. A `RangeError` thrown
  inside the transform propagates straight OUT of `safeParse`.

Consequence: the loader's `parsed.forEach(e => schema.safeParse(e))` (design.md:142-144)
**throws a raw `RangeError: Invalid time value`** for any `YYYY-MM-DD`-shaped string
whose month/day is out of `Date.parse` range (`2026-13-45`, `2026-00-10`,
`2026-01-32`). This:
  1. Bypasses `formatZodIssues` entirely — no file name, no entry locator, no field
     path, no enum/value rendering. The Shared Error-Message Contract (Reqs 1.4,
     3.1, 4.4, 10.1) is violated outright for this input class.
  2. Surfaces in CI/postinstall as `logger.error("Invalid time value")` — a
     contextless message that does not even name which file or entry is bad.
  3. Is thrown from `forEach`, so it also aborts validation of all *later* entries
     in the same file (the aggregation loop never completes).

**Evidence:** probe output `THREW: RangeError - Invalid time value`; stack through
`_ZodEffects._parse (chunk:36885) ← _ZodPipeline._parse (37117) ← safeParse (34033)`.

**Both 2a and 2b are real, novel holes the design's "regex gate enforces ISO date"
claim misses.** A correct `isoDate` must validate the calendar date itself
(round-trip check: parse, re-emit `YYYY-MM-DD`, compare; or compare the parsed
Y/M/D components against the captured groups) BEFORE any `toISOString()` transform,
and must guarantee `safeParse` never throws (the transform must be unreachable for
invalid input — i.e. use an `.refine` that both rejects rollover and aborts, or do
the whole thing in a single `.transform` guarded by an explicit `ctx.addIssue` +
`return z.NEVER`).

### 2c. `s.isodate()` namespace name — VERIFIED CORRECT.
Exported as `s.isodate` (lowercase) — `dist/index.js:5385` `isodate,` in the export
list, consumed via `s.isodate()` in the existing `posts`/`projects` collections
(velite.config.ts:94,296). Design's lowercase usage is right.

---

## Attack dimension 3 — `formatZodIssues` schema-walk feasibility

Empirically introspected the exact schema the design specifies. Findings:

### 3a. `_def.values` — CORRECT property; `.options` also works.
`linkSchema.shape.kind._def.values` = `['pr','commit','issue','release','writeup','discussion']`
(array), and `.options` returns the same array. Design names `_def.values` — matches.

### 3b. Issue shapes — CONFIRM design's r2-derived claims.
- bad enum string (`kind:"merge-request"`) → `invalid_enum_value` WITH `options:[…]`, `path:["links",0,"kind"]`.
- non-string enum (`kind:42`) → `invalid_type`, **no `options`**, `path:["links",0,"kind"]`.
  Confirms the design's "schema-walk needed because `invalid_type` carries no
  options" reasoning (design.md:231).
- `unrecognized_keys`: top-level stray key → `keys:["repoURL"]`, **`path:[]`**
  (empty, NOT the entry index — Velite roots the entry at `[index]` only inside its
  own re-parse loop; the loader's direct `safeParse(entry)` roots at `[]`).
  Nested stray key under a link → `keys:["lable"]`, `path:["links",0]`.
- `links:{}` (non-array) → `invalid_type` expected array received object,
  `path:["links"]` — non-scalar offending value, covered by design's `JSON.stringify`
  rule (design.md:230).

### 3c. NOVEL/Compounding — the ZodEffects/ZodPipeline/ZodOptional unwrap is UNDER-SPECIFIED.
Confirmed the walk MUST unwrap wrappers the design's prose does not enumerate:
- `entry.shape.links` is a **`ZodEffects`** (from `.superRefine`), NOT a `ZodArray`.
  Reaching `links[2].kind` requires: `shape.links` → `_def.schema` (ZodArray) →
  `_def.type` (element ZodObject) → `.shape.kind` (ZodEnum). Probe confirmed:
  `links node typeName: ZodEffects … _def.schema typeName: ZodArray … element typeName: ZodObject … shape.kind typeName: ZodEnum`.
- `entry.shape.title`/`description` are **`ZodPipeline`** (`.transform().pipe()`), and
  `entry.shape.date` is also a `ZodPipeline` (isoDate). `entry.shape.language` is
  `ZodOptional`.

The design's error-contract section (design.md:231-232) says only "walking the
schema along `issue.path` to the failing field's `ZodEnum`/correct nested
`ZodObject`." It does NOT specify the wrapper-unwrap table
(`ZodEffects → _def.schema`, `ZodPipeline → _def.in`/`_def.out`,
`ZodOptional → _def.innerType`, `ZodArray → _def.type`). Without that table, a
walk that descends by `.shape[segment]` / `[index]` naively will hit a
`ZodEffects`/`ZodPipeline` node that has no `.shape`/`_def.type` and either crash or
silently fail to find the enum — at which point item 5 (enum members) and item 6
("did you mean" against `.shape`) of the contract are not delivered. The prompt
predicted this exact crack; it is real and the design must be amended to enumerate
the unwrap chain. (The prompt's r3 instructions acknowledge `ZodEffects` on `links`,
but **design.md itself does not** — the gap is in the artifact being implemented.)

Severity: Compounding — it's the r2 finding-5 area, and v3's "hardened schema-walk"
claim is not actually backed by an unwrap spec in the doc.

---

## Attack dimension 4 — separate scanner + TRACKED_SET edit — MOSTLY SOUND

### 4a. TRACKED_SET introducing-PR — NO chicken-and-egg. (Verified against script logic.)
`verify-canary-regex-pair.mjs`: `TRACKED_SET` is a frozen array; `touched =
changedFiles ∩ tracked`, then `present`/`missing` partition it; rule is
`present.length === 0` (none-touched PASS) OR `=== TRACKED_SET.length` (all-touched
PASS), else strict-subset FAIL. On the introducing PR that adds BOTH new files AND
registers them in TRACKED_SET in the same commit, `changedFiles` contains both new
paths → for the new pair `present.length === 2 === length` → PASS. The existing
projects pair is untouched → those two are not in `touched` … BUT note: TRACKED_SET
is a SINGLE flat array. If the design APPENDS the two new paths to the same
TRACKED_SET, then on a PR that touches only the new canary+test (and not the
projects pair), `touched` = {2 new files}, `present` = those 2 of 4, `missing` = the
2 projects files → **strict-subset FAIL**. **This is a real interaction the design's
"additive edit that does not touch the existing projects pair" framing glosses
over.** The current script tracks an all-or-NONE set of *all* tracked files, not
per-pair. The design MUST either (a) make the new pair its own separate gate/script
or its own separate TRACKED_SET constant with independent all-or-none logic, or
(b) refactor the script to track pairs, not a flat union. As written ("register the
new canary↔test pair in TRACKED_SET"), appending to the flat array breaks the
projects pair's independence — any future PR touching one pair but not the other
fails. **Compounding finding (touches r2 finding 3 infra).**

### 4b. `verify-ci-topology.mjs` interaction — design's acceptance gate is adequate.
Topology verifier pins specific named literals (STEP_NAMES + ENHANCED_STEPS_ORDERED)
and is fatal on missing/misordered. The design's three new steps
(`check:authoring-docs`, its self-test, the new cadence check) are NOT in the
verifier's pinned lists, and inserting `check:authoring-docs` after `Lint`
(ci.yml:45) does not reorder any pinned literal. Verified the pinned anchor
"Verify getPublishedPosts callers" must sit between Typecheck and Unit tests — the
new step is inserted after Lint/before Build 1, well clear. The design's stated
acceptance requirement (run `verify-ci-topology.mjs` after the edit; grow the
literal list if needed) is the right discipline. OK.

### 4c. New scanner file self-trip — adequately addressed, one residual.
`tsconfig.json` excludes only `node_modules` + `src/__fixtures__/chokepoint-canary.ts`
— it does NOT exclude `src/lib/build/*`, so the new `check-content-chokepoint.ts`
will typecheck normally (fine — it imports `typescript`/`fs`, not `#site/content`).
The new canary `content-chokepoint-canary.ts` WILL contain raw `#site/content`
imports of `contributions`/`resources` and MUST be added to `tsconfig.json`'s
`exclude` (mirroring the projects canary) AND exempted in the new scanner's own
allowlist AND in eslint's `no-restricted-imports` `off` file list — the design
mentions the eslint allowlist and the scanner allowlist but does NOT mention the
`tsconfig.json` exclude edit. **Residual gap:** add the new canary to
`tsconfig.json` exclude, or `pnpm typecheck` (ci.yml:51) goes red. Novel-minor.

### 4d. Symbol→allowlist cross-symbol rule — sound in concept; the canary is the catch.
The new canary fixture deliberately imports BOTH `contributions` and `resources`
(to exercise both symbols' shapes). Under a symbol→authorized-helper map
`{contributions:["src/lib/contributions.ts"], resources:["src/lib/resources.ts"]}`,
the canary would be flagged for BOTH unless the canary path is exempted wholesale.
The design says the canary is "parallel to the projects canary" and the projects
canary is exempted by path in the test allowlist — so the same path-exemption must
be wired for the new canary. Design implies but doesn't state it explicitly for the
new scanner's allowlist. Minor under-spec.

---

## Attack dimension 5 — residual gaps & requirement coverage

### 5a. `<time datetime>` / display with full-datetime emission — NOT a novel regression.
`formatContentDate` (src/lib/format-date.ts:7-9) returns
`{ datetime: iso, display: Intl.DateTimeFormat("en-CA",{…}).format(new Date(iso)) }`.
With `iso` now a full UTC datetime, `display` is computed in the runtime's local TZ:
under `TZ=America/Toronto`, `new Date("2026-05-28T00:00:00.000Z")` formats to
**"May 27, 2026"** (off-by-one vs the authored day). **However**, this is identical
to the existing behavior: `posts`/`projects` already store full-datetime `date` via
`s.isodate()` (`.velite/projects.json` shows `"2026-05-25T00:00:00.000Z"`), and
`new Date("2026-05-28")` (date-only) parses to the SAME UTC-midnight instant — so
date-only vs full-datetime produce the IDENTICAL display. Verified empirically
(both render "May 27, 2026" under Toronto TZ). So the design's "fine for
formatContentDate" claim is consistent with the repo's existing, accepted behavior;
NOT a new bug. (If the site cares about this off-by-one it's a pre-existing,
cross-cutting issue, out of this spec's scope.) Req 2.4 only requires "formatted via
`formatContentDate`" — satisfied.

### 5b. Sitemap `maxOr` over full-datetime strings — consistent.
`maxOr` reduces with lexicographic `>` over uniform full-ISO strings (chronological)
and wraps the max in `new Date(...)`. Works for full-datetime emission. No leftover
"date-only" assumption in the sitemap section. OK. (Minor: `maxOr([])` reduces an
empty array — guarded by `dates.length ?` ternary, so the empty case hits the
`fallback` branch. Correct.)

### 5c. `added <= BUILD_START_UTC` refine runs on TRANSFORMED value — but only if 2b doesn't crash first.
design.md:216,221 puts the `.refine` on the OUTPUT of `isoDate()`
(`isoDate().refine(d => Date.parse(d) <= BUILD_START_UTC)`). For a regex-passing but
unparseable `added` (`2026-13-45`), the crash in 2b happens INSIDE `isoDate()`
before this refine ever runs — so the future-date refine never gets a chance and the
build dies with `RangeError` instead of a contract message. Same root cause as 2b;
fixing `isoDate` fixes this too.

### 5d. `date`/`added` round-trip (Req 2.4/5.4) — no contradiction.
No requirement asserts the author's literal `YYYY-MM-DD` round-trips to output; Reqs
describe rendering/sort behavior, both satisfied by full-datetime emission. The
data-model doc (design.md:392,410) explicitly documents the normalized stored value.
OK.

### 5e. Under-specified implementer decision left open (besides isoDate & unwrap table):
- The new cadence script reads `contributions.length + resources.length` from TWO
  `.velite/*.json` files. `check-lighthouse-cadence.mjs` (the cited precedent)
  reads ONE file and `fail()`s hard if it's missing. With two files, the new script
  must define behavior when ONE collection's JSON is absent (e.g. file removed). The
  design says "structural clone" but doesn't pin the two-file-missing semantics.
  Minor.

---

## Top 5 risks/gaps

1. **`isoDate()` silently accepts & rewrites impossible dates** (`2026-02-30` →
   `2026-03-02`). **NOVEL.** Failure scenario: author types Feb 30; build goes green;
   card shows a different date than authored; sort order is silently wrong. Evidence:
   probe `entry.safeParse({date:"2026-02-30"}) => success, "2026-03-02T00:00:00.000Z"`;
   engine `dist/index.js:140`. Contradicts design.md:220,392,410.

2. **`isoDate()` throws an uncaught `RangeError` for `YYYY-MM-DD`-shaped unparseable
   dates** (`2026-13-45`, `2026-00-10`, `2026-01-32`). **NOVEL.** Failure scenario:
   loader's `safeParse` throws OUT of `formatZodIssues`; CI/postinstall prints bare
   `"Invalid time value"` — no file, no entry, no field; the Shared Error-Message
   Contract (Reqs 1.4/3.1/4.4/10.1) is violated; later entries in the file are never
   validated. Evidence: probe `THREW: RangeError - Invalid time value`; refinement
   sets status "dirty" not "aborted" (chunk:36837-36859), transform runs anyway
   (chunk:36876), `safeParse` has no try/catch (chunk:34019-34039), CLI prints only
   `err.message` (cli.js).

3. **`formatZodIssues` schema-walk has no wrapper-unwrap spec.** **COMPOUNDING**
   (r2 finding 5). `links` is `ZodEffects`(superRefine) over `ZodArray`; `title`/
   `description`/`date` are `ZodPipeline`; `language` is `ZodOptional`. The design
   says "walk along `issue.path` to the `ZodEnum`/`ZodObject`" but never enumerates
   `ZodEffects→_def.schema`, `ZodPipeline→_def.in/out`, `ZodArray→_def.type`,
   `ZodOptional→_def.innerType`. Failure scenario: an `invalid_type` enum failure
   under `links[i].kind` cannot reach the `ZodEnum` (the walk dies at the
   `ZodEffects` node) → contract item 5 (enum members) silently dropped or the
   formatter crashes. Evidence: probe `links node typeName: ZodEffects … _def.schema
   typeName: ZodArray`.

4. **Appending to the flat `TRACKED_SET` breaks the projects pair's independence.**
   **COMPOUNDING** (r2 finding 3). The script's all-or-NONE rule is over the entire
   union; a future PR touching the projects pair but not the content pair (or vice
   versa) becomes a strict-subset FAIL. Evidence: `verify-canary-regex-pair.mjs:64-125`
   — `present`/`missing` computed over the whole `TRACKED_SET`, not per-pair. The
   design must use a separate gate/constant with its own all-or-none logic.

5. **Missing `tsconfig.json` exclude for the new canary fixture.** **NOVEL-minor.**
   The new `content-chokepoint-canary.ts` will carry raw `#site/content` imports;
   `tsconfig.json:34` excludes only the projects canary, so `pnpm typecheck`
   (ci.yml:51) will fail on the new canary's intentional violations unless it's added
   to `exclude`. The design lists eslint + scanner allowlist edits but omits this.

---

## Top 3 conclusions to challenge or reverse

1. **REVERSE: "the regex gate enforces date-only ISO shape first, then `s.isodate()`
   confirms parseability and normalizes" (design.md:220).** The regex enforces only
   the `\d{4}-\d{2}-\d{2}` *shape*. `s.isodate()` does NOT confirm calendar validity
   — it accepts any `Date.parse`-able string (rolling over `2026-02-30`) and CRASHES
   on shape-valid-but-unparseable strings. The composition does not deliver "ISO
   date" validation. Reversed by findings 2a + 2b.

2. **CHALLENGE: "the loader runs each entry through `safeParse` … aggregates issues,
   formats them per the Contract, and throws" (design.md:26, 422).** True only when
   `safeParse` returns. For the `isoDate` RangeError class, `safeParse` THROWS, so
   the aggregate-and-format path is bypassed and the contract is not delivered. The
   loader needs a `try/catch` around each `safeParse` (mapping a thrown non-ZodError
   into a contract message) REGARDLESS of the isoDate fix, as defense-in-depth —
   `safeParse` throwing on a transform exception is a general zod-v3 property, not
   unique to dates.

3. **CHALLENGE: "register the new canary↔test pair in `verify-canary-regex-pair.mjs`
   TRACKED_SET … an additive edit that does not touch the existing projects pair"
   (design.md:258).** Additive to the array, yes — but NOT isolation-preserving: the
   script's all-or-none logic is union-wide, so the projects pair and the content
   pair become mutually coupled (finding 4). "Does not touch the existing projects
   pair" is false at the behavioral level.

---

## What's missing before this design is safe to implement

1. **A correct `isoDate()` that (a) rejects calendar-impossible dates without
   rollover, and (b) NEVER lets `safeParse` throw.** Concretely: do not chain
   `s.isodate()`'s transform after a shape-only regex. Either validate Y/M/D against
   the captured regex groups and reject mismatches with an aborting issue before any
   `toISOString`, or implement the whole field as a single guarded `.transform` that
   calls `ctx.addIssue(...) + return z.NEVER` on any non-round-tripping or
   non-finite parse. Add unit tests for `2026-02-30`, `2026-04-31`, `2026-13-45`,
   `2026-00-10`, `2026-02-29`, `2025-02-29` asserting CLEAN contract-conformant
   failure (not RangeError, not silent rewrite).

2. **A `try/catch` (or `safeParse`-cannot-throw guarantee) in the loader** so any
   transform-thrown exception becomes a contract message, not a bare `RangeError`.

3. **An explicit wrapper-unwrap table in `formatZodIssues`** covering
   `ZodEffects`/`ZodPipeline`/`ZodOptional`/`ZodArray`, with a unit test that walks
   `["links", 0, "kind"]` to the `ZodEnum` through the `superRefine` `ZodEffects`.

4. **A per-pair (not union) paired-merge gate** for the new canary↔test — either a
   second TRACKED_SET constant with its own all-or-none check, or a refactor of the
   script to track pairs. Plus a self-test for the "touch content pair only" case.

5. **`tsconfig.json` exclude entry for the new canary**, and explicit statements that
   the new canary is path-exempted in BOTH the eslint `off` list and the new
   scanner's allowlist (it imports both `contributions` and `resources`).

6. **Two-file-missing semantics for the new cadence script.**

Everything in attack dimensions 1 (run-points, install-time fail) and the bulk of 4
(topology verifier, scanner-as-separate, symbol→allowlist concept) and 5a/5b
(time-display non-regression, sitemap) are genuinely fine — verified, move on.
The blocking work is the `isoDate` rewrite + loader try/catch (findings 1–2 above),
which is precisely the wiring/validation-layer claim-as-fact that prior rounds kept
catching.
