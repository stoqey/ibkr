# 2026-06-30 Historical Date Bars

- summary: fix historical daily/weekly/monthly bar dates returned as `yyyyMMdd`.
- notable files or areas changed: `src/marketdata/MarketDataManager.ts`, market-data tests.
- tests run: `yarn mocha src/marketdata/MarketDataManager.getHistoricalData.test.ts --exit`; `yarn marketdata`; `yarn lint`.
- risks or follow-ups: date-only bars are normalized to UTC midnight.
