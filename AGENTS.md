# AGENTS.md

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