import 'mocha';
import AccountSummary from './AccountSummary';


describe('Account Summary', () => {
    it('should get account Summary', (done) => {
        const accountSummary = AccountSummary.Instance;
        async function getAccountSummary() {
            const { AccountId, Currency } = await accountSummary.getAccountSummary();
            console.log('Account summary', JSON.stringify({ AccountId, Currency }))
            if (Currency === 'CAD') {
                return done();
            }
            done(new Error('Error getting account summary'));
        }
        getAccountSummary();
    });
})

