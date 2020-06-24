import {ContractObject} from '../contracts';

export type SCANCODE =
    | 'TOP_PERC_GAIN'
    | 'TOP_PERC_LOSE'
    | 'MOST_ACTIVE'
    | 'ALL_SYMBOLS_ASC'
    | 'ALL_SYMBOLS_DESC'
    | 'BOND_CUSIP_AZ'
    | 'BOND_CUSIP_ZA'
    | 'FAR_MATURITY_DATE'
    | 'HALTED'
    | 'HIGH_COUPON_RATE'
    | 'HIGH_DIVIDEND_YIELD'
    | 'HIGH_DIVIDEND_YIELD_IB'
    | 'HIGHEST_SLB_BID'
    | 'HIGH_GROWTH_RATE'
    | 'HIGH_MOODY_RATING_ALL'
    | 'HIGH_OPEN_GAP'
    | 'HIGH_OPT_VOLUME_PUT_CALL_RATIO'
    | 'HIGH_PE_RATIO'
    | 'HIGH_PRICE_2_BOOK_RATIO'
    | 'HIGH_PRICE_2_TAN_BOOK_RATIO'
    | 'HIGH_QUICK_RATIO'
    | 'HIGH_RETURN_ON_EQUITY'
    | 'HIGH_SYNTH_BID_REV_NAT_YIELD'
    | 'HIGH_VS_13W_HL'
    | 'HIGH_VS_26W_HL'
    | 'HIGH_VS_52W_HL'
    | 'HOT_BY_OPT_VOLUME'
    | 'HOT_BY_PRICE'
    | 'HOT_BY_PRICE_RANGE'
    | 'HOT_BY_VOLUME'
    | 'LIMIT_UP_DOWN'
    | 'LOW_COUPON_RATE'
    | 'LOWEST_SLB_ASK'
    | 'LOW_GROWTH_RATE'
    | 'LOW_MOODY_RATING_ALL'
    | 'LOW_OPEN_GAP'
    | 'LOW_PE_RATIO'
    | 'LOW_PRICE_2_BOOK_RATIO'
    | 'LOW_PRICE_2_TAN_BOOK_RATIO'
    | 'LOW_QUICK_RATIO'
    | 'LOW_RETURN_ON_EQUITY'
    | 'LOW_SYNTH_ASK_REV_NAT_YIELD'
    | 'LOW_VS_13W_HL'
    | 'LOW_VS_26W_HL'
    | 'LOW_VS_52W_HL'
    | 'LOW_WAR_REL_IMP_VOLAT'
    | 'MARKET_CAP_USD_ASC'
    | 'MARKET_CAP_USD_DESC'
    | 'MOST_ACTIVE_AVG_USD'
    | 'MOST_ACTIVE_USD'
    | 'NEAR_MATURITY_DATE'
    | 'NOT_OPEN'
    | 'OPT_OPEN_INTEREST_MOST_ACTIVE'
    | 'OPT_VOLUME_MOST_ACTIVE'
    | 'PMONITOR_AVAIL_CONTRACTS'
    | 'PMONITOR_CTT'
    | 'PMONITOR_IBOND'
    | 'PMONITOR_RFQ'
    | 'TOP_OPEN_PERC_GAIN'
    | 'TOP_OPEN_PERC_LOSE'
    | 'TOP_OPT_IMP_VOLAT_GAIN'
    | 'TOP_OPT_IMP_VOLAT_LOSE'
    | 'TOP_PRICE_RANGE'
    | 'TOP_STOCK_BUY_IMBALANCE_ADV_RATIO'
    | 'TOP_STOCK_SELL_IMBALANCE_ADV_RATIO'
    | 'TOP_TRADE_COUNT'
    | 'TOP_TRADE_RATE'
    | 'TOP_VOLUME_RATE'
    | 'WSH_NEXT_ANALYST_MEETING'
    | 'WSH_NEXT_EARNINGS'
    | 'WSH_NEXT_EVENT'
    | 'WSH_NEXT_MAJOR_EVENT'
    | 'WSH_PREV_ANALYST_MEETING'
    | 'WSH_PREV_EARNINGS'
    | 'WSH_PREV_EVENT';

export interface MosaicScannerData extends ContractObject {
    rank: number; //0,
    marketName: string;
    distance: string; // "",
    benchmark: string; // "",
    projection: string; // "",
    legsStr: string; //""
}

export interface ScanMarket {
    instrument: string; // 'STK',
    locationCode: string; // 'STK.NASDAQ.NMS',
    numberOfRows: number; // 5,
    scanCode: SCANCODE; // 'TOP_PERC_GAIN',
    stockTypeFilter: string; //  'ALL'
}
