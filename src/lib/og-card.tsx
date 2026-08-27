import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { siteConfig } from "@/config/site";

// Shared renderer for the social cards (site-wide, blog posts, projects).
// ImageResponse does NOT read next/font, so the glyph data is read from the
// committed binaries under public/fonts/ and passed via the `fonts` option.
// Fraunces-Regular.ttf is a static instance of the variable font at
// wght 400 / opsz 9 — the same cut next/font serves for the site's headings.
//
// Satori does not resolve the site's oklch CSS custom properties, so the dark
// tokens are restated here as sRGB hex.

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

const BACKGROUND = "#0a0a0a";
const FOREGROUND = "#fafafa";
const MUTED = "#a3a3a3";
const BORDER = "#262626";
const RUST = "#e89960";

const HOST = new URL(siteConfig.url).host;

let fonts: { fraunces: Buffer; geistMono: Buffer } | undefined;

function loadFonts() {
  fonts ??= {
    fraunces: readFileSync(join(process.cwd(), "public/fonts/Fraunces-Regular.ttf")),
    geistMono: readFileSync(join(process.cwd(), "public/fonts/GeistMono-Regular.ttf")),
  };
  return fonts;
}

function toImageResponse(node: React.ReactElement) {
  const { fraunces, geistMono } = loadFonts();
  return new ImageResponse(node, {
    ...ogSize,
    fonts: [
      { name: "Fraunces", data: fraunces, style: "normal", weight: 400 },
      { name: "Geist Mono", data: geistMono, style: "normal", weight: 400 },
    ],
  });
}

function Footer({ fontSize, gap }: { fontSize: number; gap: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        borderTop: `2px solid ${BORDER}`,
        paddingTop: fontSize,
        fontFamily: "Geist Mono",
        fontSize,
        color: MUTED,
      }}
    >
      <span style={{ color: RUST }}>/</span>
      <span style={{ marginLeft: gap }}>{HOST}</span>
    </div>
  );
}

/** Site-wide card: the `mf/` mark, the name, the tagline. */
export function renderSiteCard() {
  return toImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BACKGROUND,
        borderLeft: `12px solid ${RUST}`,
        padding: 80,
      }}
    >
      <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 56, color: FOREGROUND }}>
        mf<span style={{ color: RUST }}>/</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontFamily: "Fraunces",
            fontSize: 132,
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            color: FOREGROUND,
          }}
        >
          {siteConfig.name}
        </div>
        <div style={{ marginTop: 24, fontFamily: "Geist Mono", fontSize: 36, color: MUTED }}>
          {siteConfig.tagline}
        </div>
      </div>

      <Footer fontSize={30} gap={24} />
    </div>,
  );
}

/** Article card: `mf / <section>` lockup, the title, the date. */
export function renderArticleCard({
  section,
  title,
  date,
}: {
  section: "blog" | "projects";
  title: string;
  /** ISO date; only the YYYY-MM-DD part is shown. */
  date: string;
}) {
  return toImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BACKGROUND,
        borderLeft: `12px solid ${RUST}`,
        padding: "72px 80px",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "baseline", fontFamily: "Geist Mono", fontSize: 44 }}
      >
        <span style={{ color: FOREGROUND }}>mf</span>
        <span style={{ color: RUST, margin: "0 14px" }}>/</span>
        <span style={{ color: MUTED }}>{section}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "block",
            lineClamp: 3,
            fontFamily: "Fraunces",
            fontSize: 68,
            lineHeight: 1.12,
            letterSpacing: "-0.025em",
            color: FOREGROUND,
          }}
        >
          {title}
        </div>
        <div style={{ marginTop: 28, fontFamily: "Geist Mono", fontSize: 27, color: MUTED }}>
          {date.slice(0, 10)}
        </div>
      </div>

      <Footer fontSize={27} gap={22} />
    </div>,
  );
}
