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
  ogImage: string;
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
  url: "https://matthewfield.ca",
  language: "en-CA",
  ogImage: "/images/og-default.png",
  navItems: [
    { label: "Professional Profile", href: "/profile" },
    { label: "Projects", href: "/projects" },
    { label: "Contributions", href: "/contributions" },
    { label: "Blog", href: "/blog" },
    { label: "Resources", href: "/resources" },
    { label: "Playground", href: "/playground" },
  ],
  heroCards: [
    {
      title: "Professional Profile",
      description: "Background, experience, and areas of focus.",
      href: "/profile",
    },
    {
      title: "Projects",
      description: "Selected work across infrastructure and platform engineering.",
      href: "/projects",
    },
    {
      title: "Contributions",
      description: "Open-source contributions and community involvement.",
      href: "/contributions",
    },
    {
      title: "Blog",
      description: "Notes on tooling, systems, and the craft.",
      href: "/blog",
    },
    {
      title: "Resources",
      description: "Curated references and things worth sharing.",
      href: "/resources",
    },
    {
      title: "Playground",
      description: "Interactive experiments and demos.",
      href: "/playground",
    },
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
