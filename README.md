
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
This is an event-based ibkr client for node
|       | Feature                                       |
| :---: | --------------------------------------------- |
|   ✅   | Accounts                                      |
|   ✅   | Portfolios                                    |
|   ✅   | Orders                                        |
|   ✅   | Historical Data                               |
|   ✅   | Realtime price updates                        |
|   ✅   | Contracts (stocks/forex/options/index .e.t.c) |
|   ✅   | Mosaic Market scanner                         |
|   ⬜️   | News                                          |


## 1. Install
```bash
npm i @stoqey/ibkr
```

## 2. Usage

### Initialize
```ts
import ibkr, { AccountSummary, IBKREVENTS, IbkrEvents, PortFolioUpdate, getContractDetails } from '@stoqey/ibkr';

const ibkrEvents = IbkrEvents.Instance;

// 1. Async 
await ibkr({ port: IB_PORT, host: IB_HOST });

// 2. Callback
ibkr({ port: IB_PORT, host: IB_HOST }).then(started => {
  
    if(!started){
          // Error IBKR has not started
          console.log('error cannot start ibkr');
        //   Not to proceed if not connected with interactive brokers
          return process.exit(1);
    }

    // Your code here

})
```

### Accounts, Summary e.t.c
```ts
const accountId = AccountSummary.Instance.accountSummary.AccountId;
const totalCashValue = AccountSummary.Instance.accountSummary.TotalCashValue;

```
### Portfolios
```ts

// Get current portfolios
const portfolios = Portfolios.Instance;
const accountPortfolios = await portfolios.getPortfolios();

// Subscribe to portfolio updates
ibkrEvents.on(IBKREVENTS.PORTFOLIOS, (porfolios: PortFolioUpdate[]) => {
      // use porfolios  updates here
})

```

### Historical Data + Realtime price updates

- Market data
```ts
import { HistoricalData } from '@stoqey/ibkr';

// 1. Init
HistoricalData.Instance;

const args = {
  symbol,
  contract = [symbol, 'SMART', 'USD'],
  endDateTime = '',
  durationStr = '1 D',
  barSizeSetting = '1 min',
  whatToShow = 'ASK'
};

// 2.1 Request for market data directly
HistoricalData.Instance.getHistoricalData(args);

// 2.2 Request for market using events
ibkrEvents.emit(IBKREVENTS.GET_MARKET_DATA, args);

// 3. Subscribe to market data results
ibkrEvents.on(IBKREVENTS.ON_MARKET_DATA, ({ symbol, marketData }) => {
    //  Use the data here
})
```

- Real-time price updates
```ts
import { PriceUpdates } from '@stoqey/ibkr';

PriceUpdates.Instance; // init

// subscribe for price updates
ibkrEvents.on(IBKREVENTS.ON_PRICE_UPDATES, (priceUpdates) => {
     // use the price updates here
 });

//  Request price updates
ibkrEvents.emit(IBKREVENTS.SUBSCRIBE_PRICE_UPDATES, { symbol: 'AAPL' });
```
  
### Contracts
```ts
 
const contractDetails = await getContractDetails(ib.contract.stock("AAPL"));

//  or 

const contractDetails = await getContractDetails({
    currency: 'USD',
    exchange: 'SMART',
    multiplier: 100,
    right: 'C',
    secType: 'OPT',
    strike: 300,
    symbol: 'AAPL'
});

// or with just a symbol, defaults to stocks
 const contractDetails = await getContractDetails('AAPL');
```

### Orders
```ts
import { Orders, OrderStock } from '@stoqey/ibkr';

const orderTrade = Orders.Instance;

const myStockOrder: OrderStock = { ... }

const placedOrder = await orderTrade.placeOrder(myStockOrder);
          
```

**OrderStock** 
```ts
const stockOrderBuyOut: OrderStock = {
    symbol: symbol,
    action: "SELL",
    type: "market",
    parameters: ["1", "9999"], // 'SELL', 1, 9999,
    size: 3,
    capital: 1000,
    exitTrade: false,
}
```

**type**
- limit `('SELL', 1, 9999)` like in example above
- market `(action, quantity, transmitOrder, goodAfterTime, goodTillDate)`
- marketClose `(action, quantity, price, transmitOrder)`
- stop `(action, quantity, price, transmitOrder, parentId, tif)`
 - stopLimit `(action, quantity, limitPrice, stopPrice, transmitOrder, parentId, tif)`
- trailingStop `(action, quantity, auxPrice, tif, transmitOrder, parentId)`

**Order events**

- Order filled
```ts
ibkrEvents.on(IBKREVENTS.ORDER_FILLED, (data) => {

});
```

- Order status
```ts
ibkrEvents.on(IBKREVENTS.ORDER_STATUS, (data) => {

});
```

- Open Orders updates
```ts
ibkrEvents.on(IBKREVENTS.OPEN_ORDERS, (data) => {

});
```

**Mosaic Scanner**
```ts
import { MosaicScanner } from '@stoqey/ibkr';
const mosaicScanner = new MosaicScanner();

const scannerData = await mosaicScanner.scanMarket({
      instrument: 'STK',
      locationCode: 'STK.US.MAJOR',
      numberOfRows: 10,
      scanCode: 'TOP_PERC_GAIN',
      stockTypeFilter: 'ALL'
})
```

see any `.test.ts` file for examples

## 3. Debug

We use [debug](https://github.com/visionmedia/debug) library for logging.
Run with `DEBUG=ibkr:*` to see all logs, or `DEBUG=ibkr:info` for less verbose logs.

<div align="center" >
<img style="background:#231f20;color:white; width:100%;padding:10px" src="./docs/logo_interactive-brokers_white.png"></img>
<h3>Stoqey Inc<h3>
</div>