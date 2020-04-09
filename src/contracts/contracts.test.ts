// {"conId":347408543,"symbol":"MAXR","secType":"STK","expiry":"","strike":0,"right":"","multiplier":"","exchange":"NYSE","currency":"USD","localSymbol":"MAXR","tradingClass":"MAXR"}

import 'mocha';
import { expect } from 'chai';
import isEmpty from 'lodash/isEmpty';
import { getContractDetails } from './ContractDetails';


// const contractDetails = { "conId": 347408543, "symbol": "MAXR", "secType": "STK", "expiry": "", "strike": 0, "right": "", "multiplier": "", "exchange": "NYSE", "currency": "USD", "localSymbol": "MAXR", "tradingClass": "MAXR" }
const contractDetails = { "conId": 141253540, "symbol": "ITCI", "secType": "STK", "expiry": "", "strike": 0, "right": "", "multiplier": "", "exchange": "NASDAQ", "currency": "USD", "localSymbol": "ITCI", "tradingClass": "NMS" }

describe('Contracts', () => {
    it('should get contract details', async t => {
        const accountSummary = await getContractDetails(contractDetails.symbol);
        console.log('Contract details', JSON.stringify(accountSummary));
        expect(accountSummary.orderTypes).to.be.not.not.null;
    });
})
