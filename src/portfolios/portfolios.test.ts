import 'mocha';
import { expect } from 'chai';
import ibkr from '..';
import { log } from '../log';
import Portfolios from './Portfolios';


before((done) => {
    ibkr().then(started => {
        if (started) {
            return done();
        }
        done(new Error('error starting ibkr'))

    })
})

describe('Portfolios', () => {

    it('should get all portfolios', async () => {
        const portfolios = Portfolios.Instance;
        const results = await portfolios.getPortfolios();
        log('All portfolios are', results && results.length)
        expect(results).to.be.not.null;

    });

})


