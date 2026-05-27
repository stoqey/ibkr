import 'mocha';
import { expect } from 'chai';
import { of } from 'rxjs';
import { AccountSummary } from './AccountSummary';
import { IBKREvents, IBKREVENTS } from '../events';

describe('IBKR AccountSummary cache updates', () => {
    const originalMdOnly = process.env.MD_ONLY;
    const originalIbkrMdOnly = process.env.IBKR_MD_ONLY;
    const ibkrEvents = IBKREvents.Instance;

    beforeEach(() => {
        const accountSummary = AccountSummary.Instance as any;
        accountSummary.accountSummary = {};
        accountSummary.GetAccountSummaryUpdates?.unsubscribe();
        ibkrEvents.removeAllListeners(IBKREVENTS.IBKR_ACCOUNT_UPDATED);
        delete process.env.MD_ONLY;
        delete process.env.IBKR_MD_ONLY;
    });

    after(() => {
        if (originalMdOnly === undefined) {
            delete process.env.MD_ONLY;
        } else {
            process.env.MD_ONLY = originalMdOnly;
        }
        if (originalIbkrMdOnly === undefined) {
            delete process.env.IBKR_MD_ONLY;
        } else {
            process.env.IBKR_MD_ONLY = originalIbkrMdOnly;
        }
        ibkrEvents.removeAllListeners(IBKREVENTS.IBKR_ACCOUNT_UPDATED);
    });

    it('should write zero account values and emit after cache update', () => {
        const accountSummary = AccountSummary.Instance as any;
        let eventPayload: { updatedAt: number };
        let observedNetLiquidation: number;

        accountSummary.ib = {
            getAccountSummary: () => of({
                all: new Map([
                    ['DU123', new Map([
                        ['NetLiquidation', new Map([
                            ['USD', { value: '0' }],
                        ])],
                    ])],
                ]),
            }),
        };

        ibkrEvents.once(IBKREVENTS.IBKR_ACCOUNT_UPDATED, (payload) => {
            eventPayload = payload;
            observedNetLiquidation = accountSummary.getAccountSummary.NetLiquidation.value;
        });

        accountSummary.getAccountSummaryUpdates();

        expect(eventPayload.updatedAt).to.be.a('number');
        expect(observedNetLiquidation).to.equal(0);
    });
});
