# Fix `@humanfs/node` dependency update

- Kept the `@humanfs/node` 0.16.8 transitive dependency update.
- Aligned `lint-staged` with the project's Node.js 20 minimum by using the latest compatible 16.x release.
- Ran the frozen install, lint, build, test, and production dependency audit checks.
- Risk: `lint-staged` remains on 16.x until the project raises its minimum Node.js version to 22.22.1 or newer.
