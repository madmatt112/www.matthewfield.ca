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
              importNames: ["posts"],
              message:
                'Import posts via src/lib/blog.ts helpers (e.g., getPublishedPosts) instead of "#site/content" directly.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/blog.ts", "velite.config.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
