module.exports = {
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:prettier/recommended",
    "prettier",
    "prettier/@typescript-eslint",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  plugins: [
    "@typescript-eslint",
    "import",
    "json",
    "simple-import-sort",
  ],
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/array-type": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "off",

    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/ban-ts-ignore": "off",
    "@typescript-eslint/camelcase": "off",
    "@typescript-eslint/no-this-alias": "off",

    "import/default": "off",
    "import/order": "off",
    "import/no-duplicates": "error",
    "import/no-named-as-default": "off",
    "import/no-named-as-default-member": "off",
    "import/no-unresolved": "off",
    "import/named": "off",
    "import/namespace": "off",
    "simple-import-sort/sort": "off",
    "sort-imports": "off",
  },
  settings: {
  },
  
};
