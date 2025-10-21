import { expect } from 'chai';
import { MarketDataManager } from './MarketDataManager';
import { Instrument, MarketData } from '../interfaces';
import { getSymbolKey } from '../utils/instrument.utils';

describe('MarketDataManager - doCleanUp', () => {
    let manager: MarketDataManager;


    beforeEach(() => {
        manager = MarketDataManager.Instance;
    });

    const instrument: Instrument = {
        symbol: "AAPL",
        secType: 'STK'
    } as Instrument;

    const testSymbol = getSymbolKey(instrument);

    describe('cleanup logic', () => {
        it('should not cleanup if CLEAN_UP_INTERVAL has not passed', () => {
            const now = new Date();
            const data: MarketData = {
                instrument,
                date: now,
                open: 100,
                high: 105,
                low: 95,
                close: 102,
                volume: 1000,
                vwap: 101
            };

            const buffer: MarketData[] = [
                {
                    instrument,
                    date: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
                    timestamp: new Date(now.getTime() - 30 * 60 * 1000).getTime(),
                    open: 99,
                    high: 101,
                    low: 98,
                    close: 100,
                    volume: 500,
                    vwap: 99.5
                }
            ];

            manager.marketData[testSymbol] = buffer;
            manager.doCleanUp(testSymbol, data, buffer);

            expect(manager.marketData[testSymbol]).to.deep.equal(buffer);
        });

        it('should cleanup and aggregate old items when CLEAN_UP_INTERVAL has passed', () => {
            const now = new Date('2024-01-01T12:00:00Z');
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

            const data: MarketData = {
                instrument,
                date: now,
                open: 100,
                high: 105,
                low: 95,
                close: 102,
                volume: 1000,
                vwap: 101
            };

            const buffer: MarketData[] = [
                {
                    instrument,
                    date: threeHoursAgo,
                    timestamp: threeHoursAgo.getTime(),
                    open: 90,
                    high: 92,
                    low: 89,
                    close: 91,
                    volume: 200,
                    vwap: 90.5
                },
                {
                    instrument,
                    date: twoHoursAgo,
                    timestamp: twoHoursAgo.getTime(),
                    open: 91,
                    high: 94,
                    low: 90,
                    close: 93,
                    volume: 300,
                    vwap: 92
                },
                {
                    instrument,
                    date: oneHourAgo,
                    timestamp: oneHourAgo.getTime(),
                    open: 93,
                    high: 96,
                    low: 92,
                    close: 95,
                    volume: 400,
                    vwap: 94
                },
                {
                    instrument,
                    date: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
                    timestamp: new Date(now.getTime() - 30 * 60 * 1000).getTime(),
                    open: 95,
                    high: 98,
                    low: 94,
                    close: 97,
                    volume: 500,
                    vwap: 96
                }
            ];

            manager.marketData[testSymbol] = buffer;
            manager._cleanUp[testSymbol] = new Date(now.getTime() - 2 * 60 * 60 * 1000); // Set last cleanup to 2 hours ago
            manager.doCleanUp(testSymbol, data, buffer);

            // Should have recent items (last 2) + aggregated data
            const result = manager.marketData[testSymbol];
            expect(result.length).to.be.greaterThan(0);
            
            // The last item should be the most recent one
            expect(result[result.length - 1].close).to.equal(97);
        });

        it('should handle empty buffer gracefully', () => {
            const now = new Date();
            const data: MarketData = {
                instrument,
                date: now,
                open: 100,
                high: 105,
                low: 95,
                close: 102,
                volume: 1000,
                vwap: 101
            };

            const buffer: MarketData[] = [];
            manager.marketData[testSymbol] = buffer;
            manager._cleanUp[testSymbol] = new Date(now.getTime() - 2 * 60 * 60 * 1000);

            expect(() => manager.doCleanUp(testSymbol, data, buffer)).to.not.throw();
        });

        it('should update _cleanUp timestamp after cleanup', () => {
            const now = new Date();
            const data: MarketData = {
                instrument,
                date: now,
                open: 100,
                high: 105,
                low: 95,
                close: 102,
                volume: 1000,
                vwap: 101
            };

            const buffer: MarketData[] = [
                {
                    instrument,
                    date: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).getTime(),
                    open: 90,
                    high: 92,
                    low: 89,
                    close: 91,
                    volume: 200,
                    vwap: 90.5
                }
            ];

            manager.marketData[testSymbol] = buffer;
            manager._cleanUp[testSymbol] = new Date(now.getTime() - 2 * 60 * 60 * 1000);

            const originalCleanupTime = manager._cleanUp[testSymbol];
            manager.doCleanUp(testSymbol, data, buffer);

            expect(manager._cleanUp[testSymbol]).to.not.equal(originalCleanupTime);
            expect(manager._cleanUp[testSymbol].getTime()).to.equal(now.getTime());
        });

        it('should aggregate multiple second-level data points into minute-level data', () => {
            const now = new Date('2024-01-01T12:00:00Z');
            const data: MarketData = {
                instrument,
                date: now,
                open: 100,
                high: 105,
                low: 95,
                close: 102,
                volume: 1000,
                vwap: 101
            };

            // Create multiple data points within the same minute (2 hours ago)
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            const buffer: MarketData[] = [
               
                // Old data - multiple seconds within same minute
                {
                    instrument,
                    date: new Date(twoHoursAgo.getTime() + 0 * 1000), // 2:00:00
                    timestamp: new Date(twoHoursAgo.getTime() + 0 * 1000).getTime(),
                    open: 90,
                    high: 92,
                    low: 89,
                    close: 91,
                    volume: 100,
                    vwap: 90.5
                },
                {
                    instrument,
                    date: new Date(twoHoursAgo.getTime() + 15 * 1000), // 2:00:15
                    timestamp: new Date(twoHoursAgo.getTime() + 15 * 1000).getTime(),
                    open: 91,
                    high: 93,
                    low: 90,
                    close: 92,
                    volume: 150,
                    vwap: 91.5
                },
                {
                    instrument,
                    date: new Date(twoHoursAgo.getTime() + 30 * 1000), // 2:00:30
                    timestamp: new Date(twoHoursAgo.getTime() + 30 * 1000).getTime(),
                    open: 92,
                    high: 94,
                    low: 91,
                    close: 93,
                    volume: 200,
                    vwap: 92.5
                },
                {
                    instrument,
                    date: new Date(twoHoursAgo.getTime() + 45 * 1000), // 2:00:45
                    timestamp: new Date(twoHoursAgo.getTime() + 45 * 1000).getTime(),
                    open: 93,
                    high: 95,
                    low: 92,
                    close: 94,
                    volume: 250,
                    vwap: 93.5
                },
                 // Recent data (should be kept)
                 {
                    instrument,
                    date: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
                    timestamp: new Date(now.getTime() - 30 * 60 * 1000).getTime(),
                    open: 95,
                    high: 98,
                    low: 94,
                    close: 97,
                    volume: 500,
                    vwap: 96
                },
            ];

            manager.marketData[testSymbol] = buffer;
            manager._cleanUp[testSymbol] = new Date(now.getTime() - 2 * 60 * 60 * 1000);

            manager.doCleanUp(testSymbol, data, buffer);

            const result = manager.marketData[testSymbol];

            // Should have recent data + aggregated old data
            expect(result.length).to.be.eq(2);
            
            // The recent data should be preserved
            expect(result[0].close).to.equal(94);
            
            // Should have aggregated the old data into minute-level
            // The result should have fewer items than the original buffer
        });

        it('should aggregate data from different minutes correctly', () => {
            const now = new Date('2024-01-01T12:00:00Z');
            const data: MarketData = {
                instrument,
                date: now,
                open: 100,
                high: 105,
                low: 95,
                close: 102,
                volume: 1000,
                vwap: 101
            };

            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            const buffer: MarketData[] = [
               
                // Old data from different minutes
                {
                    instrument,
                    date: new Date(twoHoursAgo.getTime() + 0 * 60 * 1000), // 2:00:00
                    timestamp: new Date(twoHoursAgo.getTime() + 0 * 60 * 1000).getTime(),
                    open: 90,
                    high: 92,
                    low: 89,
                    close: 91,
                    volume: 100,
                    vwap: 90.5
                },
                {
                    instrument,
                    date: new Date(twoHoursAgo.getTime() + 1 * 60 * 1000), // 2:01:00
                    timestamp: new Date(twoHoursAgo.getTime() + 1 * 60 * 1000).getTime(),
                    open: 91,
                    high: 93,
                    low: 90,
                    close: 92,
                    volume: 150,
                    vwap: 91.5
                },
                {
                    instrument,
                    date: new Date(twoHoursAgo.getTime() + 2 * 60 * 1000), // 2:02:00
                    timestamp: new Date(twoHoursAgo.getTime() + 2 * 60 * 1000).getTime(),
                    open: 92,
                    high: 94,
                    low: 91,
                    close: 93,
                    volume: 200,
                    vwap: 92.5
                },
                 // Recent data
                 {
                    instrument,
                    date: new Date(now.getTime() - 30 * 60 * 1000),
                    open: 95,
                    high: 98,
                    low: 94,
                    close: 97,
                    volume: 500,
                    vwap: 96
                },
            ];

            manager.marketData[testSymbol] = buffer;
            manager._cleanUp[testSymbol] = new Date(now.getTime() - 2 * 60 * 60 * 1000);

            manager.doCleanUp(testSymbol, data, buffer);

            const result = manager.marketData[testSymbol];
            
            // Should have recent data + aggregated old data
            expect(result.length).to.be.eq(4);
            
            // Recent data should be preserved
            expect(result[0].close).to.equal(91);
        });

        it('should handle mixed old and recent data correctly', () => {
            const now = new Date('2024-01-01T12:00:00Z');
            const data: MarketData = {
                instrument,
                date: now,
                open: 100,
                high: 105,
                low: 95,
                close: 102,
                volume: 1000,
                vwap: 101
            };

            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            const buffer: MarketData[] = [
                // Old data (should be aggregated)
                {
                    instrument,
                    date: new Date(twoHoursAgo.getTime() + 0 * 60 * 1000), // 2:00:00
                    timestamp: new Date(twoHoursAgo.getTime() + 0 * 60 * 1000).getTime(),
                    open: 90,
                    high: 92,
                    low: 89,
                    close: 91,
                    volume: 100,
                    vwap: 90.5
                },
                {
                    instrument,
                    date: new Date(twoHoursAgo.getTime() + 1 * 60 * 1000), // 2:01:00
                    timestamp: new Date(twoHoursAgo.getTime() + 1 * 60 * 1000).getTime(),
                    open: 91,
                    high: 93,
                    low: 90,
                    close: 92,
                    volume: 150,
                    vwap: 91.5
                },
                 // Recent data (should be kept)
                 {
                    instrument,
                    date: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
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
                    date: new Date(now.getTime() - 45 * 60 * 1000), // 45 minutes ago
                    timestamp: new Date(now.getTime() - 45 * 60 * 1000).getTime(),
                    open: 93,
                    high: 96,
                    low: 92,
                    close: 95,
                    volume: 400,
                    vwap: 94
                },
            ];

            manager.marketData[testSymbol] = buffer;
            manager._cleanUp[testSymbol] = new Date(now.getTime() - 2 * 60 * 60 * 1000);

            manager.doCleanUp(testSymbol, data, buffer);

            const result = manager.marketData[testSymbol];
            
            // Should have recent data + aggregated old data
            expect(result.length).to.be.greaterThan(0);
            
            // Data should be preserved (first 2 items)
            expect(result[0].close).to.equal(91);
            expect(result[1].close).to.equal(92);
            
            // Old data should be aggregated (last 2 items)
            expect(result.length).to.be.eq(4); // Same as original, but with aggregation
        });
    });
});
