import 'mocha';
import { expect } from 'chai'
import { HistoricalData } from '.';
import { onConnected } from '../connection/connection.utilities';
import ibkr from '..';

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
    it('should get market data', async () => {
        const symbol = "PECK";

        await onConnected();

        demoSymbolData = await HistoricalData.Instance.getHistoricalData(symbol);

        await fsPromises.writeFile(`${__dirname}/${symbol}.json`, JSON.stringify(demoSymbolData))

        console.log(`Historical Data for ${symbol} ${demoSymbolData && demoSymbolData.length}`);
        expect(demoSymbolData).to.be.not.null;

    });
})


