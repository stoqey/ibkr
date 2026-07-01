import { expect } from 'chai';
import { BarSizeSetting, SecType, WhatToShow } from '@stoqey/ib';
import IBKRConnection from '../connection/IBKRConnection';
import { MarketDataManager } from './MarketDataManager';

describe('MarketDataManager - getHistoricalData', () => {
    const originalConnectionInstance = (IBKRConnection as any)._instance;

    afterEach(() => {
        (IBKRConnection as any)._instance = originalConnectionInstance;
    });

    const buildManager = (bars: any[]) => {
        const contract = {
            symbol: 'NVDA',
            secType: SecType.STK,
            exchange: 'SMART',
            currency: 'USD',
        };
        const contractInstrument = {
            ...contract,
            conId: 4815747,
            contract,
        };

        const manager = new MarketDataManager();
        let getContractCalls = 0;
        manager.getContract = async () => {
            getContractCalls += 1;
            return contractInstrument as any;
        };
        let historicalDataArgs: any[];

        (IBKRConnection as any)._instance = {
            ib: {
                getHistoricalData: async (...args: any[]) => {
                    historicalDataArgs = args;
                    return bars;
                },
            },
        };

        return { manager, contract, getContractCalls: () => getContractCalls, getHistoricalDataArgs: () => historicalDataArgs };
    };

    it('should parse date-only daily bars when IBKR returns yyyyMMdd times', async () => {
        const { manager, contract } = buildManager([
            { time: '20250417', open: 104.32, high: 104.32, low: 99.91, close: 101.35, volume: 227874919, WAP: 101.38, count: 774511 },
            { time: '20250421', open: 98.63, high: 99.3, low: 94.91, close: 96.77, volume: 193607618, WAP: 96.2, count: 691760 },
        ]);

        const result = await manager.getHistoricalData(contract as any, '', '301 D', BarSizeSetting.DAYS_ONE, WhatToShow.ADJUSTED_LAST, true);

        expect(result).to.have.length(2);
        expect(result[0].date.toISOString()).to.equal('2025-04-17T00:00:00.000Z');
        expect(result[1].date.toISOString()).to.equal('2025-04-21T00:00:00.000Z');
    });

    it('should parse Unix-second intraday bars when IBKR returns epoch times', async () => {
        const { manager, contract } = buildManager([
            { time: '1696622399', open: 429.5, high: 429.6, low: 429.47, close: 429.51, volume: 3487.38, WAP: 429.532, count: 1090 },
        ]);

        const result = await manager.getHistoricalData(contract as any, '20231006-20:00:00', '30 S', BarSizeSetting.SECONDS_ONE, WhatToShow.TRADES);

        expect(result).to.have.length(1);
        expect(result[0].date.toISOString()).to.equal('2023-10-06T19:59:59.000Z');
    });

    it('should not normalize malformed date-only bar times', async () => {
        const { manager, contract } = buildManager([
            { time: '20250230', open: 104.32, high: 104.32, low: 99.91, close: 101.35, volume: 227874919, WAP: 101.38, count: 774511 },
        ]);

        const result = await manager.getHistoricalData(contract as any, '', '301 D', BarSizeSetting.DAYS_ONE, WhatToShow.ADJUSTED_LAST, true);

        expect(result).to.have.length(1);
        expect(Number.isNaN(result[0].date.getTime())).to.be.true;
    });

    it('should return raw bars when caller requests historical data without parsing', async () => {
        const bars = [
            { time: '20260618', open: 208.92, high: 212.72, low: 203.45, close: 210.69, volume: 301767666, WAP: 209.011, count: 1288876 },
            { time: '20260626', open: 211.44, high: 213.99, low: 191.22, close: 192.53, volume: 369526864, WAP: 200.004, count: 1726049 },
        ];
        const { manager, contract, getHistoricalDataArgs } = buildManager(bars);

        const result = await manager.getHistoricalDataRaw(contract as any, '', '6 Y', BarSizeSetting.WEEKS_ONE, WhatToShow.TRADES, true);

        expect(result).to.deep.equal(bars);
        expect(getHistoricalDataArgs()).to.include.members(['', '6 Y', BarSizeSetting.WEEKS_ONE, WhatToShow.TRADES, true, 2]);
    });

    it('should return an empty raw bar array when IBKR returns no historical data', async () => {
        const { manager, contract } = buildManager([]);

        const result = await manager.getHistoricalDataRaw(contract as any, '', '6 Y', BarSizeSetting.WEEKS_ONE, WhatToShow.TRADES, true);

        expect(result).to.deep.equal([]);
    });

    it('should resolve the contract once when parsing historical data', async () => {
        const { manager, contract, getContractCalls } = buildManager([
            { time: '20250417', open: 104.32, high: 104.32, low: 99.91, close: 101.35, volume: 227874919, WAP: 101.38, count: 774511 },
        ]);

        const result = await manager.getHistoricalData(contract as any, '', '301 D', BarSizeSetting.DAYS_ONE, WhatToShow.ADJUSTED_LAST, true);

        expect(result).to.have.length(1);
        expect(getContractCalls()).to.equal(1);
    });
});
