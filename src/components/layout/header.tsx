import { SiteSearch } from "@/components/blog/site-search";
import { DesktopNav, MobileNav } from "@/components/layout/nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Wordmark } from "@/components/layout/wordmark";

export function Header() {
  return (
    <header className="sticky top-0 z-sticky border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Wordmark className="text-base" />
        <div className="flex items-center gap-2">
          <DesktopNav />
          <SiteSearch />
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
