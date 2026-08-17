import Link from "next/link";

import { FooterNewsletter } from "@/components/layout/footer-newsletter";
import { NewTabHint } from "@/components/shared/new-tab-hint";
import { siteConfig } from "@/config/site";
import { getBuildInfo } from "@/lib/build-info";

/**
 * PRINT HOOK: `site-footer`, a class for the same reason `site-header` is —
 * `<footer>` is content markup too (the post footer on /blog/[slug]), so a bare
 * `footer` selector in print.css would be a latent repeat of the role-header
 * bug that hid the printed CV's employers and dates.
 */
export function Footer() {
  const build = getBuildInfo();
  return (
    <footer className="site-footer border-t border-border">
      {/* Sitewide, low-intent capture. Compact and inline — it never covers
          content, and it sits in its own row so it doesn't crowd the nav.
          Hides itself on /newsletter/welcome; see footer-newsletter.tsx. */}
      <FooterNewsletter />
      <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-4 border-t border-border px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p>&copy; {new Date().getFullYear()} Matthew Field</p>
          {build && (
            <a
              href={build.commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Deployed commit ${build.shortSha} (opens in a new tab)`}
              className="font-mono text-xs hover:text-foreground"
            >
              {build.shortSha}
            </a>
          )}
        </div>
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
            href={siteConfig.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            GitHub
            <NewTabHint />
          </a>
          <a
            href={siteConfig.links.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            LinkedIn
            <NewTabHint />
          </a>
        </nav>
      </div>
    </footer>
  );
}
