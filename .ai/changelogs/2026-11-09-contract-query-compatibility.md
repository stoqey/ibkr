# Gateway contract query compatibility

- Summary: normalize contract-detail requests in `MarketDataManager.getContract` and `searchContracts`; use positive conId with exchange/includeExpired for known contracts and strip recognized expiry timestamp suffixes for symbol searches. Preserve caller objects, returned metadata, and the existing resolved-contract bypass.
- Files: `src/marketdata/MarketDataManager.ts`, sibling contract-query and snapshot tests, `package.json`, and `yarn.lock`. Update `@stoqey/ib` from 1.6.7 to the registry's latest version, 1.6.14.
- Tests: `yarn mocha 'src/marketdata/*test.ts' --exit --timeout 10000` (98 passing), `yarn lint`, `yarn tsc --noEmit`, and `git diff --check`.
- Live verification: read-only contract queries reproduced error 10372 for an unnormalized expiry timestamp; normalized known-contract lookups and symbol/expiry search succeeded, and broad symbol search returned multiple contracts. Disconnected afterwards; no order operations or Redis access.
- Risks/follow-ups: identity lookups deliberately omit redundant filters when conId is positive. Returned expiry timestamps remain unchanged. No low-level SDK protocol changes or consumer edits are required for this request normalization; package publication and consumer deployment remain separate steps.
