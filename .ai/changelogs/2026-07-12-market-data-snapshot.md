# Market data snapshot resolver

- summary: added a high-level MarketDataManager snapshot method that resolves contract details before requesting a snapshot.
- notable files or areas changed: `src/marketdata/MarketDataManager.ts`, `src/marketdata/MarketDataManager.getMarketDataSnapshot.test.ts`.
- tests run: `pnpm exec mocha src/marketdata/MarketDataManager.getMarketDataSnapshot.test.ts --exit`, `pnpm run build`, `pnpm run lint`.
- risks or follow-ups: none known.
