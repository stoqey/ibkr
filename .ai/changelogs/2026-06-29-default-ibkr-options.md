# 2026-06-29 default ibkr options

- summary: allow the default `ibkr` export to accept IB API creation options and forward them to `IBKRConnection.Instance.init`.
- notable files or areas changed: `src/index.ts`, `src/index.test.ts`.
- tests run: `pnpm exec mocha src/index.test.ts --exit`, `pnpm run build`.
- risks or follow-ups: none known.
