import { siteConfig } from "@/config/site";
import { type ExperienceRole, getEducation, getExperience, getSkills } from "@/lib/experience";
import { getProfileSummary } from "@/lib/profile-summary";

/**
 * The schema.org `Person` graph for /profile (Req 7.1–7.3).
 *
 * **Every value comes from a selector or from `siteConfig`.** Nothing is
 * hand-copied and `#site/content` is never read here, so the page and the
 * JSON-LD cannot drift apart (R7.2).
 *
 * **No `telephone` and no `email`, at any nesting depth** (R7.3, R3.1). The
 * three content schemas make contact data inexpressible; this module must not
 * reintroduce it from `siteConfig.links.email`. Do not add one "for
 * completeness" — a unit test walks the whole object graph for it.
 */

type OrganizationNode = {
  "@type": "Organization";
  name: string;
  url?: string;
};

type EducationalOrganizationNode = {
  "@type": "EducationalOrganization";
  name: string;
  url?: string;
};

/**
 * schema.org's Role pattern: the Role is nested under the property it decorates
 * and repeats that property name to carry the underlying value. So an
 * `OrganizationRole` sitting under `Person.affiliation` holds the organisation
 * on its own `affiliation` key. This is the only way to attach dates to an
 * organisational relationship — `Occupation` carries neither employer nor
 * dates, so `hasOccupation` alone cannot express employment history.
 */
type OrganizationRoleNode = {
  "@type": "OrganizationRole";
  roleName: string;
  startDate: string;
  /** Omitted entirely for a current role. Never `null`, never fabricated. */
  endDate?: string;
  affiliation: OrganizationNode;
};

type OccupationNode = {
  "@type": "Occupation";
  name: string;
};

export type ProfileJsonLd = {
  "@context": "https://schema.org";
  "@type": "Person";
  name: string;
  url: string;
  jobTitle?: string;
  description: string;
  sameAs: string[];
  worksFor?: OrganizationNode;
  alumniOf: EducationalOrganizationNode[];
  knowsAbout: string[];
  hasOccupation: OccupationNode;
  affiliation: OrganizationRoleNode[];
};

function toOrganization(role: ExperienceRole): OrganizationNode {
  return {
    "@type": "Organization",
    name: role.organisation,
    // Spread rather than `url: role.organisationUrl` so an absent URL leaves
    // the key off the object instead of setting it to `undefined`.
    ...(role.organisationUrl === undefined ? {} : { url: role.organisationUrl }),
  };
}

function toOrganizationRole(role: ExperienceRole): OrganizationRoleNode {
  return {
    "@type": "OrganizationRole",
    roleName: role.title,
    // `start`/`end` are month-precision `YYYY-MM`, which ISO 8601 (and so
    // schema.org's Date) accepts as-is. Padding to a day would fabricate one.
    startDate: role.start,
    ...(role.end === undefined ? {} : { endDate: role.end }),
    affiliation: toOrganization(role),
  };
}

/**
 * `alumniOf` is a set of institutions, not a list of credentials — and the
 * node carries no credential detail to tell two entries apart. Two credentials
 * from one school therefore collapse to one entry, in first-listed (most
 * recent) order; emitting the same organisation twice would add no information.
 */
function toAlumniOf(): EducationalOrganizationNode[] {
  const byInstitution = new Map<string, EducationalOrganizationNode>();
  for (const entry of getEducation()) {
    const key = `${entry.institution}\u0000${entry.institutionUrl ?? ""}`;
    if (byInstitution.has(key)) continue;
    byInstitution.set(key, {
      "@type": "EducationalOrganization",
      name: entry.institution,
      ...(entry.institutionUrl === undefined ? {} : { url: entry.institutionUrl }),
    });
  }
  return [...byInstitution.values()];
}

/**
 * Build the `Person` object for the inline `application/ld+json` script on
 * /profile. Pure: no I/O, no mutation, returns a fresh plain object.
 */
export function buildProfileJsonLd(): ProfileJsonLd {
  const roles = getExperience();
  // `getExperience()` sorts most-recent-first with a current role treated as
  // infinity, so this is the role the page shows first — using it for
  // `jobTitle` is what keeps the two in agreement (R7.2).
  const mostRecentRole: ExperienceRole | undefined = roles[0];
  const currentRole = roles.find((role) => role.end === undefined);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.name,
    // The page this graph describes, not the site root: a consumer following
    // `url` should land on the professional profile.
    url: new URL("/profile", siteConfig.url).toString(),
    ...(mostRecentRole === undefined ? {} : { jobTitle: mostRecentRole.title }),
    description: getProfileSummary(),
    // LinkedIn and GitHub only. `siteConfig.links.email` is deliberately not
    // referenced — `sameAs` takes profile URLs, and an email here would be a
    // contact detail (R7.3).
    sameAs: [siteConfig.links.linkedin, siteConfig.links.github],
    ...(currentRole === undefined ? {} : { worksFor: toOrganization(currentRole) }),
    alumniOf: toAlumniOf(),
    knowsAbout: getSkills().flatMap((group) => group.items),
    hasOccupation: {
      "@type": "Occupation",
      // The occupational category. The dated, employer-bound history lives
      // in `affiliation`.
      name: siteConfig.occupation,
    },
    // EVERY role, current one included — not just the finished ones. The
    // current role's start date exists nowhere else in the graph (`worksFor`
    // is an undated `Organization`), so dropping it would make the JSON-LD
    // narrate less history than the page does.
    affiliation: roles.map(toOrganizationRole),
  };
}
