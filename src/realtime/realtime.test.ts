import 'mocha';
import { expect } from 'chai'
import PriceUpdates from './price.updates';
import { onConnected } from '../connection/connection.utilities';
import { IbkrEvents, IBKREVENTS } from '../events';
import ibkr from '..';

const ibkrEvents = IbkrEvents.Instance;


before((done) => {
    ibkr().then(r => done())
});

describe('Realtime', () => {

    PriceUpdates.Instance;

    it('should get price updates for AAPL', (done) => {

        const getMarketData = () => {
            const handleData = (data) => {
                ibkrEvents.off(IBKREVENTS.ON_PRICE_UPDATES, handleData);
                done();
            };
            ibkrEvents.on(IBKREVENTS.ON_PRICE_UPDATES, handleData);

            ibkrEvents.emit(IBKREVENTS.SUBSCRIBE_PRICE_UPDATES, { symbol: 'AAPL' });
        };

        getMarketData();
    });

});
