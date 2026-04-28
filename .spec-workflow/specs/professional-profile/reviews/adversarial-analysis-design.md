# Adversarial Analysis — `professional-profile/design.md`

Read against `requirements.md` and the three steering docs (`product.md`, `tech.md`, `structure.md`). All references are to `design.md` line/section anchors and concrete code snippets in the design.

---

## 1. The Velite `profile` collection and the `git log` transform

### 1.1 `meta.path` is correct in v0.3.1, but the design's hedge ("the implementation verifies against the installed version") is the wrong instinct

In Velite v0.3.1 (the version this repo has installed at `node_modules/velite@0.3.1`), `defineCollection({ schema: s.object().transform((data, ctx) => ...) })` calls zod's `.transform()`, whose `ctx` is Velite's `ParseContext` (extends zod's `RefinementCtx`) and exposes `meta: ZodMeta`. `ZodMeta extends VeliteFile`, and `VeliteFile extends VFile` — VFile.path is a *string getter* (`node_modules/velite/dist/index.d.ts:5111` and `:5292` confirm `readonly meta: ZodMeta`).

So `meta.path` works in v0.3.1 and resolves to a string. The design's hedge ("verifies against the installed version and uses the documented field" — line 305) is unnecessary lip-service. It signals that the architect didn't actually open `node_modules/velite` and is hand-waving the most load-bearing API call in the entire transform. **Pin it now**: the API in v0.3.1 is `(data, { meta }) => meta.path`, full stop. If any minor version flips this, the build fails loudly — not silently — because `meta.path` would be `undefined` and `git log -1 -- "undefined"` returns empty, hitting the named-error contract. So the actual residual is small; the *signal* of an architect who left the API surface open is worse than the residual.

### 1.2 Shell injection / quoting via `execSync` template-string interpolation (design line 289)

```js
execSync(`git log -1 --format=%cI -- "${filePath}"`, { encoding: 'utf8' })
```

The `--` separator only protects against paths that look like flags. It does NOT protect against shell metacharacters (`$()`, backtick, `;`, `>`, `&&`). For `content/profile.mdx` literal this is fine. For ANY other path Velite eventually resolves (e.g. if `meta.path` returns an absolute path containing a `$` or quote, which is uncommon but possible on Windows or in CI scratch dirs), the `"..."` quoting is fragile.

This is a code-level bug: the right primitive is `execFileSync('git', ['log', '-1', '--format=%cI', '--', filePath], { encoding: 'utf8' })`, which bypasses the shell entirely. The design picks `execSync` ostensibly for readability; the cost is a shell-injection seam in build-time code. Cheap fix; design should mandate `execFileSync`.

### 1.3 The fallback chain `git fetch --deepen=1000 || git fetch --unshallow || true` does NOT cover the rename case

Walking each branch:

- **`--deepen=1000` succeeds**: short-circuits, the `--unshallow` branch is never run. On a Vercel build cache where the previous deepen left state at depth 200 and the rename commit is at depth 850, `--deepen=1000` succeeds (returns 0 even if it didn't pull anything new — `git fetch` exits 0 on no-op). Downstream `git log -1 -- content/profile.mdx` returns the most recent commit touching that exact path that is *visible in the current history window*. If the file was renamed *before* the deepened window (say, depth 1100), `git log -1 -- profile.mdx` returns the *rename commit* timestamp at depth 850, NOT the file's actual last-edit timestamp. **The transform's `if (!out)` empty-string check does NOT catch this** — non-empty wrong output sails through.
- **`--deepen=1000` fails, `--unshallow` runs**: on a fully-cloned repo (rare on Vercel), `--unshallow` returns non-zero ("fatal: --unshallow on a complete repository does not make sense"). Falls to `|| true`, which masks the failure. Build proceeds with whatever history is present. Same wrong-non-empty-output failure mode.
- **`|| true` swallows everything**: no signal whatsoever to the build that the deepen step didn't accomplish what it claimed.

**The design's "transform throws on empty output" contract (Req 1.4 transform-failure clause, design line 290–296) is a partial guard**: it catches the *no-history-at-all* case but NOT the *wrong-history* case. To close the rename hole the transform must use `git log -1 --follow --format=%cI -- "${filePath}"` — `--follow` traces history through renames. The design explicitly does not include `--follow`, so any future rename of `content/profile.mdx` (or moving it under `content/pages/`, which is a structural choice the design made backwards — see §1.6) silently produces a stale `updatedAt` until 1000 commits accumulate after the rename.

### 1.4 Dev-loop cost of `execSync` inside Velite's transform

`velite dev` watches `content/` and re-runs the transform on every file change. On modest hardware `execSync('git log ...')` is ~30–80ms (fork + child + objdb read). For the *single-file* `profile` collection that's negligible. But the design pattern is being established for what could become future single-doc collections (about, now, colophon — see structure.md:14). At N collections each shelling out, the dev hot-reload time scales linearly. The design should explicitly note this is a per-collection cost and mention the obvious cache (memoize `path → output` for a single Velite build run).

Velite's incremental cache invalidates by file content hash, not by repo SHA. So if you `git commit` without changing `content/profile.mdx`, Velite *won't* re-run the transform — the cached `updatedAt` from the previous build is reused, becoming stale relative to the new commit. **For dev this is acceptable; for `pnpm build` invoked from a CI step that depends on `updatedAt` reflecting the build commit, it is wrong.** The design doesn't acknowledge this. In practice it's mitigated because Vercel's build cache is per-deploy and Velite re-runs from clean, but a developer running `pnpm build` locally to check production output may see stale dates.

### 1.5 Cheaper alternative to the local-build quirk that the design did not consider

Req 1.4's "Local-build quirk (acknowledged, not fixed)" is a 2-line mitigation away:

```js
const isDirty = execFileSync('git', ['diff', '--quiet', '--', filePath], {
  encoding: 'utf8',
  stdio: ['ignore', 'ignore', 'ignore'],
}).status !== 0;
const out = isDirty
  ? new Date(statSync(filePath).mtimeMs).toISOString()
  : execFileSync('git', ['log', '-1', '--follow', '--format=%cI', '--', filePath], { encoding: 'utf8' }).trim();
```

This costs 4 extra lines and one `node:fs` import; it removes the "stale dates locally" footgun entirely. The design dismisses the cost without enumerating the alternative. Argue: the punt is conservative — production output is correct either way — but the cost of fixing it is so low that punting reads as a process choice (avoid scope) rather than an engineering choice (correctness/cost tradeoff).

A second alternative: read `VERCEL_GIT_COMMIT_SHA` (env var injected by Vercel on every build) and use `git log -1 --format=%cI ${SHA}` — gives the *deploy commit timestamp* rather than the *file last-edit timestamp*. Different semantic, possibly better for "when was the site last shipped" framing. Design should at minimum enumerate-and-reject.

### 1.6 Same-commit constraint — the asymmetric enforcement gap

Req 1.14 / design line 307 / 537: schema and content land in the same commit. The design declines a CI gate.

But the constraint is asymmetric:
- **Schema-first commit** (`velite.config.ts` adds `single: true, pattern: "profile.mdx"` without the file): Velite already fails the build with a named error (Req 1.2). Already enforced by code.
- **Content-first commit** (`content/profile.mdx` lands without the schema): Velite silently ignores the file because no collection's pattern matches it. `/profile/page.tsx` (which the design also lands in this commit) imports `profile` from `#site/content` — but `#site/content` was never updated to export it. TypeScript catches this at typecheck time IF typecheck runs before build. CI does run typecheck (`package.json` line 11: `"typecheck": "tsc --noEmit"`), so the CI gate already exists for this direction.

So the same-commit constraint is *already enforced* in both directions by existing tooling — `velite build` for one direction, `tsc --noEmit` for the other. The design's hand-wringing about "human discipline" is overblown. **Reframe**: the implementer should land them together because the implementation tasks are coupled, not because uncoupling them produces a silent failure (it doesn't — both directions fail loudly).

### 1.7 The directory choice for `content/profile.mdx` is structurally backwards (design line 37, structure.md line 14)

structure.md establishes `content/pages/about.mdx` as the convention for "standalone page content." The design puts `content/profile.mdx` at `content/` root because the Velite collection is `single: true` with `pattern: "profile.mdx"` — and "filename collision with `content/pages/profile.mdx` is avoided by structural choice."

This argument is backwards: there is NO collision with `content/pages/profile.mdx`, because the existing `pages` collection's `pattern: "pages/*.mdx"` (velite.config.ts:13) matches files *inside* `content/pages/`, not at root. If `profile.mdx` lived at `content/pages/profile.mdx`, it would be picked up by the existing `pages` collection — at which point a separate `profile` single-doc collection is unnecessary, the file appears as a regular `Page` document with the existing schema, and the contact-section composition lives in `/profile/page.tsx` reading `siteConfig.links` (which it does anyway).

If the architect's intent is "richer schema fields than `pages` exposes" (`headline`, `location`, `availability`, `headshot`), THEN the choice to make a separate collection is justified — but the structural argument given (filename collision) is wrong. **The real reason should be: "richer typed frontmatter + `s.image()` on headshot + the `updatedAt` git transform require collection-level isolation from the generic `pages` schema."** Recharacterize.

A consequence of placing `content/profile.mdx` at root is that the `pattern: "profile.mdx"` glob is brittle: any *future* single-doc collection (e.g. a `now` collection following the same pattern with `pattern: "now.mdx"`) accumulates more root-level MDX files in `content/`, which is exactly the structure structure.md says to avoid (line 14: `pages/` is the bucket for standalone pages). This sets a precedent that compounds.

---

## 2. Origin/Referer check, preview deploys, and `NEXT_PUBLIC_SITE_URL`

### 2.1 Preview deploys are silently broken — confirmed against Req 3.11's env table (Top-6 risk)

Cross-reference Req 3.11's env-scoping table (requirements.md:97–100):

- **Production**: `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_TO`, `RESEND_BASE_URL`.
- **Preview**: `RESEND_API_KEY`, `RESEND_FROM=onboarding@resend.dev`, `RESEND_TO`, `RESEND_BASE_URL`.
- **Development**: documented in `.env.example`.

`NEXT_PUBLIC_SITE_URL` is *not in this table*. structure.md:106 lists it as required ("absolute URLs for RSS, OG images, sitemap"), but with one value, presumably production. The design's route handler (line 258) reads the accepted origin from `process.env.NEXT_PUBLIC_SITE_URL`:

> If `Origin` header present and mismatched → 403.

**Failure scenario**: A preview deploy at `https://matthew-field-ca-git-feat-profile-mcf.vercel.app` serves the form. User submits. Browser sends `Origin: https://matthew-field-ca-git-feat-profile-mcf.vercel.app`. Server reads `process.env.NEXT_PUBLIC_SITE_URL = 'https://matthew-field.ca'` (production value, leaked via "All Environments" or never re-scoped). Mismatch → 403. Form silently fails on every preview. Smoke test passes because the wrapper script sets `NEXT_PUBLIC_SITE_URL=http://localhost:3013` (design line 461), exercising the localhost-origin code path only.

**This is a hidden production-only assumption.** Two correct fixes, neither in the design:

1. Make the accepted origin a *list* (production + preview wildcard + localhost), and check membership rather than equality. The Vercel preview wildcard is `https://*.vercel.app` — match by `URL(request.origin).hostname.endsWith('.vercel.app')` plus an env-list of explicitly-allowed hostnames.
2. Per-environment scope `NEXT_PUBLIC_SITE_URL` (Vercel injects the per-deploy URL via `VERCEL_URL`; the design could prefer that env var over `NEXT_PUBLIC_SITE_URL` for origin-check purposes, with a fallback to `NEXT_PUBLIC_SITE_URL` for production-canonical).

Either is ~10 lines. The design's "single origin string" (line 258) is the wrong shape. Req 3.11 enumerates the env vars but explicitly omits `NEXT_PUBLIC_SITE_URL` — the design inherits this omission and propagates the bug.

### 2.2 The smoke test does NOT verify the production CSRF defense

The wrapper exports `NEXT_PUBLIC_SITE_URL=http://localhost:3013` (design line 461). Playwright runs the form. Browser sends `Origin: http://localhost:3013`. Match → allow. **The test exercises only the localhost-origin acceptance path.** The production-origin code (which is what runs in production) is never executed in CI. If a future refactor changes `process.env.NEXT_PUBLIC_SITE_URL` lookup to (say) a hardcoded `https://matthew-field.ca`, the smoke test still passes (because localhost-origin matches whatever the code reads, by virtue of being equal to the env value the test sets). **The CSRF defense has zero CI coverage of the actual production path.**

Mitigation the design didn't propose: a Vitest-level integration test that constructs a `Request` with `Origin: 'https://attacker.example'` and `process.env.NEXT_PUBLIC_SITE_URL = 'https://matthew-field.ca'`, asserts 403. This is ~5 lines added to the route-handler unit-test suite (design line 432) and closes the gap without any Playwright complexity.

### 2.3 The both-absent fallback is a real attacker affordance — observable nowhere

Design line 504: "near-impossible from a real browser submitting the actual form." Correct for *real browsers*. Irrelevant for *attackers*, who don't use browsers. Curl, requests, fetch from a script — all can omit both Origin and Referer trivially:

```bash
curl -X POST https://matthew-field.ca/api/contact \
  -H "Content-Type: application/json" \
  --data '{"name":"a","email":"a@b.com","message":"...10+ chars..."}'
```

This passes the both-absent fallback (allow), passes the size cap (small body), passes the JSON parse, fails the honeypot check only if the bot is naive enough to fill it (this one doesn't), passes zod (valid shapes). **It reaches Resend.**

Req-NFR-Security accepts this: the layered defense (honeypot + zod + the 100/day Resend cap as a forced ceiling) is the residual mitigation. Design forwards this without comment. **Argue it's wrong to forward**: a determined attacker can drain the 100/day quota from a single curl loop in seconds, and the only signal Matthew sees is "no submissions today." The design's "near-impossible from a real browser" framing (line 504) is correct but answers the wrong question; the threat is scripted abuse, not browser abuse.

Req 3.5b explicitly forbids logging the fallback firing: "IP, user-agent, or any other request metadata in a `console.*` call would be captured by Vercel Function Logs (~1 day retention on Hobby) and become an undisclosed persistence channel in tension with Req 3.9." The design honors this. But the requirement's reasoning is over-broad: a sanitized counter (`origin_fallback_count_today`) with no IP, no UA, no body — just a daily total — is not a persistence channel of user data. It's a usage signal. The design (and Req 3.5b) declined it without enumerating that lighter alternative. **Bake-in the undetectable gap and declare it acceptable** is a defensible call only after considering and rejecting low-cost observability. The design takes the inherited acceptance as load-bearing without challenging it.

---

## 3. The Resend client, timeout, and lazy construction

### 3.1 "If available" is doing all the work in the timeout claim (Top-6 risk)

Design line 248: "passed via the Resend SDK's per-call timeout option if available; otherwise wrapped in a `Promise.race` against a 9000ms `setTimeout`."

The actual `resend` SDK (uninstalled at this repo, but checked against the published package): `Resend.emails.send()` does not accept a per-call `timeout` or `signal` option that aborts the underlying `fetch`. The SDK's internal `fetch` runs without an `AbortSignal` unless the consumer passes one — and the SDK does not expose a hook for this. **The design's "if available" branch is essentially never taken**, and the production behavior is the `Promise.race` + `setTimeout` fallback.

Consequence: `Promise.race` only abandons the *promise*. The underlying TLS socket to `api.resend.com` keeps the function alive in the Node event loop until either (a) Vercel's 10s function cap fires SIGTERM, or (b) the socket closes naturally. Vercel's cap fires first → 504 (not 503), no `Retry-After: 60` header, no structured JSON body. **The Req 3.8 contract ("503 + Retry-After: 60") is unreachable in practice.** The user sees a Vercel-formatted 504 (which the client treats as `server-error` per Req 4.4 — survives, but loses the 503-specific UX of "try again in a minute").

Correct shape: construct an `AbortController`, pass `controller.signal` into the fetch (requires patching the SDK or, more practically, using `fetch('https://api.resend.com/emails', ...)` directly with `signal`). At 9000ms, `controller.abort()`. Now the underlying socket actually closes and the catch path runs within the function's remaining ~1s budget.

The design should EITHER mandate this pattern, OR remove the 503 + `Retry-After` claim and document that Resend timeouts surface as Vercel 504 instead. The current "if available" hedge is the worst of both: it claims a contract it cannot guarantee.

### 3.2 Per-call client construction is a defensible CHOICE the design hasn't justified

Design line 244: "constructed *inside* this function on each call (Req 3.11)."

Req 3.11's stated motivation: "freezes `RESEND_BASE_URL` at first import, after which any later env change ... is silently ignored." This is correct for the test scenario where the wrapper exports env after Next.js boots. But within a *single function invocation*, env is stable. Constructing a new SDK client on every call costs ~1–2ms of constructor work (allocating internal state, parsing the API key) — trivial in absolute terms but not zero on cold-start where every ms matters.

A correctness-preserving cache that satisfies Req 3.11:

```ts
let cached: Resend | null = null;
let cachedKey: string | null = null;
let cachedBaseUrl: string | undefined;

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY!;
  const baseUrl = process.env.RESEND_BASE_URL;
  if (cached && cachedKey === key && cachedBaseUrl === baseUrl) return cached;
  cached = new Resend(key, baseUrl ? { baseUrl } : undefined);
  cachedKey = key;
  cachedBaseUrl = baseUrl;
  return cached;
}
```

This rebuilds when env changes (satisfies Req 3.11), reuses across calls within a single warm-invocation window. The design's blanket "lazy per-call" is a simplification that pays a small cold-start tax to dodge a 5-line cache. Fair tradeoff to call out, but the design didn't enumerate it.

### 3.3 CRLF in the `text` body is correctly identified as not a header-injection vector

Design line 38 of the prompt asks whether CRLF in `text` matters. **It does not.** `text` is the body of the multipart MIME message; embedded CRLF becomes a visible line break in webmail rendering, but does NOT inject SMTP/MIME headers because the MIME parser has already consumed the boundary by the time it reads the body. The design's "CRLF risk closed at `reply_to`, not at `text`" (Req 3.5e note) is correct. Move on.

The actual residual is *cosmetic* — an attacker can craft `name: "Matt\r\nFrom: ceo@bigcorp.com"` and the rendered text in Matthew's webmail might read like a forwarded message with a spoofed From line. Not a security vector but a minor social-engineering one. Acceptable to not address.

---

## 4. Playwright wrapper, mock-Resend ordering, parallel-worker isolation

### 4.1 The fork-time env capture point is correct, but the design doesn't verify Playwright's `webServer.env` inheritance

Node's `process.env`-to-child semantics: when you `child_process.spawn(cmd, args, options)`, the child inherits `options.env` (defaults to `process.env`). If the wrapper sets `process.env.RESEND_API_KEY = 'test-key'` and then spawns Playwright via `spawn('pnpm', ['exec', 'playwright', 'test', ...])`, Playwright inherits the wrapper's full env. Playwright's `webServer.command` is then spawned by Playwright's own code, and Playwright's `webServer.env` defaults to `process.env` (Playwright's own process env, which now includes `RESEND_API_KEY=test-key`).

Inspecting the existing `e2e/playwright.config.ts`: there is no `webServer.env` field set (lines 22–28), so the inheritance chain works by default. Confirmed correct.

But the design doesn't say this explicitly. An implementer who later adds `webServer: { ..., env: { PORT: 3013 } }` (a common pattern when wanting to be explicit about env) would *break the chain* — `webServer.env` replaces inheritance rather than merging unless explicitly set to `{ ...process.env, PORT: 3013 }`. The design should pin: "DO NOT set `webServer.env` to a literal object without spreading `process.env` into it; doing so silently strips `RESEND_BASE_URL` and reverts to the production Resend URL."

### 4.2 Mock ready-signal mechanism is unspecified

Design line 459: "Wait for ready signal (the mock writes `READY` to stdout once listening)."

Three plausible implementations, with very different failure modes:

- **stdout pipe-read with `data` events**: standard pattern. `child.stdout.on('data', chunk => { if (chunk.toString().includes('READY')) resolve() })`. Works iff stdout is `pipe`'d (not `inherit`'d) and the mock flushes the line synchronously after `listen()` resolves.
- **Port poll**: `setTimeout` loop attempting `net.connect(port)`. Robust but slow (10–50ms latency). The design says "READY signal," not "port poll," so this is not what's described.
- **stdout `read()` synchronously**: doesn't work; stdout is async.

The design picks option (1) by description but doesn't state the mechanism. This is a scope-of-the-Implementation-Tasks decision, not Design — but the *race window* between mock-spawn and READY-signal is real: if Playwright's `webServer.command` spawns `pnpm start` *before* the mock is listening, the first form submission's `RESEND_BASE_URL` request gets `ECONNREFUSED`. The wrapper's strict ordering (step 2 wait for READY, step 5 spawn Playwright per design line 459–462) avoids this — but only if the wait is implemented correctly. **A pin on the mechanism (and a 5s timeout on the wait) is appropriate at design time.**

### 4.3 `test.describe.configure({ mode: 'serial' })` is insufficient given `fullyParallel: true` (Top-6 risk)

`e2e/playwright.config.ts:8` sets `fullyParallel: true`. Playwright's `serial` mode only serializes within a single test file. Cross-file isolation requires `fullyParallel: false` at the project level OR test files in different "projects."

Concrete failure scenario: `e2e/tests/contact-form.test.ts` and `e2e/tests/contact-csp-axe.test.ts` (per design line 480). Both files submit the form. With `fullyParallel: true`, two workers run them concurrently. Worker A (`contact-form.test.ts`) is in `beforeEach` resetting the mock (`POST /__reset`); worker B (`contact-csp-axe.test.ts`) is mid-submission and just POSTed an email to `/emails`. The reset zeros B's recording. Worker A then submits and asserts `calls.length === 1` — passes (its own call recorded). Worker B's later assertion against its own submission now sees its email plus A's submission, or zero if B's flow happens to call `__reset` before its own assertion — depends on timing. **Flaky test.**

Mitigation options the design didn't enumerate:

1. Set `fullyParallel: false` for the contact-test project specifically (Playwright supports per-project parallel control, but this requires an explicit `projects:` entry).
2. Make the mock multi-tenant: each test sends a unique `X-Test-Id` header, and `GET /__state?testId=xxx` returns only matching calls. Eliminates cross-test interference structurally.
3. Run the contact tests in a separate Playwright project ID and run that project sequentially via `--project=contact-serial`.

The design's "serial within file" is a partial mitigation that fails as soon as a second file touches the same mock. Req 3.13's serialization clause ("tests SHALL serialize within the same worker if cross-test mock state is unavoidable") is a per-file scope; the design inherits that scope and propagates the cross-file gap.

### 4.4 Retries within a serial block

CI's `retries: 2`. A serial test fails, retries. Retry runs `beforeEach` (mock reset). Good in isolation. But a *parallel* worker on a *different file* (CSP-axe) is mid-submission during the retry's reset. Same race as §4.3.

### 4.5 Wrapper crash-safety: orphaned mock processes leak in CI

If Playwright crashes (segfault, OOM, runner killed), the wrapper's `process.kill(mockPid)` doesn't run. The mock survives until the CI runner is recycled. **In Vercel/GitHub-hosted runners this is moot** — the runner is destroyed at end-of-job. **In self-hosted runners or local-developer machines** it matters: the next `pnpm test:e2e` allocates a *new* ephemeral port (`net.createServer().listen(0)` returns OS-assigned), so port collisions don't break the next run; only the orphaned process accumulates until reboot. Acceptable residual; design should at minimum call out "process.on('SIGTERM') and 'SIGINT') to kill the mock" so Ctrl-C cleans up locally.

### 4.6 `.env.local` shadowing concern (briefly)

Next.js loads `.env*.local` automatically when `pnpm start` runs. Order: shell env > `.env.development.local` > `.env.local`. The wrapper's `process.env.RESEND_API_KEY = 'test-key'` is shell-level by virtue of being set in the parent process before fork, so it should win. **But** if a developer's `.env.local` has `RESEND_API_KEY=re_real_key`, that file IS read by Next.js — which only fills in vars not already set. Since the wrapper set it first, fine. **The actual hazard is `RESEND_TO`**: if the developer never sets `RESEND_TO` in `.env.local` BUT the wrapper sets `RESEND_TO=test@example.com`, this works. But if the wrapper *forgets* to set `RESEND_TO` and the developer's `.env.local` has `RESEND_TO=fieldm58@gmail.com`, real emails could be sent to the developer's actual inbox during local CI runs (because the Resend SDK is being redirected to the mock via `RESEND_BASE_URL`, so the mock receives the request — no real email sent). So this is OK in practice because `RESEND_BASE_URL` is the chokepoint.

But: what if the `RESEND_BASE_URL` set by the wrapper somehow doesn't reach `pnpm start`? Now `pnpm start` reads `.env.local`'s `RESEND_API_KEY` (real key) and the SDK's default base URL (`api.resend.com`) and sends real email. **This is the worst-case failure mode**, and the wrapper's correctness is the only defense. The design doesn't propose a sanity check at handler-start: "if `RESEND_API_KEY === 'test-key'` AND `RESEND_BASE_URL` is unset, throw." A cheap fail-fast guard that rules out the mistake.

---

## 5. Form-state machine and accessibility correctness

### 5.1 `useEffect` keyed on `state.kind` does not retrigger on same-kind transitions (Top-6 risk)

Design line 181: "side effects ... run in a `useEffect` keyed on `state.kind` so they fire exactly once per transition."

React's dependency-array semantics: `useEffect(() => { ... }, [state.kind])` re-runs ONLY when `Object.is(prev, next)` is false. For `'validation-error' → 'validation-error'` (same kind, different `errors` object), `Object.is` returns true → effect does NOT re-run.

**Concrete failure scenario**: User submits with empty `name` and empty `email`. Validation-error state with `{ errors: { name: 'required', email: 'required' } }`. Effect fires, focus moves to `#name` (first invalid). User fills `name`, clears `email`, hits submit. Validation-error state again with `{ errors: { email: 'required' } }`. **Effect does NOT fire.** Focus stays on `#name` — but `#name` is now valid, and the actual first-invalid is `#email`. User is stranded on a focused valid field with no audible/visual cue that `#email` is the new failure.

Fix: key the effect on a value that changes per submission attempt. Options:

- `useEffect(() => { ... }, [state])` — depends on object identity; new state object each transition.
- `useEffect(() => { ... }, [state.kind, JSON.stringify('errors' in state ? state.errors : null)])` — string-equality on errors content.
- Or: dispatch via a separate `submissionAttemptId` counter that increments on every submit handler call, used as the effect dependency.

The design's "exactly once per transition" claim is wrong for same-kind-to-same-kind transitions. **This is a real a11y bug** — focus doesn't follow the invalid field for repeat submissions. The unit-test surface that would catch this is jsdom DOM tests (which the design declined, design line 434, "fragile to assert in jsdom"); the Playwright smoke covers happy-path only. **Closes a regression class with no test coverage.**

### 5.2 Focus race during Enter-from-input submit

Concrete sequence:
1. User has focus on `#email` input, presses Enter.
2. React handler `onSubmit` fires synchronously, calls `setState({ kind: 'submitting' })`, queues re-render.
3. Browser dispatches the form-submit event; React's commit phase runs.
4. Re-render mounts the disabled submit button, demounts/keeps the email input.
5. `useEffect` fires (post-commit) — but during `'submitting'` state there is no focus management defined.

Actual question: what does focus do during `submitting`? The design doesn't say. The submit button gets `disabled={state.kind === 'submitting'}`. Disabled buttons in Chrome blur on disable; focus moves to `<body>`. Screen reader: announces nothing useful. The user is in limbo with no anchor.

Fix the design didn't propose: on `idle → submitting`, move focus to the form's "Sending…" indicator (a `<p role="status" tabIndex={-1}>Sending your message…</p>` adjacent to the button). Or — better — use `aria-disabled="true"` on the button instead of `disabled`, which keeps focus AND prevents clicks (with a `if (state.kind === 'submitting') return;` guard in the handler). The design's `<button disabled>` (line 233) is ARIA-correct but focus-incorrect.

### 5.3 Multiple live-regions, transition cleanup

Design line 234: per-field `aria-live="polite"`, top-level `role="alert"` (validation summary), and `role="status"` (success / server-error). When transitioning validation-error → submitting → success:
- React unmounts the `role="alert"` summary on entering `submitting`.
- React mounts the `role="status"` success region on entering `success`.
- VoiceOver, JAWS, and NVDA handle remount differently:
  - **NVDA**: aggressive — re-announces the new region's content.
  - **JAWS**: usually announces.
  - **VoiceOver**: depends on focus; if focus is on the heading inside the new region (`<h2 tabIndex={-1}>`), the focus-move triggers the announcement, the live-region attribute is redundant.

Stale-region cleanup is React's job (unmount). No bug. Cross-screen-reader behavior is the testing gap — Playwright's axe-core run asserts *static* a11y, not *dynamic* announcement behavior. **Acceptable residual** because dynamic announcement testing is impractical in CI.

### 5.4 Honeypot `display: none` on container — confirmed safe

The prompt asks whether `display: none` on a container removes the input from form submission. **It does not.** HTML form serialization walks the form's element tree by name, regardless of CSS. `display: none` on a parent does NOT remove descendants from `FormData`. The honeypot input is still serialized with `name=url_secondary` and an empty value. Confirmed correct; design is fine here.

### 5.5 Focus-restoration vs value-clearing on success

Design line 176: "Inputs cleared. Focus moved to the success `<h2 tabIndex={-1}>`."

Both happen as a result of the same `setState({ kind: 'success' })` call. React batches, commits both DOM changes synchronously, then runs `useEffect`. No race — by the time the effect fires, the inputs are already cleared and the success heading is mounted. Focus moves cleanly. Correct.

---

## 6. CSP, `form-action`, and the test that "doesn't actively exercise" it

### 6.1 `form-action 'self'` is correctly characterized as cross-origin protection, NOT regression-protection

Design line 540 / Req-NFR-Security: "defense-in-depth against a future regression to native `<form>` submission."

This framing is wrong. `form-action 'self'` blocks native `<form action="https://attacker.example/...">` cross-origin submissions. It does NOT block native `<form action="/api/contact">` same-origin submissions. **A future regression where the JS handler is removed and the form becomes `<form method="POST" action="/api/contact">` will pass the `form-action 'self'` check** (same origin) AND will pass the smoke test's "no CSP violations" assertion (because there isn't one).

So the directive's actual value is:
- Blocks cross-origin native form exfiltration (someone injects a `<form action="https://evil/">` via XSS — which inline-injection requires a separate CSP weakness anyway).
- Provides no protection against a regression to same-origin native submission.

**Recharacterize**: `form-action 'self'` is *cross-origin defense-in-depth in a hypothetical XSS-injection scenario*, not a regression detector for the JS-vs-native submission distinction. The design's framing oversells what the directive buys. Keep the directive (it's free), but document its actual value.

The smoke test's pass-1 (Report-Only) asserts zero violations. If a regression to native same-origin submission occurs, Report-Only mode would *also* show zero violations — same-origin native submission is allowed by `form-action 'self'`. **The CSP test does not detect this regression class.** A separate test that asserts the form's submit handler calls `event.preventDefault()` (or that the form has no `action` attribute) would close this gap. The design doesn't add such a test.

### 6.2 `addInitScript` runs before inline scripts — confirmed

Playwright's `addInitScript` injects code that runs before any other script in the page (including inline hydration scripts). The design's claim is correct against Playwright's documented behavior. The CSP-violation listener attached via `addInitScript` will catch hydration-time violations.

### 6.3 `setExtraHTTPHeaders` sets the CSP on every request, including subresources — production semantics divergence

Design line 485: pass-2 uses `page.setExtraHTTPHeaders({ 'Content-Security-Policy': '<production CSP value>' })`.

Production behavior (from `next.config.ts`): CSP is path-scoped via `headers: async () => [{ source: '/((?!playground...).*)', headers: [...] }]`. So Vercel sends the CSP only on responses for non-`/playground/*` paths.

Playwright's `setExtraHTTPHeaders` adds the header to every *request* (not response) — but in two different ways depending on the override location. Specifically, `setExtraHTTPHeaders` adds the header to outgoing requests; the *response* still carries Vercel's CSP. So in pass-2 the page receives:
- The Vercel response's `Content-Security-Policy` header (production directives).
- The Playwright-injected request header (named `Content-Security-Policy` — but request-side CSP is not a defined directive; browsers ignore the request header).

**Wait — this is the bug.** `Content-Security-Policy` as an HTTP *request* header is non-standard and ignored by browsers. The design's pass-2 enforcement is a no-op: the browser only honors response-side CSP, and that is what Vercel already sends in production. Pass-2 is therefore *redundant with pass-1's enforcing variant* (if pass-1 also relies on Vercel-served CSP) OR *broken* (if the design author thought `setExtraHTTPHeaders` injects response headers).

Re-read design line 485: "via `page.setExtraHTTPHeaders` injecting enforcing CSP." This is incorrect mechanism. Playwright cannot inject response headers from the test harness; it can intercept and rewrite responses via `page.route(...)`. **The correct mechanism for pass-2 is `page.route('**', route => route.continue({ responseHeaders: [...injected enforcing CSP...] }))`** — which is more involved.

Alternatively, the test could rely on Vercel's already-served CSP (which is enforcing in production) and skip the Report-Only pass entirely. The two-pass design as written has a structural flaw.

### 6.4 `next-themes` storage key — likely correct, worth pinning

The default `next-themes` storage key is `'theme'`. The design's `localStorage.setItem('theme', theme)` works iff the existing `<ThemeProvider>` doesn't override `storageKey`. From the existing layout/provider directory listing (`src/components/layout/`), there's a `theme-provider.tsx`. The design should specify reading the `storageKey` value from there to avoid drift, OR the test should set the key by calling the same constant.

If the existing provider uses `'next-themes'` (an older convention) or a custom key like `'matthew-theme'`, the test silently does nothing (sets a key that the app ignores) and runs in default light theme for both passes. **The dark-theme axe pass becomes a duplicate light-theme axe pass.** No test failure, no signal. Pin the key.

---

## 7. Deferred risks promoted to deferred-still

### 7.1 Edge-middleware was a design-level option that was not enumerated

Req-NFR-Security explicitly notes the 100K-invocation/month DoS counts ALL invocations, including rejected ones. The design's pipeline puts the size cap first inside the route handler — but the route handler invocation has *already happened* by the time the size cap runs.

Vercel's edge middleware (Next.js `middleware.ts`) runs at the edge before the function invocation. It can:
- Reject oversize bodies via `Content-Length` header (cheap, no body read).
- Reject Origin/Referer mismatches (header inspection only).
- Forward to the route handler only if the request passes both checks.

Edge middleware *does* count against Vercel's edge-request quota (1M/month on Hobby), but NOT against the function-invocation quota (100K/month). For a 1-req/sec spray attack, edge middleware would absorb the rejections at 86,400/day and shed them before they consume function quota. The funnel survives.

**The design should have enumerated and either adopted or explicitly rejected edge middleware.** Adopting it is ~30 lines of `middleware.ts`. Rejecting it on grounds of complexity / staying-on-Hobby-tier is fine, but the rejection should be explicit. The design's "deferred to follow-up spec" is the wrong scope decision — the cost is small enough that a launch-time mitigation is appropriate.

### 7.2 IDN email validation — alternatives exist with low cost

zod's `.email()` regex rejects non-ASCII local parts. Alternatives:

- `z.string().refine(s => /^[^\s@]+@[^\s@]+$/.test(s) && s.length <= 254)` — permissive, rejects only obvious garbage; lets IDN through. Server-side `reply_to` accepts the value as-is (Resend handles IDN delivery downstream).
- `email-validator` npm package (~5 KB unpacked) supports IDN.
- Custom regex against RFC 6531 (SMTPUTF8) — ~20 lines.

The design accepts the limitation by inheritance (Req 3.5d). The cost of a permissive regex is essentially zero (one fewer dependency on zod's email check). **Argue: the inheritance is load-bearing in design only because the architect didn't open the alternatives**; the actual cost-benefit favors a permissive validator given the threat model (form is bot-protected; IDN-spam is rare; rejecting legitimate IDN users is a worse outcome than accepting one extra IDN spammer).

### 7.3 30s client AbortController vs 10s server cap

Design line 235: "a per-call `AbortController` set to a generous 30s ceiling so a user does not stay locked in `submitting` indefinitely on a hung connection."

The server's function cap is 10s (Vercel Hobby). On a normal hang, the server emits 504 at 10s — the client's `fetch()` resolves with the 504 response, transitions to server-error. **The 30s client ceiling is only reached if the server's 504 itself fails to ship** — which is a network-level failure mode (TCP RST, connection drop after request started, no response at all). At 30s the client aborts and transitions to server-error with `status: 'network'` (per the form-state machine).

This is correct. But: **the user has been staring at "Sending…" for 30 seconds.** That's a UX disaster on its own — most users will hit back/refresh by ~5 seconds. The design doesn't propose a copy update ("This is taking longer than usual…") at, say, 8 seconds. Or a more aggressive 12s ceiling that's slightly above the server cap but below human patience.

Req 4.4 says "client SHALL NOT auto-retry; the user initiates any retry." A 30s abort isn't a retry, but it IS silent abandonment 20 seconds after the user lost interest. The "1s error response budget" framing in Req-NFR-Reliability implies the user-facing latency ceiling is ~10s; the 30s client ceiling is 3× that with no documented justification. **Argue: 12s ceiling is correct**; 30s is over-defensive for a fetch path that has a 10s server cap.

---

## 8. Steering and structure conformance gaps

### 8.1 `scripts/` is a new top-level directory not in structure.md

structure.md's directory tree (lines 5–110) does not mention `scripts/`. The design adds it for `scripts/run-e2e.mjs`. The design self-acknowledges this as "thin operational glue" (line 34) but does not propose updating structure.md.

**The structure.md gap is itself a finding.** structure.md is supposed to be the SSOT for project structure (per its own framing). Adding a top-level directory without updating the SSOT propagates documentation drift. The design should include "update structure.md to add `scripts/` with a description" as part of the implementation scope.

### 8.2 `vercel.json` likewise

Same issue. Single-file deployment config; not in structure.md's tree. Update structure.md.

### 8.3 `src/lib/mail.ts` path matches structure.md:71 — confirmed

The design adds nothing else to `src/lib/`. The `TimeoutError` class (referenced at design line 248) is colocated in `mail.ts` — fine for a single-use exception type, structure.md doesn't require its own file.

### 8.4 "Push 'use client' as far down as possible" — design is mostly compliant

`<ContactForm />` is a single client component; pushing further down would split the form into per-field client components, which is over-engineering. The success heading and LinkedIn CTA are inside `<ContactForm />` because they're conditionally rendered based on client state. Acceptable.

`<ObfuscatedEmail />` is a `"use client"` leaf because `react-obfuscate` requires it. Compliant.

### 8.5 Filename casing — `obfuscated-email.tsx` is correct

structure.md:116 prescribes kebab-case. Design line 36: `obfuscated-email.tsx → ObfuscatedEmail`. Correct.

### 8.6 Velite `single: true` emits a singular object — confirmed

Per Velite v0.3.x source, single-doc collections emit the parsed object directly (not an array). `import { profile } from '#site/content'` returns a single object. The design's claim (line 51, "since `single: true` emits a single object, not an array") is correct.

---

## 9. Site config extension and email plaintext

### 9.1 Email rotation residual is correctly accepted; launch-prerequisite gap is real

The design says "actual URL/email values are filled in during the implementation task; design only fixes the shape." (line 339)

This is design-correct (shape vs values is a fair separation), but **the design does not call out**: the per-address mail-provider filter that defends the alias must be in place *before the first commit lands*. GitHub Code Search indexes commits within minutes. Once `siteConfig.links.email = "hello@matthew-field.ca"` lands on `main`, that string is searchable globally; spammers get the alias before the production deploy completes.

Mitigation (~5 minutes of work, missing from the design):
- Set up the alias (`hello@matthew-field.ca` → forwarder rule + filter) at the mail provider FIRST.
- THEN commit the value.

The design's "Implementation Sequencing & Risk Notes" (line 533) lists the same-commit constraint, the DNS prerequisite, the wrapper-script-before-tests order — but **does not list the mail-filter prerequisite**. Add it.

### 9.2 Rotation: previous alias persists in git history

Design doesn't address. Acceptable residual — once `hello@matthew-field.ca` is exhausted, a `git revert` of the commit that introduced it doesn't remove it from history. Matthew rotates to `matthew@...`, the old alias keeps receiving spam to a now-unmonitored address.

A design-time mitigation: env-driven alias (`siteConfig.links.email = process.env.NEXT_PUBLIC_CONTACT_EMAIL`) — the value is in Vercel env vars, not git history. Rotation = update the env var, redeploy. **But this breaks the public-source-tree commitment** (Req 2.7 / 2.8) and adds an env-var-required-to-build constraint to a string that's structurally a config value. Tradeoff favors current design: accept the residual (rotation is rare, and `git filter-repo` is the nuclear option if it ever matters).

---

## 10. Test coverage gaps

### 10.1 Reduced-motion is declared, not verified

Design line 175: "no rotating spinner; honors `prefers-reduced-motion`." Design line 176: "scroll into view ... `behavior: prefersReducedMotion ? 'auto' : 'smooth'`."

**No test asserts this.** Playwright's `page.emulateMedia({ reducedMotion: 'reduce' })` would let a test:
- Submit the form successfully.
- Assert that `scrollIntoView` was called with `behavior: 'auto'` (or assert the scroll happened instantly via element-position timing).
- Assert no rotating animation classes are applied to the loading indicator.

Design's test files (lines 467–493) don't mention `emulateMedia`. **Reduced-motion is declared, not verified.** Confirmed gap.

### 10.2 Validation-error → server-error transition not tested

The form-state machine has 5 kinds with N×N possible transitions (N=5). The design's smoke test exercises:
- `idle → submitting → success` (per-page happy path).
- `submitting → server-error` indirectly via mock 500 (CSP-axe test).

**Not exercised**:
- `validation-error → server-error` (user fixes fields, server returns 502).
- `server-error → submitting → success` (retry succeeds).
- `validation-error → validation-error` (the same-kind transition that exposes the §5.1 focus bug).

The route-handler unit tests cover each branch in isolation but don't compose transitions. The Playwright smoke covers the happy path. **The transition graph is undertested.**

### 10.3 Honeypot path covered at unit level — confirmed

Design line 432: "populated honeypot → 200 + `sendContactEmail` NOT called." Vitest covers this via `vi.mock('@/lib/mail', ...)` and asserts the mock is not called. Good. The Playwright smoke does NOT cover this (only happy-path), which is fine because the unit test is the right layer for "the route handler's pipeline branches correctly."

### 10.4 503 + `Retry-After: 60` header — partially covered

Design line 432: route-handler unit tests cover "the 9-second Resend timeout fires 503." The header assertion is not explicitly mentioned. The design should pin: "`Retry-After: 60` header asserted alongside the 503 status." One-line addition. **Without it, a regression that returns 503 with no header fails Req 3.8 silently.**

Tied to §3.1's broader concern: the 503 + `Retry-After: 60` contract is unreachable in production if the SDK's timeout doesn't actually abort. The unit test's mocked SDK can produce the 503 + header response; production cannot. **Test passes, production fails.** This is a Top-3 design-conclusion-to-challenge.

### 10.5 Origin-check production path not covered

§2.2 above. The smoke test only exercises localhost-origin. A unit test asserting `Request` with foreign Origin → 403 is missing. The design's unit-test list (line 432) lists "mismatched Origin → 403" — actually this IS covered. Good. Re-reading line 432: "oversize body → 413; mismatched Origin → 403; ...". So the route-handler unit test does cover it. The gap is that the production-origin *value* isn't fixed in the test (it's whatever `process.env.NEXT_PUBLIC_SITE_URL` is at test time). If the env isn't explicitly set in the test, the assertion is meaningless. **Pin: the unit test sets `process.env.NEXT_PUBLIC_SITE_URL = 'https://matthew-field.ca'` and constructs requests with `Origin: 'https://attacker.example'` to exercise the production-origin code path.**

---

## Closing Deliverables

### Top 6 risks/gaps (likelihood × blast radius)

1. **Preview-deploy origin-check 403 silent failure** (§2.1, §2.2). Vercel preview deploys at `*.vercel.app` send `Origin: https://abc.vercel.app`; route handler reads `process.env.NEXT_PUBLIC_SITE_URL = 'https://matthew-field.ca'` (production value, leaked or never re-scoped because Req 3.11's env table doesn't include `NEXT_PUBLIC_SITE_URL`); mismatch → 403; every preview submission silently fails. Smoke test passes because the wrapper sets `NEXT_PUBLIC_SITE_URL=http://localhost:3013`, exercising the localhost-origin code path only. Production-origin code has zero CI coverage. *Likelihood: certain on first preview deploy.* *Blast radius: the entire pre-merge QA process is broken — Matthew sees 403s, debugs the form, doesn't notice it's only the env scoping.*

2. **Resend SDK timeout `Promise.race` does not abort the underlying socket; 503 + `Retry-After: 60` contract is unreachable** (§3.1, §10.4). The Resend SDK does not expose a per-call timeout that aborts the in-flight HTTPS request. `Promise.race` against `setTimeout(9000)` only abandons the outer promise; the socket stays alive until Vercel's 10s function cap fires SIGTERM and emits 504. Req 3.8's structured "503 + `Retry-After: 60`" response is never produced in production; the user sees a Vercel-formatted 504. The unit test exercises the timeout path with a mocked SDK that DOES produce a clean rejection at 9s, so the test passes — production fails. *Likelihood: any time Resend is slow or the request times out.* *Blast radius: degraded UX during any Resend partial outage; worse, the design's confidence in the timeout contract is misplaced and propagates to the spec.*

3. **Cross-file Playwright test races against the single-instance mock-Resend server** (§4.3). `e2e/playwright.config.ts:8` sets `fullyParallel: true`; the design's `mode: 'serial'` only serializes within a file. With two files (`contact-form.test.ts` and `contact-csp-axe.test.ts`) submitting the form, parallel workers race on the shared mock's `__reset` / `/emails` / `__state` endpoints. Test A's `beforeEach` resets the mock while Test B is mid-submission; assertions become non-deterministic, surfacing as flaky CI failures (low signal-to-noise — Matthew assumes "transient" and re-runs). *Likelihood: every CI run that schedules the two tests on different workers.* *Blast radius: blocking-CI flake until disambiguated; team trust in the smoke test erodes.*

4. **`useEffect` keyed on `state.kind` does not retrigger on validation-error → validation-error transitions** (§5.1). Repeat submissions with different invalid-field combinations leave focus stranded on the first attempt's `first-invalid` field, which is now valid. Screen-reader and keyboard users have no cue that focus is wrong. The design's "exactly once per transition" claim is incorrect for same-kind transitions; the unit-test coverage is jsdom-based, which the design declined as "fragile" — there is no test for this. *Likelihood: every multi-field validation cycle.* *Blast radius: a11y regression that fails Req 4.3(d) "move focus to the first invalid field" on retry; visible only to users actually relying on focus management.*

5. **`git log -1 -- path` without `--follow` returns stale data after file rename** (§1.3, §1.7). The design picks `content/profile.mdx` at root, where structure.md says single-doc page content lives under `content/pages/`. Any future rename or move (e.g. relocating to `content/pages/profile.mdx` to align with site-foundation) silently emits the wrong `updatedAt` until 1000+ commits accumulate — the `if (!out)` guard catches empty output, not wrong-non-empty output. *Likelihood: high if Matthew restructures `content/` (Req 1.4 contemplates rename scenarios).* *Blast radius: silently wrong "last updated" on the live profile page; recruiters see a date that's ~3 months stale, undermining the freshness signal.*

6. **`form-action 'self'` mischaracterized; `setExtraHTTPHeaders` two-pass enforcement is mechanism-broken** (§6.1, §6.3). The directive is sold as "regression-protection against native form submission"; it actually only blocks cross-origin submission. Same-origin native submission regression is undetected by the smoke test. Pass-2's `page.setExtraHTTPHeaders` injects the CSP as a *request* header, which browsers ignore — the test relies on Vercel's already-served response CSP, making pass-2 redundant with pass-1's enforcing variant or simply broken. *Likelihood: regression-protection claim never tested in practice.* *Blast radius: false confidence in CSP coverage; a future revert to `<form action="/api/contact">` ships unnoticed.*

### Top 3 design conclusions to challenge or reverse

1. **Reverse: "Single-string accepted origin" → "list of accepted origins, including Vercel preview wildcard"**.
   Quote: design line 258 — "The accepted origin is `process.env.NEXT_PUBLIC_SITE_URL` (which is already required by the project per `.env.example`)."
   Alternative dismissed/not-considered: a per-environment origin list or a hostname-suffix match (e.g. accept any `*.vercel.app` plus the production domain plus `localhost`). Reversal reasoning: a single-string check on Vercel inherently breaks preview deploys, as Req 3.11 doesn't scope `NEXT_PUBLIC_SITE_URL` per environment. Either widen the check to a list, or use Vercel's own `VERCEL_URL` env var (which Vercel injects per-deploy) for the origin source-of-truth, with `NEXT_PUBLIC_SITE_URL` as a production override. Cost: ~10 lines. Benefit: previews actually work.

2. **Reverse: "`Promise.race` + `setTimeout(9000)` is sufficient for the Resend timeout contract" → "Use `AbortController` + direct `fetch` (or SDK's signal option) so the underlying socket is actually closed at 9s"**.
   Quote: design line 248 — "passed via the Resend SDK's per-call timeout option if available; otherwise wrapped in a `Promise.race` against a 9000ms `setTimeout`."
   Alternative dismissed: explicit `AbortController` ownership. Reversal reasoning: the SDK does not expose a timeout option that aborts the socket. `Promise.race` only resolves the outer promise — the function continues to consume runtime against the 10s cap, the catch path's "503 + `Retry-After: 60`" budget is illusory, and Vercel emits 504 instead. Either: bypass the SDK and call `fetch('https://api.resend.com/emails', { signal })` directly, OR document that the 503 contract is best-effort and the 504 fallback is the actual production behavior. The design's "if available" hedge papers over a contract it cannot guarantee.

3. **Reverse: "Per-call `getResendClient()` construction" → "Cache the client by env-tuple, rebuild only when env changes"**.
   Quote: design line 244 — "constructed *inside* this function on each call (Req 3.11), reading `RESEND_API_KEY` and `RESEND_BASE_URL` from `process.env`. No module-top instantiation."
   Alternative dismissed: a 5-line memoization keyed on `(RESEND_API_KEY, RESEND_BASE_URL)`. Reversal reasoning: Req 3.11's motivation is "env can change after first import" (specifically: the test wrapper sets `RESEND_BASE_URL` after Next.js boots). A cache keyed on env values rebuilds when they change AND avoids per-call construction overhead during a warm invocation window. Both correctness and cost are improved. The blanket "lazy per-call" is a design-level oversimplification that pays a small cold-start tax to dodge a tiny cache.

### What's missing — work needed before the design is acted upon

- **Per-environment scoping for `NEXT_PUBLIC_SITE_URL`** (or a list-based accepted-origins check that includes Vercel preview hosts). Without this, preview deploys silently 403 every form submission. Section 2.1.

- **Resend timeout via real `AbortController`** (or explicit acceptance that 503 is unreachable and 504 is the production behavior). The design should not claim a contract it cannot guarantee. Section 3.1.

- **Edge-middleware enumeration**: the 100K-invocation/month DoS is the spec's largest known residual. The design forwards it without enumerating Vercel edge middleware as the launch-time mitigation. At minimum, a "considered-and-rejected" with reasoning. Section 7.1.

- **Cross-file Playwright isolation strategy**: `mode: 'serial'` only serializes within a file. The design's contact-form and CSP-axe tests both exercise the form against a single shared mock-Resend instance with `fullyParallel: true`. Either (a) make the mock multi-tenant via test-id headers, (b) put both tests in the same file, or (c) move both into a separate Playwright project with `fullyParallel: false`. Section 4.3.

- **`useEffect` dependency fix**: key the effect on `state` (object identity) or on a per-attempt counter, not on `state.kind`. The current pattern fails for same-kind transitions and creates a focus-management a11y regression with no test coverage. Section 5.1.

- **`form-action` test that asserts the JS preventDefault path holds**: a Playwright assertion that the form's submit handler calls `event.preventDefault()` (or that the form has no `action` attribute) closes the regression class that `form-action 'self'` itself does not detect. The CSP smoke test as designed is structurally incapable of catching same-origin native-submit regressions. Section 6.1.

- **CSP test pass-2 mechanism fix**: `setExtraHTTPHeaders` injects request headers, which browsers ignore for CSP enforcement. Either rewrite via `page.route` to inject response headers, or drop pass-2 as redundant with Vercel's already-enforcing production CSP. Section 6.3.

- **`git log` rename robustness**: add `--follow` to the transform's git invocation. Without it, any future rename of `content/profile.mdx` produces silently wrong `updatedAt` until 1000+ commits accumulate. Cheap fix; design declined to enumerate. Section 1.3.

- **`execSync` → `execFileSync`** in the Velite transform. Removes the shell from the codepath entirely; eliminates the (small but real) shell-injection surface in build-time code. One-line refactor. Section 1.2.

- **Local-build dirty-file fallback to `mtime`**: 4 extra lines in the transform; eliminates the "stale dates locally" footgun. Design treats this as acceptable residual; the fix is so cheap it isn't. Section 1.5.

- **Email rotation / launch-prerequisite documentation**: per-address mail-provider filter must be in place *before* the first commit lands (GitHub Code Search indexes within minutes). Add to "Implementation Sequencing & Risk Notes" alongside the DNS prerequisite. Section 9.1.

- **Reduced-motion verification in Playwright** via `page.emulateMedia({ reducedMotion: 'reduce' })`. Currently declared, not verified. Section 10.1.

- **`Retry-After: 60` header assertion in Vitest** alongside the 503 status assertion. One-line addition; closes the silent-regression class for Req 3.8. Section 10.4.

- **Sanity guard at handler-start for test-key leakage**: if `RESEND_API_KEY === 'test-key'` AND `RESEND_BASE_URL` is unset, throw at the top of `getResendClient()`. Cheap fail-fast that rules out the worst-case "real Resend gets test traffic" footgun. Section 4.6.

- **structure.md updates** for `scripts/` and `vercel.json` (new top-level entries). Documentation-drift mitigation. Section 8.1, 8.2.

- **Recharacterize `form-action 'self'`** in the spec text from "regression-protection against native submission" to "cross-origin defense-in-depth in an XSS-injection scenario." Keep the directive (free); fix the framing. Section 6.1.

- **`next-themes` storage key pinning**: read the actual `storageKey` from the existing `<ThemeProvider>` rather than assuming `'theme'`; otherwise the dark-theme axe pass silently runs in light theme. Section 6.4.
