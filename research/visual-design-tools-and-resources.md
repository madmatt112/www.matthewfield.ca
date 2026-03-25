# Visual Design Tools & Resources for matthew-field.ca

Research conducted 2026-03-23 to help bootstrap the visual design process for the website rebuild. Matthew is an infrastructure engineer, not a designer — these tools and resources are selected to help a developer create a professional, consistent visual design without deep design experience.

---

## Color Palette Tools

- **[Realtime Colors](https://www.realtimecolors.com/)** — Pick colors and see them applied to a realistic website mockup instantly. Built-in accessibility/contrast checker (AA/AAA). Exports to CSS, SCSS, PNG. The standout pick for developers.
- **[Coolors](https://coolors.co/)** — Press spacebar to cycle through palettes. Image-to-palette extraction. Export to code. Most popular general-purpose generator.
- **[Khroma](https://www.khroma.co/)** — AI-powered. Pick colors you like, it trains a model to generate palettes matching your taste. Good for "know it when I see it" people.
- **[Palettemaker](https://palettemaker.com/)** — AI color palette generator that previews colors on real design mockups.
- **[Color Hunt](https://colorhunt.co/)** — Curated community-submitted palettes. Browse by trend/popularity. Good for grabbing a known-good palette quickly.
- **[Paletton](https://paletton.com/)** — Classic tool based on color theory (RYB wheel). Generates harmonious 1-4 hue palettes.

**Practical tip:** Use the 60-30-10 rule — 60% dominant/background color, 30% secondary, 10% accent.

---

## Typography & Layout

- **[Typescale](https://typescale.com/)** — Generate a modular type scale (font size hierarchy) and export as CSS.
- **[Better Web Type](https://betterwebtype.com/)** — Free course + book on web typography specifically for developers. 20,000+ developers have used it.
- **[MDN: Design for Developers](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Design_for_developers)** — Mozilla's guide covering layout, color, typography fundamentals.

**Rules of thumb:** Body text 16px minimum. Line length 45-75 characters (66 ideal). Generous whitespace makes everything look more professional.

---

## Component Libraries & UI Kits

- **[shadcn/ui](https://ui.shadcn.com/)** — Copy-paste component library built on Radix + Tailwind CSS. Not a dependency you install; you own the code. Highly customizable. Current developer favorite.
- **[Origin UI](https://originui.com/)** — 400+ free shadcn-compatible components.
- **[DaisyUI](https://daisyui.com/)** — Tailwind CSS plugin with pre-styled component classes and theme switching. Lower effort than raw Tailwind.
- **[Preline UI](https://preline.co/)** — Free, open-source Tailwind components with Figma design system included.
- **[MUI (Material UI)](https://mui.com/)** — React component library. More opinionated (Material Design aesthetic) but very complete.

---

## Portfolio Templates (Starting Points)

- **[shadcn-portfolio](https://github.com/techwithanirudh/shadcn-portfolio)** — MIT-licensed, Next.js + shadcn/ui + Framer Motion. Single config file for personalization.
- **[Shadcnblocks templates](https://www.shadcnblocks.com/templates)** — Portfolio templates in Next.js and Astro editions.

**Animation-focused:**
- **[Aceternity UI](https://ui.aceternity.com/)** — 200+ animated components (React + Tailwind + Framer Motion).
- **[Magic UI](https://magicui.design/)** — 50+ animated components built on shadcn. Has pre-assembled page templates.
- **[Uiverse](https://uiverse.io/)** — Community library of free, copy-paste UI elements (CSS/Tailwind).

---

## AI-Assisted Design Tools

- **[Relume](https://www.relume.io/)** — Describe your site, get AI-generated wireframes and sitemaps. Exports to Figma or Webflow. Great for the "blank page" problem.
- **[v0 by Vercel](https://v0.dev/)** — Describe UI in natural language, get shadcn/ui + Tailwind code. Directly useful for Next.js/React projects.
- **[Uizard](https://uizard.io/)** — Type a description, get multi-screen mockups in seconds.
- **[Locofy](https://www.locofy.ai/)** — Converts Figma/Adobe XD designs into production React/Next.js/Vue code.
- **[Figma](https://www.figma.com/)** (free tier) — AI features now suggest layouts and auto-tidy components. Useful even for developers for trying layouts before coding.

**Suggested developer workflow:** Relume for initial wireframe/sitemap -> Realtime Colors for palette -> v0/Claude for generating component code -> iterate in editor.

---

## Hiring a Freelance Designer

**Platforms:**
- **[Upwork](https://www.upwork.com/)** — Largest marketplace. Median ~$21/hr, range $15-$30/hr mid-tier. Good filtering, escrow.
- **[Fiverr](https://www.fiverr.com/)** — Project-based pricing. Good for well-scoped tasks. $100-$500 for simple projects.
- **[Contra](https://contra.com/)** — No commission fees for freelancers, attracts quality talent.
- **[Toptal](https://www.toptal.com/)** — Vetted top 3%. Higher cost but consistent quality.

**Typical costs for this scope (personal site mockups in Figma):** $500-$1,500 project-based.

**What to look for:**
- Portfolio with clean, developer-oriented personal sites
- Delivers in Figma (so you can inspect spacing, colors, fonts)
- Understands responsive design
- Can articulate rationale for design choices

---

## Design Feedback Communities

- **[r/design_critiques](https://www.reddit.com/r/design_critiques/)** — Explicitly for critique requests. Enforces constructive feedback.
- **[r/UI_Design](https://www.reddit.com/r/UI_Design/)** — UI-specific feedback.
- **[r/web_design](https://www.reddit.com/r/web_design/)** — General web design discussion and feedback.
- **[Dribbble](https://dribbble.com/)** — More showcase-oriented; better for inspiration than feedback.
- **[Designer Hangout](https://www.designerhangout.co/)** (Slack) — UX-focused community with active critique channels.
- **[Dev.to](https://dev.to/)** — "Show Dev" posts for developer-perspective design feedback.
