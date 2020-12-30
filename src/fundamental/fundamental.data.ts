import ibkr, {EventName} from '@stoqey/ib';
import IBKRConnection from '../connection/IBKRConnection';
import {getRadomReqId} from '../_utils/text.utils';

export interface FundamentalDataContractParams {
    readonly exchange: string;
    readonly primaryExch: string;
    readonly secType: string;
    readonly symbol: string;
    readonly currency?: string;
}

export class FundamentalData {
    ib: ibkr;

    private reqIdToResolver: {[reqId: string]: (value?: string | PromiseLike<string>) => void} = {};
    symbolsWithTicker: {tickerId: number; symbol: string}[] = [];

    private static _instance: FundamentalData;

    public static get Instance(): FundamentalData {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const ib = IBKRConnection.Instance.getIBKR();
        this.ib = ib;

        ib.on(EventName.fundamentalData, (reqId: number, xmlText: string) => {
            console.log('onFundamentalData:', reqId, xmlText);

            const res = this.reqIdToResolver[reqId];
            if (res) {
                delete this.reqIdToResolver[reqId];
                res(xmlText);
            }
        });
    }

    /**
     * Requests the contract's fundamental or Wall Street Horizons data.
     *
     * @param reportType - there are three available report types:
     * ReportSnapshot: Company overview
     * ReportsFinSummary: Financial summary
     * ReportRatios: Financial ratios
     * ReportsFinStatements: Financial statements
     * RESC: Analyst estimates
     * CalendarReport: Company calendar from Wall Street Horizons
     */
    public getFundamentalData(
        reportType:
            | 'ReportSnapshot'
            | 'ReportsFinSummary'
            | 'ReportRatios'
            | 'ReportsFinStatements'
            | 'RESC'
            | 'CalendarReport',
        contract: FundamentalDataContractParams
    ): Promise<string> {
        const reqId = getRadomReqId();
        return new Promise((res) => {
            this.reqIdToResolver[reqId] = res;
            // FIXME: remove `as any` ASAP
            this.ib.reqFundamentalData(reqId, contract as any, reportType);
        });
    }
}

export default FundamentalData;
