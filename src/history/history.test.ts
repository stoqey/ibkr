import 'mocha';
import { expect } from 'chai'
import { HistoricalData } from '.';
import { onConnected } from '../connection/connection.utilities';
import ibkr from '..';
import { IbkrEvents, IBKREVENTS } from '../events';
import { log } from '../log';

const ibkrEvents = IbkrEvents.Instance;

const fsPromises = require('fs').promises

let demoSymbolData;

before((done) => {
    ibkr().then(started => {
        if (started) {
            return done();
        }
        done(new Error('error starting ibkr'))

    })
})

describe('Historical Data', () => {
    it('should get market data', (done) => {
        const symbol = "PECK";

        HistoricalData.Instance.getHistoricalData({ symbol, whatToShow: "BID" });

        ibkrEvents.on(IBKREVENTS.ON_MARKET_DATA, async ({ symbol, marketData: data }) => {
            await fsPromises.writeFile(`${__dirname}/${symbol}.json`, JSON.stringify(data));
            log(`Historical Data for ${symbol} ${data && data.length}`);
            done();

        })

    });
})


