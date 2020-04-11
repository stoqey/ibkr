# [WIP] 

## IBKR - NodeJS Interactive Brokers wrapper & utilities

[![npm](https://img.shields.io/npm/dt/@stoqey/ibkr.svg)](http://www.npmtrends.com/@stoqey/ibkr)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
![TypeScript compatible](https://img.shields.io/badge/typescript-compatible-brightgreen.svg)


### Run IBKR in style
This is an event-based ibkr client for node
- Accounts
- Portfolios
- Orders/Trades
- Historical Data
- Contracts

## 1. Install
```bash
npm i @stoqey/ibkr
```

## 2. Usage
```ts
import ibkr, { AccountSummary, APPEVENTS, AppEvents, HistoryData, PortFolioUpdate } from '@stoqey/ibkr';

const ibkrEvents = AppEvents.Instance;

ibkr().then(started => {
  
    if(!started){
          // Error IBKR has not started
          console.log('error cannot start ibkr');
        //   Not to proceed if not connected with interactive brokers
          return process.exit(1);
    }

    // Register listners
    console.log('IBKR App has started', AccountSummary.Instance.AccountId);
    
    //  Portfolios
    ibkrEvents.on(APPEVENTS.PORTFOLIOS, (porfolios: PortFolioUpdate) => {
      // use porfolios here
    })

     //  Market data
     ibkrEvents.on(APPEVENTS.ON_MARKET_DATA, ({ symbol, marketData }) => {
      //  Use the data here
    })

})


```

see any `.test.ts` file for examples
