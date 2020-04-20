import includes from 'lodash/includes';
import { getRadomReqId } from '../_utils/text.utils';
import { publishDataToTopic, IBKREVENTS, IbkrEvents } from '../events';
import { IBKRAccountSummary } from './account-summary.interfaces'
import { log } from '../log';
import IBKRConnection from '../connection/IBKRConnection';
import { LIVE_ACCOUNT_IDS } from '../config';
import isEmpty from 'lodash/isEmpty';
import { Portfolios } from '../portfolios';

const appEvents = IbkrEvents.Instance;

export class AccountSummary {
    ib: any;
    accountReady: boolean = false;
    tickerId = getRadomReqId();
    AccountId;
    accountSummary: IBKRAccountSummary = {} as any;
    private static _instance: AccountSummary;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this.ib = IBKRConnection.Instance.getIBKR();
    }

    public init() {
        const self = this;


        const ib = IBKRConnection.Instance.getIBKR();

        self.ib = ib;

        // Record values from here
        ib.on('accountSummary', (reqId, account, tag, value, currency) => {
            self.tickerId = reqId;
            self.AccountId = account;
            self.accountSummary.AccountId = account;
            self.accountSummary[tag] = value; // set the account value
            self.accountSummary.Currency = currency; // always set the account currency
            // console.log('accountSummaryEnd', { account, tag, value, });
        });

        // Return values from here 
        ib.once('accountSummaryEnd', () => {
            const { AccountId = 'unknown', tickerId, accountReady, accountSummary } = self;

            log('accountSummaryEnd', { AccountId, tickerId, accountReady });


            ib.cancelAccountSummary(tickerId);


            publishDataToTopic({
                topic: IBKREVENTS.ON_ACCOUNT_SUMMARY,
                data: accountSummary
            });

            self.accountReady = true;

        });

        self.reqAccountSummary();

    }

    /**
     * reqAccountSummary
     */
    public reqAccountSummary = () => {
        // Request Account summary from here
        this.ib.reqAccountSummary(this.tickerId, 'All', [
            'AccountType',
            'NetLiquidation',
            'TotalCashValue',
            'SettledCash',
            'AccruedCash',
            'BuyingPower',
            'EquityWithLoanValue',
            'PreviousEquityWithLoanValue',
            'GrossPositionValue',
            'RegTEquity',
            'RegTMargin',
            'SMA',
            'InitMarginReq',
            'MaintMarginReq',
            'AvailableFunds',
            'ExcessLiquidity',
            'Cushion',
            'FullInitMarginReq',
            'FullMaintMarginReq',
            'FullAvailableFunds',
            'FullExcessLiquidity',
            'LookAheadNextChange',
            'LookAheadInitMarginReq',
            'LookAheadMaintMarginReq',
            'LookAheadAvailableFunds',
            'LookAheadExcessLiquidity',
            'HighestSeverity',
            'DayTradesRemaining',
            'Leverage'
        ]);
    }

    /**
 * initialiseDep
 */
    public initialiseDep() {
        Portfolios.Instance/*  */;
    }/*  */

    /**
     * isLiveAccount
     * Check whether this is the live account
     */
    public isLiveAccount(): boolean {
        return includes(LIVE_ACCOUNT_IDS, this.AccountId)
    }

    /**
     * getAccountSummary
     */
    public getAccountSummary(): Promise<IBKRAccountSummary> {
        const { accountSummary, reqAccountSummary } = this;
        return new Promise((resolve, reject) => {

            if (!isEmpty(accountSummary)) {
                return resolve(accountSummary);
            }

            // listen for account summary
            const handleAccountSummary = (accountSummaryData) => {
                appEvents.off(IBKREVENTS.ON_ACCOUNT_SUMMARY, handleAccountSummary);
                resolve(accountSummaryData);
            }
            appEvents.on(IBKREVENTS.ON_ACCOUNT_SUMMARY, handleAccountSummary);

            reqAccountSummary();
        })

    }
}

export default AccountSummary;