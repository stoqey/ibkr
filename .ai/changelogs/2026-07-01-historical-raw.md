# 2026-07-01 historical raw data

- summary: added `MarketDataManager.getHistoricalDataRaw` to expose IBKR historical bars without wrapper date parsing, including empty raw responses and shared contract resolution for parsed data.
- notable files or areas changed: `src/marketdata/MarketDataManager.ts`, `src/marketdata/MarketDataManager.getHistoricalData.test.ts`.
- tests run: `./node_modules/.bin/mocha src/marketdata/MarketDataManager.getHistoricalData.test.ts --exit`; `./node_modules/.bin/tsc --noEmit`; `git diff --check`.
- risks or follow-ups: raw bars retain IBKR's native `time` labels and are not sorted or converted to `MarketData`.
