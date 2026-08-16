"use client";

import { Search } from "lucide-react";
import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type SearchState = "closed" | "opening" | "ready" | "unavailable";

// Accept `/blog/<slug>` and `/blog/<slug>/` (with optional sub-paths) but
// exclude the bare `/blog` and `/blog/` index pages. Robust to whether the
// static export emits trailing slashes on result URLs.
const BLOG_POST_URL = /^\/blog\/[^/].*/;

/**
 * `@pagefind/default-ui` ships its base stylesheet separately from its JS, and
 * nothing was loading it — which is why the dialog rendered as a bare input, an
 * unstyled result list, and the browser's default yellow `<mark>`.
 * `src/styles/blog/pagefind-ui.css` is an override slice: it rebinds the
 * `--pagefind-ui-*` variables *this* sheet consumes, so it themes the package
 * rather than replacing it.
 *
 * Served from the index directory rather than bundled, for the same reason the
 * runtime beside it is: a stylesheet for a dialog most visitors never open has
 * no business in every page's critical CSS. `pagefind` and
 * `@pagefind/default-ui` are pinned to the same version in package.json, so the
 * emitted sheet matches the imported JS — bump them together.
 */
const PAGEFIND_UI_STYLESHEET = "/pagefind/pagefind-ui.css";

function loadPagefindStylesheet(): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector("link[data-pagefind-ui-css]")) {
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = PAGEFIND_UI_STYLESHEET;
    link.setAttribute("data-pagefind-ui-css", "");
    // Resolve on error too. An unstyled result list is worse than a styled one
    // and far better than the "unavailable" surface, so a missing stylesheet
    // must never be the thing that takes search down.
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => resolve(), { once: true });
    document.head.appendChild(link);
  });
}

export function SiteSearch() {
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<SearchState>("closed");
  const mountRef = React.useRef<HTMLDivElement | null>(null);
  // Track the live PagefindUI instance so we can destroy it on close.
  const uiInstanceRef = React.useRef<{ destroy?: () => void } | null>(null);

  // Global keyboard shortcuts: `/` (scoped) and Cmd/Ctrl+K (always).
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K always opens
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      // `/` opens unless typing or dialog already open or modifiers held
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (open) return;
        const target = e.target as HTMLElement | null;
        if (target?.isContentEditable) return;
        const tag = target?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // On each dialog open: prefetch entry-json (failure-mode b), then
  // parallel dynamic imports + PagefindUI construction.
  // Radix unmounts DialogContent on close, so we re-init on every open.
  React.useEffect(() => {
    if (!open) {
      // Reset to a clean "closed" state on every close. Don't preserve
      // "unavailable" — a transient failure shouldn't lock out future opens.
      setState("closed");
      return;
    }

    // NOTE: this effect intentionally depends on `open` ONLY, not on
    // `state`. Including `state` would re-run the effect on every state
    // transition this effect itself triggers (closed → opening → ready /
    // unavailable), which would cancel the in-flight `load()` mid-flight
    // and prevent setState("ready" | "unavailable") from landing.
    setState("opening");

    let cancelled = false;
    // Capture the mount node so cleanup uses the same DOM reference that
    // existed when this effect ran (avoids react-hooks/exhaustive-deps warn).
    const mountNode = mountRef.current;

    const load = async () => {
      try {
        // Failure mode (b): entry-json 404 / network failure.
        // Prefetch and check before constructing PagefindUI so we can route
        // to the graceful "unavailable" surface per Req 1.9a.
        const entryResp = await fetch("/pagefind/pagefind-entry.json", {
          cache: "no-store",
        });
        if (!entryResp.ok) {
          if (!cancelled) setState("unavailable");
          return;
        }

        // Failure mode (d): strict CSP that blocks WebAssembly instantiation
        // (no `'wasm-unsafe-eval'` in `script-src`). Pagefind's UI constructor
        // returns synchronously and instantiates WASM lazily on first search,
        // so we can't rely on the dynamic import below to surface this. Probe
        // a 4-byte empty-module WASM up-front; if it throws, route directly
        // to the unavailable surface per Req 1.9a.
        try {
          // Minimal valid WASM binary: \0asm + version 1.
          const probeBytes = new Uint8Array([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]);
          await WebAssembly.instantiate(probeBytes);
        } catch {
          if (!cancelled) setState("unavailable");
          return;
        }

        const [, uiModule] = await Promise.all([
          // The pagefind runtime is served as a static asset; bypass bundler.
          import(
            /* webpackIgnore: true */ /* @vite-ignore */ /* turbopackIgnore: true */ "/pagefind/pagefind.js" as string
          ),
          import("@pagefind/default-ui"),
          // Awaited with the rest so the dialog paints styled rather than
          // flashing an unstyled result list first.
          loadPagefindStylesheet(),
        ]);

        if (cancelled) return;
        const element = mountRef.current;
        if (!element) {
          setState("unavailable");
          return;
        }
        // Clear any prior content (e.g. loading message) before mounting.
        element.innerHTML = "";

        const instance = new uiModule.PagefindUI({
          element,
          bundlePath: "/pagefind/",
          showImages: false,
          excerptLength: 30,
          // `--adjust-extension` in scripts/run-pagefind-crawl.mjs makes
          // Pagefind index URLs with a trailing `.html` (wget mirror shape).
          // Strip the suffix so result links route through Next's clean
          // `/blog/<slug>` routes (which 404 on the literal `.html` path).
          processResult: (r: { url: string; meta?: Record<string, string> }) => {
            if (!BLOG_POST_URL.test(r.url)) return null;
            // The default UI prints every meta key it is handed as its own row.
            // `description` is the post's own summary, which the excerpt
            // directly above it already renders — two near-identical paragraphs
            // per result. Drop it from the render; it stays in the index.
            const meta = { ...(r.meta ?? {}) };
            delete meta.description;
            return { ...r, meta, url: r.url.replace(/\.html$/, "") };
          },
        });
        uiInstanceRef.current = instance as { destroy?: () => void };
        setState("ready");
      } catch {
        if (!cancelled) setState("unavailable");
      }
    };

    void load();

    return () => {
      cancelled = true;
      // Tear down the previous PagefindUI instance (if any) on unmount /
      // close to avoid leaking listeners and to allow a clean re-init.
      const instance = uiInstanceRef.current;
      if (instance && typeof instance.destroy === "function") {
        try {
          instance.destroy();
        } catch {
          // ignore destroy errors
        }
      }
      uiInstanceRef.current = null;
      // Clear the captured mount node so the next open starts blank.
      if (mountNode) mountNode.innerHTML = "";
    };
  }, [open]);

  // Click delegation: close dialog when a result link is clicked.
  const onDialogBodyClick = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("a[href]")) setOpen(false);
  }, []);

  return (
    <>
      {/* `<noscript>` hide CSS: pin the trigger out of view when JS is off. */}
      <noscript>
        <style>{`[data-search-trigger]{display:none}`}</style>
      </noscript>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            data-search-trigger
            aria-label="Open search"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3"
          >
            <Search aria-hidden className="size-5 sm:size-4" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground sm:inline">
              ⌘K
            </kbd>
          </button>
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-2xl"
          onOpenAutoFocus={(e) => {
            // Let the pagefind input claim focus when ready; otherwise default.
            if (state === "ready") e.preventDefault();
          }}
        >
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">Search posts on this site.</DialogDescription>
          {state === "unavailable" ? (
            <div>
              <h2 className="text-lg font-semibold">Search</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Search is temporarily unavailable.
              </p>
              <p className="mt-2 text-sm">
                You can still browse posts via the{" "}
                {/* Plain anchor per design Req 1.9a v4 — degrades without JS. */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/blog" className="text-primary underline underline-offset-4">
                  blog index
                </a>
                .
              </p>
              <div aria-live="polite" className="sr-only">
                Search index could not be loaded.
              </div>
            </div>
          ) : (
            <div onClick={onDialogBodyClick}>
              {state === "opening" || state === "closed" ? (
                <p className="text-sm text-muted-foreground">Loading search…</p>
              ) : null}
              <div ref={mountRef} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
