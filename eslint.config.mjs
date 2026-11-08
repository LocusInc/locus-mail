import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: { curly: ["error", "all"] },
  },
  {
    files: ["bin/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["**/*.email.tsx", "src/components/email-layout.tsx"],
    // Email templates and their document shell render outside the Next.js router.
    rules: { "@next/next/no-head-element": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "example/build/**",
    "dist/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
