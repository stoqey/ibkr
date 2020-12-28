import dotenv from 'dotenv';
import 'mocha';
import ibkr from '..';
import {IBKRConnection} from '../connection';
import {getContractSummaryOne} from '../contracts';
import {log} from '../log';
import FundamentalData from './fundamental.data';

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

describe('Fundamental', () => {
    it.only('get ReportSnapshot for MMM', async () => {
        const fundamental = FundamentalData.Instance;

        const contractSummary = await getContractSummaryOne({
            exchange: 'NYSE',
            symbol: 'MMM',
            secType: 'STK',
        });
        log('contractSummary:', contractSummary);
        const xmlText = await fundamental.getFundamentalData('ReportSnapshot', contractSummary);
        log('xmlText:', xmlText);
        if (!xmlText) {
            throw Error('Error getting ReportSnapshot');
        }
    });
});
