# Product Overview

## Product Purpose

matthewfield.ca is a personal website for Matthew Field, an infrastructure/platform/DevOps engineer. It replaces an existing WordPress.com site with a modern, markdown-driven, developer-owned site. It serves as a professional presence, a showcase for projects and open-source contributions, a blog, a curated resource directory, and a playground for small-web experiments.

## Target Users

1. **Potential employers and recruiters** — Looking for infrastructure/platform/DevOps engineers. Need to quickly assess Matthew's experience, skills, and communication ability. Want an easy way to get in touch.

2. **Peers and collaborators** — Fellow engineers, open-source contributors, and tech community members interested in Matthew's projects, blog posts, or shared resources.

3. **General visitors** — Anyone who lands on the site via a blog post, shared link, or search result. May be interested in the blog, resources, or playground items regardless of professional context.

4. **Matthew himself** — As the sole author and maintainer, the site must be easy to update via markdown files and straightforward to extend with new playground items.

## Key Features

### 1. Landing Page
A full-viewport overview page. Short personal intro with photo(s) at the top, followed by mini-preview/hero cards for each major section of the site (Professional Profile, Project & Contribution Showcase, Blog, Playground). All visible without scrolling. Each card links through to its full section.

### 2. Professional Profile
A single long-scroll page presenting Matthew's professional experience, skills, and background — functioning as a visual resume/CV. Content is authored in markdown. The page uses wide layout to maximize viewport width. Includes a contact section at the bottom with:
- LinkedIn, GitHub, and bot-protected email (click-to-reveal or obfuscation via react-obfuscate or similar)
- A contact form (name, email, message)
- Copy: "Shoot me a message - I respond to every human :)"

### 3. Project Showcase
A gallery page of project cards with visual previews. Each card links to a dedicated subpage with full project details — description, the story behind it, screenshots, GIF screen captures, technical details, and links. Content is markdown-driven. Projects are manually curated and added as Matthew launches or publishes them.

### 4. Contributions Gallery
A single page displaying curated open-source contributions as cards/sections. Each card shows the repo, what Matthew contributed, a short description, and links to the relevant PR/commit. Manually curated via markdown/data files. Does not have individual subpages — all contributions are presented on one page.

### 5. Blog
A full-featured blog with posts authored in markdown. Posts can cover any topic — technical, personal, hobbies, reading, anything.

**Features:**
- Reverse-chronological post listing
- Tags and categories
- RSS/Atom feed
- Estimated reading time
- Previous/next post navigation
- Search (basic text search)
- Auto-generated table of contents from headings
- Series/multi-part post grouping
- Draft/unpublished status (local only, not rendered in production)
- Code syntax highlighting with copy button
- Related posts suggestions
- Social sharing buttons
- Reading progress bar
- Footnotes/sidenotes
- Last-updated date displayed only if the post has been updated since publication

### 6. Resources
A simple bookmarks/links page. Each entry has a title, URL, and short description. Entries are grouped by category (e.g., "DevOps Tools", "Blogs & Feeds", "Reading", "Fun Stuff"). Content is markdown-driven. Not elaborate — a clean, scannable reference page. The "Blogs & Feeds" category serves as a blogroll.

### 7. Playground
A sandbox section for self-contained mini-apps, toys, games, curiosities, and small tools. Each playground item is its own independent thing — potentially with its own architecture, dependencies, and even small backends. These are "small web" creations that don't warrant their own repo, CI/CD, or domain. The playground section provides a listing/gallery of available items, and each item loads in its own space.

### 8. Slash Pages
Lightweight standalone pages following IndieWeb conventions:

- **/about** — A personal, human-focused page. Distinct from the Professional Profile — more "who is Matthew" than "what's on his resume." Photo(s), personality, interests, whatever feels right.
- **/contact** — Standalone contact page reusing the same contact components from the Professional Profile (LinkedIn, GitHub, obfuscated email, contact form, "Shoot me a message - I respond to every human :)").
- **/colophon** — How the site is built. Documents the tech stack, hosting, CI/CD, and design decisions. The site as its own portfolio piece.
- **/now** — What Matthew is currently focused on. Updated regularly. Useful for recruiters and peers who want to know what's happening right now.
- **/sitemap** — Auto-generated HTML sitemap listing all pages on the site.
- **/slashes** — An index page listing all slash pages with brief descriptions.

### 9. Site Navigation
A top navigation bar with links to each major section. Clean, functional, with styled buttons and center-justified layout.

### 10. Dark/Light Mode
A toggle for dark and light themes. Applies to the Professional Profile, Project Showcase, Contributions Gallery, Blog, Resources, Landing Page, and Slash Pages. Does not apply to Playground items (they control their own presentation).

## Business Objectives

- **Professional inbound funnel**: Make it easy for potential employers, recruiters, and collaborators to find Matthew, understand his experience, and get in touch.
- **Builder credibility**: Demonstrate active building and contributing through the project showcase, contributions gallery, and the website itself.
- **Personal expression**: Provide a space for writing, sharing, and building things outside of professional obligations.
- **Independence from platforms**: Own the content and presentation rather than depending on WordPress.com or any other managed platform.

## Success Metrics

- **Contact form submissions**: The site generates inbound professional inquiries.
- **Content velocity**: Matthew is able to add new blog posts, projects, contributions, and resources by editing markdown files without touching React components.
- **Playground extensibility**: New playground items can be added without restructuring the site.
- **Performance**: Pages load fast. Static content is fully static. No unnecessary JavaScript on content pages.

## Product Principles

1. **Wide and spacious**: Use the viewport generously. No restrictively narrow content columns. Long-form text (blog posts, project writeups) should constrain line length to ~75 characters for readability — spaciousness comes from generous whitespace and breathing room, not from stretching prose to the screen edges.
2. **Markdown-first content**: All regularly-updated content (profile, blog, projects, contributions, resources) is authored in markdown with frontmatter metadata and rendered by React components.
3. **Simple to maintain**: Matthew edits markdown files to update content. No CMS, no database for content sections, no complex deployment pipeline for content changes.
4. **Progressive complexity**: The main site sections are static/pre-rendered. The playground allows for dynamic, per-item architectures without affecting the rest of the site.
5. **Approachable and human**: The tone is professional but warm. The site should feel like a person's home on the internet, not a corporate template.
6. **Responsive**: The site works well on desktop, tablet, and phone. Mobile is not an afterthought — recruiters and peers will view this on phones. Navigation, the landing page hero cards, the professional profile, and blog layout all adapt gracefully to smaller screens.
7. **Accessible**: Target WCAG 2.1 AA conformance. Proper semantic HTML, keyboard navigation, sufficient color contrast in both themes, alt text for images, and screen reader support.

The visual system that realizes these principles — design tokens and roles, type/spacing scales, component conventions, theming, and the accessibility/performance gates — is defined in the design-system steering document (`.spec-workflow/steering/design-system.md`). The concrete visual identity (palette, type voice, motion) is intentionally deferred there to a later design spec.

## Future Vision

### Potential Enhancements
- **Newsletter/email subscription**: If the blog gains readership, add opt-in email delivery of new posts.
- **Comments**: Add a commenting system (e.g., Giscus via GitHub Discussions) to blog posts if community engagement develops.
- **Analytics**: Lightweight, privacy-respecting analytics (e.g., Plausible, Umami) to understand what content resonates.
- **Playground APIs**: If playground items need persistent backends, evaluate lightweight serverless options on a per-item basis.
