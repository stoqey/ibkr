import dotenv from 'dotenv';
import 'mocha';
import ibkr from '..';
import {IBKRConnection} from '../connection';
import {getContractSummaryOne} from '../contracts';
import {IbkrEvents, IBKREVENTS} from '../events';
import {PriceUpdatesEvent} from './price.interfaces';
import PriceUpdates from './price.updates';

const ibkrEvents = IbkrEvents.Instance;

before(async () => {
    dotenv.config({path: '.env.test'});
    const args = {
        port: process.env.TEST_IBKR_PORT ? Number(process.env.TEST_IBKR_PORT) : undefined,
        host: process.env.TEST_IBKR_HOST,
    };
    await ibkr(args);

    // Set the type of market data to retrieve: 1=live, 2=frozen, 3=delayed, 4=delayed/frozen
    const ib = IBKRConnection.Instance.getIBKR();
    const marketDataType: number = process.env.TEST_IBKR_MARKET_DATA_TYPE
        ? Number(process.env.TEST_IBKR_MARKET_DATA_TYPE)
        : 1;
    ib.reqMarketDataType(marketDataType);
});

describe('Realtime', () => {
    const priceUpdates = PriceUpdates.Instance;

    it('should get price updates for AAPL', (done) => {
        const getMarketData = async () => {
            const contract = await getContractSummaryOne({
                exchange: 'SMART',
                symbol: 'AAPL',
                secType: 'STK',
                currency: 'USD',
            });

            let stopped = false;
            function stop(error?: Error) {
                if (!stopped) {
                    stopped = true;
                    ibkrEvents.off(IBKREVENTS.ON_PRICE_UPDATES, onPriceUpdates);
                    priceUpdates.unsubscribe(contract);
                    done(error);
                }
            }

            function onPriceUpdates(ev: PriceUpdatesEvent) {
                console.log('onPriceUpdates:', ev);

                const tickType: string | undefined = ev.tickType;
                if (tickType) {
                    if (tickType.includes('BID') || tickType.includes('LAST')) {
                        stop();
                    }
                }
            }
            ibkrEvents.on(IBKREVENTS.ON_PRICE_UPDATES, onPriceUpdates);

            priceUpdates.subscribe({contract});

            return setTimeout(() => {
                stop(new Error('timeout'));
            }, 10000);
        };

        try {
            getMarketData();
        } catch (err) {
            done(err);
        }
    });

    // it('should unsubscribe from updates for AAPL', (done) => {

    //     const symbol = 'AAPL';

    //     const getMarketData = () => {
    //         ibkrEvents.emit(IBKREVENTS.UNSUBSCRIBE_PRICE_UPDATES, symbol);

    //         return setTimeout(() => {
    //             done();
    //         }, 5000);
    //     };

    //     getMarketData();
    // });

    // it('should get price updates for forex updates ASK', (done) => {

    //     const contract = {
    //         "symbol":"GBP",
    //         "secType":"CASH",
    //         "currency":"USD",
    //     };

    //     const getMarketData = () => {
    //         const handleData = (data) => {
    //             // ibkrEvents.off(IBKREVENTS.ON_PRICE_UPDATES, handleData);
    //             // done();
    //         };
    //         ibkrEvents.on(IBKREVENTS.ON_PRICE_UPDATES, handleData);

    //         ibkrEvents.emit(IBKREVENTS.SUBSCRIBE_PRICE_UPDATES, {contract, opt: { tickType: 'ASK' }});

    //         return setTimeout(() => {
    //             ibkrEvents.off(IBKREVENTS.ON_PRICE_UPDATES, handleData);
    //             done();
    //         }, 5000);
    //     };

    //     getMarketData();
    // });

    // it('should get price updates for forex updates BID', (done) => {

    //     const contract = {
    //         "symbol":"GBP",
    //         "secType":"CASH",
    //         "currency":"USD",
    //     };

    //     const getMarketData = () => {
    //         const handleData = (data) => {
    //             // ibkrEvents.off(IBKREVENTS.ON_PRICE_UPDATES, handleData);
    //             // done();
    //         };
    //         ibkrEvents.on(IBKREVENTS.ON_PRICE_UPDATES, handleData);

    //         ibkrEvents.emit(IBKREVENTS.SUBSCRIBE_PRICE_UPDATES, {contract, opt: { tickType: 'BID' }});

    //         return setTimeout(() => {
    //             ibkrEvents.off(IBKREVENTS.ON_PRICE_UPDATES, handleData);
    //             done();
    //         }, 5000);
    //     };

    //     getMarketData();
    // });
});
