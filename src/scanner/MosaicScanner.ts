import chalk from 'chalk';
import IBKRConnection from "../connection/IBKRConnection";
import { getRadomReqId } from '../_utils/text.utils';
import { SCANCODE } from './scanner.interface';
import { ContractObject } from '../contracts';

/**
 * Not completed
 */

interface MosaicScannerData {
    tickerId: number; // 12345,
    rank: number; //0,
    contract: {
        summary?: ContractObject;
        marketName: string;
    },
    distance: string; // "",
    benchmark: string; // "",
    projection: string; // "",
    legsStr: string; //""
}

interface SubscribeToScanner {
    instrument: string; // 'STK',
    locationCode: string; // 'STK.NASDAQ.NMS',
    numberOfRows: number; // 5,
    scanCode: SCANCODE; // 'TOP_PERC_GAIN',
    stockTypeFilter: string; //  'ALL'
}


class MosaicScanner {

    ib: any;
    tickerId = getRadomReqId();

    private static _instance: MosaicScanner;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        if (this.ib) {
            return;
        }

        this.ib = IBKRConnection.Instance.getIBKR();

        const self = this;

        self.ib.on('scannerData', (tickerId, rank, contract, distance, benchmark, projection, legsStr) => {

            const symbol = contract && contract.summary && contract.summary.symbol;

            // publishDataToTopic({
            //     topic: 'historicalData',
            //     data: {
            //         symbol
            //     }
            // })

            console.log(chalk.dim(`scannerData:${tickerId} -> ${rank}. ${(symbol).toLocaleUpperCase()}`))

        })

        self.ib.on('scannerDataEnd', (tickerId) => {
            console.log(chalk.blue(`MOSAIC:SCANNER end ${tickerId}`))
        })

    }

    /**
     * scanMarket
     */
    public scanMarket = (args?: SubscribeToScanner) => {
        const { instrument = "STK", locationCode, numberOfRows, scanCode, stockTypeFilter } = args;

        let randomTicker = getRadomReqId();

        console.log(chalk.yellow(`MOSAIC:SCANNER start ${randomTicker}`))

        this.ib.reqScannerSubscription(randomTicker, {
            instrument,
            locationCode,
            numberOfRows,
            scanCode,
            stockTypeFilter,
        });

    }
}


export default MosaicScanner;