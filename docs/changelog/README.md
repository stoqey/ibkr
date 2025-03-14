# Change log


## 2.1.0
**14-03-2025**
* ### **V2 using IbApiNext by @ceddybi in https://github.com/stoqey/ibkr/pull/92**
- V2 Breaking changes using IbApiNext, previously using ib events
- Changed all classes using `rxjs` internally but exporting promises with methods, i.e accounts, connection, portfolios, marketdata, orders e.t.c
- `Connections` is improved to auto re-connect when  TWS/Gateway disconnects, previously it'd process.exit(0)
-  Introduces separate objects similar to the ones in `@stoqey/ib` but different, i.e `Position`, `Instrument`, `Order`, `OrderType`, `OrderAction` 
- If you want to define custom functions, the `ibApiNext` can be found in any class. e.g `Orders.ib`, `Portfolios.ib` e.t.c ...



**Full Changelog**: https://github.com/stoqey/ibkr/compare/1.8.5...2.1.0

<hr /><em>This discussion was created from the release <a href='https://github.com/stoqey/ibkr/releases/tag/2.1.0'>2.1.0</a>.</em>

## 1.2.2
**29-05-2020**
 - sort market data return when `reqHistoricalData`
 - listen if any errors are thrown when `reqHistoricalData`, then return empty market data and avoid deadlock like in [#25](https://github.com/stoqey/ibkr/issues/25)

## 1.2.1 
**26-05-2020**
  - `reqHistoricalData` async + any symbol [#23](https://github.com/stoqey/ibkr/issues/23)

## 1.1.9 
**25-05-2020**
  - When portfolio updates, re-fetch and update local portfolios see see [#22](https://github.com/stoqey/ibkr/issues/22)