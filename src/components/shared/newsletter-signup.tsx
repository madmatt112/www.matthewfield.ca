"use client";

import * as React from "react";

import { StatusCallout } from "@/components/shared/status-callout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Newsletter signup. Posts to /api/newsletter, which proxies Buttondown —
 * see src/lib/newsletter.ts for why it is not a direct cross-origin post.
 *
 * Deliberately inline-only: no modal, no popover, no scroll-triggered
 * interstitial. Nothing here can cover the page or interrupt a reader.
 *
 * Two variants share one state machine:
 *   "block"   full CTA with a heading — content surfaces (end of a post, /newsletter)
 *   "compact" single row, no heading — site chrome (the footer)
 */
type Variant = "block" | "compact";

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const SUBMIT_TIMEOUT_MS = 12_000;

const NETWORK_ERROR = "We couldn't reach the server. Check your connection and try again.";
const UNKNOWN_ERROR = "Something went wrong. Please try again.";

function errorMessageFrom(body: unknown, fallback: string): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    return (body as { error: string }).error;
  }
  return fallback;
}

export function NewsletterSignup({
  variant = "block",
  id = "newsletter",
  heading = "Field Notes, by email",
  blurb = "Essays on building software, working for myself, and the rest of it. One click unsubscribes.",
}: {
  variant?: Variant;
  id?: string;
  heading?: string;
  blurb?: string;
}): React.JSX.Element {
  const [state, setState] = React.useState<FormState>({ kind: "idle" });
  const [email, setEmail] = React.useState("");
  const inFlightRef = React.useRef(false);
  const honeypotRef = React.useRef<HTMLInputElement>(null);
  const statusRef = React.useRef<HTMLDivElement>(null);

  // Move focus to the outcome so a screen reader lands on it. Skipped while
  // idle so the component never steals focus on mount.
  React.useEffect(() => {
    if (state.kind === "success" || state.kind === "error") {
      statusRef.current?.focus();
    }
  }, [state.kind]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    setState({ kind: "submitting" });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    try {
      let response: Response;
      try {
        response = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            url_secondary: honeypotRef.current?.value ?? "",
          }),
          signal: controller.signal,
        });
      } catch {
        setState({ kind: "error", message: NETWORK_ERROR });
        return;
      } finally {
        clearTimeout(timer);
      }

      if (response.ok) {
        setEmail("");
        setState({ kind: "success" });
        return;
      }

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        // fall through to the generic message
      }
      setState({ kind: "error", message: errorMessageFrom(body, UNKNOWN_ERROR) });
    } finally {
      inFlightRef.current = false;
    }
  }

  const isSubmitting = state.kind === "submitting";
  const inputId = `${id}-email`;
  const compact = variant === "compact";

  if (state.kind === "success") {
    return (
      <StatusCallout
        tone="success"
        role="status"
        tabIndex={-1}
        ref={statusRef}
        className={compact ? "text-sm" : undefined}
      >
        <p className="font-medium">Almost there. Check your inbox.</p>
        <p className="mt-1 text-sm">
          Buttondown sent a confirmation link. Click it and you&rsquo;re subscribed.
        </p>
      </StatusCallout>
    );
  }

  const form = (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={compact ? "flex flex-col gap-2 sm:flex-row sm:items-end" : "flex flex-col gap-3"}
    >
      <div className={compact ? "flex-1" : "flex flex-col gap-2"}>
        <Label htmlFor={inputId} className={compact ? "sr-only" : undefined}>
          Email address
        </Label>
        <Input
          id={inputId}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={state.kind === "error" ? true : undefined}
          aria-describedby={state.kind === "error" ? `${id}-status` : undefined}
          className="min-h-11"
        />
      </div>
      <Button
        type="submit"
        variant="brand"
        aria-disabled={isSubmitting}
        className="min-h-11 min-w-11"
      >
        {isSubmitting ? "Subscribing…" : "Subscribe"}
      </Button>
    </form>
  );

  return (
    <section
      id={id}
      aria-labelledby={compact ? undefined : `${id}-heading`}
      aria-label={compact ? heading : undefined}
      className={compact ? undefined : "rounded-lg border border-border bg-muted/40 p-6 sm:p-8"}
    >
      {!compact && (
        <>
          <h2 id={`${id}-heading`} className="font-display text-3xl">
            {heading}
          </h2>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">{blurb}</p>
        </>
      )}

      <div className={compact ? undefined : "mt-5"}>{form}</div>

      {/* Honeypot — hidden from people and assistive tech, tempting to bots. */}
      <div style={{ display: "none" }} aria-hidden="true">
        <label>
          url_secondary
          <input
            ref={honeypotRef}
            name="url_secondary"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </label>
      </div>

      <div
        id={`${id}-status`}
        ref={statusRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="mt-2 text-sm text-destructive empty:mt-0"
      >
        {state.kind === "error" ? state.message : ""}
      </div>
    </section>
  );
}
