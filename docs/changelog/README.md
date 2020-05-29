# Change log

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