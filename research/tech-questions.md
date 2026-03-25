# Tech Stack Questions for tech.md

Answer inline below each question. Save the file when done.

---

## Framework & Runtime

**1. Are you set on Next.js (App Router)? Or considering alternatives like Astro (which is strong for content-heavy static sites)?**

Answer: I'm not completely set on Next.js, as long as I can use something non-static like Nextjs in the playground section of the website.

**2. Node version preference? (e.g., 22 LTS)**

Answer: No preference. LTS is fine unless it's almost end of support

---

## Styling & Components

**3. The research points toward shadcn/ui + Tailwind CSS. Is that the direction, or are you still deciding?**

Answer: I'm fine with shadcn/ui + Tailwind CSS as long as the components and styling can be modified to fit whatever design language/specs I end up settling on.

---

## Hosting & Deployment

**4. Where are you planning to host? Vercel, Cloudflare Pages, self-hosted, something else?**

Answer: I'm open to ideas and a wide array of options. Research which hosting options are going to fit the tech and structure of the website best.

**5. Domain/DNS — staying with the existing registrar, or moving?**

Answer: No need to change registrars.

---

## Content Pipeline

**6. Markdown rendering — plain markdown with gray-matter + remark/rehype, or MDX (markdown with embedded React components)?**

Answer: Discuss the difference with me.

**7. Content organization — using a content framework like Contentlayer / Velite / next-mdx-remote, or rolling your own file-based loader?**

Answer: What do these content frameworks bring to the table that would be worth the overhead? How much overhead are we talking about?

---

## Backend & Integrations

**8. Contact form — what should handle submissions? A service like Resend/Formspree, a serverless function + SMTP, or something else?**

Answer: An email SaaS would, I think, be fine.

**9. Search — client-side (e.g., Fuse.js/Pagefind) or server-side?**

Answer: My gut says client-side, but I want your thoughts as well. Don't kowtow to me.

---

## Playground

**10. How isolated should playground items be? Options range from "just separate React routes with their own components" to "fully independent apps loaded via iframe."**

Answer: Can you sketch out any of the "steps" in between the two extremes you mentioned in the question?

---

## Dev Tooling & Quality

**11. Any preferences on linting/formatting (ESLint + Prettier? Biome?), testing (Vitest? Playwright?), or CI (GitHub Actions?)?**

Answer: linting+formatting; no preference. testing; no preference/whatever works against the tech stack we choose. CI; not real preference but GHA seems like the natural choice being the repo is hosted thereon.

**12. Monorepo tooling (Turborepo, etc.) or keep it simple with a single package?**

Answer: Discuss the difference with me, and explain the pros/cons and tradeoffs of each.

---

## Other

**13. Any strong opinions on code syntax highlighting (Shiki vs Prism)?**

Answer: no

**14. Are you planning to use any of the AI design tools from your research (Relume, v0) to generate initial layouts, and should the tech stack accommodate that workflow?**

Answer: That's... an interesting question. How could the tech stack possibly accomodate the workflow that will define how the tech stack is implemented? What are you envisioning here?
