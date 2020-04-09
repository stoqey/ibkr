import 'mocha';
import { expect } from 'chai'
import AccountSummary from './AccountSummary';


describe('Account Summary', () => {
    it('should get account Summary', async t => {
        const accountSummary = AccountSummary.Instance;
        const { AccountId, Currency } = await accountSummary.getAccountSummary();
        console.log('Account summary', JSON.stringify({ AccountId, Currency }))
        expect(Currency).to.be.equals("CAD");
    });
})

