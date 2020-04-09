export interface IBKRAccountSummary {
    AccountId: string; // U323xxxxx
    Currency: string; // CAD
    AccountType: string; // INDIVIDUAL
    NetLiquidation: number; // 134343.2
    TotalCashValue: number;
    SettledCash: number;
    AccruedCash: number;
    BuyingPower: number;
    EquityWithLoanValue: number;
    PreviousEquityWithLoanValue: number;
    GrossPositionValue: number;
    RegTEquity: any;
    RegTMargin: any;
    SMA: any;
    InitMarginReq: any;
    MaintMarginReq: any;
    AvailableFunds: any;
    ExcessLiquidity: any;
    Cushion: any;
    FullInitMarginReq: any;
    FullMaintMarginReq: any;
    FullAvailableFunds: any;
    FullExcessLiquidity: any;
    LookAheadNextChange: any;
    LookAheadInitMarginReq: any;
    LookAheadMaintMarginReq: any;
    LookAheadAvailableFunds: any;
    LookAheadExcessLiquidity: any;
    HighestSeverity: any;
    DayTradesRemaining: any;
    Leverage: any;
}