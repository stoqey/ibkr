// {"conId":347408543,"symbol":"MAXR","secType":"STK","expiry":"","strike":0,"right":"","multiplier":"","exchange":"NYSE","currency":"USD","localSymbol":"MAXR","tradingClass":"MAXR"}


import test from 'ava';
import isEmpty from 'lodash/isEmpty';
import { getContractDetails } from './getContractDetails';
import IbConnection from '../ibConnection';
test.after(t => {
    IbConnection.Instance.disconnectIBKR();
});

// const contractDetails = { "conId": 347408543, "symbol": "MAXR", "secType": "STK", "expiry": "", "strike": 0, "right": "", "multiplier": "", "exchange": "NYSE", "currency": "USD", "localSymbol": "MAXR", "tradingClass": "MAXR" }
const contractDetails = { "conId": 141253540, "symbol": "ITCI", "secType": "STK", "expiry": "", "strike": 0, "right": "", "multiplier": "", "exchange": "NASDAQ", "currency": "USD", "localSymbol": "ITCI", "tradingClass": "NMS" }

test('Get contract details', async t => {
    const accountSummary = await getContractDetails(contractDetails.symbol);
    console.log('Contract details', JSON.stringify(accountSummary))
    t.is(!accountSummary.orderTypes, false);
});