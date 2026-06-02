"use client";

// Segment error boundary (Req 3.5). Covers render-time throws and `load`-thunk
// rejections during the same-page dynamic import — NOT post-hydration event-handler
// throws inside a client item (the item owns its runtime errors).
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-xl font-semibold">This experiment failed to load.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Something went wrong while rendering this playground item.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm"
      >
        Try again
      </button>
    </div>
  );
}
