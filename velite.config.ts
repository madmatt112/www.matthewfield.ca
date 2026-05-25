import { execFileSync } from "node:child_process";
import path from "node:path";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { defineConfig, defineCollection, s } from "velite";
import { siteConfig } from "@/config/site";
import { rehypeAbsolutizeUrls } from "./src/lib/build/rehype-absolutize-urls";
import { rehypeCopyButton } from "./src/lib/build/rehype-copy-button";
import { countWordsFromMdast } from "./src/lib/build/word-count";
import { KNOWN_FIXTURE_SLUGS, derivePostSlug } from "./src/lib/build/derive-post-slug.mjs";

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

// YAML collection pattern — uncomment and adapt when a downstream spec needs
// structured data instead of MDX prose.
//
// const projects = defineCollection({
//   name: "Project",
//   pattern: "projects/*.yml",
//   schema: s.object({
//     name: s.string(),
//     url: s.string().url(),
//     description: s.string(),
//   }),
// });

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    clean: true,
  },
  collections: { pages, profile, posts },
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
