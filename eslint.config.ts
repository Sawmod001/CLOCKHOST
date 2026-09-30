import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

// eslint-config-next already ships typescript-eslint and @typescript-eslint/parser
// internally, so we don't add them again as separate plugins to avoid version conflicts.
const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      // ── TypeScript ─────────────────────────────────────────────────────────
      // Allow explicit `any` with a comment but warn on bare usage
      "@typescript-eslint/no-explicit-any": "warn",
      // Warn on unused vars — prefix with _ to suppress per-site
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Consistent type imports
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // Avoid require() in TS files
      "@typescript-eslint/no-require-imports": "warn",

      // ── React ──────────────────────────────────────────────────────────────
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",

      // ── General ────────────────────────────────────────────────────────────
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "tests/**",
    "supabase/**",
    "node_modules/**",
  ]),
]);

export default eslintConfig;
