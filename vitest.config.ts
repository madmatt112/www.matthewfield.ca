import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "#site/content": fileURLToPath(new URL("./.velite", import.meta.url)),
      "#playground": fileURLToPath(new URL("./playground", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx,mjs}"],
    globalSetup: ["./vitest.global-setup.ts"],
  },
});
