import 'mocha';
import { expect } from 'chai'
import { HistoricalData } from '.';
import { onConnected } from '../connection/connection.utilities';

const fsPromises = require('fs').promises

let demoSymbolData;

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


