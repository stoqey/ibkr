import ibkr, {EventName} from '@stoqey/ib';
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

        const scannedData: MosaicScannerData[] = [];

        return new Promise((resolve) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const handleScannerData = (tickerId) => {
                ib.off('scannerData', handleScannerData);
                resolve(scannedData);
            };

            ib.on(
                EventName.scannerData,
                (tickerId, rank, contractDetails, distance, benchmark, projection, legsStr) => {
                    if (
                        contractDetails &&
                        contractDetails.contract &&
                        contractDetails.contract.conId
                    ) {
                        // FIXME: the Contract types between @stoqey/ib and @stoqey/ibkr need to be resolved; in particular, the types from `ib` should not be optional if they are present.
                        const data: MosaicScannerData = {
                            rank,
                            ...contractDetails.contract,
                            conId: contractDetails.contract.conId,
                            marketName: contractDetails?.marketName,
                            distance,
                            benchmark,
                            projection,
                            legsStr,
                        } as any;
                        scannedData.push(data);
                    }
                }
            );

            ib.on(EventName.scannerDataEnd, handleScannerData);

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
