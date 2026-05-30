import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Pagefind generated bundle (built by `pnpm build:search`).
    "public/pagefind/**",
  ]),
  // Chokepoint-bypass guard: direct imports of "#site/content" are forbidden
  // outside the authorized helper. Consume posts via src/lib/blog.ts.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "#site/content",
              importNames: ["posts", "contributions", "resources"],
              message:
                'Import posts via src/lib/blog.ts helpers (e.g., getPublishedPosts) instead of "#site/content" directly.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/lib/blog.ts",
      "src/lib/contributions.ts",
      "src/lib/resources.ts",
      "velite.config.ts",
      "src/__fixtures__/chokepoint-canary.ts",
      "src/__fixtures__/content-chokepoint-canary.ts",
      "src/lib/blog.test.ts",
      "src/app/feed.xml/parity.test.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
