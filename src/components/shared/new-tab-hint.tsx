/**
 * Visually-hidden suffix warning that a link opens in a new tab (WCAG 3.2.5).
 * Place it inside the anchor so it becomes part of the accessible name.
 * Hidden from Pagefind so it never leaks into search excerpts.
 */
export function NewTabHint() {
  return (
    <span className="sr-only" data-pagefind-ignore="all">
      {" (opens in a new tab)"}
    </span>
  );
}
