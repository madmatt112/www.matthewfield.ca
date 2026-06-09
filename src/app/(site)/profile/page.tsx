import type { Metadata } from "next";
import Image from "next/image";

import { profile } from "#site/content";

import { AvatarPlaceholder } from "@/components/shared/avatar-placeholder";
import { ContactForm } from "@/components/shared/contact-form";
import { MDXContent } from "@/components/shared/mdx-content";
import { ObfuscatedEmail } from "@/components/shared/obfuscated-email";
import { SectionKicker } from "@/components/shared/section-kicker";
import { SocialLinks } from "@/components/shared/social-links";
import { Button } from "@/components/ui/button";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  return {
    title: profile.title,
    description: profile.description,
    alternates: { canonical: "/profile" },
  };
}

export default function ProfilePage() {
  return (
    <div className="profile-print-root mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <section className="flex flex-col items-start gap-6 md:flex-row md:items-center md:gap-10">
        {profile.headshot ? (
          <Image
            src={profile.headshot.src}
            alt={`Portrait of ${profile.title}`}
            width={profile.headshot.width}
            height={profile.headshot.height}
            placeholder="blur"
            blurDataURL={profile.headshot.blurDataURL}
            priority
            className="rounded-full border border-border object-cover"
          />
        ) : (
          <AvatarPlaceholder size={160} label={`Portrait of ${profile.title} (placeholder)`} />
        )}
        <div className="flex flex-col gap-3">
          <SectionKicker label="profile" />
          <h1 className="font-display text-3xl tracking-tight text-balance sm:text-4xl md:text-5xl">
            {profile.headline}
          </h1>
          <p className="text-sm text-muted-foreground">
            {profile.location} · {profile.availability}
          </p>
          <Button asChild variant="brand" className="mt-2 w-fit">
            <a href="#get-in-touch">Get in touch</a>
          </Button>
        </div>
      </section>

      <article className="prose dark:prose-invert max-w-measure mt-10">
        <MDXContent code={profile.body} />
      </article>

      <section id="get-in-touch" className="mt-16 flex max-w-measure flex-col gap-4">
        <p className="text-base text-foreground">
          Shoot me a message — I respond to every human :)
        </p>
        <SocialLinks />
        <ObfuscatedEmail />
        <ContactForm source="profile" />
      </section>
    </div>
  );
}
