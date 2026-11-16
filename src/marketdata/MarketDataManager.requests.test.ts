import { expect } from 'chai';
import { BarSizeSetting, Contract, SecType, WhatToShow } from '@stoqey/ib';
import { of, Subject } from 'rxjs';
import moment from 'moment';
import IBKRConnection from '../connection/IBKRConnection';
import Portfolios from '../portfolios/Portfolios';
import { MarketDataManager } from './MarketDataManager';

describe('MarketDataManager - outgoing market-data requests', () => {
    const originalConnection = (IBKRConnection as any)._instance;
    const originalPortfolios = (Portfolios as any)._instance;
    const originalMomentNow = moment.now;
    const originalFilter = process.env.IBKR_CONTRACTS;
    const originalMarketDataFilter = process.env.IBKR_CONTRACTS_MARKETDATA;
    const originalMarketDataAlias = process.env.IBKR_CONTRACTS_MD;
    let manager: MarketDataManager;
    let contract: Contract;
    let resolved: any;
    let calls: { method: string; args: any[] }[];
    let stream: Subject<any>;

    beforeEach(() => {
        delete process.env.IBKR_CONTRACTS;
        delete process.env.IBKR_CONTRACTS_MARKETDATA;
        delete process.env.IBKR_CONTRACTS_MD;
        moment.now = () => Date.parse('2026-11-16T23:23:00Z');
        contract = Object.freeze({
            conId: 123456789, symbol: 'NQ', secType: SecType.FUT,
            exchange: 'CME', currency: 'USD', multiplier: 20,
            localSymbol: 'NQZ6', tradingClass: 'NQ', includeExpired: true,
            lastTradeDateOrContractMonth: '20261218 09:30:00 US/Eastern',
        });
        resolved = Object.freeze({ ...contract, contract, minTick: 0.25 });
        calls = [];
        stream = new Subject();
        const record = (method: string, result: any) => (...args: any[]) => {
            calls.push({ method, args });
            return result;
        };
        const ib = {
            getContractDetails: async () => [resolved],
            getHistoricalData: record('bars', Promise.resolve([
                { time: '1794867780', open: 1, high: 2, low: 1, close: 2, volume: 3 },
            ])),
            getHistoricalTicksLast: record('ticks', of([
                { time: 1794867780, price: 2, size: 1, exchange: 'CME' },
            ])),
            getHistoricalDataUpdates: record('bar updates', stream),
            getTickByTickAllLastDataUpdates: record('tick updates', stream),
        };
        manager = new MarketDataManager();
        manager.ib = ib as any;
        (IBKRConnection as any)._instance = { ib };
        (Portfolios as any)._instance = { updateMarketPrice: () => undefined };
    });

    afterEach(() => {
        manager.removeHistoricalDataUpdates(contract);
        manager.removeTickByTickDataUpdates(contract);
        stream.complete();
        (IBKRConnection as any)._instance = originalConnection;
        (Portfolios as any)._instance = originalPortfolios;
        moment.now = originalMomentNow;
        for (const [key, value] of Object.entries({
            IBKR_CONTRACTS: originalFilter,
            IBKR_CONTRACTS_MARKETDATA: originalMarketDataFilter,
            IBKR_CONTRACTS_MD: originalMarketDataAlias,
        })) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });

    for (const method of ['getHistoricalDataRaw', 'getHistoricalData'] as const) {
        it(`should normalize the request expiry when ${method} receives resolved details`, async () => {
            const result = await manager[method](resolved, '', '30 S', BarSizeSetting.SECONDS_FIVE, WhatToShow.TRADES);

            expect(result).to.have.length(1);
            expect(calls[0].args[0]).to.deep.equal({ ...resolved, lastTradeDateOrContractMonth: '20261218' });
            expect(calls[0].args.slice(1)).to.deep.equal(['', '30 S', BarSizeSetting.SECONDS_FIVE, WhatToShow.TRADES, false, 2]);
            expect(resolved.lastTradeDateOrContractMonth).to.equal('20261218 09:30:00 US/Eastern');
            expect(contract.lastTradeDateOrContractMonth).to.equal('20261218 09:30:00 US/Eastern');
            if (method === 'getHistoricalData') {
                expect((result[0] as any).instrument).to.equal(contract);
            }
        });
    }

    for (const method of ['getHistoricalDataUpdates', 'getTickByTickDataUpdates'] as const) {
        it(`should normalize subscription expiry and use UTC backfill when ${method} receives a saved contract`, async () => {
            if (method === 'getHistoricalDataUpdates') {
                await manager.getHistoricalDataUpdates(contract, BarSizeSetting.SECONDS_FIVE, WhatToShow.TRADES);
            } else {
                await manager.getTickByTickDataUpdates(contract);
            }

            expect(calls).to.have.length(2);
            expect(calls[0].method).to.equal('bars');
            expect(calls[0].args[0].lastTradeDateOrContractMonth).to.equal('20261218');
            expect(calls[0].args[1]).to.equal('20261116-23:23:00');
            expect(calls[1].method).to.equal(method === 'getHistoricalDataUpdates' ? 'bar updates' : 'tick updates');
            expect(calls[1].args[0]).to.deep.equal({ ...contract, lastTradeDateOrContractMonth: '20261218' });
            expect(contract.lastTradeDateOrContractMonth).to.equal('20261218 09:30:00 US/Eastern');
        });
    }

    it('should normalize expiry and serialize UTC when historical ticks receive Date inputs', async () => {
        const result = await manager.getHistoricalTicksLast(resolved,
            new Date('2026-11-16T18:22:00-05:00'), new Date('2026-11-16T18:23:00-05:00'));

        expect(calls[0].args[0].lastTradeDateOrContractMonth).to.equal('20261218');
        expect(calls[0].args.slice(1)).to.deep.equal(['20261116-23:22:00', '20261116-23:23:00', 1000, false]);
        expect(result[0].contract).to.equal(contract);
    });

    it('should preserve explicit time zones when historical ticks receive string inputs', async () => {
        await manager.getHistoricalTicksLast(resolved, '20261116 18:22:00 US/Eastern', '20261116 18:23:00 US/Eastern');

        expect(calls[0].args.slice(1, 3)).to.deep.equal(['20261116 18:22:00 US/Eastern', '20261116 18:23:00 US/Eastern']);
    });
});
