# AGENTS.md

# Agent Instructions

You are an AI coding agent working in this repository.

All mandatory rules are defined in the `.ai/` directory:

- .ai/commit-style.md
- .ai/editing-style.md
- .ai/testing-style.md
- .ai/state.md

You MUST read and follow them before making any changes.

General behavior:

- Prefer minimal diffs
- Do not refactor unrelated code
- Do not introduce new dependencies without approval
- Always add tests for new logic
- Do not modify generated files
- Generated files include build outputs, generated clients/types, compiled
  assets, files marked with generated headers, and package-manager lockfiles.
  Update them only when the requested change directly requires regeneration or
  an approved dependency/package-manager change requires it.

If rules conflict, follow this priority:

testing > editing style > commit style > general rules


## Repository expectations

- Use pnpm unless package manager files indicate otherwise.
- Keep changes minimal and localized.
- Do not add new dependencies without explicit approval.
- Run lint/tests for touched packages.
- For generated PRs, include:
  - summary
  - tests run
  - risks / follow-ups

## Code style

- Prefer existing patterns over new abstractions.
- Do not refactor unrelated code.
- Avoid touching infra, secrets, env files, or workflows unless the issue asks for it.
