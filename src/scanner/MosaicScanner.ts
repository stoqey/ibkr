import ibkr from '@stoqey/ib'
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


export class MosaicScanner {

    ib: ibkr;

    constructor() {
        if (this.ib) {
            return;
        }

        this.ib = IBKRConnection.Instance.getIBKR();
    }

    /**
     * scanMarket
     */
    public scanMarket = (args?: SubscribeToScanner): Promise<any> => {
        const { instrument = "STK", locationCode, numberOfRows, scanCode, stockTypeFilter } = args;
        const self = this;

        let randomTicker = getRadomReqId();

        const scans = [];

        return new Promise((resolve, reject) => {
            self.ib.on('scannerData', (tickerId, rank, contract, distance, benchmark, projection, legsStr) => {

                const symbol = contract && contract.summary && contract.summary.symbol;

                scans.push({
                    rank,
                    ...(contract && contract.summary || {})
                });

            })

            self.ib.once('scannerDataEnd', (tickerId) => {
                resolve(scans)
            })

            self.ib.reqScannerSubscription(randomTicker, {
                instrument,
                locationCode,
                numberOfRows,
                scanCode,
                stockTypeFilter,
            });
        })



    }
}


export default MosaicScanner;