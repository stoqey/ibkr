import 'mocha';
import { expect } from 'chai';
import MosaicScanner from './MosaicScanner';
import { IbkrEvents, IBKREVENTS } from '../events';
import ibkr from '..';
import { log } from '../log';


const ibkrEvents = IbkrEvents.Instance;

before((done) => {
    ibkr().then(started => {
        if (started) {
            return done();
        }
        done(new Error('error starting ibkr'))

    })
})


describe('Mosaic Scanner', () => {


    it('should get top gainers', (done) => {
        const mosaicScanner = new MosaicScanner();

        mosaicScanner.scanMarket({
            instrument: 'STK',
            locationCode: 'STK.NASDAQ.NMS',
            numberOfRows: 10,
            scanCode: 'TOP_PERC_GAIN',
            stockTypeFilter: 'ALL'
        }).then(data => {
            console.log('data is ', JSON.stringify(data));
            done();
        })

    });

})


