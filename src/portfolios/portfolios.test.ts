import 'mocha';
import { expect } from 'chai'
import Portfolios from './Portfolios';

const portfolios = Portfolios.Instance;

describe('Given IBKR with proper env, port, url', () => {

    it('should be connected to ibkr',  async () => {
         const accountPortfolios = portfolios.getPortfolios();
        expect(accountPortfolios).to.be.equal([]);
    });

});
