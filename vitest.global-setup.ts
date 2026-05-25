import { execFileSync } from "node:child_process";
import path from "node:path";

// Ensures `#site/content` resolves to a freshly built Velite manifest before
// any test imports it. Runs `pnpm velite build` once per `vitest run`.
export default function setup(): void {
  execFileSync("pnpm", ["velite", "build"], {
    cwd: path.resolve(__dirname),
    stdio: "inherit",
  });
}
