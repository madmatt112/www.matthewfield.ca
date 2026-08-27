type NavItem = {
  label: string;
  href: string;
};

/** One row of the landing page's path index. `label` follows the `/`. */
type HomeIndexEntry = {
  href: string;
  label: string;
  description: string;
};

export type SlashPage = {
  href: string;
  title: string;
  description: string;
};

type SiteConfig = {
  name: string;
  /** Meta description: one line on who this is and what the site is about. */
  description: string;
  /** Occupational category. Feeds the profile JSON-LD `hasOccupation`. */
  occupation: string;
  /** The line under the name on the site-wide social card. */
  tagline: string;
  /** Landing-page lead paragraph — the first thing a visitor actually reads. */
  intro: string;
  url: string;
  language: string;
  navItems: NavItem[];
  homeIndex: HomeIndexEntry[];
  slashPages: SlashPage[];
  links: {
    linkedin: string;
    github: string;
    email: string;
    storygraph: string;
  };
};

export const siteConfig: SiteConfig = {
  name: "Matthew Field",
  description:
    "Field notes from an engineer, ADHD dad, and solopreneur: healing old wounds and building my dreams.",
  occupation: "Infrastructure/Platform/DevOps engineer",
  tagline: "Heal the wounds. Build the dreams.",
  intro:
    "I'm a platform and infrastructure engineer with a decade of experience building reliable distributed systems and developer tooling. Mostly Kubernetes and the platforms developers build on top of it. I write good docs, and I care about open source.",
  // Canonical host = the actual serving host: the apex 301/307-redirects to
  // www, so www is canonical for SEO (canonical/OG/sitemap/feed all derive
  // from this) and is the trusted origin for the contact endpoint.
  url: "https://www.matthewfield.ca",
  language: "en-CA",
  navItems: [
    { label: "Professional Profile", href: "/profile" },
    { label: "Projects", href: "/projects" },
    { label: "Contributions", href: "/contributions" },
    { label: "Blog", href: "/blog" },
    { label: "Resources", href: "/resources" },
    // Playground is intentionally unlisted: the route still exists and renders
    // at /playground, it is just not advertised in the nav or on the homepage.
  ],
  homeIndex: [
    {
      href: "/now",
      label: "now",
      description: "What I'm focused on at the moment.",
    },
    {
      href: "/profile",
      label: "profile",
      description: "Background, experience, areas of focus.",
    },
    {
      href: "/projects",
      label: "projects",
      description: "Things I built, and why.",
    },
    {
      href: "/contributions",
      label: "contributions",
      description: "Open-source work worth pointing at.",
    },
    {
      href: "/blog",
      label: "blog",
      description: "Writing about tech, life, and sundry.",
    },
    {
      href: "/resources",
      label: "resources",
      description: "References and links worth sharing.",
    },
    {
      href: "/newsletter",
      label: "newsletter",
      description: "Essays by email, when there's something worth sending.",
    },
    // Playground intentionally omitted — see the note on navItems above.
  ],
  slashPages: [
    { href: "/now", title: "/now", description: "What I'm focused on right now." },
    { href: "/colophon", title: "/colophon", description: "How this site is built." },
    { href: "/contact", title: "/contact", description: "Get in touch." },
    { href: "/sitemap", title: "/sitemap", description: "Every page and post, in one list." },
    { href: "/slashes", title: "/slashes", description: "This index of standalone pages." },
  ],
  links: {
    linkedin: "https://www.linkedin.com/in/matthewcfield",
    github: "https://github.com/madmatt112",
    email: "hello@matthewfield.ca",
    storygraph: "https://app.thestorygraph.com/profile/madmatt112",
  },
};
