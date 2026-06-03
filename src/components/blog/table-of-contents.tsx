import type { TocEntry } from "@/lib/blog";

type TableOfContentsProps = {
  entries: ReadonlyArray<TocEntry>;
};

// Server component. Renders a flat <ol> of TOC entries; depth-3 entries
// receive a `ml-4` indentation class (Req 7.5 v4: entries carry their depth
// as a field). Returns null when fewer than 2 entries (Req 7.9).
export function TableOfContents({ entries }: TableOfContentsProps) {
  if (entries.length < 2) return null;

  return (
    <nav aria-label="On this page" data-pagefind-ignore="all" className="table-of-contents">
      <ol className="toc-list">
        {entries.map((entry) => (
          <li
            key={entry.id}
            data-depth={entry.depth}
            className={entry.depth === 3 ? "toc-entry ml-4" : "toc-entry"}
          >
            <a href={`#${entry.id}`} className="toc-link">
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
