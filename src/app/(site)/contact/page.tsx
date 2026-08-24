import type { Metadata } from "next";

import { ContactForm } from "@/components/shared/contact-form";
import { ObfuscatedEmail } from "@/components/shared/obfuscated-email";
import { SectionKicker } from "@/components/shared/section-kicker";
import { SocialLinks } from "@/components/shared/social-links";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  return {
    title: "Contact",
    description:
      "Reach out directly — socials, email, or the form below. Every human gets a reply.",
  };
}

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 md:py-24">
      <SectionKicker label="contact" />
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Get in touch</h1>
      <section className="mt-8 flex max-w-measure flex-col gap-4">
        <p className="text-base text-foreground">
          Pick the channel that suits you — socials below, an obfuscated email, or send a note
          straight from the form.
        </p>
        <SocialLinks />
        <ObfuscatedEmail />
        <ContactForm source="contact" />
      </section>
    </div>
  );
}
