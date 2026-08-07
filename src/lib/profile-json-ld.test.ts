// profile-json-ld.test.ts — the schema.org `Person` graph for /profile (Req 7.1, 7.3).
//
// The centrepiece is the RECURSIVE absence check. R7.3 forbids contact detail
// anywhere in the JSON-LD, and `expect(jsonLd.telephone).toBeUndefined()` would
// sail straight past a number nested under an affiliation's organisation — the
// exact shape a well-meaning "let's make this more complete" edit produces. So
// every absence assertion here walks the WHOLE graph, through arrays and nested
// objects to any depth, and flags contact data two ways:
//
//   - by KEY NAME, normalised so `Telephone`, `phone_number`, `e-mail` and
//     `contactPoint` all land on the same needles; and
//   - by VALUE SHAPE, because a leaked phone number is just as leaked sitting
//     under a key called `note`.
//
// The first describe block tests the DETECTOR against deliberately-planted
// contact data, so the absence assertions can never quietly become vacuous.
//
// Fixture cases follow src/lib/experience.test.ts: `vi.doMock("#site/content")`
// + `vi.resetModules()` + a dynamic import. All fixture data is obviously
// synthetic; the real-content cases assert against the shipped collections.
import { afterEach, describe, expect, it, vi } from "vitest";

import { siteConfig } from "@/config/site";
import {
  type EducationEntry,
  type ExperienceRole,
  type SkillGroup,
  getEducation,
  getExperience,
  getSkills,
} from "@/lib/experience";
import { type ProfileJsonLd, buildProfileJsonLd } from "@/lib/profile-json-ld";
import { profileSummary } from "@/lib/profile-summary";

// ---------------------------------------------------------------------------
// The recursive walk
// ---------------------------------------------------------------------------

type GraphNode = {
  /** Trail to the value, e.g. `$.affiliation[0].affiliation.name`. */
  path: string;
  /** The object key this value sat on; `null` for array elements and the root. */
  key: string | null;
  value: unknown;
};

/** Every node in the graph — the root, every object value, every array element. */
function walk(value: unknown, path = "$", key: string | null = null): GraphNode[] {
  const here: GraphNode[] = [{ path, key, value }];
  if (Array.isArray(value)) {
    return here.concat(...value.map((item, index) => walk(item, `${path}[${index}]`)));
  }
  if (typeof value === "object" && value !== null) {
    return here.concat(...Object.entries(value).map(([k, v]) => walk(v, `${path}.${k}`, k)));
  }
  return here;
}

// ---------------------------------------------------------------------------
// Contact-data detection
// ---------------------------------------------------------------------------

/**
 * Matched against the key with everything but letters stripped, so `e-mail`,
 * `phone_number`, `emailAddress` and `Telephone` all normalise onto a needle.
 * `^tel$` is anchored so it catches the bare schema.org-adjacent `tel` key
 * without firing on an innocent word that merely contains those letters.
 */
const CONTACT_KEY = /telephone|phone|^tel$|email|fax|mobile|contactpoint/;

function isContactKey(key: string | null): boolean {
  if (key === null) return false;
  return CONTACT_KEY.test(key.toLowerCase().replace(/[^a-z]/g, ""));
}

/** `someone@example.com`, with or without a `mailto:` scheme. */
const EMAIL_SHAPED = /mailto:|[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/i;

/**
 * Seven or more digits in sequence, allowing the usual separators — so
 * `7805550199`, `780-555-0199` and `+1 (780) 555-0199` all match — plus the
 * `tel:` URI scheme. Seven is the floor deliberately: it clears the
 * month-precision `YYYY-MM` dates this graph legitimately carries (six digits)
 * without letting a local subscriber number through.
 */
const PHONE_SHAPED = /\btel:|(?:\+?\d[\s().-]*){7,}/;

function asText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

/**
 * Every place in the graph that looks like contact data, described well enough
 * to fix. An empty array is the assertion every absence test makes.
 */
function contactFindings(root: unknown): string[] {
  const findings: string[] = [];
  for (const node of walk(root)) {
    if (isContactKey(node.key)) {
      findings.push(`${node.path} — contact-shaped key '${node.key}'`);
      continue;
    }
    const text = asText(node.value);
    if (text === null) continue;
    if (EMAIL_SHAPED.test(text)) {
      findings.push(`${node.path} — email-shaped value: ${text}`);
    } else if (PHONE_SHAPED.test(text)) {
      findings.push(`${node.path} — telephone-shaped value: ${text}`);
    }
  }
  return findings;
}

/** Keys present with an `undefined` value — the shape `endDate` must never take. */
function undefinedValuedKeys(root: unknown): string[] {
  return walk(root)
    .filter((node) => node.key !== null && node.value === undefined)
    .map((node) => node.path);
}

// ---------------------------------------------------------------------------
// Synthetic fixtures
// ---------------------------------------------------------------------------

const FIXTURE_SUMMARY =
  "Synthetic fixture summary that exists only to satisfy the profile summary length guard while these JSON-LD tests run against fabricated content.";

function fixtureRole(organisation: string, start: string, end?: string): ExperienceRole {
  const base = {
    organisation,
    organisationUrl: "https://fixture.example.com",
    title: "Synthetic Fixture Role",
    start,
    location: "Fixtureville, Testland",
    summary: "Synthetic fixture row that exists only to exercise buildProfileJsonLd().",
    highlights: ["Synthetic fixture highlight that exists only to exercise the JSON-LD builder."],
  };
  return end === undefined ? base : { ...base, end };
}

function fixtureCredential(
  credential: string,
  institution: string,
  completed: string,
  institutionUrl?: string,
): EducationEntry {
  const base = { credential, institution, completed };
  return institutionUrl === undefined ? base : { ...base, institutionUrl };
}

type ContentFixture = {
  experience: ExperienceRole[];
  skills: SkillGroup[];
  education: EducationEntry[];
};

async function buildWith(content: Partial<ContentFixture>): Promise<ProfileJsonLd> {
  vi.resetModules();
  vi.doMock("#site/content", () => ({
    experience: content.experience ?? [],
    skills: content.skills ?? [],
    education: content.education ?? [],
    profile: { summary: FIXTURE_SUMMARY },
  }));
  const { buildProfileJsonLd: build } = await import("@/lib/profile-json-ld");
  return build();
}

afterEach(() => {
  vi.doUnmock("#site/content");
  vi.resetModules();
});

// The real graph, built once from the shipped collections.
const jsonLd = buildProfileJsonLd();

// ---------------------------------------------------------------------------

describe("contact-data detector — guards the absence assertions from going vacuous", () => {
  it.each([
    "telephone",
    "Telephone",
    "TELEPHONE",
    "tel",
    "phone",
    "phoneNumber",
    "phone_number",
    "email",
    "e-mail",
    "emailAddress",
    "faxNumber",
    "mobile",
    "contactPoint",
  ])("flags the key '%s'", (key) => {
    expect(contactFindings({ [key]: "redacted" })).toHaveLength(1);
  });

  it("finds a telephone three levels deep, where a top-level key check sees nothing", () => {
    const graph = {
      "@context": "https://schema.org",
      "@type": "Person",
      affiliation: [
        {
          "@type": "OrganizationRole",
          roleName: "Synthetic Fixture Role",
          affiliation: {
            "@type": "Organization",
            name: "Fixture Co",
            telephone: "+1 (555) 010-0199",
          },
        },
      ],
    };

    // This is precisely the check this suite exists to replace: the shallow
    // version passes on a graph that plainly carries a telephone.
    expect(Object.keys(graph)).not.toContain("telephone");

    expect(contactFindings(graph)).toEqual([
      "$.affiliation[0].affiliation.telephone — contact-shaped key 'telephone'",
    ]);
  });

  it("finds an email inside an array, under an innocuous key", () => {
    const graph = { sameAs: ["https://github.com/example", "someone@example.com"] };
    expect(contactFindings(graph)).toEqual([
      "$.sameAs[1] — email-shaped value: someone@example.com",
    ]);
  });

  it("finds a bare phone number under an innocuous key", () => {
    const graph = { description: "Reach the fixture desk on 780-555-0199 any weekday." };
    expect(contactFindings(graph)).toHaveLength(1);
  });

  it("does not flag the value shapes this graph legitimately carries", () => {
    expect(
      contactFindings({
        startDate: "2026-01",
        endDate: "2019-12",
        url: "https://www.matthewfield.ca/profile",
        sameAs: ["https://github.com/madmatt112", "https://www.linkedin.com/in/matthewcfield"],
        name: "Matthew Field",
        roleName: "Infrastructure Engineer III",
      }),
    ).toEqual([]);
  });
});

describe("buildProfileJsonLd — no contact data at any depth (Req 7.3)", () => {
  it("emits no contact-shaped key or value anywhere in the graph", () => {
    expect(contactFindings(jsonLd)).toEqual([]);
  });

  it("never emits the configured email address, at any depth", () => {
    expect(JSON.stringify(jsonLd)).not.toContain(siteConfig.links.email);
    expect(jsonLd.sameAs).not.toContain(siteConfig.links.email);
  });

  it("keeps contact data out when built from synthetic content too", async () => {
    const built = await buildWith({
      experience: [fixtureRole("Fixture Current Co", "2020-01")],
      skills: [{ category: "Fixture Skills", items: ["fixture-item"] }],
      education: [fixtureCredential("Fixture Credential", "Fixture Institute", "2015-06")],
    });
    expect(contactFindings(built)).toEqual([]);
  });
});

describe("buildProfileJsonLd — schema.org Person shape (Req 7.1)", () => {
  it("declares the schema.org context and the Person type", () => {
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("Person");
  });

  it("names the person from siteConfig and points url at /profile", () => {
    expect(jsonLd.name).toBe(siteConfig.name);
    expect(jsonLd.url).toBe(`${siteConfig.url}/profile`);
  });

  it("takes description from the profile summary rather than restating it", () => {
    expect(jsonLd.description).toBe(profileSummary);
  });

  it("lists only profile URLs in sameAs", () => {
    expect(jsonLd.sameAs).toEqual([siteConfig.links.linkedin, siteConfig.links.github]);
  });

  it("derives knowsAbout from the skill groups", () => {
    expect(jsonLd.knowsAbout).toEqual(getSkills().flatMap((group) => group.items));
    expect(jsonLd.knowsAbout.length).toBeGreaterThan(0);
  });

  it("states the occupational category on hasOccupation", () => {
    expect(jsonLd.hasOccupation).toEqual({
      "@type": "Occupation",
      name: siteConfig.description,
    });
  });

  it("takes jobTitle and worksFor from the most recent role", () => {
    const roles = getExperience();
    expect(jsonLd.jobTitle).toBe(roles[0]?.title);
    expect(jsonLd.worksFor).toEqual({
      "@type": "Organization",
      name: roles[0]?.organisation,
      url: roles[0]?.organisationUrl,
    });
  });

  it("serializes losslessly and carries no undefined-valued key", () => {
    // Both matter for an inline <script type="application/ld+json">: an
    // `undefined` value silently disappears on stringify, so a key that is
    // present-but-undefined is not the same thing as a key that is absent.
    expect(undefinedValuedKeys(jsonLd)).toEqual([]);
    expect(JSON.parse(JSON.stringify(jsonLd))).toEqual(jsonLd);
  });
});

describe("buildProfileJsonLd — dated affiliation entries (Req 7.1)", () => {
  it("emits one OrganizationRole per role, in the same order as the page", () => {
    const roles = getExperience();
    expect(jsonLd.affiliation).toHaveLength(roles.length);
    expect(jsonLd.affiliation.map((entry) => entry.roleName)).toEqual(roles.map((r) => r.title));
  });

  it("carries roleName, a month-precision startDate, and a nested organisation", () => {
    expect(jsonLd.affiliation.length).toBeGreaterThan(0);
    for (const entry of jsonLd.affiliation) {
      expect(entry["@type"]).toBe("OrganizationRole");
      expect(entry.roleName.length).toBeGreaterThan(0);
      expect(entry.startDate).toMatch(/^\d{4}-\d{2}$/);
      expect(entry.affiliation["@type"]).toBe("Organization");
      expect(entry.affiliation.name.length).toBeGreaterThan(0);
    }
  });

  it("gives every finished role a month-precision endDate", () => {
    const finished = getExperience().filter((role) => role.end !== undefined);
    expect(finished.length).toBeGreaterThan(0);
    for (const role of finished) {
      const entry = jsonLd.affiliation.find((node) => node.roleName === role.title);
      expect(entry?.endDate).toBe(role.end);
    }
  });

  it("omits the endDate KEY on the shipped current role", () => {
    const current = getExperience().find((role) => role.end === undefined);
    expect(current).toBeDefined();
    const entry = jsonLd.affiliation.find((node) => node.roleName === current?.title);
    expect(entry).toBeDefined();
    // Own-property style on purpose: `toBeUndefined()` would also pass on an
    // explicit `endDate: undefined`, which is a different object.
    expect(Object.keys(entry ?? {})).not.toContain("endDate");
    expect("endDate" in (entry ?? {})).toBe(false);
  });

  it("omits the endDate KEY for a current role in synthetic content", async () => {
    const built = await buildWith({
      experience: [
        fixtureRole("Fixture Current Co", "2020-01"),
        fixtureRole("Fixture Ended Co", "2015-01", "2019-12"),
      ],
    });
    const [current, ended] = built.affiliation;

    expect(current?.roleName).toBe("Synthetic Fixture Role");
    expect(current?.startDate).toBe("2020-01");
    expect(Object.keys(current ?? {})).not.toContain("endDate");
    expect("endDate" in (current ?? {})).toBe(false);

    expect(ended?.endDate).toBe("2019-12");
    expect(built.worksFor).toEqual({
      "@type": "Organization",
      name: "Fixture Current Co",
      url: "https://fixture.example.com",
    });
  });

  it("omits worksFor entirely when no role is current", async () => {
    const built = await buildWith({
      experience: [fixtureRole("Fixture Ended Co", "2015-01", "2019-12")],
    });
    expect("worksFor" in built).toBe(false);
    expect(built.affiliation).toHaveLength(1);
  });
});

describe("buildProfileJsonLd — alumniOf", () => {
  it("collapses the two shipped NAIT credentials into a single institution", () => {
    // The node carries no credential detail, so two credentials from one school
    // would emit the identical organisation twice. Adjudicated in task 15's
    // review: one entry, not two.
    const institutions = new Set(getEducation().map((entry) => entry.institution));
    expect(institutions.size).toBe(1);
    expect(jsonLd.alumniOf).toHaveLength(1);
    expect(jsonLd.alumniOf[0]?.["@type"]).toBe("EducationalOrganization");
    expect(jsonLd.alumniOf[0]?.name).toBe([...institutions][0]);
  });

  it("keeps distinct institutions apart", async () => {
    const built = await buildWith({
      education: [
        fixtureCredential(
          "Fixture Degree",
          "Fixture Institute",
          "2018-01",
          "https://a.example.com",
        ),
        fixtureCredential("Fixture Diploma", "Other Fixture School", "2016-04"),
      ],
    });
    expect(built.alumniOf.map((entry) => entry.name)).toEqual([
      "Fixture Institute",
      "Other Fixture School",
    ]);
  });

  it("returns an empty alumniOf when there is no education at all", async () => {
    expect((await buildWith({ education: [] })).alumniOf).toEqual([]);
  });
});

describe("buildProfileJsonLd — determinism and purity", () => {
  it("returns an equal graph on every call", () => {
    expect(buildProfileJsonLd()).toEqual(buildProfileJsonLd());
  });

  it("returns a fresh object each call, so a caller cannot poison the next one", () => {
    const first = buildProfileJsonLd();
    expect(first).not.toBe(buildProfileJsonLd());
    first.affiliation.push(...first.affiliation);
    first.knowsAbout.length = 0;
    expect(buildProfileJsonLd()).toEqual(jsonLd);
  });

  it("leaves the selectors' output untouched", () => {
    const before = {
      experience: getExperience(),
      skills: getSkills(),
      education: getEducation(),
    };
    buildProfileJsonLd();
    expect({
      experience: getExperience(),
      skills: getSkills(),
      education: getEducation(),
    }).toEqual(before);
  });
});
