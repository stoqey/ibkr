import 'mocha';
import { expect } from 'chai'
import { HistoricalData } from '.';
import { onConnected } from '../connection/connection.utilities';
import ibkr from '..';
import { IbkrEvents, IBKREVENTS } from '../events';
import { log } from '../log';
import { IBKRConnection } from '../connection';

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
        const symbol = "AAPL";

        let complete = false;
        HistoricalData.Instance.getHistoricalData({
            endDateTime: '20200521 15:00:00',
            symbol,
            whatToShow: "BID",
            durationStr: '3600 S',
            barSizeSetting: '5 secs',
        });

        ibkrEvents.on(IBKREVENTS.ON_MARKET_DATA, async ({ symbol, marketData: data }: { symbol: string; marketData: any[] }) => {
            // await fsPromises.writeFile(`${__dirname}/${symbol}.json`, JSON.stringify(data));
            log(`Historical Data for ${symbol} ${data && data.length}`);
            log(`Start ----> ${symbol} ${data.shift().date}`);
            log(`End ----> ${symbol} ${data.pop().date}`);
            if (!complete) {
                complete = true;
                done();
            }
        })
    });

    it('should get market data with contract object', (done) => {
        const symbol = "AAPL";

        const ib = IBKRConnection.Instance.getIBKR();

        let complete = false;

        setTimeout(() => {
            // To avoid violation pace
            HistoricalData.Instance.getHistoricalData({

                contract: ib.contract.stock("AAPL"),
                symbol,
                whatToShow: "BID",
                durationStr: '1800 S',
                barSizeSetting: '1 secs',
            });
        }, 3000);


        ibkrEvents.on(IBKREVENTS.ON_MARKET_DATA, async ({ symbol, marketData: data }) => {
            // await fsPromises.writeFile(`${__dirname}/${symbol}.json`, JSON.stringify(data));
            log(`Historical Data for ${symbol} ${data && data.length}`);
            if (!complete) {
                complete = true;
                done();
            }
        })
    });

    it('should get market data async mode', (done) => {
        const symbol = "AAPL";

        async function getMarketData() {
            const data = await HistoricalData.Instance.reqHistoricalData({
                endDateTime: '20200521 15:00:00',
                symbol, whatToShow: "BID",
                durationStr: '1800 S',
                barSizeSetting: '1 secs',
            });

            log(`Historical Data for ${symbol} ${data && data.length}`);
            log(`Start ----> ${symbol} ${data.shift().date}`);
            log(`End ----> ${symbol} ${data.pop().date}`);

            done();
        }

        setTimeout(() => {
            getMarketData();
        }, 1000);


    });

    it('should get market data async mode with contract object', (done) => {
        const symbol = "AAPL";

        const ib = IBKRConnection.Instance.getIBKR();

        async function getMarketData() {
            const data = await HistoricalData.Instance.reqHistoricalData({
                symbol,
                whatToShow: "BID",
                contract: ib.contract.stock("AAPL"),
                durationStr: '1800 S',
                barSizeSetting: '1 secs',
            });

            log(`Historical Data for ${symbol} ${data && data.length}`);
            done();
        }

        setTimeout(() => {
            getMarketData();
        }, 3000);


    });

    it('should get empty market data when contract object is invalid', (done) => {
        const symbol = "AAPL";

        async function getMarketData() {
            const data = await HistoricalData.Instance.reqHistoricalData({
                symbol,
                durationStr: '1 W',
                barSizeSetting: '1 day',
                whatToShow: 'YIELD_BID'
            });

            log(`Historical Data for ${symbol} ${data && data.length}`);
            done();
        }

        setTimeout(() => {
            getMarketData();
        }, 3000);


    });

    it('should get empty market data when contract is invalid/ambiguous', (done) => {
        const symbol = 'csco'

        async function getMarketData() {
            const data = await HistoricalData.Instance.reqHistoricalData({
                symbol,
                endDateTime: '',
                durationStr: '1 W',
                barSizeSetting: '1 day',
                whatToShow: 'TRADES',
            });

            log(`Historical Data for ${symbol} ${data && data.length}`);
            done();
        }

        setTimeout(() => {
            getMarketData();
        }, 3000);


    });
})


