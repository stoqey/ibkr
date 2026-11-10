# Dependency security updates

- Summary: update `@stoqey/ib` from 1.6.14 to registry-verified latest 1.6.15 and Moment to 2.31.0. Refresh vulnerable transitive dependencies in `yarn.lock`.
- Files: `package.json` and `yarn.lock`. Keep only two resolutions, for patched glob 14 and minimatch 11; current upstream tooling still requests vulnerable older majors. js-yaml and serialize-javascript use normal compatible lockfile upgrades.
- Tests: 98 market-data tests pass; `yarn lint`, `yarn tsc --noEmit`, and `git diff --check` pass. `yarn audit --json` reports zero vulnerabilities across all severity levels, down from 25 vulnerable dependency paths.
- Risks/follow-ups: remove the glob/minimatch resolutions when upstream tooling accepts patched major versions. No live Gateway or Redis operations were needed for this update.

## PR #162 merge resolution

- Merge master while preserving its package version 2.8.11 and the PR's newer dependency fixes with only the glob/minimatch resolutions. Regenerate the Yarn lockfile from the resolved manifest.
- Validation: market-data unit tests, lint, TypeScript checking, dependency audit, and diff checks; no live Gateway or Redis operations.
