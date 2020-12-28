import {expect} from 'chai';
import dotenv from 'dotenv';
import 'mocha';
import ibkr from '..';
import {log} from '../log';
import Portfolios from './Portfolios';

before(async () => {
    dotenv.config({path: '.env.test'});
    const args = {
        port: process.env.TEST_IBKR_PORT ? Number(process.env.TEST_IBKR_PORT) : undefined,
        host: process.env.TEST_IBKR_HOST,
    };
    await ibkr(args);
});

describe('Portfolios', () => {
    it('should get all portfolios', async () => {
        const portfolios = Portfolios.Instance;
        const results = await portfolios.getPortfolios();
        log('All portfolios are', results && results.length);
        expect(results).to.be.not.null;
    });
});
