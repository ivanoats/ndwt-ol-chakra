import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import _import from "eslint-plugin-import";
import react from "eslint-plugin-react";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores([
    "**/node_modules/",
    "**/build/",
    "**/coverage/",
    "**/dist/",
    "**/out/",
    "**/.next/",
    "**/vite-env.d.ts",
    "**/vite.config.ts",
    "**/vitest.config.ts",
]), {
    extends: fixupConfigRules(compat.extends(
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
        "plugin:react-hooks/recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
    )),

    plugins: {
        import: fixupPluginRules(_import),
        react: fixupPluginRules(react),
        "@typescript-eslint": fixupPluginRules(typescriptEslint),
        "react-hooks": fixupPluginRules(reactHooks),
        prettier,
        "simple-import-sort": simpleImportSort,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
        },

        parser: tsParser,
        ecmaVersion: 13,
        sourceType: "module",

        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },
        },
    },

    settings: {
        "import/resolver": {
            node: {
                extensions: [".js", ".jsx", ".ts", ".tsx"],
            },
        },

        react: {
            version: "detect",
        },
    },

    rules: {
        "no-use-before-define": "off",
        "react/react-in-jsx-scope": "off",

        "react/jsx-filename-extension": ["warn", {
            extensions: [".tsx"],
        }],

        "react/jsx-props-no-spreading": "off",
        "linebreak-style": "off",
        "eol-last": "off",

        "max-len": ["warn", {
            code: 80,
        }],

        "import/extensions": ["error", "never", {
            svg: "always",
        }],

        "prettier/prettier": ["error", {
            endOfLine: "auto",
        }],

        "simple-import-sort/exports": "error",

        "simple-import-sort/imports": ["warn", {
            groups: [[
                "^(assert|buffer|child_process|cluster|console|constants|crypto|dgram|dns|domain|events|fs|http|https|module|net|os|path|punycode|querystring|readline|repl|stream|string_decoder|sys|timers|tls|tty|url|util|vm|zlib|freelist|v8|process|async_hooks|http2|perf_hooks)(/.*|$)",
            ], ["^\\w"], ["^(@|config/)(/*|$)"], ["^\\u0000"], ["^\\.\\.(?!/?$)", "^\\.\\./?$"], ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"], ["^.+\\.s?css$"]],
        }],

        "import/no-anonymous-default-export": ["error", {
            allowArrowFunction: true,
            allowAnonymousFunction: true,
        }],
        "react-hooks/set-state-in-effect": "off",
    },
}]);
