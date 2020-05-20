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
    it('should get contract details by symbol', (done) => {
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

    it('should get contract details by contract object', (done) => {
        async function getContractDetailsData() {
            const contractDetails = await getContractDetails({
                currency: 'USD',
                exchange: 'SMART',
                //expiry: '202007',
                multiplier: 100,
                right: 'C',
                secType: 'OPT',
                strike: 300,
                symbol: 'AAPL'
            });
            if (contractDetails) {
                log('contract ', JSON.stringify(contractDetails))
                return done();
            }
            done(new Error('Error getting symbol details'));
        }
        getContractDetailsData();
    });


})
