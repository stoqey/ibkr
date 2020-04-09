import includes from 'lodash/includes';
import { getRadomReqId } from '../_utils/text.utils';
import { publishDataToTopic, APPEVENTS, AppEvents } from '../events';
import { IBKRAccountSummary } from './account-summary.interfaces'
import { log } from '../log';
import IBKRConnection from '../connection/IBKRConnection';
import { LIVE_ACCOUNT_IDS } from '../config';
import isEmpty from 'lodash/isEmpty';

const appEvents = AppEvents.Instance;

export class AccountSummary {
    ib = IBKRConnection.Instance.getIBKR();
    accountReady: boolean = false;
    tickerId = getRadomReqId();
    AccountId;
    accountSummary: IBKRAccountSummary = {} as any;
    private static _instance: AccountSummary;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const self = this;

        const ib = this.ib;

        // Record values from here
        ib.on('accountSummary', (reqId, account, tag, value, currency) => {
            this.tickerId = reqId;
            this.AccountId = account;
            this.accountSummary.AccountId = account;
            this.accountSummary[tag] = value; // set the account value
            this.accountSummary.Currency = currency; // always set the account currency
        });

        // Return values from here 
        ib.on('accountSummaryEnd', () => {
            const { AccountId = 'unknown', tickerId, accountReady, accountSummary } = self;

            // We got the account id so success
            log('accountSummaryEnd', { AccountId, tickerId });

            ib.cancelAccountSummary(tickerId);

            if (!accountReady) {
                // Publish account ready
                publishDataToTopic({
                    topic: APPEVENTS.ACCOUNT_SUMMARY,
                    data: accountSummary
                })
            }
        });

        // Request Account summary from here
        ib.reqAccountSummary(self.tickerId, 'All', [
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
        const { accountSummary } = this;
        return new Promise((resolve, reject) => {

            if (!isEmpty(accountSummary)) {
                return resolve(accountSummary);
            }

            // listen for account summary
            const handleAccountSummary = (accountSummaryData) => {
                appEvents.off(APPEVENTS.ACCOUNT_SUMMARY, handleAccountSummary);
                resolve(accountSummaryData);
            }
            appEvents.on(APPEVENTS.ACCOUNT_SUMMARY, handleAccountSummary);
        })

    }
}

export default AccountSummary;