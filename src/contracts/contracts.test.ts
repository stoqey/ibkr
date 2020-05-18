import 'mocha';
import { getContractDetails } from './ContractDetails';
import ibkr from '..';
import { log } from '../log';

const symbol = "ITCI"
// const contractDetails = { "conId": 347408543, "symbol": "MAXR", "secType": "STK", "expiry": "", "strike": 0, "right": "", "multiplier": "", "exchange": "NYSE", "currency": "USD", "localSymbol": "MAXR", "tradingClass": "MAXR" }
// const contractDetails = { "conId": 141253540, "symbol": "ITCI", "secType": "STK", "expiry": "", "strike": 0, "right": "", "multiplier": "", "exchange": "NASDAQ", "currency": "USD", "localSymbol": "ITCI", "tradingClass": "NMS" }

before((done) => {
    ibkr().then(ran => done());
});

describe('Contracts', () => {
    it('should get contract details', (done) => {
        async function getContractDetailsData() {
            const contractDetails = await getContractDetails(symbol);
            if (contractDetails) {
                log('contract ', JSON.stringify(contractDetails))
                return done();
            }
            done(new Error('Error getting symbol details'));
        }
        getContractDetailsData();
    });
})
