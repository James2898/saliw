import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // RSC boundary enforcement:
  // Disallow direct Supabase client/SSR imports inside server-only files.
  // src/app/** and src/components/server/** are server-component territory.
  // Client-safe Supabase usage lives in src/services/ (future task).
  {
    files: [
      "src/app/**/*.ts",
      "src/app/**/*.tsx",
      "src/components/server/**/*.ts",
      "src/components/server/**/*.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@supabase/ssr",
              message:
                "Do not import @supabase/ssr directly in server components. Use the service helpers in src/services/supabase/server.ts or src/services/supabase/client.ts.",
            },
            {
              name: "@supabase/supabase-js",
              message:
                "Do not import @supabase/supabase-js directly in server components. Use the service helpers in src/services/supabase/server.ts or src/services/supabase/client.ts.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
