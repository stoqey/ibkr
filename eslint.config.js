const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const importPlugin = require("eslint-plugin-import");

module.exports = [
  {
    ignores: ["**/*.test.ts", "src/test.ts"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...importPlugin.configs.errors.rules,
      ...importPlugin.configs.warnings.rules,
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-wrapper-object-types": "off",
      "import/default": "off",
      "import/order": "off",
      "import/no-duplicates": "off",
      "import/no-named-as-default": "off",
      "import/no-named-as-default-member": "off",
      "import/no-unresolved": "off",
      "import/named": "off",
      "import/namespace": "off",
      "sort-imports": "off",
    },
  },
];
