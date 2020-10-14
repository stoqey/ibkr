import 'mocha';
import { expect } from 'chai'
import PriceUpdates from './price.updates';
import { onConnected } from '../connection/connection.utilities';
import { IbkrEvents, IBKREVENTS } from '../events';
import ibkr from '..';
import { IBKRConnection } from '../connection';
import { ContractObject } from '../contracts';

const ibkrEvents = IbkrEvents.Instance;


before((done) => {
    ibkr().then(r => done())
});

describe('Realtime', () => {

    PriceUpdates.Instance;

    it('should get price updates for AAPL', (done) => {

        const symbol = 'AAPL';

        const getMarketData = () => {
            const handleData = (data) => {
                // ibkrEvents.off(IBKREVENTS.ON_PRICE_UPDATES, handleData);
                // done();
            };
            ibkrEvents.on(IBKREVENTS.ON_PRICE_UPDATES, handleData);

            ibkrEvents.emit(IBKREVENTS.SUBSCRIBE_PRICE_UPDATES, { contract: symbol, opt: { tickType: 'ASK'} });
            ibkrEvents.emit(IBKREVENTS.SUBSCRIBE_PRICE_UPDATES, { contract: 'TSLA', opt: { tickType: 'ASK'} });

            return setTimeout(() => {
                ibkrEvents.off(IBKREVENTS.ON_PRICE_UPDATES, handleData);
                // done();
            }, 5000);
        };

        getMarketData();
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
