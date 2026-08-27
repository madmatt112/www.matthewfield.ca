// Reuse the per-post Open Graph image as the Twitter card image. Route
// segment config must be declared literally here; Next.js does not accept
// re-exported `dynamic` / `dynamicParams`.
export const dynamic = "force-static";
export const dynamicParams = false;

export { alt, size, contentType, generateStaticParams } from "./opengraph-image";
export { default } from "./opengraph-image";
