import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    rules: {
      /**
       * Fetch-on-mount is the pattern nearly every screen here uses: an effect
       * calls an async loader that awaits the API and then sets state. The
       * React Compiler rule flags the call site because it cannot see that the
       * setState happens after an await.
       *
       * Kept as a warning rather than switched off: the genuine instances it
       * caught — a ref written during render, Date.now() read during render,
       * and props mirrored into state — were all real and are fixed. Silencing
       * it entirely would have hidden those.
       *
       * The proper fix is a data-fetching library (React Query, or `use()` with
       * suspense) rather than hand-rolled effects. That is a deliberate later
       * step, not something to fake with per-line disables now.
       */
      "react-hooks/set-state-in-effect": "warn",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Shipped verbatim from the design system — not ours to lint.
    "public/styles/**",
  ]),
]);

export default eslintConfig;
