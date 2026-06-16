# Project State

This file is a working architecture note for AI agents and humans doing larger
feature work in this repository.

Feature-specific runtime notes can also live under:

- `.ai/state/*.md`

Use those files for deeper feature state that would make this root file too
large or too noisy.
Keep this root file focused. When a note grows beyond a few paragraphs or is
specific to one feature, move it to `.ai/state/brief-slug.md` and reference it
from this file only when broadly useful.

## AI Work Tracking

For AI-authored PRs, create or update `.ai/changelogs/YYYY-MM-DD.md`.
If multiple AI PRs may land on the same day and cause conflicts, use
`.ai/changelogs/YYYY-MM-DD-brief-slug.md` instead.
Changelog files are PR artifacts; stage and commit them with the related
AI-authored PR instead of leaving them as local notes.
Keep entries brief and factual:
- summary
- notable files or areas changed
- tests run
- risks or follow-ups

Update `.ai/state.md` or `.ai/state/*.md` only when the work changes durable
project context that future agents should know, such as architecture, workflows,
external integrations, setup, testing constraints, migrations, or known limits.
Do not use state files as a routine task log.
Do not record secrets, credentials, tokens, account IDs, private customer data,
or private runtime data in `.ai/state` files or `.ai/changelogs` files.
