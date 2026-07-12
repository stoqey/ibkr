# Market data snapshot resolver

- summary: added a high-level MarketDataManager snapshot method that resolves contract details before requesting a snapshot and hardened it against embedded-contract and contract-filter bypasses.
- notable files or areas changed: `src/marketdata/MarketDataManager.ts`, `src/marketdata/MarketDataManager.getMarketDataSnapshot.test.ts`.
- tests run: `pnpm exec mocha src/marketdata/MarketDataManager.getMarketDataSnapshot.test.ts --exit` (4 passing), `pnpm run marketdata` (64 passing), `pnpm run build`, `pnpm run lint`.
- risks or follow-ups: snapshot requests for contracts outside the market-data allowlist now reject before reaching IBKR.
