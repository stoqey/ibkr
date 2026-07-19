import { expect } from 'chai';
import { SecType } from '@stoqey/ib';
import { formatHistoricalEndDateTime, getHistoricalData } from './ibkr.utils';
import MarketDataManager from './MarketDataManager';

describe('IBKR historical data end timestamp', () => {
    const originalTimeZone = process.env.TZ;
    const originalMarketDataManager = (MarketDataManager as any)._instance;

    afterEach(() => {
        if (originalTimeZone === undefined) {
            delete process.env.TZ;
        } else {
            process.env.TZ = originalTimeZone;
        }
        (MarketDataManager as any)._instance = originalMarketDataManager;
    });

    it('should serialize a 4:00PM EDT date as UTC', () => {
        const localDate = new Date('2026-06-03T16:00:00-04:00');

        const endDateTime = formatHistoricalEndDateTime(localDate);

        expect(endDateTime).to.equal('20260603-20:00:00');
    });

    it('should request the UTC calendar days when dates are midnight in a Toronto process', async () => {
        process.env.TZ = 'America/Toronto';
        const endDateTimes: string[] = [];
        (MarketDataManager as any)._instance = {
            getHistoricalData: async (_contract: unknown, endDateTime: string) => {
                endDateTimes.push(endDateTime);
                return [];
            },
        };

        await getHistoricalData({
            instrument: { symbol: 'NVDA', secType: SecType.STK } as any,
            startDate: new Date('2026-06-02T00:00:00.000Z'),
            endDate: new Date('2026-06-03T00:00:00.000Z'),
        });

        expect(endDateTimes).to.deep.equal(['20260602-20:30:00', '20260603-20:30:00']);
    });
});
