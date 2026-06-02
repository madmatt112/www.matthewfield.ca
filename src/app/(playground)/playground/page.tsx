import type { Metadata } from "next";
import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { playgroundItems } from "#playground/manifest";

export function generateMetadata(): Metadata {
  return {
    title: "Playground",
    description: "Small self-contained web experiments, toys, and curiosities.",
    robots: { index: true },
  };
}

export default function PlaygroundGallery() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          &larr; matthewfield.ca
        </Link>
        <ThemeToggle />
      </div>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">Playground</h1>
      {playgroundItems.length === 0 ? (
        <p className="mt-6 text-base text-muted-foreground">
          Nothing here yet &mdash; check back soon.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {playgroundItems.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/playground/${item.slug}`}
                className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full transition-colors hover:bg-accent/50">
                  <CardHeader>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  {item.tags.length > 0 ? (
                    <ul className="flex flex-wrap gap-2 px-6">
                      {item.tags.map((tag) => (
                        <li
                          key={tag}
                          className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
