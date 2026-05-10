import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const sharedRestrictedImports = {
  patterns: [
    {
      group: ["../../apps/*", "../api/*", "../web/*", "../worker/*"],
      message:
        "Cross-app relative imports are not allowed. Use a shared package or an explicit runtime interface instead."
    }
  ]
};

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**"]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,mts,cts,js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-restricted-imports": ["error", sharedRestrictedImports]
    }
  },
  {
    files: ["apps/web/**/*.{ts,js,mjs}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "apps/api/**",
                "apps/worker/**",
                "@tip/api*",
                "@tip/worker*"
              ],
              message:
                "The frontend modular monolith must not import backend or worker implementation code."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["apps/api/**/*.{ts,js,mjs}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "apps/web/**",
                "apps/worker/**",
                "@tip/web*",
                "@tip/worker*"
              ],
              message:
                "The backend modular monolith must not import frontend or worker implementation code."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["apps/worker/**/*.{ts,js,mjs}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["apps/web/**", "apps/api/**", "@tip/web*", "@tip/api*"],
              message:
                "The worker must stay decoupled from web and API implementation details."
            }
          ]
        }
      ]
    }
  }
);
