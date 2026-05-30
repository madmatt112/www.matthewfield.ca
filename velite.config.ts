import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { assets, defineConfig, defineCollection, s } from "velite";
import { siteConfig } from "@/config/site";
import { rehypeAbsolutizeUrls } from "./src/lib/build/rehype-absolutize-urls";
import { rehypeCopyButton } from "./src/lib/build/rehype-copy-button";
import { countWordsFromMdast } from "./src/lib/build/word-count";
import { KNOWN_FIXTURE_SLUGS, derivePostSlug } from "./src/lib/build/derive-post-slug.mjs";
import { checkProjectHeadings } from "./src/lib/build/check-project-headings";
import { contributionEntrySchema } from "./src/lib/build/contributions-schema";
import { resourceEntrySchema } from "./src/lib/build/resources-schema";
import { makeContentYamlLoader } from "./src/lib/build/content-yaml-loader";

// Typed content collections for the site. Downstream specs extend this file
// by adding more collections (blog, projects, etc.) following the `pages`
// pattern below. The build output is written to `.velite/` and imported
// through the `#site/content` path alias configured in `tsconfig.json`.

// Shared syntax-highlighting + plugin config. Both `mdx` and `markdown`
// top-level blocks reference the SAME constant arrays so plugin instances
// are not duplicated across collections.
const prettyCodeOptions = {
  theme: { light: "github-light", dark: "github-dark" },
  defaultColor: false,
  keepBackground: false,
} as const;

const sharedRemarkPlugins = [remarkGfm];
const sharedRehypePlugins = [
  rehypeSlug,
  rehypeCopyButton,
  [rehypePrettyCode, prettyCodeOptions] as [typeof rehypePrettyCode, typeof prettyCodeOptions],
  rehypeAbsolutizeUrls({ baseUrl: siteConfig.url }),
];

// MDX collection pattern — copy this block to add a new MDX-based collection.
// Flat glob (e.g. `pages/*.mdx`) keeps slugs single-segment so explicit route
// files can map to each entry without catch-all routing.
const pages = defineCollection({
  name: "Page",
  pattern: "pages/*.mdx",
  schema: s
    .object({
      title: s.string(),
      description: s.string(),
      slug: s.path(),
      body: s.mdx(),
    })
    .transform((data) => ({ ...data, slug: data.slug.replace(/^pages\//, "") })),
});

const profile = defineCollection({
  name: "Profile",
  pattern: "profile.mdx",
  single: true,
  schema: s
    .object({
      title: s.string(),
      description: s.string(),
      headline: s.string(),
      location: s.string(),
      availability: s.string(),
      headshot: s.image().optional(),
      body: s.mdx(),
    })
    .transform((data, { meta }) => {
      const filePath = meta.path;
      const out = execFileSync("git", ["log", "-1", "--follow", "--format=%cI", "--", filePath], {
        encoding: "utf8",
      }).trim();
      if (!out) {
        throw new Error(
          `[velite/profile] git log returned empty for ${filePath}. ` +
            `This typically indicates a shallow clone — ensure 'git fetch --deepen=1000' ` +
            `runs before velite build (see vercel.json buildCommand).`,
        );
      }
      return { ...data, updatedAt: out };
    }),
});

const posts = defineCollection({
  name: "Post",
  pattern: "posts/*.mdx",
  schema: s
    .object({
      title: s.string(),
      description: s.string(),
      date: s.isodate(),
      tags: s.array(s.string()).default([]),
      categories: s.array(s.string()).max(3).default([]),
      updated: s.isodate().optional(),
      draft: s.boolean().default(false),
      series: s.string().optional(),
      seriesOrder: s.number().optional(),
      hiddenFromLists: s.boolean().optional(),
      excludeFromSearch: s.boolean().optional(),
      slug: s.path(),
      body: s.mdx(),
      bodyHtml: s.markdown(),
    })
    .strict()
    .transform((data, { meta }) => {
      const fileRel = `content/posts/${path.basename(meta.path)}`;

      // 4.1 — Tag/category kebab-slug enforcement (REQ 4.6).
      const kebabRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      for (const value of [...data.tags, ...data.categories]) {
        if (!kebabRegex.test(value)) {
          throw new Error(
            `[velite/posts] ${fileRel}: invalid tag/category slug '${value}' — must match ^[a-z0-9]+(?:-[a-z0-9]+)*$ (e.g. 'devops-tooling')`,
          );
        }
      }
      // REQ 4.6: deduplicate but do NOT case-fold.
      const tags = [...new Set(data.tags)];
      const categories = [...new Set(data.categories)];

      // Fixture-slug audit (v2 — narrowed scope per r1 review). Exact match
      // against KNOWN_FIXTURE_SLUGS; published roster slugs must declare
      // hiddenFromLists: true or remain drafts. Authors of essays whose slug
      // merely begins with `fixture-` (e.g. `fixture-driven-testing`) are
      // unaffected — only the explicit roster fires.
      if (
        KNOWN_FIXTURE_SLUGS.has(data.slug) &&
        !data.draft &&
        data.hiddenFromLists !== true
      ) {
        throw new Error(
          `[velite/posts] ${fileRel}: slug '${data.slug}' is in the KNOWN_FIXTURE_SLUGS roster but is published without hiddenFromLists: true. Either rename the slug, mark it draft, or set hiddenFromLists: true.`,
        );
      }

      // 4.2 — Rejection visitor. Runs BEFORE reading-time so disallowed nodes
      // never reach downstream transforms.
      const content = meta.content;
      let rejectionTree;
      try {
        rejectionTree = unified()
          .use(remarkParse)
          .use(remarkGfm)
          .use(remarkMdx)
          .parse(content);
      } catch (parseErr) {
        throw new Error(
          `[velite/posts] ${fileRel}: mdx-parse-failure — ${(parseErr as Error).message}`,
        );
      }
      visit(rejectionTree, (node: { type: string; value?: unknown; depth?: number }) => {
        const t = node.type;
        if (t === "heading") {
          const depth = node.depth;
          if (typeof depth === "number" && depth >= 4) {
            if (process.env.BLOG_ALLOW_H4 !== "1") {
              throw new Error(
                `[velite/posts] ${fileRel}: heading depth ${depth} (h${depth}) is not supported by the TOC pipeline. Use h2/h3 only, or set BLOG_ALLOW_H4=1 to allow h4+ headings (they will not appear in the TOC).`,
              );
            }
            process.stderr.write(
              `[velite/posts] ${fileRel}: h${depth} heading present; not included in TOC. Set BLOG_ALLOW_H4=1 acknowledged.\n`,
            );
          }
        }
        if (t === "html") {
          const v = String(node.value ?? "");
          // HTML comments are mdast `type: 'html'` per `mdast-util-from-markdown`;
          // the FIXTURE-NOTE soft signal needs to survive the rejection layer.
          if (v.trimStart().startsWith("<!--") && v.trimEnd().endsWith("-->")) {
            return;
          }
          throw new Error(
            `[velite/posts] ${fileRel}: html rejected — ${v.slice(0, 80)}`,
          );
        }
        if (t === "mdxFlowExpression" || t === "mdxTextExpression") {
          // MDX-comment carve-out. MDX2's grammar excludes HTML comments
          // (`<!-- ... -->`); `{/* ... */}` is the canonical FIXTURE-NOTE
          // syntax once `s.mdx()` is in the pipeline. Strict predicate: the
          // entire trimmed value must be one comment span (lazy-match `*/`
          // so `{/* a */ + ident /* b */}` does NOT slip through).
          const v = String(node.value ?? "").trim();
          if (/^\/\*[\s\S]*?\*\/$/.test(v)) {
            return;
          }
          throw new Error(
            `[velite/posts] ${fileRel}: ${t} rejected — ${v.slice(0, 80)}`,
          );
        }
        if (
          t === "mdxJsxFlowElement" ||
          t === "mdxJsxTextElement" ||
          t === "mdxjsEsm"
        ) {
          const snippet = String(node.value ?? t).slice(0, 80);
          throw new Error(
            `[velite/posts] ${fileRel}: ${t} rejected — ${snippet}`,
          );
        }
      });

      // 4.3 — Reading-time transform (markdown-only stack, no remark-mdx).
      const readingTree = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .parse(content);
      const words = countWordsFromMdast(readingTree as Parameters<typeof countWordsFromMdast>[0]);
      const readingTime = Math.max(1, Math.round(words / 238));

      // 4.4 — CDATA-safe bodyHtml. Substitution applied to bodyHtml ONLY
      // (never to body, which remains the MDX compiled artifact).
      //
      // `s.markdown()` does not parse MDX, so an `{/* FIXTURE-NOTE: ... */}`
      // comment in the source survives as literal text and serializes to a
      // `<p>{/* ... */}</p>` paragraph in bodyHtml. The same comment is
      // invisible in `body` (the MDX compiler strips it). Strip those
      // paragraphs from bodyHtml so RSS subscribers don't see MDX comment
      // noise.
      const safeBodyHtml = data.bodyHtml
        .replace(/<p>\{\/\*[\s\S]*?\*\/\}<\/p>\s*/g, "")
        .replace(/\sdata-copy-source="[^"]*"/g, "")
        .split("]]>")
        .join("]]]]><![CDATA[>");

      return {
        ...data,
        tags,
        categories,
        // s.path() populates data.slug with the velite-root-relative path
        // (`posts/<basename>`). The shared derivePostSlug helper's contract is
        // "frontmatter.slug if user-supplied, otherwise basename of file path".
        // Velite has no first-class hook for raw YAML frontmatter inside a
        // transform, so we strip the `posts/` prefix here to mirror the
        // pages-collection pattern. Pass undefined so derivePostSlug falls
        // through to the basename branch.
        slug: derivePostSlug(meta.path, { slug: undefined }),
        readingTime,
        bodyHtml: safeBodyHtml,
      };
    }),
});

// Project link sub-schema (Component 1 v4 — Model 2). The `url` field is
// validated in two stages per Req 5.2: (a) Zod's `.url()` parser, (b) a
// `.refine()` step that re-parses with `new URL(url)` and restricts the
// protocol to `http:` / `https:`. The `kind` enum's rejection message is
// the exact string mandated by Req 5.1 — author-guidance contract.
const linkSchema = s
  .object({
    kind: s
      .enum(["demo", "repo", "docs", "package", "writeup"], {
        errorMap: (issue, ctx) => {
          if (issue.code === "invalid_enum_value") {
            return {
              message: `links[<i>].kind '${String(issue.received)}' is not in {demo,repo,docs,package,writeup}; omit 'kind' for a label-only entry with no icon.`,
            };
          }
          return { message: ctx.defaultError };
        },
      })
      .optional(),
    label: s.string().min(1).max(60),
    url: s
      .string()
      .url()
      .refine(
        (value) => {
          try {
            const parsed = new URL(value);
            return parsed.protocol === "http:" || parsed.protocol === "https:";
          } catch {
            return false;
          }
        },
        { message: "url must use http: or https: protocol" },
      ),
  })
  .strict();

// `projects` collection (Component 1 v4). Defined here but NOT yet registered
// in `defineConfig` — Task 8.4 registers after the transform chain in
// Tasks 8.2/8.3/8.4 is complete. Transform body is identity-only at this
// stage; later tasks extend the pipeline.
const projects = defineCollection({
  name: "Project",
  pattern: "projects/*.mdx",
  schema: s
    .object({
      title: s.string().min(1).max(120),
      description: s.string().min(50).max(160),
      summary: s.string().min(30).max(140),
      date: s.isodate(),
      cover: s.image(),
      coverAlt: s.string().min(1).max(250),
      tags: s.array(s.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(8).default([]),
      status: s.enum(["active", "archived", "concept"]).default("active"),
      ogImage: s.image().optional(),
      updated: s.isodate().optional(),
      draft: s.boolean().default(false),
      slug: s.path(),
      featured: s.boolean().default(false),
      links: s.array(linkSchema).max(6).optional(),
      body: s.mdx(),
    })
    .strict()
    .transform((data, { meta }) => {
      // Component 1 v4 — transform pipeline steps 1-4. Steps 5 (heading hygiene)
      // and 6 (draft-warning emit) are added by Tasks 8.3 and 8.4 respectively.
      const fileRel = `content/projects/${path.basename(meta.path)}`;

      // Step 1 — Strip `projects/` prefix from slug (and trailing `/index.mdx`
      // or `.mdx`). Mirrors the `pages` collection's slug-strip pattern.
      const slug = data.slug
        .replace(/^projects\//, "")
        .replace(/\/index\.mdx$/, "")
        .replace(/\.mdx$/, "");

      // Step 2 — Cover validation. Velite has already resolved data.cover into
      // its Image shape ({ src, width, height, ... }). Map the public src back
      // to the on-disk source path via velite's `assets` Map (key is the
      // hashed filename portion, value is the absolute source path).
      const COVER_WARN_BYTES = 500 * 1024; // 500 KB soft warning
      const COVER_FAIL_BYTES = 1024 * 1024; // 1 MB hard fail
      const COVER_MIN_WIDTH = 1200;
      const COVER_MIN_HEIGHT = 800;

      const coverAssetKey = data.cover.src.replace(/^\/static\//, "");
      const coverDiskPath = assets.get(coverAssetKey);
      if (coverDiskPath == null) {
        throw new Error(
          `[velite/projects] ${fileRel}: cover-asset-unresolved — could not map ${data.cover.src} to an on-disk path via velite's assets map for slug '${slug}'`,
        );
      }
      const coverSize = fs.statSync(coverDiskPath).size;
      if (coverSize >= COVER_FAIL_BYTES) {
        throw new Error(
          `[velite/projects] ${fileRel}: cover-too-large — '${slug}' cover is ${coverSize} bytes (>= ${COVER_FAIL_BYTES} byte hard-fail threshold)`,
        );
      }
      if (coverSize >= COVER_WARN_BYTES) {
        console.warn(
          `[velite/projects] ${fileRel}: cover-large — '${slug}' cover is ${coverSize} bytes (>= ${COVER_WARN_BYTES} byte soft-warn threshold)`,
        );
      }
      if (data.cover.width < COVER_MIN_WIDTH || data.cover.height < COVER_MIN_HEIGHT) {
        throw new Error(
          `[velite/projects] ${fileRel}: cover-too-small — '${slug}' cover is ${data.cover.width}x${data.cover.height} (< required ${COVER_MIN_WIDTH}x${COVER_MIN_HEIGHT})`,
        );
      }

      // Step 3 — ogImage validation (when present). Width >= 1200 px; aspect in
      // [1.72, 2.10]. When absent for a non-draft project, emit an INFO log
      // naming the slug and stating the site-default fallback applies.
      const OG_MIN_WIDTH = 1200;
      const OG_ASPECT_MIN = 1.72;
      const OG_ASPECT_MAX = 2.1;
      if (data.ogImage != null) {
        if (data.ogImage.width < OG_MIN_WIDTH) {
          throw new Error(
            `[velite/projects] ${fileRel}: ogImage-too-narrow — '${slug}' ogImage is ${data.ogImage.width}px wide (< required ${OG_MIN_WIDTH}px)`,
          );
        }
        const aspect = data.ogImage.width / data.ogImage.height;
        if (aspect < OG_ASPECT_MIN || aspect > OG_ASPECT_MAX) {
          throw new Error(
            `[velite/projects] ${fileRel}: ogImage-bad-aspect — '${slug}' ogImage aspect ratio ${aspect.toFixed(3)} (${data.ogImage.width}x${data.ogImage.height}) is outside the required [${OG_ASPECT_MIN}, ${OG_ASPECT_MAX}] range`,
          );
        }
      } else if (data.draft !== true) {
        console.info(
          `[velite/projects] ${fileRel}: ogImage absent for non-draft project '${slug}' — site-default OG image fallback applies`,
        );
      }

      // Step 4 — Links uniqueness per recognized `kind`. linkSchema already
      // validates each entry; this check enforces at most one entry per kind
      // across the array. Entries with no `kind` (label-only) are exempt.
      if (data.links != null) {
        const seenKinds = new Set<string>();
        for (const link of data.links) {
          if (link.kind == null) continue;
          if (seenKinds.has(link.kind)) {
            throw new Error(
              `[velite/projects] ${fileRel}: links-duplicate-kind — '${slug}' has more than one link with kind '${link.kind}'; each recognized kind may appear at most once`,
            );
          }
          seenKinds.add(link.kind);
        }
      }

      // Step 5 — Heading hygiene (Component 2 v4 / Reqs 6.9.a/6.9.b/6.9.c).
      // AST-only walk via remark-parse + remark-gfm + remark-mdx; rejects
      // h1 (mdast + mdxJsx), depth >= 4 unless PROJECTS_ALLOW_H4=1, and
      // enforces h2-first + no-deeper-level-skip on the mdast heading
      // sequence. Throws ProjectHeadingHygieneError on failure.
      checkProjectHeadings({ content: meta.content ?? "", path: fileRel });

      // Step 6 — Draft-warning emit (Risk 3 reversal).
      // Single-process pin: velite runs once per build in one Node process; one emit per draft
      // per build is sufficient. If a future velite upgrade introduces worker-thread isolation
      // for transforms, this pin breaks silently (each worker emits its own warning per draft).
      // Rollback signal: the upgrade-gate test at src/__tests__/velite-output-shape.test.ts
      // (Task 9) plus the integration assertion in Task 28.1 will detect the regression —
      // count of emitted warnings will exceed the count of draft fixtures.
      if (data.draft === true && process.env.PROJECTS_INCLUDE_DRAFTS === "1") {
        console.error(`[velite/projects] PROJECTS_INCLUDE_DRAFTS=1 — including draft project: ${slug}`);
      }

      return { ...data, slug };
    }),
});

const contributions = defineCollection({
  name: "Contribution",
  pattern: "contributions.yaml",
  schema: contributionEntrySchema,
});

const resources = defineCollection({
  name: "Resource",
  pattern: "resources.yaml",
  schema: resourceEntrySchema,
});

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    clean: true,
  },
  collections: { pages, profile, posts, projects, contributions, resources },
  loaders: [
    makeContentYamlLoader({
      "contributions.yaml": contributionEntrySchema,
      "resources.yaml": resourceEntrySchema,
    }),
  ],
  mdx: {
    remarkPlugins: sharedRemarkPlugins,
    rehypePlugins: sharedRehypePlugins,
  },
  markdown: {
    remarkPlugins: sharedRemarkPlugins,
    rehypePlugins: sharedRehypePlugins,
  },
  // Post-collection cross-post invariants. Fires after all per-post transforms
  // complete, before .velite/ is written to disk. CHOSEN_PATH: HOOK
  // (see .spec-workflow/specs/blog-enhanced/Implementation Logs/task-6.4-velite-api-spike.md).
  prepare(data) {
    const posts = (data as { posts?: Array<{ slug: string; series?: string; seriesOrder?: number }> }).posts ?? [];
    const bySeries = new Map<string, Array<{ slug: string; order: number }>>();
    for (const post of posts) {
      if (typeof post.series !== "string" || typeof post.seriesOrder !== "number") continue;
      const list = bySeries.get(post.series) ?? [];
      list.push({ slug: post.slug, order: post.seriesOrder });
      bySeries.set(post.series, list);
    }
    for (const [series, members] of bySeries) {
      const byOrder = new Map<number, string>();
      for (const { slug, order } of members) {
        const prior = byOrder.get(order);
        if (prior !== undefined) {
          throw new Error(
            `[velite/posts] series '${series}' has colliding seriesOrder values: ${prior} and ${slug}`,
          );
        }
        byOrder.set(order, slug);
      }
    }
  },
});
