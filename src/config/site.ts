type NavItem = {
  label: string;
  href: string;
};

type HeroCardConfig = {
  title: string;
  description: string;
  href: string;
};

type SiteConfig = {
  name: string;
  description: string;
  url: string;
  ogImage: string;
  navItems: NavItem[];
  heroCards: HeroCardConfig[];
};

export const siteConfig: SiteConfig = {
  name: "Matthew Field",
  description: "Infrastructure/Platform/DevOps engineer",
  url: "https://matthewfield.ca",
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
};
