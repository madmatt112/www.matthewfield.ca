import type { Metadata } from "next";
import Link from "next/link";

export function generateMetadata(): Metadata {
  return {
    title: "Playground",
    robots: { index: false },
  };
}

export default function PlaygroundPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Playground</h1>
      <p className="mt-6 text-base text-muted-foreground">This section is under construction.</p>
      <Link
        href="/"
        className="mt-8 inline-block text-sm font-medium underline-offset-4 hover:underline"
      >
        Return home
      </Link>
    </div>
  );
}
