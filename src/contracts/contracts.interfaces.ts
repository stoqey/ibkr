import {SecType} from '@stoqey/ib';

export interface ContractObject {
    conId: number;
    symbol: string;
    secType: SecType | string;
    expiry?: string;
    strike?: number;
    right?: string;
    multiplier?: number;
    exchange: string;
    currency: string;
    localSymbol?: string;
    tradingClass?: string;
    comboLegsDescrip?: string;
}

export interface ContractSummary extends ContractObject {
    primaryExch: string;
}

export interface ContractDetails {
    summary: ContractSummary;
    marketName: string;
    minTick: number;
    orderTypes: string;
    validExchanges: string;
    priceMagnifier: number;
    underConId: number;
    longName: string;
    contractMonth: string;
    industry: string;
    category: string;
    subcategory: string;
    timeZoneId: string;
    tradingHours: string;
    liquidHours: string;
    evRule: string;
    evMultiplier?: any;
}
