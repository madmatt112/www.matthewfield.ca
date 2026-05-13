# Adversarial Review Memory — tasks
Last updated: 2026-05-13 (after v2 review)

## Cumulative Findings Summary

### Accepted (incorporated in v2)
- **Task 17 split**: v1 said one 60-line task hid ~6 surfaces. v2 split into 17 (core) + 17.1 (focus) + 17.2 (reduced-motion scroll) + 17.3 (CustomEvent). Note: v2 review found the split is along the wrong axis (paperwork, not delivery); see Unresolved.
- **Task 23 split**: v1 said CSP + axe + reduced-motion in one file colocates orthogonal failure modes. v2 split into 23 (CSP) + 23.1 (axe in both themes) + 23.2 (reduced-motion).
- **LHCI workflow**: v1 said Req-NFR-Performance has no task. v2 added task 7.3. Note: v2 review found the workflow lands in Phase 1 but tests pages from Phase 6.
- **@axe-core/playwright install**: v1 said Req 4.10 has no install task. v2 added task 7.2.
- **zod/react-obfuscate canonical install**: v1 flagged duplicate-install ambiguity in tasks 11/14. v2 added task 7.1 as the single canonical install.
- **Canonical URL assertion**: v1 said Req 6.3 was orphaned. v2 added the assertion in task 22.
- **role=status landmark assertion**: v1 said Req 4.1 was unverified. v2 added the locator assertion in task 22.
- **contact_submit_success CustomEvent assertion**: v1 said Req-NFR-Observability was unverified. v2 added the event-promise-race assertion in task 22.
- **form-action 'self' header assertion**: v1 said task 4's CSP directive had no failing test. v2 added the header substring assertion in task 23.
- **Sitemap /contact verification**: v1 said Req 5.6 was unverified. v2 added a sitemap.xml presence check inside task 24.
- **Headshot viewport check**: v1 said Req 1.5 had no verification. v2 added a manual viewport check in task 24 (320/768/1280).
- **Req 4.4 enumeration**: v1 said task 17 didn't enumerate 429/502/503/504. v2 enumerates them explicitly.
- **44×44 tap targets in ContactForm**: v1 said task 17 omitted Req 4.11 for form controls. v2 calls out min-h-11 on submit + each input/textarea.
- **sm: breakpoint side-by-side**: v1 said Req-NFR-Usability was unstated in task 17. v2 calls out sm:grid-cols-2.
- **Layout-shift container**: v1 said no task reserved vertical space. v2 added min-h-[<measured-px>] in task 17 (but see Partially Accepted — verification is absent).
- **Req 5.5 future-implementer warning**: v1 said the enum-lockstep note had no carrier. v2 folded it into task 11's body and the Prompt.
- **Task 21 verify-vs-fix ambiguity**: v1 flagged the audit-only framing. v2 reworded to "Audit AND fix" with playwright.config.ts added to files list.
- **Tagline exact-copy pinning**: v1 said Req 2.5's literal string was unowned. v2 pins the verbatim string in task 18 with em-dash + smiley callouts.
- **Logging-discipline test assertions**: v1 said Req 3.10 wasn't tested. v2 added the console-spy assertion in tasks 10 and 12.
- **rehype-slug for Req 1.11**: v1 said no task installed/configured it. v2 folded the install into task 8 (see Recurring — this made task 8 bigger, not smaller).

### Partially Accepted
- **Task 8 splitting**: v1 recommended 8a/8b split. v2 left task 8 as one *and* added rehype-slug installation to it, making it bigger. Implementer accepted the same-commit-bundle rebut but didn't address the security-conscious-transform-in-isolation argument.
- **Min-h layout-shift container (Req-NFR-Performance)**: v2 added the `min-h-[<measured-px>]` Tailwind class to task 17, but did not add any CLS assertion in any test task. The mitigation is procedural with no verification.
- **Task 24 sitemap + headshot checks**: v2 added these inside task 24 (improvement) but did not add the post-merge real-production verification step v1 recommended (real-Resend smoke, curl CSP headers, curl canonical absoluteness). Real-Resend deliverability is unverified by any task.

### Rejected
- (None observed — Matthew did not push back on any v1 finding via the v2 edits. The v1 findings that survived are unresolved, not rejected.)

### Unresolved (Recurring or new in v2)
- **Task 12 case split (Recurring from v1)**: ~12 cases in one Vitest file. v2 added a logging-discipline case but did not split into 12a/12b/12c/12d. Yes/no-signal problem remains.
- **Task 24 not split into local-gate + production-smoke (Recurring from v1)**: see Partially Accepted. Real-production verification still has no task.
- **DMARC 14-day tightening reminder (Recurring from v1)**: Req 3.6 SHALL clause still has no task. Could be an explicit deferred-operator-only ack.
- **RESEND_FROM production regression guard (Recurring from v1)**: Two-line runtime check in mail.ts (throw if VERCEL_ENV=production AND RESEND_FROM=onboarding@resend.dev) still not in any task.
- **Manual-task 1/2 enforcement (Recurring from v1)**: No CI gate / pre-commit hook for "task 1 verified before task 3 commits the alias." Procedural only.
- **Task 8 same-commit enforcement (Recurring from v1)**: No tooling enforces the schema+content same-commit constraint.
- **Task 17 paperwork-vs-delivery split (Novel in v2)**: 17/17.1/17.2/17.3 share a useEffect and file, must land in strict order. Split is along SHALL-clause axis, not code-region axis. Interim state between 17 landing and 17.3 landing ships partially-satisfied requirements.
- **Task 7.3 LHCI placement (Novel in v2)**: Phase 1 workflow targets Phase 6 pages. First several runs Lighthouse 404 pages. Also accepts pull_request_target as a trigger choice without flagging the fork-PR token-exfiltration class.
- **testId cross-task contract drift (Novel in v2)**: Task 9's ContactEmailInput type lacks testId; task 11 says to forward it; task 12 doesn't test the forwarding. Two acceptable implementations in task 11 ("design accepts either") couple downstream test code to implementer choice.
- **buildCommand char count is wrong (Novel in v2)**: Task 5 success says "86-character string"; actual is ~70.
- **Task 7's structure.md forward-reference cites wrong task number (Novel in v2)**: Says `scripts/run-e2e.mjs` is created in task 20; actually created in task 21.
- **Task 7 + task 21 structure.md double-edit choreography (Novel in v2)**: Two tasks edit structure.md's scripts/ entry; the second must remove the first's "(future)" annotation; no machinery enforces consistency.
- **Task 17 static "Sending…" UX trade-off (Novel in v2)**: Spinner-disabled to simplify task 17.2's animationName='none' assertion. Trade-off unflagged; better answer is reduced-motion-gated CSS animation.
- **Task 23.1 import-syntax ambiguity (Novel in v2)**: Prose says "import THEME_STORAGE_KEY from..." — ambiguous between named and default. Self-correcting at compile time, but gratuitous.

## Patterns & Themes
- **v2 fixed loud structural gaps but introduced cross-task contract drift**. The new splits/sub-tasks describe shared surfaces in subtly different language (testId field type, structure.md entries, scrollIntoView keying) with no automation reconciling them.
- **Paperwork atomicity vs delivery atomicity**: v2's tendency is to split tasks along requirement-clause boundaries rather than code-region boundaries. The result is checkboxes that look granular but PRs that still couple. Task 17 is the clearest example.
- **Premature configuration**: Both LHCI (task 7.3) and structure.md notes for scripts/ (task 7) land in Phase 1 referencing artifacts that don't exist until Phase 6/7. v2 chose to land config-now-doc-later rather than coupling config to the code it references.
- **Procedural mitigations without verification**: min-h container, same-commit constraints, manual-task ordering — all rely on operator discipline with no CI/test enforcement. This was a v1 pattern and remains a v2 pattern.
- **"Design accepts either" as a spec smell**: appears in task 11 (testId implementation) and task 17 (min-h measurement methodology). Each instance couples downstream tests to implementer choice.

## Guidance for Next Review
- **Focus areas**:
  - Whether tasks 8, 12, 17, 24 get re-split. v2 only addressed task 17 (and along the wrong axis); the other three remain v1 issues.
  - Whether real-production verification (task 24b equivalent) gets added.
  - Whether the cross-task contract drift (testId, char-count, structure.md, import syntax) gets a coordinated fix or stays scattered.
  - Whether the manual-task / same-commit constraint enforcement gets any CI mechanism, or is explicitly accepted as procedural-only with documented residual risk.
- **Well-covered, deprioritize in next review**:
  - Requirement-coverage gaps: most v1 unowned-requirement findings (LHCI, axe-core, canonical, CustomEvent, sitemap, form-action, role=status, Req 4.4, Req 4.11, sm: breakpoint, Req 2.5 tagline, Req 5.5 enum, logging discipline) are now owned by some task. Avoid re-walking the requirements coverage matrix unless a new requirement appears or v3 removes an assertion.
  - Task 23 colocation, Task 17 "one giant task," zod/react-obfuscate install ambiguity — all resolved.
- **New attack surfaces for v3**:
  - Audit every forward-reference in the task list (cross-task citation correctness — `scripts/run-e2e.mjs` task-20-vs-task-21 was a real error).
  - Audit every numerical claim against the documented artifact (the 86-char buildCommand claim was wrong; could be a pattern).
  - Audit "design accepts either" / "implementer chooses" phrasings — pin each one.
  - Check that the testId chain (task 9 type → task 11 read → task 12 test → task 20 bucket → task 22 query) is contract-coherent end to end.
