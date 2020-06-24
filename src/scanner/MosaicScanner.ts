import ibkr from '@stoqey/ib';
import IBKRConnection from '../connection/IBKRConnection';
import {getRadomReqId} from '../_utils/text.utils';
import {ScanMarket, MosaicScannerData} from './scanner.interface';

export class MosaicScanner {
    ib: ibkr;

    constructor() {}

    /**
     * scanMarket
     */
    public scanMarket = (args: ScanMarket): Promise<MosaicScannerData[]> => {
        const ib = IBKRConnection.Instance.getIBKR();
        const {instrument = 'STK', locationCode, numberOfRows, scanCode, stockTypeFilter} = args;
        const randomTicker = getRadomReqId();

        const scansedData: MosaicScannerData[] = [];

        return new Promise((resolve, reject) => {
            const handleScannerData = (tickerId) => {
                ib.off('scannerData', handleScannerData);
                resolve(scansedData);
            };

            ib.on(
                'scannerData',
                (tickerId, rank, contract, distance, benchmark, projection, legsStr) => {
                    scansedData.push({
                        rank,
                        ...((contract && contract.summary) || {}),
                        distance,
                        benchmark,
                        projection,
                        legsStr,
                    });
                }
            );

            ib.once('scannerDataEnd', handleScannerData);

            ib.reqScannerSubscription(randomTicker, {
                instrument,
                locationCode,
                numberOfRows,
                scanCode,
                stockTypeFilter,
            });
        });
    };
}

export default MosaicScanner;
