const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const importPlugin = require("eslint-plugin-import-x");

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
      "import-x": importPlugin,
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
      "import-x/default": "off",
      "import-x/order": "off",
      "import-x/no-duplicates": "off",
      "import-x/no-named-as-default": "off",
      "import-x/no-named-as-default-member": "off",
      "import-x/no-unresolved": "off",
      "import-x/named": "off",
      "import-x/namespace": "off",
      "sort-imports": "off",
    },
  },
];
