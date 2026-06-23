"use client";

import * as React from "react";

import { StatusCallout } from "@/components/shared/status-callout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { siteConfig } from "@/config/site";

type FieldErrors = Record<"name" | "email" | "message", string | undefined>;

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "validation-error"; errors: FieldErrors }
  | {
      kind: "server-error";
      status: 429 | 502 | 503 | 504 | "network" | "unknown";
      retryAfterSeconds?: number;
    };

type Fields = { name: string; email: string; message: string };

const INITIAL_FIELDS: Fields = { name: "", email: "", message: "" };

const SUBMIT_TIMEOUT_MS = 12_000;

const SERVER_ERROR_COPY: Record<
  ({ kind: "server-error" } & FormState)["status"],
  { heading: string; body: string }
> = {
  429: {
    heading: "Too many requests right now",
    body: "The site is being rate-limited. Please try again shortly, or reach me directly on LinkedIn.",
  },
  502: {
    heading: "The mail service is unhappy",
    body: "Our mail provider returned an error. Please try again, or reach me directly on LinkedIn.",
  },
  503: {
    heading: "Sending timed out",
    body: "The request took too long to send. Please try again in a minute, or reach me directly on LinkedIn.",
  },
  504: {
    heading: "Sending timed out",
    body: "The request took too long to complete. Please try again, or reach me directly on LinkedIn.",
  },
  network: {
    heading: "Network problem",
    body: "We couldn't reach the server. Check your connection and try again, or reach me directly on LinkedIn.",
  },
  unknown: {
    heading: "Something went wrong",
    body: "An unexpected error occurred. Please try again, or reach me directly on LinkedIn.",
  },
};

function isFieldErrors(value: unknown): value is Partial<FieldErrors> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function ContactForm(props: { source?: "profile" | "contact" }): React.JSX.Element {
  const [state, setState] = React.useState<FormState>({ kind: "idle" });
  const [fields, setFields] = React.useState<Fields>(INITIAL_FIELDS);
  const [attemptId, setAttemptId] = React.useState(0);
  const inFlightRef = React.useRef(false);
  const honeypotRef = React.useRef<HTMLInputElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const successHeadingRef = React.useRef<HTMLHeadingElement>(null);
  const serverErrorRegionRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (attemptId === 0) return;
    if (state.kind === "success") {
      const heading = successHeadingRef.current;
      if (heading) {
        heading.focus();
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        heading.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
      }
      document.dispatchEvent(new CustomEvent("contact_submit_success"));
      return;
    }
    if (state.kind === "server-error") {
      serverErrorRegionRef.current?.focus();
      return;
    }
    if (state.kind === "validation-error") {
      const form = formRef.current;
      if (!form) return;
      const order: Array<keyof FieldErrors> = ["name", "email", "message"];
      for (const field of order) {
        if (!state.errors[field]) continue;
        const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${field}"]`);
        if (el) {
          el.focus();
          return;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, state.kind]);

  function clearFieldError(field: keyof FieldErrors) {
    setState((prev) => {
      if (prev.kind !== "validation-error") return prev;
      if (!prev.errors[field]) return prev;
      return { kind: "validation-error", errors: { ...prev.errors, [field]: undefined } };
    });
  }

  function onChangeField<K extends keyof Fields>(field: K, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }));
    if (field !== "message" && field !== "email" && field !== "name") return;
    clearFieldError(field);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    setAttemptId((n) => n + 1);
    setState({ kind: "submitting" });

    const url_secondary = honeypotRef.current?.value ?? "";
    const testId =
      typeof window !== "undefined" && typeof window.__TEST_ID === "string"
        ? window.__TEST_ID
        : undefined;

    const payload: Record<string, string | undefined> = {
      name: fields.name,
      email: fields.email,
      message: fields.message,
      url_secondary,
      source: props.source,
    };
    if (testId) payload.testId = testId;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    try {
      let response: Response;
      try {
        response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch {
        setState({ kind: "server-error", status: "network" });
        return;
      } finally {
        clearTimeout(timer);
      }

      if (response.status === 200) {
        setFields(INITIAL_FIELDS);
        setState({ kind: "success" });
        return;
      }

      if (response.status === 400) {
        let body: unknown = null;
        try {
          body = await response.json();
        } catch {
          // fall through to unknown server-error
        }
        if (
          typeof body === "object" &&
          body !== null &&
          "errors" in body &&
          isFieldErrors((body as { errors: unknown }).errors)
        ) {
          const raw = (body as { errors: Partial<FieldErrors> }).errors;
          const errors: FieldErrors = {
            name: raw.name,
            email: raw.email,
            message: raw.message,
          };
          setState({ kind: "validation-error", errors });
          return;
        }
        setState({ kind: "server-error", status: "unknown" });
        return;
      }

      if (
        response.status === 429 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504
      ) {
        const status = response.status as 429 | 502 | 503 | 504;
        let retryAfterSeconds: number | undefined;
        if (status === 503) {
          const header = response.headers.get("Retry-After");
          const parsed = header === null ? NaN : Number.parseInt(header, 10);
          if (Number.isFinite(parsed) && parsed >= 0) retryAfterSeconds = parsed;
        }
        setState({
          kind: "server-error",
          status,
          ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
        });
        return;
      }

      setState({ kind: "server-error", status: "unknown" });
    } finally {
      inFlightRef.current = false;
    }
  }

  function handleRetry() {
    setState({ kind: "idle" });
  }

  const isSubmitting = state.kind === "submitting";
  const validationErrors = state.kind === "validation-error" ? state.errors : undefined;

  const nameErrorId = "contact-name-error";
  const emailErrorId = "contact-email-error";
  const messageErrorId = "contact-message-error";

  return (
    <div className="min-h-[28rem]">
      {state.kind === "success" ? (
        <StatusCallout tone="success" role="status" tabIndex={-1}>
          <h2 ref={successHeadingRef} tabIndex={-1} className="text-xl font-semibold">
            Thanks — your message is on its way.
          </h2>
          <p className="mt-2 text-sm">I respond to every human. Expect a reply soon.</p>
        </StatusCallout>
      ) : state.kind === "server-error" ? (
        <StatusCallout tone="error" role="status" tabIndex={-1} ref={serverErrorRegionRef}>
          <h2 tabIndex={-1} className="text-xl font-semibold">
            {SERVER_ERROR_COPY[state.status].heading}
          </h2>
          <p className="mt-2 text-sm">{SERVER_ERROR_COPY[state.status].body}</p>
          {state.status === 503 && state.retryAfterSeconds !== undefined ? (
            <p className="mt-1 text-sm">Try again in about {state.retryAfterSeconds} seconds.</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleRetry} className="min-h-11 min-w-11">
              Try again
            </Button>
            <a
              href={siteConfig.links.linkedin}
              target="_blank"
              rel="noopener external"
              className="inline-flex min-h-11 items-center px-1 text-sm underline underline-offset-4"
            >
              Or reach out on LinkedIn
            </a>
          </div>
        </StatusCallout>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {validationErrors ? (
            <div role="alert" className="rounded-md border border-destructive/40 px-3 py-2 text-sm">
              Could not submit — please check the fields below.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                value={fields.name}
                onChange={(e) => onChangeField("name", e.target.value)}
                aria-describedby={validationErrors?.name ? nameErrorId : undefined}
                aria-invalid={validationErrors?.name ? true : undefined}
                className="min-h-11"
              />
              <span
                id={nameErrorId}
                aria-live="polite"
                className="min-h-[1.25rem] text-sm text-destructive"
              >
                {validationErrors?.name ?? ""}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={fields.email}
                onChange={(e) => onChangeField("email", e.target.value)}
                aria-describedby={validationErrors?.email ? emailErrorId : undefined}
                aria-invalid={validationErrors?.email ? true : undefined}
                className="min-h-11"
              />
              <span
                id={emailErrorId}
                aria-live="polite"
                className="min-h-[1.25rem] text-sm text-destructive"
              >
                {validationErrors?.email ?? ""}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="contact-message">Message</Label>
            <Textarea
              id="contact-message"
              name="message"
              required
              value={fields.message}
              onChange={(e) => onChangeField("message", e.target.value)}
              aria-describedby={validationErrors?.message ? messageErrorId : undefined}
              aria-invalid={validationErrors?.message ? true : undefined}
              className="min-h-44"
              rows={6}
            />
            <span
              id={messageErrorId}
              aria-live="polite"
              className="min-h-[1.25rem] text-sm text-destructive"
            >
              {validationErrors?.message ?? ""}
            </span>
          </div>

          <div style={{ display: "none" }} aria-hidden="true">
            <label>
              url_secondary
              <input
                ref={honeypotRef}
                name="url_secondary"
                type="text"
                tabIndex={-1}
                aria-hidden="true"
                autoComplete="off"
                defaultValue=""
              />
            </label>
          </div>

          <div>
            <Button type="submit" aria-disabled={isSubmitting} className="min-h-11 min-w-11">
              {isSubmitting ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

declare global {
  interface Window {
    __TEST_ID?: string;
  }
}
