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
|       | Feature                                                  |
| :---: | -------------------------------------------------------- |
|   ✅   | Accounts and account update events                       |
|   ✅   | Portfolios, positions, and position update events        |
|   ✅   | Orders, open-order updates, and completed trade events   |
|   ✅   | Historical bars and historical ticks                     |
|   ✅   | Realtime bars and tick-by-tick price updates             |
|   ✅   | Contract lookup and search for stocks/forex/options/etc. |
|   ✅   | Market-data-only mode for scanners and feeders           |
|   ✅   | Contract allowlists for orders, positions, and data      |
|   ⬜️   | Mosaic Market scanner                                    |
|   ⬜️   | News                                                     |

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
DEBUG=ibkr:*
```

Optional connection settings:

```sh
IBKR_RECONNECT_INTERVAL=5000
IBKR_WATCHDOG_INTERVAL=1
```

### Initialize
```ts
import ibkr from '@stoqey/ibkr';

await ibkr();

// your code
```

You can also pass `@stoqey/ib` `IBApiNext` creation options directly:

```ts
import ibkr from '@stoqey/ibkr';

await ibkr({
  host: "127.0.0.1",
  port: 7497,
  reconnectInterval: 5000,
  connectionWatchdogInterval: 1,
});
```

### Events

`IBKREvents.Instance` is the shared event bus. Managers keep their cached state up to date, and these events let your app react when that state changes:

| Event | Payload | When it emits |
| --- | --- | --- |
| `IBKR_CONNECTED` | none | Socket reconnects or finishes connecting |
| `IBKR_ACCOUNT_UPDATED` | `{ updatedAt }` | Account summary cache changes |
| `IBKR_POSITIONS_UPDATED` | `{ updatedAt }` | Position cache changes |
| `IBKR_OPEN_ORDERS_UPDATED` | `{ updatedAt }` | Open-order cache changes |
| `IBKR_COMPLETED_TRADES_UPDATED` | `{ updatedAt }` | Filled trade cache changes |
| `IBKR_SAVE_TRADE` | `Trade` | A filled order is converted to a trade |
| `IBKR_BAR` | `MarketData` | Realtime bar or tick-aggregated bar is cached |

```ts
import { IBKREvents, IBKREVENTS } from '@stoqey/ibkr';
import type { MarketData, Trade } from '@stoqey/ibkr';

const events = IBKREvents.Instance;

events.on(IBKREVENTS.IBKR_BAR, (bar: MarketData) => {
  console.log(bar.instrument?.symbol, bar.close);
});

events.on(IBKREVENTS.IBKR_SAVE_TRADE, (trade: Trade) => {
  console.log(trade.instrument?.symbol, trade.action, trade.quantity);
});
```

### Accounts Summary e.t.c
```ts
import { AccountSummary, IBKREvents, IBKREVENTS } from "@stoqey/ibkr";

const accountInstance = AccountSummary.Instance;

// account summaries is automatically updated for you
const accountSummaries = accountInstance.accountSummary;

const accountId = accountSummaries.accountId;

const totalCashValue = accountSummaries.TotalCashValue.value;

IBKREvents.Instance.on(IBKREVENTS.IBKR_ACCOUNT_UPDATED, () => {
  console.log(accountInstance.accountSummary.NetLiquidation.value);
});
```

### Portfolios
```ts
import { Portfolios, IBKREvents, IBKREVENTS } from "@stoqey/ibkr";

// Get current portfolios
const portfolios = Portfolios.Instance;

// positions returns the latest cached snapshot
const accountPortfolios = portfolios.positions;
console.log(accountPortfolios);

IBKREvents.Instance.on(IBKREVENTS.IBKR_POSITIONS_UPDATED, () => {
  const updatedPortfolios = portfolios.positions;
  console.log(updatedPortfolios);
});
```

### Market Data

#### Historical bars
```ts
import { MarketDataManager } from '@stoqey/ibkr';
import { BarSizeSetting, WhatToShow } from '@stoqey/ib';

// 1. Get market data manager
const mkdManager = MarketDataManager.Instance;

// 2. Resolve an IBKR contract
const contract = await mkdManager.getContract({
  symbol: "AAPL",
  secType: "STK",
  exchange: "SMART",
  currency: "USD",
});

// 3. Get historical bars
const data = await mkdManager.getHistoricalData(
  contract,
  undefined,
  "1 D",
  BarSizeSetting.MINUTES_FIVE,
  WhatToShow.TRADES,
  true
);

```

#### Realtime bar updates
```ts
import { MarketDataManager, IBKREvents, IBKREVENTS } from '@stoqey/ibkr';
import type { MarketData } from '@stoqey/ibkr';
import { BarSizeSetting, WhatToShow } from '@stoqey/ib';

// 1. Get IBKR events
const ibkrEvents = IBKREvents.Instance;

// 2. Get market data manager
const mkdManager = MarketDataManager.Instance;

// 3. Request historical data updates
await mkdManager.getHistoricalDataUpdates(
  contract,
  BarSizeSetting.SECONDS_FIVE,
  WhatToShow.TRADES
);

// 4. Subscribe for realtime bars
ibkrEvents.on(IBKREVENTS.IBKR_BAR, (bar: MarketData) => {
  // use the realtime bar here
});

// 5. Get cached market data for a date range
const cachedData = await mkdManager.historicalData(contract, start, end);

// 6. Get the latest cached quote, or the quote at or before a timestamp
const latestQuote = await mkdManager.getQuote(contract);
const pointInTimeQuote = await mkdManager.getQuote(contract, new Date("2026-01-15T15:30:00Z"));

```

```ts
// Unsubscribe from historical data updates
mkdManager.removeHistoricalDataUpdates(contract);
```

#### Tick-by-tick updates

`getTickByTickDataUpdates` subscribes to IBKR all-last ticks, updates portfolio market prices, aggregates ticks into one-second bars, caches those bars, and emits them through `IBKR_BAR`.

```ts
import { MarketDataManager, IBKREvents, IBKREVENTS } from '@stoqey/ibkr';
import type { MarketData } from '@stoqey/ibkr';

const ibkrEvents = IBKREvents.Instance;
const mkdManager = MarketDataManager.Instance;

ibkrEvents.on(IBKREVENTS.IBKR_BAR, (bar: MarketData) => {
  console.log(bar.date, bar.close, bar.volume);
});

await mkdManager.getTickByTickDataUpdates(contract);

// Later, unsubscribe
mkdManager.removeTickByTickDataUpdates(contract);
```

For historical tick data:

```ts
const ticks = await mkdManager.getHistoricalTicksLast(
  contract,
  new Date("2026-01-15T14:30:00Z"),
  new Date("2026-01-15T15:30:00Z"),
  1000,
  false
);
```

#### Market-data-only mode

Set `MD_ONLY=true` or `IBKR_MD_ONLY=true` before initialization when a process only needs contract lookup and market data:

```sh
IBKR_MD_ONLY=true
```

In market-data-only mode, the package still connects to IBKR and initializes `MarketDataManager`. Contract lookup, contract details, historical data, realtime bars, historical ticks, and tick-by-tick market data remain available.

It skips account summary updates, account/portfolio subscriptions, open-order subscriptions, and order/trade event state. Use this for scanners, feeders, and symbol-search clients. Do not use it for execution clients that place orders or need live portfolio/order state.

#### Contract filtering

Set `IBKR_CONTRACTS` to a comma-separated allowlist when multiple apps share the same broker session but should only see or trade selected contracts:

```env
IBKR_CONTRACTS=NQ-FUT,AAPL-STK,GC-FUT
```

The global filter applies to orders, positions, and market data. Filters are case-insensitive and can match:

- Symbol, such as `AAPL`
- Symbol/security type, such as `NQ-FUT`
- Symbol/security type/expiry, such as `NQ-FUT-202606` or `NQ-FUT-20260622`
- Symbol/security type/exchange, such as `AAPL-STK-SMART`
- The package symbol key returned by `getSymbolKey`

If one area needs a different allowlist, use a scoped override:

```env
IBKR_CONTRACTS_ORDERS=NQ-FUT
IBKR_CONTRACTS_POSITIONS=NQ-FUT,GC-FUT
IBKR_CONTRACTS_MARKETDATA=*
```

`IBKR_CONTRACTS_ORDER`, `IBKR_CONTRACTS_POSITION`, and `IBKR_CONTRACTS_MD` are also accepted aliases. `*` disables filtering for that scope. Account summary is account-level data from IBKR, so it is intentionally not contract-filtered; use separate accounts, allocation groups, or app-side risk budgets when each app needs isolated buying power.

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

Use `searchContracts` when you need all matching contract details instead of only the first match:

```ts
const contracts = await mkdManager.searchContracts({
  symbol: "ES",
  secType: "FUT",
});
```

### Orders
```ts
import { MarketDataManager, Orders, IBKREvents, IBKREVENTS } from '@stoqey/ibkr';
import type { Trade } from '@stoqey/ibkr';
import { OrderAction, OrderType } from '@stoqey/ib';

// 1. Get IBKR events
const ibkrEvents = IBKREvents.Instance;

// 2. Get orders manager
const ordersManager = Orders.Instance;

// 3. Place order
const mkdManager = MarketDataManager.Instance;
const contract = await mkdManager.getContract({
  symbol: "AAPL",
  secType: "STK" /* STK, OPT, FUT, etc. */,
  exchange: "SMART" /* SMART, NYSE, NASDAQ, etc. */,
  currency: "USD"  /* USD, EUR, GBP, etc. */
});

const price = 200;
const quantity = 1;
const myOrder = {
  action: OrderAction.BUY,
  totalQuantity: quantity,
  orderType: price ? OrderType.LMT : OrderType.MKT,
  ...(price && { lmtPrice: price }),
  transmit: true, // true to submit order immediately, false to save as draft
  outsideRth: false, // true to allow execution outside regular trading hours, false otherwise
  tif: "DAY", // DAY (day order), GTC (good till canceled), IOC (immediate or cancel), etc.
};

const placed = await ordersManager.placeOrder(contract, myOrder);

// 4. Modify order
const modifyOrder = await ordersManager.modifyOrder(id, contract, myOrder);

// get orders, this is automatically updated
const orders = ordersManager.orders;

// get filled orders(trades), this is automatically updated
const trades = ordersManager.trades;

// subscribe for trades, when orders are filled in real time
ibkrEvents.on(IBKREVENTS.IBKR_SAVE_TRADE, (trade: Trade) => {
  // use trade here
});

ibkrEvents.on(IBKREVENTS.IBKR_OPEN_ORDERS_UPDATED, () => {
  console.log(ordersManager.orders);
});

ibkrEvents.on(IBKREVENTS.IBKR_COMPLETED_TRADES_UPDATED, () => {
  console.log(ordersManager.trades);
});

// other methods e.t.c....
await ordersManager.cancelOrder(orderId);

await ordersManager.cancelAllOrders({});
```

Quickstart Sample App: See this API in action with our companion [Sample Application](https://github.com/stoqey/ibkr-sample).
Also, see any `.test.ts` file for examples

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
