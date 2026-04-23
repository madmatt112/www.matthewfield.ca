import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

const routes = [
  "/",
  "/profile",
  "/projects",
  "/contributions",
  "/blog",
  "/resources",
  "/playground",
  "/about",
  "/contact",
  "/colophon",
  "/now",
  "/sitemap",
  "/slashes",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map((route) => ({
    url: new URL(route, siteConfig.url).toString(),
    lastModified,
  }));
}
