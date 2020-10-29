import 'mocha';
import AccountSummary from './AccountSummary';
import { log } from '../log';
import ibkr from '..';

before((done) => {
    ibkr().then(r => done())
});


describe('Account Summary', () => {
    it('should get account Summary', (done) => {
        const accountSummary = AccountSummary.Instance;
        async function getAccountSummary() {
            const { AccountId, Currency } = await accountSummary.getAccountSummary();
            log('Account summary', JSON.stringify({ AccountId, Currency }))
            if (Currency === 'CAD') {
                return done();
            }
            done(new Error('Error getting account summary'));
        }
        getAccountSummary();
    });
})

