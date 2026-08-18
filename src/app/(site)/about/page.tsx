import { permanentRedirect } from "next/navigation";

/**
 * /about was removed. It had been linked from the footer on every page and was
 * indexable, so inbound links and search-engine records for it still exist;
 * this sends them to /profile rather than a 404.
 *
 * The redirect lives in a route file rather than `next.config.ts` redirects()
 * on purpose. `next.config.ts` is one of the four files in
 * scripts/verify-paired-merge.mjs TRACKED_SET, which CI enforces as
 * all-four-or-none on non-revert commits — adding one rule there would have
 * required touching project-errors.ts and blog-errors.ts for no reason. A route
 * file is unguarded and also works under `next dev`, which vercel.json
 * redirects do not.
 *
 * Deliberately absent from src/app/sitemap.ts: a redirecting URL does not
 * belong in a sitemap.
 */
export default function AboutRedirect(): never {
  permanentRedirect("/profile");
}
