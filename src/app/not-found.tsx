import Link from "next/link";

import { SiteShell } from "@/components/layout/site-shell";

export default function NotFound() {
  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Page not found</h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Return home
        </Link>
      </div>
    </SiteShell>
  );
}
