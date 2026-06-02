import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Matthew Field</p>
        <nav aria-label="Footer" className="flex items-center gap-6">
          <Link href="/about" className="hover:text-foreground">
            /about
          </Link>
          <Link href="/now" className="hover:text-foreground">
            /now
          </Link>
          <Link href="/slashes" className="hover:text-foreground">
            /slashes
          </Link>
          <a
            href="https://github.com/madmatt112"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/matthewfieldca/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            LinkedIn
          </a>
        </nav>
      </div>
    </footer>
  );
}
