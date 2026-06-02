# Adversarial Analysis — Playground Tasks (v2, round 2)

Reviewer stance: tear down, not validate. Every claim below is checked against the live repo at `/home/mcf/repo/matthew-field.ca` (Next 16.2.2, Vitest 4): the actual `playground-isolation.test.ts` (412 lines), the live `spike/page.tsx` fixtures (the deletion target), the real `ci.yml`, `run-e2e.mjs`, `playwright.config.ts`, `button.tsx`, and `theme-provider.tsx`.

**Headline:** v2 closed both r1 blockers *correctly and mechanically*. The six-fixture panel maps **1:1 onto the assertions the live test makes** (not just the selector names) on all six selectors — I verified each. The CI steps land in the right job. The RGB-pin is a named step. There is **no new blocker**. The residual findings are: one **design-vs-tasks divergence** that should be acknowledged (the design's hook table lists three, the tasks now ship six — a legitimate refinement, but the approved design is fixed and its table is now superseded), one **under-specified run command** in Task 8 step 5 (runs the whole E2E suite, not just the isolation spec, when a one-file filter is trivially available and avoids a dependency on not-yet-written suites), and a couple of small seams. Ranked below.

---

## Verification of the v2 blocker-fixes (the highest-value target)

### R2 six-fixture panel — assertion-level match, all six confirmed 1:1 (Recurring-but-CLOSED)

I read both the live test's assertions and the live `spike/page.tsx` mechanism for each fixture, then checked the v2 Task-3 sample hook reproduces the *computed value the test asserts*, not just the selector:

| Live selector + assertion (test line) | Live spike mechanism | v2 sample hook (Task 3) | Match? |
|---|---|---|---|
| `spike-plain-div-target`: `color==="rgb(255,0,0)"` + `fontFamily==="serif"` exact (`:189,193`) | inline `style={{color:"red",fontFamily:"serif"}}` (`spike:11`) | `sample-plain-div` = "inline-styled element (red `color` + `serif` font via inline `style`)" | **✔ same mechanism (inline style), same computed value** |
| `spike-shadcn-button-target`: padding 16/16/8/8, `fontSize==="14px"`, font-family `not.toContain` Geist + `ui-sans-serif` (`:232-240`) | shadcn `<Button>` default size (`text-sm`=14px, `px-4 py-2`) (`spike:17`) | `sample-font-target` = "a shadcn `<Button>`" | **✔** — verified `button.tsx` default variant carries `text-sm`(14px)+`px-4 py-2`(16/8px); after M1 it inherits the container's `ui-sans-serif` so the Task-8 `toContain` flip is reachable |
| `spike-tailwind-div-target`: bg=BLUE_500(lab), padding 16px×4, `fontSize==="18px"`, `lineHeight==="28px"` (`:257-263`) | `className="bg-blue-500 p-4 text-lg"` (`spike:21`) | `sample-tailwind-div` = `className="bg-blue-500 p-4 text-lg"` | **✔ identical class set** |
| `spike-token-access-target`: bg=PRIMARY, color=PRIMARY_FG, **all 4 radii==="10px"**, inherited `--bg/--fg/--primary` (`:331-339`) | inline `style` `bg:var(--primary)`,`color:var(--primary-foreground)`,`borderRadius:var(--radius)`,`padding:1rem` (`spike:35-40`) | `sample-token-target` = inline `style` using `var(--primary)`/`var(--primary-foreground)`/`var(--radius)` | **✔** *provided* `var(--radius)` is applied to `border-radius` (see Finding 3 — minor under-spec) |
| `spike-button-token-target`: bg=PRIMARY, color=PRIMARY_FG (`:380-381`) | shadcn `<Button>` inline `style` `bg:var(--primary)`,`color:var(--primary-foreground)` (`spike:65-70`) | `sample-button-token` = `<Button>` inline `style` `var(--primary)`/`var(--primary-foreground)` | **✔ same mechanism** |
| `spike-ac2-inherit-target`: font-family `not.toContain` Geist (`:408-409`) | div, **no inline overrides** (`spike:52`) | `sample-leak-probe` = "no-override control element" | **✔ same (no-override) mechanism** |

All six re-pointed hooks reproduce the asserted computed value with the same CSS mechanism. **r1's R2 is genuinely closed** — this was the review's single hardest check and it passes. The CSS-Module-vs-inline-style hazard the prompt flagged does **not** materialize: the two fixtures whose assertions depend on the *delivery mechanism* (`sample-plain-div` inline red/serif; `sample-tailwind-div` Tailwind utilities) are specified to use the **same** mechanism the spike used (inline style / Tailwind utility), not a CSS Module. The CSS Module on `scribble-pad` is the *toy's* clashing palette, separate from the fixture panel. Good.

### R1 CI steps — correct job, toolchain present (Recurring-but-CLOSED)

`ci.yml` is a **single `ci` job** (line 11) with no matrix and no second job. The `check:authoring-docs` run (`ci.yml:48-49`) and its self-test (`ci.yml:97-98`) both live in that one job, which already has Setup pnpm (`:33`), Setup Node (`:36`), and `pnpm install` (`:42`) ahead of them. Task 12's two new steps mirror exactly those two — so they land in the only job, after the toolchain is set up, and `pnpm check:playground-css` + `node --test` will run. **No ordering hazard:** the new steps gate on `playground/**/*.module.css` existing, which Task 12 depends on (Tasks 3, 4) — by the time the script runs in CI the sample modules exist. r1's R1 is closed. (Nit: the two `check:authoring-docs` steps are 49 lines apart in the file — a literal "mirror 48-49 and 97-98" is fine, but the implementer should place the run step near the other gate-runs (~line 49) and the self-test near the other self-tests (~line 98), not adjacent; the task wording "mirroring …48-49 + 97-98" implies this and is adequate.)

### R4 RGB-pin step 5 — named step, but the run command is under-specified (Compounding — see Finding 2)

The verify-then-edit loop is now an explicit step 5. Good. But the *mechanism* — "run the isolation suite against the prod build (`node scripts/run-e2e.mjs`)" — runs the **whole** Playwright suite. See Finding 2.

### R3 `applyDarkMode` / THEME_STORAGE_KEY — correct and mechanized (Recurring-but-CLOSED)

`theme-provider.tsx:6` exports `THEME_STORAGE_KEY = "theme"`; the live test hardcodes `"theme"` at `:160`. Task 8 step 4 names the exact line (160), the exact import source, and the stale comment lines (36-37). Concrete and reachable. Closed.

---

## Top findings (ranked)

### Finding 1 — Design↔tasks divergence: the approved design's hook table (3 descendant hooks) is superseded by the tasks' 6, and the tasks never flag the contradiction (Novel; Low-Medium)

The approved (fixed) design `design.md:415-420` lists a hook table with **three** descendant hooks (`sample-font-target`, `sample-token-target`, `sample-leak-probe`) plus the container. The tasks now ship **six** descendant hooks. Per the prompt's instruction to decide *contradiction vs. refinement*: this is a **legitimate refinement, not a true contradiction** — Decision #7 (`requirements.md` decisions, "carries **equivalent** `data-testid` hooks") and the design's own table caption frame the table as the migration map, and the design body never claims the suite selects only three. The three-hook table was simply *incomplete* (it is the same r1-R2 undercount, in the design this time). The tasks' six-hook set is the correct, complete mapping.

**But:** the design is approved and fixed, and the tasks now exceed its literal table without a note reconciling the two. A reviewer cross-checking tasks against design will hit a 3-vs-6 mismatch and cannot tell from the tasks doc whether it is intentional. The v2 Revision-history entry (R2) explains the *expansion from Task 3's old three* but never says "this also supersedes the design's `design.md:415-420` table." **Fix (doc-only):** add one clause to the tasks' v2 revision note: "this six-hook set also supersedes the design's illustrative three-hook table at `design.md:415-420`, which was the same undercount (equivalent-hooks language, Decision #7)." No code/design change needed; the design table is illustrative by its own framing. Severity low because the tasks are self-contained and correct; it is a traceability gap, not an execution defect.

### Finding 2 — Task 8 step 5 runs the WHOLE E2E suite to pin one RGB value, creating a needless coupling to not-yet-written / unrelated specs (Novel; Medium)

Task 8 step 5 (`tasks.md:140`) and its `_Prompt` say: run `node scripts/run-e2e.mjs` to read the serialized container `color`, then pin `EXPECTED_CONTAINER_COLOR_RGB`. But `run-e2e.mjs` (verified) spawns `playwright test --config=e2e/playwright.config.ts` and the config's `testMatch` (`playwright.config.ts:13`) is `["**/*.test.ts", "component-preview/**/*.test.ts"]` — i.e. **the entire `e2e/tests/` tree**: the blog suites, the contributions/resources suites, `csp.test.ts`, etc. At Task 8's point in the DAG (depends on 2, 3, 6 only), running the full suite means:

- Task 16's `playground.test.ts` doesn't exist yet — fine, it's just absent.
- But `csp.test.ts` still has its **stale `/playground/spike` comment** (cleaned only in Task 13, which depends on 6,7 — may not have run) — comments don't fail, fine.
- The real exposure: **the agent must green the entire unrelated E2E suite (blog, feeds, contributions) just to read one computed color.** Any pre-existing flake or unrelated red in those suites blocks Task 8's pin step, and the long full-suite runtime is paid to extract a single `rgb()` triple.

`run-e2e.mjs` already forwards `process.argv.slice(2)` to `playwright test` (verified, `:102,110`), so `node scripts/run-e2e.mjs playground-isolation` runs **only** the isolation spec against the same prod webServer. **Fix:** change Task 8 step 5 (and the `_Prompt`) to `node scripts/run-e2e.mjs playground-isolation` (a positional file-filter), so the pin reads the isolation spec's own output and doesn't gate on unrelated suites. This is the r1-R4 fix being *relocated but not fully de-risked* — the loop is named, but the loop's run command still drags the whole suite. Compounding on R4.

### Finding 3 — `sample-token-target` radius assertion: the task says "uses `var(--radius)`" but not that it must be applied to `border-radius` (Novel; Low)

The live test reads all four `border*Radius` off `spike-token-access-target` and asserts `=== "10px"` (`:319-336`). The live spike applies `borderRadius: "var(--radius)"` (`spike:38`). Task 3's `sample-token-target` is specified as using "`var(--radius)` via inline `style`" but does not pin *which property* — an implementer who applies `var(--radius)` to, say, `padding` (the spike also had `padding:1rem`) instead of `border-radius` would leave the four radius assertions reading `0px` and fail Task 8. **Fix:** one clause — "set `border-radius: var(--radius)` (the four-corner radius the suite reads)". Low severity (the obvious reading is border-radius) but it is the one fixture detail Task 3 leaves to inference where the test is exact-match.

### Finding 4 — Task 3 is now a two-concern unit (toy + 6-fixture harness) but stays atomic; not a split, just a sizing note (Novel; Low — do NOT split)

v2 made Task 3 bigger: a real canvas toy AND a six-fixture isolation panel across two files. Is it still one reviewable unit? **Yes — keep it whole.** The panel and the toy share the one client component and the one folder; splitting would fragment the SSR-safety review and the import-boundary review across two tasks for no atomicity gain (the manifest thunk imports the folder, not the panel). The UX worry the prompt raises (a user opening `scribble-pad` sees six visible test fixtures) is real but **acceptable per Req 7.2** (the same-page sample is *defined* as a surface that deliberately exhibits clashing styles to prove isolation; the fixtures ARE that proof). Minor recommendation: the task could say "visually group the fixture panel below the toy (e.g. a small `<section>`)" so the landing surface reads intentionally, but this is polish, not a blocker. No split.

### Finding 5 — `sample-button-token` / `sample-font-target` pull `@/components/ui/button` into the SSR-prerendered same-page item; verified SSR-safe (Novel→cleared)

Task 3 imports a shadcn `<Button>` into the client item, which the route SSR-prerenders. I checked `button.tsx`: it imports only `cva`, `radix-ui` `Slot`, and `@/lib/utils` `cn` — **no browser globals at module/render scope, no `(site)` coupling**, pure UI primitive. It renders a `<button>` (or `Slot`) with no effect/ref. So importing it into the SSR-on `dynamic(it.load)` item is safe — it prerenders and hydrates cleanly, and it satisfies the import-boundary rule (`src/components/ui/` is permitted). **No SSR hazard.** Cleared.

### Finding 6 — Alias-edge audit: 1→9 and 1→10 added correctly; no OTHER task that imports `#playground/manifest` lacks the Task-1 edge (Novel→cleared)

r1 added 1→9, 1→10. I re-scanned all 16 tasks for `#playground/manifest` importers and their dep edges:
- Task 6 (imports it) → deps {1,2,5} ✔
- Task 7 (imports it) → deps {1,5} ✔
- Task 9 (imports it) → deps {1,5,8} ✔ (1 added in v2)
- Task 10 (imports it) → deps {1,5,6} ✔ (1 added in v2)
- Task 11 (imports it) → deps {1,3,4,5} ✔
- Task 16 — does **not** import the manifest (it hardcodes the two stable slugs, per design `:263`); deps {6,7,8,9} ✔
- Task 13 (`csp.test.ts`) — does **not** import the manifest (hardcoded paths) ✔

Every `#playground/manifest` consumer carries the Task-1 edge. The DAG mermaid block (`tasks.md:10-40`) shows 1→{6,7,9,10,11} — consistent with the prose deps. **No missing edge remains.** Cleared.

### Finding 7 — Ordering hazards (spike deletion vs. Task 13; Task 11 fs.existsSync before sample folders) — all guarded by dep edges (Novel→cleared)

- **Task 13 references the stale `/spike` comment in `csp.test.ts`** and Task 8 deletes `spike/`. If 13 ran before 8: `csp.test.ts` targets `/playground` (live), not `/spike` — only a *comment* mentions spike (r1 verified). Deleting `spike/` doesn't break `csp.test.ts`, and 13's edit is comment-cleanup. No hazard; the two are independent. ✔
- **Task 11 `fs.existsSync(playground/<slug>/index.tsx)`** depends on {1,3,4,5} — sample folders (3,4) exist before 11 runs. ✔
- **Task 9 needs all of Task 8?** Task 9 (gallery) deps {1,5,8}. The gallery doesn't render inside `<PlaygroundFrame>` and doesn't touch the isolation suite — it arguably only needs the *wrapper-removal* half of Task 8 (so the gallery renders themed, outside the reset). But Task 8 is **atomic by design** (the four edits co-land), so a finer-grained 8a/8b split is neither possible nor desirable — depending on the whole of atomic Task 8 is correct, just slightly coarser than strictly necessary. Not a defect. ✔
- **No task's `[x]` leaves a lint/typecheck error for a later task's review:** Task 2's `PlaygroundFrame` is exported and imported by Task 6 (not unused at 6's review); between 2 and 6 it is unused but **exports don't trip `eslint`/`tsc`** (an unused *local* would; an unused *export* does not). Task 5's manifest thunks `() => import("./scribble-pad")` require the folders to exist (deps {3,4}) and the item `default export` must satisfy `Promise<{ default: ComponentType }>` — both samples are `export default` client components, which match. ✔

---

## Completion-criteria / `_Prompt` executability

- **Task 8's `_Prompt` is long but executable in one pass.** It is six mapped selectors + THEME_STORAGE_KEY + RGB pin + four atomic edits + a prod-build run. This is a lot, but it is *one cohesive cascade change* with a single verification — splitting it would break the red-by-construction atomic-commit guarantee (the whole point of Task 8). Keep whole. The one improvement is Finding 2 (scope the run command). It does **not** need a split.
- **Task 8 `Success:` is self-consistent with step 5** *except* the run-command scope (Finding 2): `Success` says "run against the prod build" and step 5 says `node scripts/run-e2e.mjs` — adding the `playground-isolation` filter aligns both with "the isolation suite," not "the whole suite."
- **Task 12 now names `ci.yml` consistently** in intro / `File:` / `Success:` / `_Prompt` (verified all four). Nothing still says "1–3 files" — that phrase does not appear in the v2 doc at all (the old C1 framing was dropped). ✔

---

## Coverage / consistency after the edits

- **Should Task 3 cite Req 10.2 now that it hosts the isolation fixtures?** Task 3's `_Requirements` is `6.1, 6.3, 7.1, 7.2`. The fixtures *enable* the 10.2 re-point, but 10.2 ("isolation suite re-point + no-regress") is *delivered* by Task 8 (which does the re-point) and is correctly mapped to Task 8 only in the matrix (`tasks.md:278`). Task 3 contributes the *hooks* 7.2 already covers ("same-page conflicting styles + data-testid"). So **7.2 is the honest cite; 10.2 stays on Task 8.** No change needed — but note the `_Prompt`'s `Success:` line for Task 3 still says "it carries the **three** data-testid hooks" (`tasks.md:93`) — a **stale leftover from the pre-v2 three-hook version**. The body lists six; the `Success:` says three. **Fix:** change Task 3's `Success:` "the three data-testid hooks" → "the six data-testid hooks." (Minor but it is an internal contradiction inside one task.)
- **Req 1.2 "by construction" note** is honest (r1-R5 fix) — the matrix marks it not-independently-gated. ✔
- **No v2 edit broke an existing-correct claim:** green-before/after note intact; deferred-item folding intact (alias→11, `_components`/dynamic→6, RGB→8, Vercel→16); axe scope intact (gallery + iframe-landing, same-page toy exempt). ✔

---

## Top conclusions to challenge or reverse

**None remain.** r1's two blockers are closed with mechanized, assertion-level-correct fixes (verified against live code). The architecture, DAG, atomicity, and coverage matrix are sound. The residual items are a traceability note (Finding 1), a run-command scope tightening (Finding 2), and three one-line precision fixes (Findings 3, the stale "three hooks" in Task 3 `Success`, and the radius property). I did **not** manufacture objections beyond these — the v2 work is solid.

## What's missing before execution-ready

Nothing **blocking**. Recommended (in priority order):

1. **(Finding 2, Medium)** Scope Task 8 step 5's run command to `node scripts/run-e2e.mjs playground-isolation` so the RGB pin reads only the isolation spec and doesn't gate on unrelated/not-yet-written suites.
2. **(Task 3 `Success` contradiction, Low)** Fix Task 3's `Success:` line "three data-testid hooks" → "six" (the body already lists six).
3. **(Finding 3, Low)** Pin `sample-token-target`'s `var(--radius)` to `border-radius` (the property the suite's four radius assertions read).
4. **(Finding 1, Low/doc)** Add a one-clause note that the six-hook set supersedes the design's illustrative three-hook table (`design.md:415-420`) — traceability only.

All four are one-line doc edits; none changes the architecture, the DAG, or the atomic-commit guarantee. The breakdown is execution-ready once #1 and #2 land (the other two are polish).
