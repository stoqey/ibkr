import test from 'ava';
import AccountHistoryData, { HistoryData } from './history.data';
import IbConnection from '../../ibConnection';
import isEmpty from 'lodash/isEmpty';
import { AppEvents, onConnected } from '../../servers/app.EventEmitter';

const fsPromises = require('fs').promises
IbConnection.Instance;
AccountHistoryData.Instance;

AppEvents

test.after(t => {
    IbConnection.Instance.disconnectIBKR();
});

let demoSymbolData;

test('Get history data', async t => {
    const symbol = "PECK";

    await onConnected();

    demoSymbolData = await AccountHistoryData.Instance.getHistoricalDataSync(symbol);

    await fsPromises.writeFile(`${__dirname}/${symbol}.json`, JSON.stringify(demoSymbolData))

    console.log(`Historical Data for ${symbol} ${demoSymbolData && demoSymbolData.length}`)
    t.is(isEmpty(demoSymbolData), false);
});

