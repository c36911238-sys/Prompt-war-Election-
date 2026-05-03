import { defineConfig } from "eslint";
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs}"],
    plugins: {
      "@next/next": nextPlugin,
      "react": reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // Code Quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-unused-vars": ["error", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true 
      }],
      "no-var": "error",
      "prefer-const": "error",
      "prefer-arrow-callback": "error",
      "no-duplicate-imports": "error",
      "no-useless-return": "error",
      "no-useless-concat": "error",
      "no-template-curly-in-string": "error",
      
      // React Best Practices
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      "react/prop-types": "off", // Using TypeScript-style prop validation
      "react/react-in-jsx-scope": "off", // Not needed in Next.js 13+
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-undef": "error",
      "react/no-danger-with-children": "error",
      "react/no-deprecated": "error",
      "react/no-direct-mutation-state": "error",
      "react/no-find-dom-node": "error",
      "react/no-is-mounted": "error",
      "react/no-render-return-value": "error",
      "react/no-string-refs": "error",
      "react/no-unescaped-entities": "error",
      "react/no-unknown-property": "error",
      "react/no-unsafe": "error",
      "react/require-render-return": "error",
      
      // React Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      
      // Accessibility
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/aria-activedescendant-has-tabindex": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/html-has-lang": "error",
      "jsx-a11y/img-redundant-alt": "error",
      "jsx-a11y/interactive-supports-focus": "error",
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/no-access-key": "error",
      "jsx-a11y/no-autofocus": "error",
      "jsx-a11y/no-distracting-elements": "error",
      "jsx-a11y/no-redundant-roles": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      
      // Next.js specific
      "@next/next/no-img-element": "error",
      "@next/next/no-page-custom-font": "error",
      "@next/next/no-sync-scripts": "error",
      "@next/next/no-title-in-document-head": "error",
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**", 
      "build/**",
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "*.config.js",
      "*.config.mjs",
      "next-env.d.ts",
    ],
  },
]);

export default eslintConfig;
