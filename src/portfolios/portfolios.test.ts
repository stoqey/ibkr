import 'mocha';
import "dotenv/config";
import { expect, assert } from 'chai'
import { IBKRConnection } from '../connection';
import Portfolios from './Portfolios';

process.env.IBKR_CLIENT_ID = "25";
before((done) => {
    IBKRConnection.Instance.init().then(started => {
        if (started) {
            Portfolios.Instance.init();
            return done();
        }
        done(new Error('error starting ibkr'))
    })
})

describe('IBKR Portfolios', () => {
    it('should connect to IBKR', (done) => {
        expect(IBKRConnection.Instance.connected).to.be.true;
        done();
    });

    it('should get portfolios', async() => {
        const portfolios = await Portfolios.Instance.getPositions();
        console.log("portfolios", portfolios);
        expect(portfolios).to.be.not.empty;
    });
})

