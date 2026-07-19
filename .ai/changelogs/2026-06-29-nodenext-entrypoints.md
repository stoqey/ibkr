# 2026-06-29 NodeNext entrypoints

- Added package export entries for the root package, domain subpaths, existing `dist` deep imports, and `register` helpers.
- Added TypeScript subpath type mappings for consumers that do not read package export conditions.
- Updated the NodeNext consumer fixture to import through the published package entrypoints.
- Tests run: `yarn test:types:nodenext`, `yarn lint`, `git diff --check`, ESM/CJS package entrypoint smoke checks, `npm pack --dry-run`.
