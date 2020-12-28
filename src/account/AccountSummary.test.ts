import dotenv from 'dotenv';
import 'mocha';
import ibkr from '..';
import {log} from '../log';
import AccountSummary from './AccountSummary';

before(async () => {
    dotenv.config({path: '.env.test'});
    const args = {
        port: process.env.TEST_IBKR_PORT ? Number(process.env.TEST_IBKR_PORT) : undefined,
        host: process.env.TEST_IBKR_HOST,
    };
    await ibkr(args);
});

describe('Account Summary', () => {
    it('should get account Summary', (done) => {
        const accountSummary = AccountSummary.Instance;
        async function getAccountSummary() {
            const {AccountId, Currency} = await accountSummary.getAccountSummary();
            log('Account summary', JSON.stringify({AccountId, Currency}));
            if (!!Currency) {
                return done();
            }
            done(new Error('Error getting account summary'));
        }
        getAccountSummary();
    });
});
