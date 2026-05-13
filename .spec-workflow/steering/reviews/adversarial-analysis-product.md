# Adversarial Analysis: Product Overview — matthewfield.ca

---

## 1. Target User Analysis — Challenging the Prioritization and Completeness

### The stated priority does not match the feature investment

The document names "potential employers and recruiters" as user segment #1, but the feature allocation tells a different story. Of the ten key features, only one (Professional Profile) is directly recruiter-facing. The remaining feature investment is overwhelmingly community/peer-oriented: a 14-sub-feature blog, a playground with independent architectures, a resources/blogroll page, IndieWeb slash pages (/now, /colophon, /slashes). A recruiter will never read a /colophon page. They will not browse a blogroll. The site is being built primarily for peers, the broader internet, and Matthew's own satisfaction — but the document frames it as a professional funnel first. This mismatch will surface during every prioritization decision: "should I polish the resume page or add footnotes to the blog?" The document gives no framework for resolving that tension because it won't admit it exists.

### The four user segments are not cleanly distinct

A recruiter evaluating Matthew and a peer evaluating Matthew's work both land on the Project Showcase and want the same things: what was this, what was hard about it, what was the outcome. The document treats these as separate audiences but proposes one set of project cards to serve both. There is no discussion of whether project writeups should lead with business impact (recruiter lens) or technical depth (peer lens), or how to structure a page that satisfies both without boring either.

Similarly, "general visitors" is not a user segment — it is the absence of one. Anyone who isn't a recruiter, peer, or Matthew is a "general visitor." This tells you nothing about what they need or how to serve them. It exists to justify features (blog, playground) that don't serve the stated primary audience.

### Missing user journeys

The document describes features but never describes a single end-to-end user journey. Specific gaps:

- **Recruiter flow**: A recruiter clicks a link from LinkedIn or a job application. They land on... where? The landing page? The professional profile directly? The document doesn't say. Once on the site, what is the expected path to "get in touch"? How many clicks to reach the contact form? What if they want a downloadable resume/PDF — the document doesn't mention one, which is a real problem since recruiters routinely need to forward candidate materials to hiring managers in document form.
- **Mobile behavior**: Recruiters frequently browse on phones. The landing page is described as "full-viewport" with "mini-preview/hero cards" all visible without scrolling. This may be feasible on desktop but almost certainly not on a phone screen. There is no discussion of how the landing page, navigation, or professional profile (described as "long-scroll" and "wide layout") adapts to small screens.
- **Search visitor flow**: Someone arrives from Google on a blog post. What pulls them deeper into the site? Related posts and navigation are listed as features, but there's no discussion of how blog visitors discover the professional or project content. If the blog is a top-of-funnel content channel (which is the only reason "general visitors via search results" matters), the document should describe the funnel from blog post to professional profile or project showcase.

### "Matthew himself" as a user segment

This is simultaneously the most honest and the most underdeveloped entry. The authoring experience is arguably the most important thing to get right — if it's painful to add content, the site will rot. But the document reduces this to "easy to update via markdown files." There is no discussion of the authoring workflow: Where are markdown files stored? Is there a local preview server? How does Matthew preview draft blog posts? How does he add a new playground item — does he scaffold a directory, create a config entry, both? The inclusion of this user segment is correct, but it deserved a dedicated section on authoring ergonomics, not a single sentence.

---

## 2. Feature Scope and Prioritization — Bloat and Gaps

### Blog feature bloat

The blog lists 14 distinct sub-features for a site that does not yet exist and has no existing readership. Several of these add implementation complexity with near-zero value at launch:

- **Reading progress bar**: A cosmetic feature. No user segment listed in the document makes decisions based on a progress bar. This is pure scope creep.
- **Social sharing buttons**: In 2026, social sharing buttons have negligible click-through rates. Users who want to share copy the URL. This adds visual clutter and implementation work for effectively zero engagement.
- **Related posts suggestions**: Requires either manual tagging or algorithmic similarity matching. With fewer than ~20 posts, this feature will produce poor or repetitive suggestions. It's a feature that becomes useful at scale and is noise before that.
- **Series/multi-part post grouping**: A valid concept but premature. This can be added when the first series is written. Building it before any content exists risks building the wrong abstraction.
- **Footnotes/sidenotes**: Sidenotes in particular require significant responsive layout work (where do they go on mobile?). Footnotes alone are simpler but the document lists both without distinguishing the implementation cost.
- **Search**: Client-side text search over a small number of blog posts is achievable but still non-trivial to implement well (indexing, UI, performance). With a small corpus, it's faster for a visitor to scan the post listing or use browser Ctrl+F.

Features that actually matter for the stated audiences (recruiter wants to assess communication ability, peer wants to read a post) are: the post listing, tags/categories, RSS feed, code syntax highlighting, and reading time. That's five features, not fourteen.

### Playground feasibility is severely under-specified

The statement "potentially with its own architecture, dependencies, and even small backends" is doing enormous work in a single sentence. This raises unanswered questions that will each become a blocking decision during implementation:

- **Routing**: How does `/playground/item-name` resolve to an independent app? Is each item an iframe? A separate route handled by the framework? A subdomain? Each answer has fundamentally different implications for build tooling and deployment.
- **Dependencies**: If playground item A uses Three.js and item B uses Phaser, are these bundled separately? Does the main site build process need to know about them? Can a playground item use a different framework entirely (e.g., a Svelte app inside a React site)?
- **Backends**: "Even small backends" implies server-side compute. The rest of the site is described as static/pre-rendered. Where do these backends run? How are they deployed? This is potentially an entire infrastructure project buried in a parenthetical.
- **Maintenance**: What happens when a playground item's dependencies have vulnerabilities? If each item is independent, updating them is N separate maintenance tasks. The document claims "simple to maintain" as a principle but the playground design undermines that directly.

The playground as described is not a feature — it is an open-ended platform capability. It needs hard constraints or it will consume unbounded implementation time.

### Project Showcase vs. Contributions Gallery — arbitrary asymmetry

Projects get dedicated subpages; contributions do not. The document offers no rationale for this distinction. The implicit reasoning seems to be "projects are bigger," but this breaks immediately in practice: a significant contribution to a major open-source project (e.g., a substantial Kubernetes PR) could easily warrant more discussion than a small personal project. The document provides no mechanism for a contribution to "graduate" to a subpage, and no guidance for when content outgrows the card format.

### Professional Profile vs. /about — content boundary is unclear

The Professional Profile is described as "a visual resume/CV" and /about is described as "who is Matthew" as a person. In practice, these overlap significantly. Both will mention career background. Both will mention interests (the /about page explicitly, the professional profile implicitly through project choices). A visitor who reads one and then navigates to the other will encounter redundant content and wonder why they're separate pages.

More critically: when a recruiter lands on /about (a plausible first click from "About" in a nav bar), they may think they've seen the professional content and leave. The professional profile — the page actually designed for them — might be labeled something like "Experience" or "Resume" in the nav, but the document doesn't specify navigation labels. If /about is in the nav and the professional profile is also in the nav, visitors must choose between two "about Matthew" pages with no clear guidance on which one serves their need.

---

## 3. Success Metrics and Business Objectives — What Can't Be Measured

### Contact form submissions is a weak primary metric

In 2026, the dominant channel for professional outreach to tech workers is LinkedIn messaging. Recruiters already have established workflows there: InMail, connection requests, message sequences. A contact form on a personal site is a secondary channel at best. Realistic expectation: near-zero submissions per month, with most "inbound" still arriving via LinkedIn.

This means the primary business objective ("professional inbound funnel") has no measurable success indicator. The site could be wildly successful at convincing a recruiter Matthew is a strong candidate — and that recruiter would still reach out on LinkedIn, not through a contact form. The form's existence is fine, but treating its submission count as a success metric will produce a misleading signal (zero submissions = site is failing, even if it's doing its actual job).

A more meaningful metric would be: "Are hiring managers/recruiters viewing the professional profile and projects after Matthew shares the link?" This requires analytics, which the document lists as a future enhancement rather than a launch capability.

### Content velocity is a capability, not a metric

"Matthew is able to add new blog posts by editing markdown files" is a technical requirement, not a success metric. A metric requires a threshold. How many posts in the first six months? How many projects added? Without targets, this "metric" will be satisfied the moment the first blog post is published and then never evaluated again. Meanwhile, the site could go a year without a new post and technically still meet this criterion.

### Performance has no targets

"Pages load fast" and "no unnecessary JavaScript" are sentiments, not specifications. Without a Lighthouse performance target, an LCP budget, or a bundle size limit, any performance discussion during implementation will devolve into subjective debate. "Fast enough" for Matthew on his home broadband is not "fast enough" for a recruiter on a phone over LTE. Concrete targets to set: Lighthouse performance score >= 90, LCP < 2.5s, total JS bundle for content pages < 50KB.

### Platform independence is a preference, not a business objective

"Independence from platforms" is a philosophical value, and that's fine. But framing it as a business objective implies it should drive feature decisions and be measurable. It cannot be meaningfully measured (you either self-host or you don't — it's a binary architectural choice, not an outcome to optimize). Listing it alongside "professional inbound funnel" gives it equal weight in prioritization, which will lead to scope decisions justified by ideology rather than user value (e.g., "we can't use Disqus for comments because platform independence" even if it's the pragmatic choice).

---

## 4. Product Principles — Internal Contradictions

### "Wide and spacious" vs. long-form readability

The document says "use the viewport generously" and "no restrictively narrow content columns." Reading research is consistent: 50-75 characters per line is optimal for comfortable reading of long-form text. The blog is a core feature. Blog posts are long-form text. A blog post rendered at full viewport width on a 1440px+ monitor will produce lines of 150+ characters, which is actively hostile to reading.

This principle will either be violated for the blog (adding a content width constraint, which is what every readable blog does) or it will produce an unreadable blog. The document needs to distinguish between layout-level spaciousness (generous margins, breathing room, no cramped grids) and content-column width (which should be constrained for readability). As written, the principle is ambiguous enough to cause a design conflict on day one.

### "Markdown-first" vs. interactive feature requirements

The document claims markdown-first authoring and "simple to maintain," but the feature list requires substantial client-side JavaScript:

- Dark/light mode toggle with persistence (requires JS + localStorage/cookie)
- Blog search (requires JS for client-side search or an API call)
- Reading progress bar (requires JS scroll event listener)
- Code copy button (requires JS clipboard API)
- Contact form submission (requires JS or a form action endpoint)
- Click-to-reveal email obfuscation (requires JS)
- Social sharing buttons (requires JS for share APIs)
- Auto-generated table of contents (could be build-time, but interactive highlighting requires JS)

This is not a "simple" static site. It is a JavaScript application that renders markdown. That's fine — many modern sites work this way — but the document's framing of "simple to maintain" and "no unnecessary JavaScript" creates a false expectation. The principle should acknowledge that the site will ship meaningful client-side JS and define what "unnecessary" means in that context.

### The static/dynamic boundary is not as clean as stated

"The main site sections are static/pre-rendered. The playground allows for dynamic, per-item architectures." But the main site already needs dynamic behavior: theme toggling, search, form submission, scroll-based progress tracking. These are client-side interactive features on "static" pages. The boundary the document draws is between "static HTML with JS hydration" and "fully dynamic apps," but it doesn't articulate that distinction. Someone reading this principle would expect content pages to be plain HTML with no JS, which is not what the feature list demands.

---

## 5. Missing Concerns

### SEO strategy is absent

The blog is a primary content channel. "General visitors via search results" is a stated user segment. Yet the document contains no discussion of:

- **Meta tags and Open Graph**: Critical for social sharing (which is a listed blog feature!) and search appearance.
- **Structured data / JSON-LD**: For blog posts (Article schema), professional profile (Person schema), projects. This directly affects how the site appears in search results.
- **Canonical URLs**: If blog posts can be accessed via multiple routes (by slug, by date, through series navigation), canonicalization prevents duplicate content penalties.
- **XML sitemap**: The document mentions an HTML sitemap at /sitemap. An HTML sitemap is for humans. An XML sitemap is for search engines. These are different things. The XML sitemap is the one that matters for SEO and is not mentioned.
- **Robots.txt**: Not mentioned. Playground items in particular might need to be excluded from indexing.
- **URL structure**: No discussion of blog post URL format (`/blog/slug` vs `/blog/YYYY/MM/slug`). This is an SEO-relevant decision that's painful to change after launch.

### Accessibility is not mentioned

The document contains zero references to accessibility: no WCAG compliance target, no mention of screen reader support, keyboard navigation, color contrast, focus management, or alt text for images. For a professional site from an infrastructure engineer — someone who understands standards and systems — launching without accessibility consideration is both a practical risk (excluding users) and a credibility risk (peers and employers may notice). The dark/light mode toggle, in particular, requires careful contrast management in both themes.

### Content migration is unaddressed

The opening sentence says the site "replaces an existing WordPress.com site." The document says nothing about:

- Whether existing blog posts will be migrated.
- Whether existing URLs will have redirects (301s) to preserve any SEO equity and prevent link rot.
- Whether the WordPress.com site will be taken down, left up, or redirected at the domain level.

If there is existing content with external links pointing to it, launching a new site without redirects will produce 404s and abandon any search ranking the existing content has. Even if the WordPress.com site has minimal content, the migration/redirect plan should be explicit.

### Contact form backend is unspecified

The contact form appears in two places (Professional Profile and /contact). The document describes the frontend (name, email, message) but says nothing about:

- Where submissions are delivered (email, a database, a third-party service like Formspree/Netlify Forms).
- Spam prevention (CAPTCHA, honeypot fields, rate limiting). Without this, the form will be overrun by spam bots within weeks of launch.
- Submission confirmation UX (what does the user see after submitting?).
- Failure handling (what if the submission endpoint is down?).

### Responsive design is not discussed

The landing page expects "all visible without scrolling" with multiple hero cards. The professional profile uses "wide layout to maximize viewport width." Both of these descriptions are desktop-specific. There is no mention of:

- How the landing page adapts to mobile (cards will certainly require scrolling on a phone).
- How the wide professional profile layout works on narrow screens.
- How navigation works on mobile (hamburger menu? collapsible?).
- Whether the reading progress bar, table of contents, or sidenotes have mobile-specific behavior.

Given that the primary user (recruiters) frequently browses on mobile, this is not an edge case — it's a core requirement that the document ignores entirely.

### No RSS discovery mechanism

RSS/Atom is listed as a blog feature, but there is no mention of `<link rel="alternate">` tags in the HTML head for feed auto-discovery. Without this, RSS readers cannot automatically detect the feed. This is a small detail but the kind of thing that makes RSS support actually work vs. being technically present but practically invisible.

---

## Deliverables

### Top 5 Risks or Gaps

1. **Playground scope is unbounded.** "Its own architecture, dependencies, and even small backends" is not a feature — it is an open-ended platform capability with no constraints on routing, build tooling, deployment, or maintenance. Without hard boundaries, implementation will either stall on architectural decisions or produce a fragile system. This is the single most likely feature to blow up the timeline.

2. **No responsive/mobile design consideration.** Recruiters are the stated primary audience and are likely to view the site on phones. The document describes a desktop-centric layout (full-viewport landing, wide professional profile, hero cards without scrolling) and says nothing about mobile adaptation. Building without mobile in mind from the start means either a retrofit (expensive) or a poor mobile experience (undermines the primary business objective).

3. **Blog feature scope is 3x what a launch needs.** Fourteen sub-features for a blog with zero existing posts and zero existing readership. Building reading progress bars, social sharing, related posts, series grouping, and search before the first post is published is premature. The risk is not just wasted implementation time — it's that the blog infrastructure becomes complex enough to discourage actually writing.

4. **No SEO or accessibility strategy.** The site wants search traffic ("general visitors via search results") but has no SEO plan. The site is a professional showcase but has no accessibility commitment. Both are easier to build in from the start than to retrofit. Launching without either means the blog won't rank and the site may exclude users who rely on assistive technology.

5. **Contact form is the only measurable success indicator, and it will show near-zero.** Professional outreach in 2026 overwhelmingly happens via LinkedIn. Without analytics (listed as a future enhancement, not a launch feature), there is no way to know if the site is achieving its primary business objective. The site could be succeeding and the only metric would say it's failing.

### Top 3 Conclusions to Challenge or Reverse

1. **Reverse: The blog should launch with 14 sub-features.** Launch with: post listing, tags, RSS, code highlighting, reading time, and table of contents. Add search, series, related posts, sidenotes, progress bar, and sharing buttons only after there is enough content to justify them. This cuts implementation scope roughly in half for the blog section while delivering full value to every stated user segment.

2. **Challenge: The playground should allow independent architectures and backends at launch.** Constrain v1 playground items to client-side-only, single-page apps that build as part of the main site. This eliminates the routing, deployment, and maintenance questions entirely. "Independent backends" can be a v2 capability added when a specific playground item actually needs it — not a general capability built speculatively.

3. **Challenge: "Wide and spacious" as an unqualified layout principle.** Restate this as: "Generous whitespace and breathing room in layout; readable line lengths (max ~75ch) for long-form content." The current phrasing will produce either an unreadable blog or an immediate violation of the site's own stated principle. It needs a qualifier before it drives design decisions.

### What's Missing

Before this document drives requirements or design, the following should be completed:

- **User journey maps** for at least two scenarios: a recruiter arriving from a LinkedIn link, and a developer arriving from a Google search on a blog post. Include mobile variants. These journeys should specify entry points, expected navigation paths, and desired exit actions.
- **Responsive design requirements**: At minimum, define breakpoints and describe how the landing page, professional profile, and blog adapt across desktop, tablet, and phone. This is not a design task — it's a product requirement that constrains design.
- **SEO baseline**: Meta tag strategy, Open Graph tags, XML sitemap, structured data requirements, URL structure for blog posts, and a redirect plan for any existing WordPress.com URLs.
- **Accessibility target**: State a WCAG conformance level (2.1 AA is standard) and note specific considerations for the theme toggle, code blocks, and interactive elements.
- **Playground constraints**: Define what a v1 playground item is and is not. Specify the routing model, build integration, and deployment model. Set a boundary on backend capability.
- **Contact form backend and spam strategy**: Decide on a submission handler and spam prevention approach before building the frontend.
- **Performance budgets**: Lighthouse score target, LCP target, JS bundle size budget for content pages.
- **Content migration plan**: Decide whether existing WordPress.com content migrates, redirects, or is abandoned. Document the plan either way.
- **Analytics at launch**: Move analytics from "future enhancement" to launch scope. Without it, there is no way to evaluate whether the site is achieving its primary business objective.
