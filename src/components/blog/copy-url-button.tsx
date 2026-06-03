"use client";

import { Check, Link as LinkIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { announceCopyStatus, copyToClipboard } from "@/components/blog/clipboard";

type CopyURLButtonProps = {
  url: string;
};

type CopyState = "idle" | "copying" | "copied" | "failed";

// Client island. The ONLY "use client" component in the share-bar slice.
// State machine: idle → copying → copied (2s) → idle.
// On error: idle → copying → failed (5s) → idle.
export function CopyURLButton({ url }: CopyURLButtonProps) {
  const [state, setState] = useState<CopyState>("idle");
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== undefined) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  async function handleClick() {
    if (state === "copying") return;
    if (resetTimer.current !== undefined) {
      window.clearTimeout(resetTimer.current);
      resetTimer.current = undefined;
    }
    setState("copying");
    const ok = await copyToClipboard(url);
    if (ok) {
      setState("copied");
      announceCopyStatus("Link copied");
      resetTimer.current = window.setTimeout(() => {
        setState("idle");
        resetTimer.current = undefined;
      }, 2000);
    } else {
      setState("failed");
      announceCopyStatus("Copy failed");
      resetTimer.current = window.setTimeout(() => {
        setState("idle");
        resetTimer.current = undefined;
      }, 5000);
    }
  }

  const label =
    state === "copied"
      ? "Link copied"
      : state === "failed"
        ? "Copy failed"
        : "Copy link to this post";

  const Icon = state === "copied" ? Check : state === "failed" ? X : LinkIcon;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      data-copy-state={state}
      className="share-bar-link share-bar-copy"
    >
      <Icon aria-hidden="true" className="share-bar-icon" />
    </button>
  );
}
