import { GitHubIcon } from "@/components/shared/github-icon";
import { siteConfig } from "@/config/site";

// Brand icons (GitHub, LinkedIn) were removed from lucide-react for trademark
// reasons, so use inline SVG with the official brand paths. GitHubIcon lives in
// its own module because the contributions page needs the same mark.
function LinkedInIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.602 0 4.268 2.37 4.268 5.455v6.288zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.063 2.063 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function SocialLinks() {
  return (
    <nav aria-label="Social profiles">
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          <a
            href={siteConfig.links.linkedin}
            target="_blank"
            rel="noopener external"
            aria-label="Matthew on LinkedIn (opens in a new tab)"
            className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-md px-3 py-1 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <LinkedInIcon />
            <span>LinkedIn</span>
          </a>
        </li>
        <li>
          <a
            href={siteConfig.links.github}
            target="_blank"
            rel="noopener external"
            aria-label="Matthew on GitHub (opens in a new tab)"
            className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-md px-3 py-1 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <GitHubIcon />
            <span>GitHub</span>
          </a>
        </li>
      </ul>
    </nav>
  );
}
