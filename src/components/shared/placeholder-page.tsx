import Link from "next/link";

type PlaceholderPageProps = {
  title: string;
  description?: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
      <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{title}</h1>
      {description ? (
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">{description}</p>
      ) : null}
      <p className="mt-6 text-base text-muted-foreground">This section is under construction.</p>
      <Link
        href="/"
        className="mt-8 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Return home
      </Link>
    </div>
  );
}
