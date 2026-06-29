# 2026-06-29 NodeNext types

- Exported the `ibkr` initializer as a named export in addition to the default export.
- Added a NodeNext/type-module consumer fixture that type-checks against the built package declarations.
- Tests run: `./node_modules/.bin/rimraf dist && ./node_modules/.bin/tsc && ./node_modules/.bin/tsc -p test/types/nodenext/tsconfig.json`.
- Risk: CommonJS runtime remains the published output; full native ESM support is still a follow-up.
