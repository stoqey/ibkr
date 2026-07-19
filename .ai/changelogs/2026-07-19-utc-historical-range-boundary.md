# UTC historical range boundary

- Summary: preserve UTC calendar days while anchoring IBKR historical endpoints to the New York trading session.
- Files: `src/marketdata/ibkr.utils.ts`, `src/marketdata/ibkr.utils.test.ts`.
- Tests: `pnpm marketdata`, `pnpm lint`, `pnpm exec tsc --noEmit`.
- Risks/follow-ups: Existing hourly request windows and market-close times remain unchanged.
