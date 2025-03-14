
<p align="center">
  <h1 align="center"> IBKR: Interactive Brokers</h1>
</p>



<div align="center">

<img src="./docs/ib-logo-stacked.png"></img>

<div style="display: flex;justify-content:center;">

<img alt="NPM" src="https://img.shields.io/npm/dt/@stoqey/ibkr.svg"></img>
 

</div>

</div>


### Run IBKR in style
This is using @stoqey/ib IBKR client for node, via the newer IbApiNext in an simpler way.
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

### Initialize
```ts
import ibkr from '@stoqey/ibkr';


// Set env
// process.env.IBKR_PORT  
// process.env.IBKR_HOST 
// process.env.IBKR_CLIENT_ID (optional)

// 1. async
await ibkr();

// 2. Callback
ibkr().then(started => {
  
    if(!started){

          // Error IBKR has not started
          console.log('error cannot start ibkr');

          //  Not to proceed if not connected with interactive brokers
          return process.exit(1);
    }

    // Your code here

})
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
const contract = mkdManager.getContract({...})
const myOrder = {...}
const placedOrder = await ordersManager.placeOrder(contract, myOrder);

// 4. Modify order
const modifyOrder = await ordersManager.placeOrder(id, contract, myOrder);

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

<div align="center" >
<img style="background:#231f20;color:white; width:100%;padding:10px" src="./docs/logo_interactive-brokers_white.png"></img>
<h3>Stoqey Inc<h3>
</div>