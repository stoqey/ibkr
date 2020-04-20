
export enum WhatToShow {
    ADJUSTED_LAST,
    TRADES, MIDPOINT, BID, ASK, // << only these are valid for real-time bars
    BID_ASK, HISTORICAL_VOLATILITY, OPTION_IMPLIED_VOLATILITY, YIELD_ASK, YIELD_BID, YIELD_BID_ASK, YIELD_LAST
}

export type BarSizeSetting = "1 secs" | "5 secs" | "10 secs" | "15 secs" | "30 secs" | "1 min" | "2 mins" | "3 mins" | "5 mins" | "10 mins" | "15 mins" | "20 mins" | "30 mins" | "1 hour" | "2 hours" | "3 hours" | "4 hours" | "8 hours" | "1 day" | "1W" | "1M";
export interface HistoryData {
    reqId?: number;
    date: Date; // "20190308  11:59:56"
    open?: number;
    high?: number;
    low?: number;
    close: number;
    volume?: number;
    barCount?: number;
    WAP?: number;
    hasGaps?: boolean;
}

export interface ReqHistoricalData {
    contract: string[], // 'IFRX', 'SMART', 'USD',
    endDateTime: string; // '20190308 12:00:00',
    durationStr: string; // '1800 S'
    barSizeSetting: BarSizeSetting; // '1 secs'
    whatToShow?: keyof typeof WhatToShow; // 'TRADES'
    useRTH?: any;
    formatDate?: number;
    keepUpToDate?: boolean;
}

export interface SymbolWithTicker {
    tickerId: number,
    symbol: string;
}

export interface SymbolWithMarketData {
    symbol: string,
    marketData: HistoryData[]
}