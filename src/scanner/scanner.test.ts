import 'mocha';

import {IBKREVENTS, IbkrEvents} from '../events';

import MosaicScanner from './MosaicScanner';
import ibkr from '..';

const ibkrEvents = IbkrEvents.Instance;

before((done) => {
    ibkr({opt: {portfolios: false, orders: false}}).then((started) => {
        if (started) {
            return done();
        }
        done(new Error('error starting ibkr'));
    });
});

describe('Mosaic Scanner', () => {
    it('should get top gainers', (done) => {
        const mosaicScanner = new MosaicScanner();

        mosaicScanner
            .scanMarket({
                instrument: 'STK',
                locationCode: 'STK.US.NYSE',
                numberOfRows: 500,
                scanCode: 'TOP_PERC_GAIN',
                stockTypeFilter: 'ALL',
                // aboveVolume: 1000000
            })
            .then((data) => {
                console.log('data is ', JSON.stringify(data.map((f: any) => f.contract.symbol)));
                done();
            });
    });
});
