summary
- Commented out market data calls to plotMkdCli while preserving the call sites for quick reversal.

notable files or areas changed
- src/marketdata/MarketDataManager.ts
- src/marketdata/Mkd.ts
- src/marketdata/Mkd.test.ts

tests run
- yarn marketdata
- yarn lint
- yarn tsc --noEmit

risks or follow-ups
- CLI chart plotting remains available in src/utils/chart.ts if needed later.
