import type { Metadata } from "next";
import Image from "next/image";

import { profile } from "#site/content";

import { EducationList } from "@/components/profile/education-list";
import { ExperienceTimeline } from "@/components/profile/experience-timeline";
import { SkillsList } from "@/components/profile/skills-list";
import { AvatarPlaceholder } from "@/components/shared/avatar-placeholder";
import { ContactForm } from "@/components/shared/contact-form";
import { MDXContent } from "@/components/shared/mdx-content";
import { NewTabHint } from "@/components/shared/new-tab-hint";
import { ObfuscatedEmail } from "@/components/shared/obfuscated-email";
import { SectionKicker } from "@/components/shared/section-kicker";
import { SocialLinks } from "@/components/shared/social-links";
import { Button } from "@/components/ui/button";
import { getEducation, getExperience, getSkills } from "@/lib/experience";
import { buildProfileJsonLd } from "@/lib/profile-json-ld";
import { profileSummary } from "@/lib/profile-summary";

export const dynamic = "force-static";

/**
 * Serialize the JSON-LD for an inline `<script type="application/ld+json">`.
 *
 * `</script>` inside a string value would close the element early, so every
 * `<` is escaped to its JSON `<` form — still the same string once parsed,
 * but inert to the HTML tokenizer. The inline script itself is permitted by the
 * site CSP (`script-src 'self' 'unsafe-inline'`, next.config.ts).
 */
function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function generateMetadata(): Metadata {
  return {
    title: profile.title,
    description: profile.description,
    alternates: { canonical: "/profile" },
  };
}

/**
 * SECTION ORDER (design §Section order and the narrative/summary split):
 * hero → narrative → summary → experience → skills → education → contact.
 * In print the narrative drops out (task 20 suppresses `.profile-narrative`),
 * leaving hero → summary → … — the page opens as a person, the PDF opens as a
 * candidate (R2.1, R6.3). Nothing here is print-only: every printed element is
 * on screen too, so the two renderings cannot silently diverge.
 *
 * Experience, skills, and education each return `null` when their collection is
 * empty, so this page must NOT emit their headings itself — that is what keeps
 * an absent section from leaving an empty heading behind (R2.6/R5.4).
 */
export default function ProfilePage() {
  return (
    <div className="profile-print-root mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildProfileJsonLd()) }}
      />

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
            {profile.location} · {profile.availability}{" "}
            <a
              href={profile.availabilityLinkHref}
              target="_blank"
              rel="noopener"
              // PERMANENT underline, never `hover:underline` (R8.3, WCAG 1.4.1):
              // brand against muted-foreground is ~1.05:1 in light theme, so
              // colour alone cannot distinguish the link from its sentence — axe
              // reported `link-in-text-block` here until this underline landed.
              className="text-brand underline underline-offset-4"
            >
              {profile.availabilityLinkLabel}
              <NewTabHint />
            </a>
          </p>
          <Button asChild variant="brand" className="mt-2 w-fit">
            <a href="#get-in-touch">Get in touch</a>
          </Button>
        </div>
      </section>

      {/* The personal narrative. `profile-narrative` is the hook task 20's print
          rule targets — without this exact class the PDF would keep the personal
          material and R6.3 would silently not hold. */}
      <article className="profile-narrative prose dark:prose-invert max-w-measure mt-10">
        <MDXContent code={profile.body} />
      </article>

      {/* The professional summary: a field distinct from the narrative (R2.3).
          On screen it introduces the experience section; in print it is what the
          CV opens with once the narrative above is suppressed. */}
      <section id="summary" aria-label="Professional summary" className="mt-10 max-w-measure">
        <p className="text-base text-muted-foreground">{profileSummary}</p>
      </section>

      <ExperienceTimeline roles={getExperience()} />
      <SkillsList groups={getSkills()} />
      <EducationList entries={getEducation()} />

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
