import sharp from "sharp";
import { writeFileSync } from "node:fs";

const W = 1280,
  H = 854;

function makeGradient(c1, c2, outPath) {
  // create raw RGB buffer with a vertical gradient between c1 and c2
  const buf = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
    }
  }
  return sharp(buf, { raw: { width: W, height: H, channels: 3 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

const base = "/home/mcf/repo/matthew-field.ca/content/projects";

await makeGradient([70, 130, 180], [176, 196, 222], `${base}/fixture-placeholder-cover.png`); // steelblue → lightsteelblue
await makeGradient([46, 139, 87], [144, 238, 144], `${base}/fixture-published-second-cover.png`); // seagreen → lightgreen

console.log("done");
