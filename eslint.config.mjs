import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      // Shared logic must stay usable in the browser and in isolated tests.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/server", "@/server/**", "@/db", "@/db/**",
                "../server/**", "../db/**", "@/hooks/**", "@/components/**",
                "next", "next/**", "node:*", "react", "react-dom",
                "react-dom/**", "drizzle-orm", "drizzle-orm/**",
              ],
              message: "Keep src/lib framework-independent. Put server code in src/server, database code in src/db, and React hooks in src/hooks.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
