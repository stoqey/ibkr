import { IBApiNext } from "@stoqey/ib";
import IBKRConnection from "../connection/IBKRConnection";
import { Subscription } from "rxjs";
import { log } from "../utils";
const DEFAULT_TAGS = "AccountType,NetLiquidation,TotalCashValue,SettledCash,AccruedCash,BuyingPower,EquityWithLoanValue,PreviousDayEquityWithLoanValue,GrossPositionValue,RegTEquity,RegTMargin,SMA,InitMarginReq,MaintMarginReq,AvailableFunds,ExcessLiquidity,Cushion,FullInitMarginReq,FullMaintMarginReq,FullAvailableFunds,FullExcessLiquidity,LookAheadNextChange,LookAheadInitMarginReq,LookAheadMaintMarginReq,LookAheadAvailableFunds,LookAheadExcessLiquidity,HighestSeverity,DayTradesRemaining,Leverage";

interface IAccountSummaryValue {
    value: number | string | null;
    currency?: string;
};

interface IAccountSummary {

    accountId: string;
    /**
     * - AccountType — Identifies the IB account structure
     */
    AccountType: IAccountSummaryValue;
    /**
     * - NetLiquidation — The basis for determining the price of the assets in your account. Total cash value + stock value + options value + bond value
     */
    NetLiquidation: IAccountSummaryValue;
    /**
     * - TotalCashValue — Total cash balance recognized at the time of trade + futures PNL
     */
    TotalCashValue: IAccountSummaryValue;
    /**
     * - SettledCash — Cash recognized at the time of settlement - purchases at the time of trade - commissions - taxes - fees
     */
    SettledCash: IAccountSummaryValue;
    /**
     * - AccruedCash — Total accrued cash value of stock, commodities and securities
     */
    AccruedCash: IAccountSummaryValue;
    /**
     * - BuyingPower — Buying power serves as a measurement of the dollar value of securities that one may purchase in a securities account without depositing additional funds
     */
    BuyingPower: IAccountSummaryValue;
    /**
     * - EquityWithLoanValue — Forms the basis for determining whether a client has the necessary assets to either initiate or maintain security positions. Cash + stocks + bonds + mutual funds
     */
    EquityWithLoanValue: IAccountSummaryValue;
    /**
     * - PreviousDayEquityWithLoanValue — Marginable Equity with Loan value as of 16:00 ET the previous day
     */
    PreviousDayEquityWithLoanValue: IAccountSummaryValue;
    /**
     * - GrossPositionValue — The sum of the absolute value of all stock and equity option positions
     */
    GrossPositionValue: IAccountSummaryValue;
    /**
     * - RegTEquity — Regulation T equity for universal account
     */
    RegTEquity: IAccountSummaryValue;
    /**
     * - RegTMargin — Regulation T margin for universal account
     */
    RegTMargin: IAccountSummaryValue;
    /**
     * - SMA — Special Memorandum Account: Line of credit created when the market value of securities in a Regulation T account increase in value
     */
    SMA: IAccountSummaryValue;
    /**
     * - InitMarginReq — Initial Margin requirement of whole portfolio
     */
    InitMarginReq: IAccountSummaryValue;
    /**
     * - MaintMarginReq — Maintenance Margin requirement of whole portfolio
     */
    MaintMarginReq: IAccountSummaryValue;
    /**
     * - AvailableFunds — This value tells what you have available for trading
     */
    AvailableFunds: IAccountSummaryValue;
    /**
     * - ExcessLiquidity — This value shows your margin cushion, before liquidation
     */
    ExcessLiquidity: IAccountSummaryValue;
    /**
     * - Cushion — Excess liquidity as a percentage of net liquidation value
     */
    Cushion: IAccountSummaryValue;
    /**
     * - FullInitMarginReq — Initial Margin of whole portfolio with no discounts or intraday credits
     */
    FullInitMarginReq: IAccountSummaryValue;
    /**
     * - FullMaintMarginReq — Maintenance Margin of whole portfolio with no discounts or intraday credits
     */
    FullMaintMarginReq: IAccountSummaryValue;
    /**
     * - FullAvailableFunds — Available funds of whole portfolio with no discounts or intraday credits
     */
    FullAvailableFunds: IAccountSummaryValue;
    /**
     * - FullExcessLiquidity — Excess liquidity of whole portfolio with no discounts or intraday credits
     */
    FullExcessLiquidity: IAccountSummaryValue;
    /**
     * - LookAheadNextChange — Time when look-ahead values take effect
     */
    LookAheadNextChange: IAccountSummaryValue;
    /**
     * - LookAheadInitMarginReq — Initial Margin requirement of whole portfolio as of next period's margin change
     */
    LookAheadInitMarginReq: IAccountSummaryValue;
    /**
     * - LookAheadMaintMarginReq — Maintenance Margin requirement of whole portfolio as of next period's margin change
     */
    LookAheadMaintMarginReq: IAccountSummaryValue;
    /**
     * - LookAheadAvailableFunds — This value reflects your available funds at the next margin change
     */
    LookAheadAvailableFunds: IAccountSummaryValue;
    /**
     * - LookAheadExcessLiquidity — This value reflects your excess liquidity at the next margin change
     */
    LookAheadExcessLiquidity: IAccountSummaryValue;
    /**
     * - HighestSeverity — A measure of how close the account is to liquidation
     */
    HighestSeverity: IAccountSummaryValue;
    /**
     * - DayTradesRemaining — The Number of Open/Close trades a user could put on before Pattern Day Trading is detected. A value of "-1" means that the user can put on unlimited day trades.
     */
    DayTradesRemaining: IAccountSummaryValue;
    /**
     * - Leverage — GrossPositionValue / NetLiquidation
     */
    Leverage: IAccountSummaryValue;
}

export class AccountSummary {
    ib: IBApiNext;
    
    accountSummary: IAccountSummary = {} as unknown as IAccountSummary;

    GetAccountSummaryUpdates: Subscription;

    private static _instance: AccountSummary;

    public static get Instance(): AccountSummary {
        return this._instance || (this._instance = new this());
    }

    init = () => {
        const ib = IBKRConnection.Instance.ib;
        if (!this.ib) {
            this.ib = ib;
        }
    }

    private constructor() {
    }
    
    get getAccountSummary() {
        return this.accountSummary;
    }

    getAccountSummaryUpdates = (group: string = "All", tags: string = DEFAULT_TAGS) => {
        this.GetAccountSummaryUpdates = this.ib.getAccountSummary(group, tags).subscribe((accountSummaryUpdate) => {
            const firstAccount = accountSummaryUpdate.all.values().next().value;
            const accountId = accountSummaryUpdate.all.keys().next().value;
            const accountSummary = this.accountSummary;
            accountSummary.accountId = accountId;
            firstAccount.forEach((tag, tagName) => {
                tag.forEach((value, currency) => {
                    const tagValue = isNaN(+value.value) ? value.value : +value.value;
                    const tagCurrency = !currency ? null : currency;
                    if (!accountSummary[tagName]) {
                        accountSummary[tagName] = {} as IAccountSummaryValue;
                    };
                    if (tagValue) {
                        accountSummary[tagName].value = tagValue;
                    }
                    if (tagCurrency) {
                        accountSummary[tagName].currency = tagCurrency;
                    }
                });
            });
            log(`AccountSummary: ${accountId}`, `NetLiquidation: ${accountSummary.NetLiquidation.value}(${accountSummary.NetLiquidation.currency})`);
            this.accountSummary = accountSummary;
        });
    }

    unsubscribeAccountSummary = () => {
        this.GetAccountSummaryUpdates.unsubscribe();
    }
    
}
