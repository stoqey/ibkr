import type { Contract, WhatToShow } from "@stoqey/ib";
import type { Instrument, MarketData } from "../interfaces";

export const getSymbolKey = (contract: Contract | Instrument): string => {
    if (!contract) {
        return "";
    }
    const lastTradeDate = contract?.lastTradeDate || contract?.lastTradeDateOrContractMonth;
    return `${contract.symbol}${!!contract?.secType? `-${contract.secType}` : ""}${!!lastTradeDate? `-${lastTradeDate}`: ''}`;
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