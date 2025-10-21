import { expect } from 'chai';
import { MarketDataManager } from './MarketDataManager';
import { Instrument, MarketData } from '../interfaces';
import { getSymbolKey } from '../utils/instrument.utils';

describe('MarketDataManager - findIndex', () => {
    let manager: MarketDataManager;

    beforeEach(() => {
        manager = MarketDataManager.Instance;
    });

    const instrument: Instrument = {
        symbol: "AAPL",
        secType: 'STK'
    } as Instrument;

    const testSymbol = getSymbolKey(instrument);

    describe('findIndex functionality', () => {
        it('should find correct index for inserting new data points', () => {
            const now = new Date('2024-01-01T12:00:00Z');

            // Create test data in chronological order
            const testData: MarketData[] = [
                {
                    instrument,
                    date: new Date(now.getTime() - 90 * 60 * 1000), // 10:30
                    timestamp: new Date(now.getTime() - 90 * 60 * 1000).getTime(),
                    open: 91,
                    high: 94,
                    low: 90,
                    close: 93,
                    volume: 300,
                    vwap: 92
                },
                {
                    instrument,
                    date: new Date(now.getTime() - 60 * 60 * 1000), // 11:00
                    timestamp: new Date(now.getTime() - 60 * 60 * 1000).getTime(),
                    open: 93,
                    high: 96,
                    low: 92,
                    close: 95,
                    volume: 400,
                    vwap: 94
                },
                {
                    instrument,
                    date: new Date(now.getTime() - 30 * 60 * 1000), // 11:30
                    timestamp: new Date(now.getTime() - 30 * 60 * 1000).getTime(),
                    open: 95,
                    high: 98,
                    low: 94,
                    close: 97,
                    volume: 500,
                    vwap: 96
                },

            ];

            manager.marketData[testSymbol] = testData;

            // Test finding index for inserting data at 11:15 (between 11:30 and 11:00)
            const insertTimestamp = new Date(now.getTime() - 45 * 60 * 1000).getTime(); // 11:15
            const index = manager.findIndex(testSymbol, insertTimestamp);

            expect(index).to.equal(2); // Should insert at index 1 (between 11:30 and 11:00)
        });

        it('should find correct index for inserting data at the beginning', () => {
            const now = new Date('2024-01-01T12:00:00Z');

            const testData: MarketData[] = [

                {
                    instrument,
                    date: new Date(now.getTime() - 90 * 60 * 1000), // 10:30
                    timestamp: new Date(now.getTime() - 90 * 60 * 1000).getTime(),
                    open: 91,
                    high: 94,
                    low: 90,
                    close: 93,
                    volume: 300,
                    vwap: 92
                },
                {
                    instrument,
                    date: new Date(now.getTime() - 60 * 60 * 1000), // 11:00
                    timestamp: new Date(now.getTime() - 60 * 60 * 1000).getTime(),
                    open: 93,
                    high: 96,
                    low: 92,
                    close: 95,
                    volume: 400,
                    vwap: 94
                }
            ];

            manager.marketData[testSymbol] = testData;

            // Test finding index for inserting data at 11:30 (newest, should be at index 0)
            const insertTimestamp = new Date(now.getTime() - 30 * 60 * 1000).getTime(); // 11:30
            const index = manager['findIndex'](testSymbol, insertTimestamp);

            expect(index).to.equal(2); // Should insert at index 0 (newest)
        });

        it('should find correct index for inserting data at the end', () => {
            const now = new Date('2024-01-01T12:00:00Z');

            const testData: MarketData[] = [

                {
                    instrument,
                    date: new Date(now.getTime() - 60 * 60 * 1000), // 11:00
                    timestamp: new Date(now.getTime() - 60 * 60 * 1000).getTime(),
                    open: 93,
                    high: 96,
                    low: 92,
                    close: 95,
                    volume: 400,
                    vwap: 94
                },
                {
                    instrument,
                    date: new Date(now.getTime() - 30 * 60 * 1000), // 11:30
                    timestamp: new Date(now.getTime() - 30 * 60 * 1000).getTime(),
                    open: 95,
                    high: 98,
                    low: 94,
                    close: 97,
                    volume: 500,
                    vwap: 96
                }
            ];

            manager.marketData[testSymbol] = testData;

            // Test finding index for inserting data at 10:30 (oldest, should be at end)
            const insertTimestamp = new Date(now.getTime() - 90 * 60 * 1000).getTime(); // 10:30
            const index = manager['findIndex'](testSymbol, insertTimestamp);

            expect(index).to.equal(0); // Should insert at index 2 (oldest, which is the end of the array)
        });

        it('should return -1 when data is empty', () => {
            manager.marketData[testSymbol] = [];

            const insertTimestamp = new Date('2024-01-01T12:00:00Z').getTime();
            const index = manager['findIndex'](testSymbol, insertTimestamp);

            expect(index).to.equal(-1);
        });

        it('should find correct indices for historical data range', () => {
            const now = new Date('2024-01-01T12:00:00Z');

            const testData: MarketData[] = [
                {
                    instrument,
                    date: new Date(now.getTime() - 120 * 60 * 1000), // 10:00
                    timestamp: new Date(now.getTime() - 120 * 60 * 1000).getTime(),
                    open: 89,
                    high: 92,
                    low: 88,
                    close: 91,
                    volume: 200,
                    vwap: 90
                },
                {
                    instrument,
                    date: new Date(now.getTime() - 90 * 60 * 1000), // 10:30
                    timestamp: new Date(now.getTime() - 90 * 60 * 1000).getTime(),
                    open: 91,
                    high: 94,
                    low: 90,
                    close: 93,
                    volume: 300,
                    vwap: 92
                },
                {
                    instrument,
                    date: new Date(now.getTime() - 60 * 60 * 1000), // 11:00
                    timestamp: new Date(now.getTime() - 60 * 60 * 1000).getTime(),
                    open: 93,
                    high: 96,
                    low: 92,
                    close: 95,
                    volume: 400,
                    vwap: 94
                },

                {
                    instrument,
                    date: new Date(now.getTime() - 30 * 60 * 1000), // 11:30
                    timestamp: new Date(now.getTime() - 30 * 60 * 1000).getTime(),
                    open: 95,
                    high: 98,
                    low: 94,
                    close: 97,
                    volume: 500,
                    vwap: 96
                },
            ];

            manager.marketData[testSymbol] = testData;

            // Test finding start index (11:00)
            const startTimestamp = new Date(now.getTime() - 60 * 60 * 1000).getTime(); // 11:00
            const startIndex = manager['findIndex'](testSymbol, startTimestamp);
            expect(startIndex).to.equal(2); // Should find index 1 (11:00)

            // Test finding end index (10:30) with last=true
            const endTimestamp = new Date(now.getTime() - 90 * 60 * 1000).getTime(); // 10:30
            const endIndex = manager['findIndex'](testSymbol, endTimestamp);
            expect(endIndex).to.equal(1); // Should find index 3 (10:00) - last item <= 10:30
        });

        it('should handle edge cases with findIndex', () => {
            const now = new Date('2024-01-01T12:00:00Z');

            const testData: MarketData[] = [
                {
                    instrument,
                    date: new Date(now.getTime() - 60 * 60 * 1000), // 11:00
                    timestamp: new Date(now.getTime() - 60 * 60 * 1000).getTime(),
                    open: 93,
                    high: 96,
                    low: 92,
                    close: 95,
                    volume: 400,
                    vwap: 94
                }
            ];

            manager.marketData[testSymbol] = testData;

            // Test finding exact timestamp
            const exactTimestamp = new Date(now.getTime() - 60 * 60 * 1000).getTime(); // 11:00
            const exactIndex = manager['findIndex'](testSymbol, exactTimestamp);
            expect(exactIndex).to.equal(0); // Should find index 0 (exact match)

            // Test finding timestamp that doesn't exist
            const nonExistentTimestamp = new Date(now.getTime() - 45 * 60 * 1000).getTime(); // 11:15
            const nonExistentIndex = manager['findIndex'](testSymbol, nonExistentTimestamp, true);
            expect(nonExistentIndex).to.equal(0); // Should find index 0 (insert at beginning)
        });
    });

    describe('historicalData integration', () => {
        it('should work correctly with historicalData method', async () => {
            const now = new Date('2024-01-01T12:00:00Z');

            const testData: MarketData[] = [
                {
                    instrument,
                    date: new Date(now.getTime() - 120 * 60 * 1000), // 10:00
                    timestamp: new Date(now.getTime() - 120 * 60 * 1000).getTime(),
                    open: 89,
                    high: 92,
                    low: 88,
                    close: 91,
                    volume: 200,
                    vwap: 90
                },
                {
                    instrument,
                    date: new Date(now.getTime() - 90 * 60 * 1000), // 10:30
                    timestamp: new Date(now.getTime() - 90 * 60 * 1000).getTime(),
                    open: 91,
                    high: 94,
                    low: 90,
                    close: 93,
                    volume: 300,
                    vwap: 92
                },
                {
                    instrument,
                    date: new Date(now.getTime() - 60 * 60 * 1000), // 11:00
                    timestamp: new Date(now.getTime() - 60 * 60 * 1000).getTime(),
                    open: 93,
                    high: 96,
                    low: 92,
                    close: 95,
                    volume: 400,
                    vwap: 94
                },
                {
                    instrument,
                    date: new Date(now.getTime() - 30 * 60 * 1000), // 11:30
                    timestamp: new Date(now.getTime() - 30 * 60 * 1000).getTime(),
                    open: 95,
                    high: 98,
                    low: 94,
                    close: 97,
                    volume: 500,
                    vwap: 96
                },
                {
                    instrument,
                    date: new Date(now.getTime() - 20 * 60 * 1000), // 11:40
                    timestamp: new Date(now.getTime() - 20 * 60 * 1000).getTime(),
                    open: 95,
                    high: 98,
                    low: 94,
                    close: 90,
                    volume: 500,
                    vwap: 96
                },
            ];

            manager.marketData[testSymbol] = testData;
            // Test historicalData with date range
            const startDate = new Date(now.getTime() - 120 * 60 * 1000); // 10:00
            const endDate = new Date(now.getTime() - 60 * 60 * 1000); // 11:00

            const historicalData = await manager.historicalData(instrument, startDate, endDate);

            expect(historicalData.length).to.equal(3); // Should return 2 items (10:00, 10:30, 11:00)
            expect(historicalData[0].close).to.equal(91); // 10:00
            expect(historicalData[1].close).to.equal(93); // 10:30
            expect(historicalData[2].close).to.equal(95); // 11:00
        });
    });
});
