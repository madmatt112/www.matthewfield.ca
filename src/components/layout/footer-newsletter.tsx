"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { NewsletterSignup } from "@/components/shared/newsletter-signup";

/**
 * The footer's sitewide signup block, split out of Footer purely so it can be
 * hidden on routes where asking again is wrong.
 *
 * `/newsletter/welcome` is reached only by clicking the confirmation link in
 * Buttondown's email, so everyone who sees it subscribed seconds ago. A
 * subscribe form there is a worse defect than the ordinary redundancy of
 * carrying one in the footer, which is why this route gets special handling
 * and the end-of-post CTA does not.
 *
 * The client boundary is close to free: NewsletterSignup is already a client
 * component and already rendered here on every page, so this adds
 * `usePathname` and two short strings rather than a new island.
 */
const HIDDEN_ON = ["/newsletter/welcome"];

export function FooterNewsletter(): React.JSX.Element | null {
  const pathname = usePathname();
  if (pathname && HIDDEN_ON.includes(pathname)) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="max-w-md">
          <p className="text-sm font-medium text-foreground">Field Notes, by email</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Essays on building software and working for myself.{" "}
            <Link href="/newsletter" className="underline underline-offset-4">
              More about it
            </Link>
            .
          </p>
        </div>
        <div className="w-full sm:max-w-sm">
          <NewsletterSignup variant="compact" id="footer-newsletter" />
        </div>
      </div>
    </div>
  );
}
