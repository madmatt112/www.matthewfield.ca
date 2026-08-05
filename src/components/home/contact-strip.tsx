import Link from "next/link";

import { SocialLinks } from "@/components/shared/social-links";
import { Button } from "@/components/ui/button";

/**
 * The landing page's single primary CTA.
 *
 * The inbound funnel is the homepage's stated job (product.md), so unlike the
 * card-grid landing this replaces, the page carries one brand-filled action.
 * Still one brand CTA per page, per visual-design R2.3.
 */
export function ContactStrip() {
  return (
    <section
      aria-labelledby="contact-strip-heading"
      className="mt-16 flex flex-col gap-4 border-t border-border pt-8 md:mt-24"
    >
      <h2 id="contact-strip-heading" className="sr-only">
        Get in touch
      </h2>
      <p className="max-w-measure text-base text-foreground">
        I respond to every human who gets in touch.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="brand">
          <Link href="/contact">Get in touch</Link>
        </Button>
        <SocialLinks />
      </div>
    </section>
  );
}
