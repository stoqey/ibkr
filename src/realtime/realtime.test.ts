import 'mocha';
import { expect } from 'chai'
import PriceUpdates from './price.updates';
import { onConnected } from '../connection/connection.utilities';
import { IbkrEvents, IBKREVENTS } from '../events';

const ibkrEvents = IbkrEvents.Instance;
PriceUpdates.Instance;

describe('Realtime', () => {

    it('should get price updates for AAPL', async () => {
        let results = null;

        const getMarketData = () => new Promise((resolve, reject) => {
            const handleData = (data) => {
                ibkrEvents.off(IBKREVENTS.ON_PRICE_UPDATES, handleData);
                resolve(data)
            };
            ibkrEvents.on(IBKREVENTS.ON_PRICE_UPDATES, handleData);
        });

        if (await onConnected()) {

            ibkrEvents.emit(IBKREVENTS.SUBSCRIBE_PRICE_UPDATES, { symbol: 'AAPL' });
            results = await getMarketData();

        }
        expect(results).to.be.not.null;
    });

});
