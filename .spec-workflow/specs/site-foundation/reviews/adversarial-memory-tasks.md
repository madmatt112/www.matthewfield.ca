# Adversarial Review Memory — Tasks
Last updated: 2026-04-07 (after v2 review)

## Cumulative Findings Summary
### Accepted
- Task 4/5 canary test depended on shadcn/ui Button not yet installed: changed to plain React component (v1 risk #1)
- R2 AC3 Vercel preview deploys had no task: new task 4 added for Vercel platform configuration (v1 risk #5)
- tokens.css dependency gap (task 7 referenced tokens.css before it existed): task 8 now creates tokens.css in Phase 2 before spike tasks (v1 risk #3)
- shadcn init overwrite risk on globals.css: task 8 redesigned to manual file creation — no shadcn init (v1 risk #2, v2 finding 2.1/2.2/2.3 — fully addressed)
- R10 AC3 generateMetadata on landing page: task 23 now explicitly exports generateMetadata() (v1 finding)
- Site config type structure ambiguity (navItems/heroCards nested vs separate exports): task 19 now explicitly specifies nested structure matching design doc type definition (v1 finding)
- Nav client/server boundary ambiguity: task 20 now explicitly states Nav is a "use client" component (v1 finding)
- shadcn/ui components unavailable for Phase 2 spike: new task 9 installs all needed components before spike fixtures (v2 risk #1 — recurring from v1, now addressed)
- Task 4 (Vercel setup) marked as [MANUAL] with non-blocking note (v2 finding 4.1)
- Dark-mode isolation test added to task 13 (v2 finding 6.3/risk #4)
- Spike outcome (c) contingency documented in task 14 (v2 finding 5.4/risk #5)
- Dev-vs-production comparison downgraded to manual step in task 13 (v2 finding 5.2/risk #3)
- Task 13 writes spike-summary.txt for task 14 to reference (v2 finding 5.3)
- Task 10 prompt acknowledges possible layer ordering failure (v2 finding 5.1)
- Task 3 postinstall reference fixed from "task 6" to "task 7" (v2 finding 6.2)
- Component installation tasks updated — task 15 says "verify" not "install" Button, task 18 references existing DropdownMenu (v2 finding 1.3)

### Partially Accepted
- R5 AC5 WCAG contrast verification: task 15 now lists specific token pairs and suggests browser DevTools, but still no CI gate or mandatory tool (v1 risk #4, v2 finding 6.6 — improved but not fully resolved)

### Rejected
- (none explicitly rejected)

### Unresolved
- ESLint config naming: structure doc shows .eslintrc.json but task 2 uses eslint.config.mjs (flat config). Task 2 is correct — structure doc is stale. v2 recommended updating structure.md. Still not updated as of v2 analysis. (v1, escalated in v2 finding 6.1)

## Patterns & Themes
- **Cross-phase dependency violations** were the dominant pattern in v1 and recurred in v2. The v2 fix (task 9 installing all components before spike) addressed this comprehensively. Future reviews should verify no new cross-phase dependencies were introduced.
- **Uncontrolled side effects from CLI tools** (shadcn init) was identified in v1 and deepened in v2. The shift to manual file creation in task 8 resolved this class of issue.
- **Underspecified verification mechanisms** appeared in v2 — tasks instructing agents to "compare" or "verify" without specifying how. Addressed by downgrading dev comparison to manual and adding spike-summary.txt as an inter-task artifact.
- **Prompt ambiguity leaving architectural decisions to implementing agent** was a v1 pattern, largely resolved by making prompts more prescriptive in the current version.

## Guidance for Next Review
- Focus areas:
  - Whether task 8's manual creation approach (no shadcn init) is fully specified — are the exact files, their contents, and dependencies (clsx, tailwind-merge) all covered in the prompt?
  - Whether task 9's `shadcn add` batch install is compatible with the manually-created components.json from task 8 — will the CLI accept a hand-written config?
  - Whether the slash page routes (/about, /colophon, /now, /slashes, /sitemap) have tasks covering their creation — they appear in the sitemap (task 21) and nav/footer but may lack page.tsx creation tasks
  - Whether the playground index page (/playground) has a creation task — it appears in nav but no task creates its page.tsx
  - Whether task numbering and cross-references remain consistent after the insertion of task 9 (component installation)
  - Inter-task file conflict potential: multiple tasks touch the same files (layout.tsx, globals.css, next.config.ts) — verify no destructive overwrites
  - Whether the canary test file path (src/canary.test.tsx) follows conventions — structure doc says tests colocate next to source files, but this is a standalone canary
- Areas well-covered (don't re-examine):
  - CSP regex correctness (verified in v1)
  - File path consistency with structure doc (verified in v1)
  - Kebab-case, named exports, no barrel files conventions (verified in v1)
  - Phase 5 E2E test dependency ordering (verified in v1)
  - shadcn/ui component availability for spike fixtures (resolved in v2 with task 9)
  - Dark-mode isolation testing (added in v2)
  - Dev-vs-production comparison approach (resolved in v2)
  - Task 4 executability for AI agents (resolved in v2 with [MANUAL] flag)
  - Spike outcome (c) contingency (resolved in v2)
