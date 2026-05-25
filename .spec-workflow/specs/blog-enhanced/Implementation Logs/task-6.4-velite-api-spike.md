CHOSEN_PATH: HOOK

# Task 6.4 — Velite API investigation for series-order collision

## Question

Does Velite expose a post-collection hook that fires AFTER all per-post transforms complete, against which we can run a cross-post invariant check (group by `series`, assert `seriesOrder` uniqueness within each group)?

## Findings

Yes. Velite exposes two top-level hook keys on `defineConfig`:

- `prepare?: (data: Result<T>, context: Context) => Promisable<void | false>` — fires **after all collection transforms complete**, **before writing `.velite/` to disk**. Returning `false` from this hook prevents the write entirely. Throwing inside this hook fails the build (the velite CLI exits non-zero and an error message surfaces in `pnpm build`).
- `complete?: (data: Result<T>, context: Context) => Promisable<void>` — fires **after the write to disk completes**. Suitable for side effects (telemetry, deploy hooks) but not for invariant enforcement, because by the time it runs the data has already been emitted to `.velite/`.

Source: `node_modules/velite/dist/index.d.ts:5164–5179`. The JSDoc on `prepare` explicitly states: "You can apply additional processing to the output data, such as modify them, add missing data, handle relationships, or write them to files. return false to prevent the default output to a file if you wanted." Handling "relationships" is exactly the cross-post invariant we need (relationship = "two posts in the same series must have distinct seriesOrder values").

`data: Result<T>` is shaped like `{ pages: Page[], profile: Profile, posts: Post[] }` — i.e. the same structure that downstream consumers import via `#site/content`. The `posts` array is fully transformed (slug, readingTime, bodyHtml, etc. all materialized) by the time `prepare` fires.

## Chosen path: HOOK

Rationale:

1. **Single source of truth.** The invariant lives in `velite.config.ts` next to every other build-time guard (kebab-slug enforcement, h4 rejection, fixture-slug audit). A reader looking at the file sees the full set of `posts.transform` and collection-level invariants in one place.
2. **No package.json carve-out.** The SCRIPT branch would require an exception to Task 1's "do not bump existing dependencies" + a `scripts.build` chain. The HOOK branch needs neither.
3. **Same error-surface timing as h4 rejection.** The check fails at `pnpm velite` (or whichever step invokes velite — `pnpm build` triggers it via the `postinstall`/build chain). Authors get the error before `next build` runs.
4. **Synchronous, in-process.** No subprocess, no file-system round-trip. The collision check is O(n) over posts and runs in ms.
5. **First-class API.** `prepare` is an exported, documented hook key. Using it is not exploiting an internal — it's the supported extension point Velite provides for exactly this purpose.

The SCRIPT branch's only advantage would be testability in isolation (run the verifier against any `.velite/index.js`), but the HOOK can be unit-tested by extracting the grouping/assertion function into a pure helper and calling it from both the hook and a `.test.ts`.

## Probe transcript

Read of `node_modules/velite/dist/index.d.ts`:

```
$ grep -n -B1 -A5 "prepare\|complete" node_modules/velite/dist/index.d.ts | head -60
...
5164-    /**
5165-     * Data prepare hook, before write to file
...
5171-    prepare?: (data: Result<T>, context: Context) => Promisable<void | false>;
5172-    /**
5173-     * Build success hook
...
5178-    complete?: (data: Result<T>, context: Context) => Promisable<void>;
```

No throwaway probe was needed beyond reading the published `.d.ts` (the API surface is unambiguous and matches the requirement). If Task 6.4.1's implementer needs to verify the hook actually receives the expected data shape, a temporary `console.log(Object.keys(data))` inside `prepare` and a `pnpm velite build` run will confirm the `{ pages, profile, posts }` keys.

## Implementation pin for Task 6.4.1

```ts
// in defineConfig({...})
prepare(data) {
  const bySeries = new Map<string, Array<{ slug: string; order: number }>>();
  for (const post of data.posts) {
    if (typeof post.series !== "string" || typeof post.seriesOrder !== "number") continue;
    const list = bySeries.get(post.series) ?? [];
    list.push({ slug: post.slug, order: post.seriesOrder });
    bySeries.set(post.series, list);
  }
  for (const [series, members] of bySeries) {
    const byOrder = new Map<number, string>();
    for (const { slug, order } of members) {
      if (byOrder.has(order)) {
        throw new Error(
          `[velite/posts] series '${series}' has colliding seriesOrder values: ${byOrder.get(order)} and ${slug}`,
        );
      }
      byOrder.set(order, slug);
    }
  }
}
```

Task 6.4.1 should implement this verbatim (modulo destructuring/style tweaks) inside `velite.config.ts`'s `defineConfig({...})` block. Error string is verbatim per the task's `_Prompt:` footer.
