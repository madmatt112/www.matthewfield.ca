"use client";

import { useEffect } from "react";

import {
  announceCopyStatus,
  copyToClipboard,
  decodeUtf8B64,
} from "@/components/blog/clipboard";

/**
 * <CopyButton /> — DOM-marker client hydrator.
 *
 * Mounts ONCE inside <article> on the post page (Task 20 wires this).
 * Does NOT take props for individual <pre> content. On mount, queries
 * every `[data-copy-button]` element emitted by `rehype-copy-button.ts`
 * (Task 15) and attaches a click handler that:
 *   1. decodes the button's `data-copy-source` (base64 UTF-8) via
 *      `decodeUtf8B64` from clipboard.ts (Task 17),
 *   2. calls `copyToClipboard` (clipboard.ts),
 *   3. calls `announceCopyStatus` to update the `#copy-status` aria-live
 *      region,
 *   4. flips the per-button DOM state via `data-copy-state` and the
 *      `aria-label` text — state lives on the DOM (not React state) since
 *      one hydrator covers many buttons.
 *
 * State machine per button: idle → copying → copied (2s) → idle.
 *                            idle → copying → failed (5s) → idle.
 *
 * Cleanup: removes all listeners on unmount and clears pending timers.
 */
export function CopyButton() {
  useEffect(() => {
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-copy-button]"),
    );

    // Per-button reset timer so multiple buttons can be in different states.
    const timers = new WeakMap<HTMLButtonElement, number>();

    function setState(
      btn: HTMLButtonElement,
      state: "idle" | "copying" | "copied" | "failed",
    ) {
      btn.setAttribute("data-copy-state", state);
      const label =
        state === "copied"
          ? "Code copied to clipboard"
          : state === "failed"
            ? "Copy failed"
            : "Copy code to clipboard";
      btn.setAttribute("aria-label", label);
    }

    function scheduleReset(btn: HTMLButtonElement, ms: number) {
      const existing = timers.get(btn);
      if (existing !== undefined) window.clearTimeout(existing);
      const id = window.setTimeout(() => {
        setState(btn, "idle");
        timers.delete(btn);
      }, ms);
      timers.set(btn, id);
    }

    async function onClick(this: HTMLButtonElement, event: MouseEvent) {
      event.preventDefault();
      if (this.getAttribute("data-copy-state") === "copying") return;
      const existing = timers.get(this);
      if (existing !== undefined) {
        window.clearTimeout(existing);
        timers.delete(this);
      }

      const sourceB64 = this.getAttribute("data-copy-source") ?? "";
      setState(this, "copying");

      let source = "";
      try {
        source = decodeUtf8B64(sourceB64);
      } catch {
        setState(this, "failed");
        announceCopyStatus("Copy failed");
        scheduleReset(this, 5000);
        return;
      }

      const ok = await copyToClipboard(source);
      if (ok) {
        setState(this, "copied");
        announceCopyStatus("Code copied");
        scheduleReset(this, 2000);
      } else {
        setState(this, "failed");
        announceCopyStatus("Copy failed");
        scheduleReset(this, 5000);
      }
    }

    for (const btn of buttons) {
      btn.setAttribute("data-copy-state", "idle");
      btn.addEventListener("click", onClick);
    }

    return () => {
      for (const btn of buttons) {
        btn.removeEventListener("click", onClick);
        const id = timers.get(btn);
        if (id !== undefined) {
          window.clearTimeout(id);
          timers.delete(btn);
        }
      }
    };
  }, []);

  return null;
}
