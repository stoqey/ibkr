import 'mocha';
import {ContractDetailsParams, getContractDetails} from './ContractDetails';
import ibkr from '..';
import {log} from '../log';
import {IBKRConnection} from '../connection';
import dotenv from 'dotenv';
import {getContractDetailsOne, getContractDetailsOneOrNone, getContractSummaryOne} from '.';

before(async () => {
    dotenv.config({path: '.env.test'});
    const args = {
        port: Number(process.env.TEST_IBKR_PORT),
        host: process.env.TEST_IBKR_HOST,
    };
    // console.log('args:', args);
    await ibkr(args);

    IBKRConnection.Instance.getIBKR();
});

describe('Contracts', () => {
    it('getContractDetails() should get stock contract details for AAPL', async () => {
        const contractDetailsList = await getContractDetails({
            exchange: 'NYSE',
            symbol: 'AAPL',
            secType: 'STK',
        });
        // console.log('contract details', contractDetailsList);
        if (contractDetailsList.length !== 1) {
            throw Error('Error getting symbol details');
        }
    });

    it('getContractDetailsOne() should get stock contract details for AAPL', async () => {
        const contractDetails = await getContractDetailsOne({
            exchange: 'NYSE',
            symbol: 'AAPL',
            secType: 'STK',
        });
        // console.log('contract details', contractDetails);
        if (!contractDetails) {
            throw Error('Error getting symbol details');
        }
    });

    it('getContractDetailsOne() should throw error for AAPLXZY', async () => {
        try {
            const contractDetails = await getContractDetailsOne({
                exchange: 'NYSE',
                symbol: 'AAPLXYZ',
                secType: 'STK',
            });
            log('contract details', contractDetails);
        } catch (err) {
            // Success if error was throw
            return;
        }
        throw Error('Received contractDetails but expected none: ');
    });

    it('getContractDetailsOneOrNone() should get stock contract details for AAPL', async () => {
        const contractDetails = await getContractDetailsOneOrNone({
            exchange: 'NYSE',
            symbol: 'AAPL',
            secType: 'STK',
        });
        // console.log('contract details', contractDetails);
        if (!contractDetails) {
            throw Error('Error getting symbol details');
        }
    });

    it('getContractDetailsOneOrNone() should NOT get stock contract details for AAPLXYZ', async () => {
        const contractDetails = await getContractDetailsOneOrNone({
            exchange: 'NYSE',
            symbol: 'AAPLXYZ',
            secType: 'STK',
        });
        // console.log('contract details', contractDetails);
        if (contractDetails) {
            throw Error(
                'Received contractDetails but expected none: ' + JSON.stringify(contractDetails)
            );
        }
    });

    it('getContractSummaryOne() should get the ContractSummary for AAPL', async () => {
        const contractSummary = await getContractSummaryOne({
            exchange: 'NYSE',
            symbol: 'AAPL',
            secType: 'STK',
        });
        log('contractSummary:', contractSummary);
        if (!contractSummary) {
            throw Error('Error getting contractSummary for AAPL');
        }
    });

    it('should get contract details by options contract object', async () => {
        const contractObj: ContractDetailsParams = {
            currency: 'USD',
            exchange: 'SMART',
            multiplier: 100,
            right: 'C',
            secType: 'OPT',
            symbol: 'AAPL',
        };

        const contractDetails = await getContractDetails(contractObj);

        if (contractDetails) {
            log('contract ', JSON.stringify(contractDetails));
        } else {
            throw Error('Error getting symbol details');
        }
    });

    it('should get contract details by forex contract object', async () => {
        const contractObj = {
            symbol: 'GBP',
            secType: 'CASH',
            currency: 'USD',
            // "localSymbol":"GBP.USD",
        };

        const contractDetails = await getContractDetails(contractObj);

        if (contractDetails) {
            log('contract ', JSON.stringify(contractDetails));
        } else {
            throw Error('Error getting symbol details');
        }
    });
});
