# Commit Style Guide

Use Conventional Commits.

Format:
<type>(optional scope): <short summary>

Types:
- feat
- fix
- refactor
- perf
- test
- docs
- chore
- ci
- update (like a npm module)

Rules:
- Present tense ("add" not "added")
- Max 72 chars for summary
- No emojis
- Reference issues when relevant

Examples:
feat(trading): add tick aggregation engine
fix(api): prevent order double submit
refactor(core): extract strategy base class
update(@mypackage/nice): v1.2.3
