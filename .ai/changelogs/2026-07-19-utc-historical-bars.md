# UTC historical bars

- Summary: serialize 5-second-bar historical backfill endpoints in UTC.
- Files: `src/marketdata/ibkr.utils.ts` (including the tested timestamp formatter), `src/marketdata/ibkr.utils.test.ts`.
- Tests: `pnpm marketdata`, `pnpm lint`, `pnpm build`; local Gateway probe returned 7,200 NFLX bars from `2026-06-03T10:00:00Z` through `2026-06-03T19:59:55Z` (5,058 positive-volume, 2,142 zero-volume).
- Risks/follow-ups: IBKR may revise historical volume counts.
