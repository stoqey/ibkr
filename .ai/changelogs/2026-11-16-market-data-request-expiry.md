# Normalize outgoing market-data contract expiry

- Summary: prevent Gateway error 10372 after contract resolution by normalizing response expiry timestamps at outgoing historical-bar, historical-tick, historical-update, tick-by-tick, and snapshot calls. Preserve contract fields and returned/cached metadata without mutating caller objects. Share expiry normalization with contract searches.
- Time zones: generate both subscription backfill endpoints and historical-tick Date inputs as explicit UTC `YYYYMMDD-HH:mm:ss`; preserve caller-supplied strings.
- Files: `src/marketdata/MarketDataManager.ts`, outgoing-request regression tests, and the snapshot regression test.
- Validation: 104 market-data tests pass; `yarn lint`, `yarn tsc --noEmit`, and `git diff --check` pass. Mock tests cover resolved-contract bypass, both historical-bar APIs, both subscription APIs, historical ticks, metadata preservation, and UTC backfills.
- Live verification: read-only NQ contract details returned an expiry timestamp; sending that timestamp to historical bars reproduced 10372. Patched historical requests returned six bars; tick-by-tick and historical-update subscriptions each received data. No 10372 or implied-timezone warnings followed the patched requests. Removed subscriptions and disconnected client 45; no orders or Redis access.
- Follow-up: rebuild and deploy the consumer with the patched package; no SDK or dependency changes are required.
