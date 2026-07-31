type NavItem = {
  label: string;
  href: string;
};

type HeroCardConfig = {
  title: string;
  description: string;
  href: string;
};

export type SlashPage = {
  href: string;
  title: string;
  description: string;
};

type SiteConfig = {
  name: string;
  description: string;
  url: string;
  language: string;
  navItems: NavItem[];
  heroCards: HeroCardConfig[];
  slashPages: SlashPage[];
  links: {
    linkedin: string;
    github: string;
    email: string;
  };
};

export const siteConfig: SiteConfig = {
  name: "Matthew Field",
  description: "Infrastructure/Platform/DevOps engineer",
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
  heroCards: [
    {
      title: "Professional Profile",
      description: "Background, experience, and areas of focus.",
      href: "/profile",
    },
    {
      title: "Projects",
      description: "Selected works of my mind and hands.",
      href: "/projects",
    },
    {
      title: "Contributions",
      description: "Open-source contributions and community involvement.",
      href: "/contributions",
    },
    {
      title: "Blog",
      description: "Writing about tech, life, and sundry.",
      href: "/blog",
    },
    {
      title: "Resources",
      description: "Curated references and things worth sharing.",
      href: "/resources",
    },
    // Playground card intentionally omitted — see the note on navItems above.
  ],
  slashPages: [
    { href: "/about", title: "/about", description: "Who I am beyond the resume." },
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
  },
};
