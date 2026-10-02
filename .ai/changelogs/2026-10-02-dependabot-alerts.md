# Dependabot alert remediation

- Summary: upgraded `@stoqey/ib` and refreshed vulnerable transitive dependencies.
- Areas changed: dependency manifest and Yarn lockfile.
- Tests run: Yarn audit, lint, build, and unit tests.
- Risks / follow-ups: Yarn resolutions pin patched transitive versions until their direct dependents update their ranges.
