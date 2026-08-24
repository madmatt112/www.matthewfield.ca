// Segment loading UI (server component) — covers the same-page dynamic import
// while the client item module resolves (Req 3.5).
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 text-sm text-muted-foreground">
      Loading experiment…
    </div>
  );
}
