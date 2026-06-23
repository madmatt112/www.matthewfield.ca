import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { siteConfig } from "@/config/site";

// Build-time Open Graph image: serif display name, the `mf/` mark with a rust
// `/`, on a neutral field. ImageResponse does NOT read next/font, so the glyph
// data is read from committed binaries under public/fonts/ and passed via the
// `fonts` option.
export const alt = `${siteConfig.name} — ${siteConfig.description}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand rust + neutral tokens, expressed as sRGB hex (satori does not resolve
// the site's oklch CSS custom properties).
const RUST = "#9e441d";
const FOREGROUND = "#252525";
const MUTED = "#737373";
const BACKGROUND = "#fafafa";
const BORDER = "#e5e5e5";

export default async function OpenGraphImage() {
  const fraunces = readFileSync(join(process.cwd(), "public/fonts/Fraunces-SemiBold.ttf"));
  const geistMono = readFileSync(join(process.cwd(), "public/fonts/GeistMono-Regular.ttf"));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BACKGROUND,
        padding: "80px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          fontFamily: "Geist Mono",
          fontSize: 56,
          color: FOREGROUND,
        }}
      >
        mf<span style={{ color: RUST }}>/</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Fraunces",
            fontSize: 132,
            fontWeight: 600,
            color: FOREGROUND,
            letterSpacing: "-0.02em",
          }}
        >
          {siteConfig.name}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontFamily: "Geist Mono",
            fontSize: 36,
            color: MUTED,
          }}
        >
          {siteConfig.description}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderTop: `2px solid ${BORDER}`,
          paddingTop: 32,
          fontFamily: "Geist Mono",
          fontSize: 30,
          color: MUTED,
        }}
      >
        <span style={{ color: RUST }}>/</span>
        <span style={{ marginLeft: 12 }}>www.matthewfield.ca</span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Fraunces",
          data: fraunces,
          style: "normal",
          weight: 600,
        },
        {
          name: "Geist Mono",
          data: geistMono,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
