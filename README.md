
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
- Accounts
- Portfolios
- Orders/Trades
- Historical Data + Realtime price updates
- Contracts

## 1. Install
```bash
npm i @stoqey/ibkr
```

## 2. Usage

### Initialize
```ts
import ibkr, { AccountSummary, IBKREVENTS, IbkrEvents, HistoryData, PortFolioUpdate, getContractDetails } from '@stoqey/ibkr';

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
import { AccountHistoryData } from '@stoqey/ibkr';

// 1. Async 
const myData = await AccountHistoryData.Instance.getHistoricalData(symbol);

// 2. raw callback events
// Requeust market data
ibkrEvents.emit(IBKREVENTS.GET_MARKET_DATA, { symbol: 'AAPL' });

// Subscribe to market data
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
 const contractDetails = await getContractDetails('AAPL');
```

### Orders/Trades (TODO doc)

see any `.test.ts` file for examples



<div align="center" style="background:#231f20;color:white; width:100%;padding:10px">
<img src="./docs/logo_interactive-brokers_white.png"></img>
<h3>Stoqey Inc<h3>
</div>