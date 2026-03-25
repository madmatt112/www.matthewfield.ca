# Relume Prompts for matthew-field.ca

Generated 2026-03-23. Use these as the project-level and per-page prompts in Relume's sitemap generator.

---

## Master Project Prompt

> Personal website for an infrastructure/DevOps engineer. The home page is a dashboard-style overview with a short intro, photo, and preview cards linking to each section — no scrolling needed. The site has these pages: a long-scroll professional profile/visual resume with a contact form at the bottom, a project showcase gallery where each project links to its own detail page, a contributions gallery showing open-source work as cards on one page, a full-featured blog with individual post pages, a curated bookmarks/resources page grouped by category, a playground section listing self-contained interactive toys and small-web experiments, and IndieWeb slash pages: /about (personal, not professional), /contact (standalone contact page), /colophon (how the site is built), /now (current focus), /sitemap, and /slashes (index of slash pages). Dark/light mode toggle, wide spacious layout, professional but warm tone. No testimonials, no FAQ sections, no newsletter signups, no generic CTA sections.

---

## Per-Page Prompts

### Home

> Dashboard-style landing page. Short personal intro with professional photo at the top. Below that, a grid of preview cards — one for each major section: Professional Profile, Projects, Contributions, Blog, Resources, and Playground. Each card has a brief description and status indicator (e.g., latest blog post title, number of projects). All cards visible without scrolling on desktop. Dark/light mode toggle in the header. Wide layout. No testimonials, no newsletter, no FAQ.

### Profile (Visual Resume)

> Long-scroll professional profile page functioning as a visual resume/CV. Sections: header with name, title, and professional photo. About section with career narrative. Timeline section showing roles, companies, and milestones chronologically. Skills/proficiencies section with icons and brief descriptions. At the bottom, a contact section with LinkedIn, GitHub, bot-protected email (click-to-reveal), a contact form (name, email, message), and the copy "Shoot me a message - I respond to every human :)". Wide layout. No testimonials, no FAQ, no stats counters.

### Projects Gallery

> Visual gallery page for personal projects. Page header introducing the project showcase. Grid of project cards, each with a thumbnail/image, project name, short description, and tech stack badges. Each card links to a dedicated project detail page. Clean layout with breathing room between cards. No CTA section, no testimonials, no FAQ.

### Project Detail

> Individual project detail page. Hero section with project title, featured image or screenshot, and key metadata (tech stack, year, links to live demo and source). Long-form body section for project description: the story behind it, goals, challenges, and outcomes. Supports screenshots, GIF screen captures, and diagrams inline. Gallery section for additional media if needed. Links back to the projects gallery. No testimonials, no stats counters, no FAQ.

### Contributions

> Single-page gallery of curated open-source contributions. Page header with brief intro about OSS involvement. Cards/sections for each contribution, showing: the repo name and link, what was contributed, a short description, and a link to the relevant PR or commit. Cards can be grouped by theme (e.g., Collaboration, Automation, Documentation) if desired. All contributions on one page — no individual subpages. No FAQ, no CTA, no testimonials.

### Blog

> Blog listing page. Header introducing the blog with a warm, inviting tone. Featured/latest post highlighted at the top. Below that, a paginated grid or list of post previews showing title, date, tags, excerpt, and featured image. Sidebar or filter bar for categories and tags. Search input for basic text search. RSS feed link. Supports dark/light mode. No newsletter signup, no FAQ, no generic CTA.

### Blog Post

> Individual blog post page. Header with post title, publish date, last-updated date (if applicable), author, tags, and estimated reading time. Dark/light mode toggle. Auto-generated table of contents from headings (sidebar or top). Full article body supporting headings, images, code blocks with syntax highlighting and copy button, blockquotes, footnotes/sidenotes, and embedded media. Reading progress bar at the top. Previous/next post navigation at the bottom. Related posts section. Social sharing buttons. Wide but readable content column (~75 characters line length). No testimonials, no FAQ, no newsletter.

### Resources

> Curated bookmarks/links page. Simple, clean layout. Page header with brief description. Links grouped by category with section headers (e.g., "DevOps Tools", "Blogs & Feeds", "Reading", "Fun Stuff"). Each entry has a title (linked to the URL), and a one-line description. Scannable, not elaborate. No cards with thumbnails — just a clean organized list. No FAQ, no CTA, no newsletter.

### Playground

> Gallery/listing page for self-contained interactive experiments, toys, games, and small-web creations. Page header explaining this is a sandbox for fun builds. Grid of cards, each with a name, short description, and thumbnail or preview. Each card links to its own self-contained app/experiment (loaded in its own space, independent of the main site's styling). Playful tone. Does not use the site's dark/light mode — each item controls its own presentation. No FAQ, no CTA, no testimonials.

### /about

> Personal about page, distinct from the professional profile. Warm, human tone. Photo(s). Who Matthew is as a person — interests, hobbies, what he's curious about, where he lives. Not a resume — the profile page handles that. Short and genuine. No FAQ, no CTA, no testimonials.

### /contact

> Standalone contact page. LinkedIn and GitHub profile links. Bot-protected email address (click-to-reveal). Contact form with name, email, and message fields. Copy near the form: "Shoot me a message - I respond to every human :)". Simple, clean, focused. No FAQ, no testimonials, no newsletter.

### /colophon

> How the site is built. A single-page writeup describing the tech stack, hosting, CI/CD pipeline, design tools used, and any notable architectural decisions. Treats the site itself as a portfolio piece. Markdown-style prose, not a feature list. Brief and informative. No FAQ, no CTA.

### /now

> A "now" page following the IndieWeb /now convention. What Matthew is currently focused on — work, learning, building, reading, anything relevant. Updated regularly. Simple prose, possibly with a "last updated" date at the top. Short — a few paragraphs at most. No FAQ, no CTA, no testimonials.

### /sitemap

> Auto-generated HTML sitemap listing all pages on the site, organized by section. Clean, scannable list with links. Nothing else.

### /slashes

> Index page listing all slash pages on the site. Each entry has the page name (linked) and a one-line description of what it contains. Clean, minimal list. Nothing else.
