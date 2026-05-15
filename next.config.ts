import type { NextConfig } from "next";

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/((?!playground(?:/|$)).*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: cspDirectives,
        },
      ],
    },
  ],
};

export default nextConfig;
