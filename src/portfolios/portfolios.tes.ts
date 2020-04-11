import 'mocha';
import { expect } from 'chai'
import Portfolios from './Portfolios';
import { onConnected } from '../connection/connection.utilities';


describe('Given IBKR with proper env, port, url', () => {

    it('should be connected to ibkr', async () => {
        let accountPortfolios = [];
        if (await onConnected()) {
            const portfolios = Portfolios.Instance;
            accountPortfolios = await portfolios.getPortfolios();
        }
        expect(accountPortfolios).to.be.not.null;
    });

});
