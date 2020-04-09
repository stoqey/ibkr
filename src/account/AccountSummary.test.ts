import test from 'ava';
import isEmpty from 'lodash/isEmpty';
import getAccountSummary from './AccountSummary';
import { getAllPositions } from './getPositions';
import IbConnection from '../ibConnection';
import { onAccount } from '../servers/app.EventEmitter';
test.after(t => {
    IbConnection.Instance.disconnectIBKR();
});

test('Get account Summary', async t => {
    getAccountSummary.Instance;
    const { accountSummary } =  await onAccount();
    console.log(JSON.stringify(accountSummary))
	t.is(accountSummary.Currency, 'CAD');
});