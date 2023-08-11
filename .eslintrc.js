module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "plugin:react/recommended",
    "plugin:@next/next/recommended",
    "prettier",
  ],
  plugins: ["prettier", "react", "unused-imports", "import"],
  parserOptions: {
    tsconfigRootDir: "./",
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: "module",
  },
  ignorePatterns: ["**/gen/**", "scripts/**"],
  settings: {
    react: {
      version: "detect",
    },
    "import/resolver": {
      typescript: {},
    },
  },
  rules: {
    "no-console": ["error", { allow: ["time", "timeEnd", "timeStamp"] }],
    "no-new-wrappers": "error",
    "no-invalid-this": "error",
    "no-promise-executor-return": "error",
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "node:assert",
            message: "Use 'assert' instead",
          },
        ],
        patterns: [
          {
            group: ["@/gen/cayley/impl/*"],
            message: "Use '@/wasm/cayley' instead",
          },
        ],
      },
    ],
    "no-fallthrough": [
      "error",
      {
        commentPattern: "break[\\s\\w]*omitted",
      },
    ],
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "error",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],

    "react/display-name": "off",
    "react/prop-types": "off",
    "react/jsx-uses-react": "off",
    "react/react-in-jsx-scope": "off",

    "@next/next/no-img-element": "off",
    "prettier/prettier": "error",
  },
  overrides: [
    {
      // Typescript-only rules.
      files: ["**/*.ts", "**/*.tsx"],
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
      ],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: ["./tsconfig.json"],
      },
      plugins: ["@typescript-eslint", "no-relative-import-paths"],
      rules: {
        "@typescript-eslint/ban-types": [
          "error",
          {
            extendDefaults: true,
            types: {
              "{}": false,
            },
          },
        ],
        "no-relative-import-paths/no-relative-import-paths": [
          "error",
          { rootDir: "src", prefix: "@" },
        ],
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/consistent-type-exports": "error",
        "@typescript-eslint/naming-convention": [
          "error",
          {
            selector: "variableLike",
            format: ["camelCase", "UPPER_CASE"],
            leadingUnderscore: "allowSingleOrDouble",
          },
          {
            selector: "variable",
            format: ["camelCase", "PascalCase", "UPPER_CASE"],
            leadingUnderscore: "allowSingleOrDouble",
          },
          {
            selector: "function",
            format: ["camelCase", "PascalCase"],
          },
          {
            selector: "variable",
            modifiers: ["destructured"],
            format: null,
          },
          {
            selector: "parameter",
            modifiers: ["destructured"],
            format: null,
          },
        ],
        "@typescript-eslint/unbound-method": [
          "error",
          {
            ignoreStatic: true,
          },
        ],
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-inferrable-types": "off",
        "@typescript-eslint/no-misused-new": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-unused-vars": "off",

        "return-await": "off",
        "@typescript-eslint/return-await": "error",

        // TODO (akarpenko): re-enable those:
        "@typescript-eslint/require-await": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-return": "off",
      },
    },
  ],
};
