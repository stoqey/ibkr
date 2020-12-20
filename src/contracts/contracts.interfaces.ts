export interface ContractObject {
    conId: number;
    symbol: string;
    secType: string;
    expiry?: string;
    strike?: number;
    right?: string;
    multiplier?: string;
    exchange: string;
    currency: string;
    localSymbol?: string;
    tradingClass?: string;
    comboLegsDescrip?: string;
}

interface ContractsSummary extends ContractObject {
    primaryExch: string;
}

export interface ContractDetails {
    summary: ContractsSummary;
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
