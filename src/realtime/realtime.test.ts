import 'mocha';
import { expect } from 'chai'
import PriceUpdates from './price.updates';
import { onConnected } from '../connection/connection.utilities';
import { IbkrEvents, IBKREVENTS } from '../events';
import ibkr from '..';
import { IBKRConnection } from '../connection';

const ibkrEvents = IbkrEvents.Instance;


let symbol = 'USD.EUR';

before((done) => {
    ibkr().then(r => done())
});

describe('Realtime', () => {

    PriceUpdates.Instance;

    // it('should get price updates for AAPL', (done) => {

    //     const getMarketData = () => {
    //         const handleData = (data) => {
    //             // ibkrEvents.off(IBKREVENTS.ON_PRICE_UPDATES, handleData);
    //             // done();
    //         };
    //         ibkrEvents.on(IBKREVENTS.ON_PRICE_UPDATES, handleData);

    //         ibkrEvents.emit(IBKREVENTS.SUBSCRIBE_PRICE_UPDATES, { symbol });

    //         return setTimeout(() => {
    //             ibkrEvents.off(IBKREVENTS.ON_PRICE_UPDATES, handleData);
    //             done();
    //         }, 5000);
    //     };

    //     getMarketData();
    // });

    it('should get price updates for forex', (done) => {

        symbol = 'USD.EUR';
        const ib = IBKRConnection.Instance.getIBKR();
        const contract = ib.contract.forex('CAD');

        const getMarketData = () => {
            const handleData = (data) => {
                // ibkrEvents.off(IBKREVENTS.ON_PRICE_UPDATES, handleData);
                // done();
            };
            ibkrEvents.on(IBKREVENTS.ON_PRICE_UPDATES, handleData);

            

            ibkrEvents.emit(IBKREVENTS.SUBSCRIBE_PRICE_UPDATES, contract);

            return setTimeout(() => {
                ibkrEvents.off(IBKREVENTS.ON_PRICE_UPDATES, handleData);
                done();
            }, 5000);
        };

        getMarketData();
    });

});
