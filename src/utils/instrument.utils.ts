import type { Contract, WhatToShow } from "@stoqey/ib";
import type { Instrument, MarketData } from "../interfaces";

export const getSymbolKey = (contract: Contract | Instrument): string => {
    if (!contract) {
        return "";
    }
    const isCrypto = contract?.secType === 'CRYPTO';
    const exchange = isCrypto && contract?.exchange ? `-${contract.exchange}` : "";
    const lastTradeDate = contract?.lastTradeDate || contract?.lastTradeDateOrContractMonth;
    return `${contract.symbol}${!!contract?.secType ? `-${contract.secType}` : ""}${!!lastTradeDate ? `-${lastTradeDate}` : ''}${exchange}`;
};

export interface GetHistoricalData {
    instrument: Instrument;
    startDate: Date;
    endDate?: Date;
    whatToShow?: WhatToShow;

    // options
    saveToDb?: (mkd: MarketData[]) => Promise<void>;
    calculate?: boolean;
}