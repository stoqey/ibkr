import 'mocha';
import { getContractDetails } from './ContractDetails';

const symbol = "ITCI"
// const contractDetails = { "conId": 347408543, "symbol": "MAXR", "secType": "STK", "expiry": "", "strike": 0, "right": "", "multiplier": "", "exchange": "NYSE", "currency": "USD", "localSymbol": "MAXR", "tradingClass": "MAXR" }
// const contractDetails = { "conId": 141253540, "symbol": "ITCI", "secType": "STK", "expiry": "", "strike": 0, "right": "", "multiplier": "", "exchange": "NASDAQ", "currency": "USD", "localSymbol": "ITCI", "tradingClass": "NMS" }

describe('Contracts', () => {
    it('should get contract details', (done) => {
        async function getContractDetailsData() {
            const accountSummary = await getContractDetails(symbol);
            const currenySymbol = accountSummary && accountSummary.summary && accountSummary.summary.symbol;
            if (currenySymbol === symbol) {
                return done();
            }

            done(new Error('Error getting symbol details'));
        }
        getContractDetailsData();
    });
})
