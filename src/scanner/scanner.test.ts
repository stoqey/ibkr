import 'mocha';
import MosaicScanner from './MosaicScanner';
import { IbkrEvents, IBKREVENTS } from '../events';
import ibkr from '..';


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
            locationCode: 'STK.US.MAJOR',
            numberOfRows: 10,
            scanCode: 'TOP_PERC_GAIN',
            stockTypeFilter: 'ALL'
        }).then(data => {
            console.log('data is ', JSON.stringify(data));
            done();
        })

    });

})


