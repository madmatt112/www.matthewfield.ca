import type { Metadata } from "next";
import Image from "next/image";

import { profile } from "#site/content";

import { AvatarPlaceholder } from "@/components/shared/avatar-placeholder";
import { ContactForm } from "@/components/shared/contact-form";
import { MDXContent } from "@/components/shared/mdx-content";
import { ObfuscatedEmail } from "@/components/shared/obfuscated-email";
import { SocialLinks } from "@/components/shared/social-links";

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
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-16">
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
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{profile.headline}</h1>
          <p className="text-sm text-muted-foreground">
            {profile.location} · {profile.availability}
          </p>
        </div>
      </section>

      <article className="mt-10 text-base leading-relaxed text-foreground">
        <MDXContent code={profile.body} />
      </article>

      <section className="mt-12 flex flex-col gap-4">
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
