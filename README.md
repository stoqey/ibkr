<p align="center">
  <h1 align="center"> IBKR: Interactive Brokers</h1>
</p>

<div align="center">

<img src="./docs/ib-logo-stacked.png"></img>

<div style="display: flex;justify-content:center;">
<a href="https://discord.gg/T4VjBrqGtK" aria-label="Join Stoqey #welcome"><img src="https://img.shields.io/badge/discord-join%20chat-blue.svg" alt="Join Stoqey #welcome"></a>
<img alt="NPM" src="https://img.shields.io/npm/dt/@stoqey/ibkr.svg"></img>
</div>

</div>

## Overview
A modern, TypeScript-based Node.js client for Interactive Brokers (IBKR) that provides a simplified interface to the IBKR API. This package is a wrapper around [@stoqey/ib](https://github.com/stoqey/ib), which implements the official IBKR API. It offers a more developer-friendly way to interact with Interactive Brokers' trading platform, abstracting away the complexity of the underlying API.

### Key Features
|       | Feature                                       |
| :---: | --------------------------------------------- |
|   ✅   | Accounts                                      |
|   ✅   | Portfolios                                    |
|   ✅   | Orders                                        |
|   ✅   | Historical Data                               |
|   ✅   | Realtime price updates                        |
|   ✅   | Contracts (stocks/forex/options/index .e.t.c) |
|   ⬜️   | Mosaic Market scanner                         |
|   ⬜️   | News                                          |

## 1. Install
```bash
npm i @stoqey/ibkr
```

## 2. Usage

Create a `.env` in the root dir of your project, set `IBKR_HOST` and `IBKR_PORT`, `IBKR_CLIENT_ID`(Optional, it'll use 0 by default), and `DEBUG` for logs, like this
```sh
IBKR_HOST=localhost
IBKR_PORT=7497
IBKR_CLIENT_ID=123
DEBUG=ibkr* 
```

### Initialize
```ts
import ibkr from '@stoqey/ibkr';

await ibkr();

// your code
```

### Accounts Summary e.t.c
```ts
import { AccountSummary } from  "@stoqey/ibkr";

const accountInstance = AccountSummary.Instance;

// account summaries is automatically updated for you
const accountSummaries = accountInstance.accountSummary;

const accountId = accountSummaries.accountId;

const totalCashValue = accountSummaries.TotalCashValue.value;

```
### Portfolios
```ts
import { Portfolios } from  "@stoqey/ibkr";
// Get current portfolios
const portfolios = Portfolios.Instance;

// positions is automatically updated for you
const accountPortfolios = portfolios.positions;

```

### Historical Data + Realtime price updates

- Market data
```ts
import { MarketDataManager } from '@stoqey/ibkr';

// 1. Get market data manager
const mkdManager = MarketDataManager.Instance;

// 2. Get market data async promise
const data = await mkdManager.getHistoricalData(contract, endDateTime, durationStr, barSizeSetting, whatToShow,useRTH );

```

- Real-time price updates
```ts
import { MarketDataManager, IBKREvents, IBKREVENTS } from '@stoqey/ibkr';

// 1. Get IBKR events
const ibkrEvents = IBKREvents.Instance;

// 2. Get market data manager
const mkdManager = MarketDataManager.Instance;

// 3. Request historical data updates
await mkdManager.getHistoricalDataUpdates(contract,barSizeSetting, whatToShow);

// 3. Subscribe for historical data updates
ibkrEvents.on(IBKREVENTS.IBKR_BAR, (bar: MarketData) => {
     // use the historical data updates here
});

// 4. get the cached marketdata
const cachedData = await mkdManager.historicalData(contract, start, end)

```

```ts
// Unsubscribe from historical data updates
mkdManager.removeHistoricalDataUpdates(contract);
```
  
### Contracts
```ts
import { MarketDataManager } from '@stoqey/ibkr';

// 1. Get market data manager
const mkdManager = MarketDataManager.Instance;

const contract = {
  symbol: "PLTR",
  secType: "STK"
};

const contractDetails = await mkdManager.getContract(contract);

//  or e.g options
const contractDetails = await mkdManager.getContract({
    currency: 'USD',
    exchange: 'SMART',
    multiplier: 100,
    right: 'C',
    secType: 'OPT',
    strike: 300,
    symbol: 'AAPL'
});

// e.g forex
const contractDetails = await mkdManager.getContract({
    "symbol":"GBP",
    "secType":"CASH",
    "currency":"USD",
});
```

### Orders
```ts
import { Orders, OrderStock, IBKREvents, IBKREVENTS } from '@stoqey/ibkr';

// 1. Get IBKR events
const ibkrEvents = IBKREvents.Instance;

// 2. Get orders manager
const ordersManager = Orders.Instance;

// 3. Place order
const contract = await mkdManager.getContract({
  symbol: ticker,
  secType: "STK" /* STK, OPT, FUT, etc. */,
  exchange: "SMART" /* SMART, NYSE, NASDAQ, etc. */,
  currency: "USD"  /* USD, EUR, GBP, etc. */
})
const myOrder = {
  action, // 1. BUY, 2. SELL
  totalQuantity: quantity,
  orderType: price ? OrderType.LIMIT : OrderType.MARKET, // 1. MARKET, 2. LIMIT, 3. STOP, etc.
  ...(price && { lmtPrice: price }),
  transmit: true, // true to submit order immediately, false to save as draft
  outsideRth: false, // true to allow execution outside regular trading hours, false otherwise
  tif: "DAY", // DAY (day order), GTC (good till canceled), IOC (immediate or cancel), etc.
};

const placedOrder = await ordersManager.placeOrder(contract, myOrder);

// 4. Modify order
const modifyOrder = await ordersManager.modifyOrder(id, contract, myOrder);

// get orders, this is automatically updated
const orders = ordersManager.orders;

// get filled orders(trades), this is automatically updated
const trades = ordersManager.trades;

// subscribe for trades, when orders are filled in real time
ibkrEvents.on(IBKREVENTS.IBKR_SAVE_TRADE, (bar: Trade) => {
     // use trade here
});

// other methods e.t.c....
await ordersManager.cancelOrder(orderId)

await ordersManager.cancelAllOrders()        
```

see any `.test.ts` file for examples

## 3. Debug

We use [debug](https://github.com/visionmedia/debug) library for logging.
Run with `DEBUG=ibkr:*` to see all logs, or `DEBUG=ibkr:info` for less verbose logs.

#### [See change log for updates](/docs/changelog/README.md)

## Community

Join our Discord community to get help, share ideas, and connect with other developers:

[![Join our Discord server](https://img.shields.io/badge/discord-join%20chat-blue.svg)](https://discord.gg/T4VjBrqGtK)

- Get help with implementation
- Share your projects
- Connect with other developers
- Stay updated on new releases
- Contribute to discussions
  
<div align="center" >
<img style="background:#231f20;color:white; width:100%;padding:10px" src="./docs/logo_interactive-brokers_white.png"></img>
<h3>Stoqey Inc<h3>
</div>