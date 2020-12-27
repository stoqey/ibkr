import 'mocha';
import {ContractDetailsParams, getContractDetails} from './ContractDetails';
import ibkr from '..';
import {log} from '../log';
import {IBKRConnection} from '../connection';
import dotenv from 'dotenv';
import {getContractDetailsOne, getContractDetailsOneOrNone} from '.';

before(async () => {
    dotenv.config({path: '.env.test'});
    const args = {
        port: Number(process.env.TEST_IBKR_PORT),
        host: process.env.TEST_IBKR_HOST,
    };
    console.log('args:', args);
    await ibkr(args);

    IBKRConnection.Instance.getIBKR();
});

describe('Contracts', () => {
    it.only('getContractDetails() should get stock contract details for AAPL', async () => {
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

    it.only('getContractDetailsOne() should get stock contract details for AAPL', async () => {
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

    it.only('getContractDetailsOne() should throw error for AAPLXZY', async () => {
        try {
            const contractDetails = await getContractDetailsOne({
                exchange: 'NYSE',
                symbol: 'AAPL',
                secType: 'STK',
            });
            throw Error(
                'Received contractDetails but expected none: ' + JSON.stringify(contractDetails)
            );
        } catch (err) {
            // Expected
        }
    });

    it.only('getContractDetailsOneOrNone() should get stock contract details for AAPL', async () => {
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

    it.only('getContractDetailsOneOrNone() should NOT get stock contract details for AAPLXYZ', async () => {
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
