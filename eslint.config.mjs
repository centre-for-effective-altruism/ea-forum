import { dirname } from "path";
import { fileURLToPath } from "url";
import { globalIgnores } from "eslint/config";

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  globalIgnores(["**/*.queries.ts"]),
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-console": [
        "error",
        {
          allow: ["warn", "error"],
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lodash",
              message:
                "Don't import all of lodash, import a specific lodash function. Eg; lodash/sumBy",
            },
            {
              name: "lodash/fp",
              message:
                "Don't import all of lodash/fp, import a specific lodash function. Eg; lodash/fp/capitalize",
            },
            {
              name: "next/link",
              message: "Use @/components/Link instead of next/link",
            },
            {
              name: "zod",
              message: "Use zod/v4 instead of zod",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
      "ckEditor/**",
      "src/vendor/**",
    ],
  },
];

export default eslintConfig;
