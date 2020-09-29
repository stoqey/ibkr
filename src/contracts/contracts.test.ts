import 'mocha';
import { getContractDetails } from './ContractDetails';
import ibkr from '..';
import { log } from '../log';
import { IBKRConnection } from '../connection';

const symbol = "ITCI"

before((done) => {
    ibkr().then(ran => done());
});

describe('Contracts', () => {
    it('should get contract details by symbol', (done) => {
        async function getContractDetailsData() {
            const contractDetails = await getContractDetails(symbol);
            if (!Array.isArray(contractDetails)) {
                log('contract ', JSON.stringify(contractDetails))
                return done();
            }
            done(new Error('Error getting symbol details'));
        }
        getContractDetailsData();
    });


    it('should get contract details by options contract object', (done) => {
        async function getContractDetailsData() {

            const contractObj = {
                currency: 'USD',
                exchange: 'SMART',
                multiplier: 100,
                right: 'C',
                secType: 'OPT',
                symbol: 'AAPL'
            }

            const contractDetails = await getContractDetails(contractObj);

            if (contractDetails) {
                log('contract ', JSON.stringify(contractDetails))
                return done();
            }
            done(new Error('Error getting symbol details'));
        }
        getContractDetailsData();
    });

    it('should get contract details by forex contract object', (done) => {
        async function getContractDetailsData() {

            const contractObj = {
                "symbol":"GBP",
                "secType":"CASH",
                "currency":"USD",
                 // "localSymbol":"GBP.USD",
            };

            const contractDetails = await getContractDetails(contractObj);

            if (contractDetails) {
                log('contract ', JSON.stringify(contractDetails))
                return done();
            }
            done(new Error('Error getting symbol details'));
        }
        getContractDetailsData();
    });

})
