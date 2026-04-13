import { defineConfig, defineCollection, s } from "velite";

// Typed content collections for the site. Downstream specs extend this file
// by adding more collections (blog, projects, etc.) following the `pages`
// pattern below. The build output is written to `.velite/` and imported
// through the `#site/content` path alias configured in `tsconfig.json`.

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
  collections: { pages },
});
