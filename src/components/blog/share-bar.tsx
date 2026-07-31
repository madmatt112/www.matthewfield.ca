import { Mail } from "lucide-react";

import { CopyURLButton } from "@/components/blog/copy-url-button";

type ShareBarProps = {
  title: string;
  description: string;
  url: string;
};

// Brand icons (X/Twitter, LinkedIn) were removed from lucide-react for
// trademark reasons (see src/components/shared/social-links.tsx) — use
// inline SVG with the official brand paths.
function XIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="share-bar-icon">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="share-bar-icon">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.602 0 4.268 2.37 4.268 5.455v6.288zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.063 2.063 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

// Server component (no "use client"). Renders bot-friendly share anchors
// (X, LinkedIn, mailto) + the <CopyURLButton /> client island.
// Wrapped in <section data-pagefind-ignore="all"> so the share UI is
// excluded from Pagefind's index.
export function ShareBar({ title, description, url }: ShareBarProps) {
  const enc = encodeURIComponent;
  const xHref = `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`;
  const mailHref = `mailto:?subject=${enc(title)}&body=${enc(`${description}\n\n${url}`)}`;

  return (
    <section data-pagefind-ignore="all" aria-label="Share this post" className="share-bar">
      <a
        href={xHref}
        target="_blank"
        rel="noopener nofollow"
        aria-label="Share on X (Twitter) (opens in a new tab)"
        className="share-bar-link"
      >
        <XIcon />
      </a>
      <a
        href={linkedinHref}
        target="_blank"
        rel="noopener nofollow"
        aria-label="Share on LinkedIn (opens in a new tab)"
        className="share-bar-link"
      >
        <LinkedInIcon />
      </a>
      <a
        href={mailHref}
        target="_blank"
        rel="noopener nofollow"
        aria-label="Share via email (opens in a new tab)"
        className="share-bar-link"
      >
        <Mail aria-hidden="true" className="share-bar-icon" />
      </a>
      <CopyURLButton url={url} />
    </section>
  );
}
