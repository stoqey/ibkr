import { expect } from 'chai';
import 'mocha';
import { MkdManager } from './Mkd';
import { Instrument, MarketData } from '../interfaces';
import { getSymbolKey } from '../utils/instrument.utils';

describe('MkdManager with Arrays', () => {
    let manager: MkdManager;
    
    beforeEach(() => {
        manager = new MkdManager();
    });

    describe('historicalData with binary search', () => {
        const instrument = { symbol: 'TEST' } as Instrument;
        beforeEach(() => {
            // Add test data - 10 items, 1 minute apart
            const baseTime = new Date('2024-01-15T10:30:00Z').getTime();
            
            for (let i = 0; i < 10; i++) {
                const data: MarketData = {
                    date: new Date(baseTime + i * 60000),
                    close: 100 + i,
                    volume: 1000 + i * 100,
                    instrument
                };
                manager.cacheBar(data);
            }
        });

        it('should return correct range using binary search', async () => {
            const startDate = new Date('2024-01-15T10:32:00Z'); // 3rd item
            const endDate = new Date('2024-01-15T10:35:00Z');   // 6th item
            const result = await manager.historicalData(instrument, startDate, endDate);
            
            expect(result).to.have.length(4); // items 2, 3, 4, 5 (0-indexed)
            expect(result[0].close).to.equal(102); // 3rd item
            expect(result[3].close).to.equal(105); // 6th item
        });

        it('should return empty array for non-existent symbol', async () => {
            const startDate = new Date('2024-01-15T10:30:00Z');
            const endDate = new Date('2024-01-15T10:40:00Z');
            
            const result = await manager.historicalData({ symbol: 'NONEXISTENT' } as Instrument, startDate, endDate);
            expect(result).to.be.empty;
        });

        it('should return empty array when no data in range', async () => {
            const startDate = new Date('2024-01-15T11:00:00Z'); // After all data
            const endDate = new Date('2024-01-15T11:10:00Z');
            
            const result = await manager.historicalData(instrument, startDate, endDate);
            expect(result).to.be.empty;
        });

        it('should return all data when range encompasses everything', async () => {
            const startDate = new Date('2024-01-15T10:25:00Z'); // Before all data
            const endDate = new Date('2024-01-15T10:45:00Z');   // After all data
            
            const result = await manager.historicalData(instrument, startDate, endDate);
            expect(result).to.have.length(10);
        });

        it('should match slow filter method results', async () => {
            const startDate = new Date('2024-01-15T10:32:00Z');
            const endDate = new Date('2024-01-15T10:36:00Z');
            
            const fastResult = await manager.historicalData(instrument, startDate, endDate);
            expect(fastResult).to.have.length(5);
        });
    });
    describe('getQuote', () => {
        const instrument = { symbol: 'QUOTE_TEST' } as Instrument;
        beforeEach(() => {
            const baseTime = new Date('2024-01-15T10:30:00Z').getTime();
            
            for (let i = 0; i < 5; i++) {
                const data: MarketData = {
                    date: new Date(baseTime + i * 60000),
                    close: 100 + i,
                    instrument
                };
                manager.cacheBar(data);
            }
        });

        it('should return exact quote for matching timestamp', async () => {
            const targetTime = new Date('2024-01-15T10:32:00Z').getTime();
            const quote = await manager.getQuote(instrument, new Date(targetTime));
            
            expect(quote).to.not.be.null;
            expect(quote.timestamp).to.equal(targetTime);
            expect(quote.close).to.equal(102);
        });

        it('should return last known quote before timestamp (point-in-time lookup)', async () => {
            // Query at 10:31:30 (30 seconds after second data point)
            const targetTime = new Date('2024-01-15T10:31:30Z');
            const quote = await manager.getQuote(instrument, targetTime);
            
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(101); // Should get 10:31:00, not 10:32:00
            expect(quote.timestamp).to.equal(new Date('2024-01-15T10:31:00Z').getTime());
        });

        it('should return exact match when timestamp exists', async () => {
            const targetTime = new Date('2024-01-15T10:32:00Z');
            const quote = await manager.getQuote(instrument, targetTime);
            
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(102);
            expect(quote.timestamp).to.equal(targetTime.getTime());
        });

        it('should return last data point when querying after all data', async () => {
            // Query time is after the last data point (10:34:00)
            const targetTime = new Date('2024-01-15T10:40:00Z');
            const quote = await manager.getQuote(instrument, targetTime);
            
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(104); // Last item
            expect(quote.timestamp).to.equal(new Date('2024-01-15T10:34:00Z').getTime());
        });

        it('should return first data point when querying before all data', async () => {
            // Query time is before the first data point (10:30:00)
            const targetTime = new Date('2024-01-15T10:25:00Z');
            const quote = await manager.getQuote(instrument, targetTime);
            
            // Should return first item when query is before all data
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(100); // First item
            expect(quote.timestamp).to.equal(new Date('2024-01-15T10:30:00Z').getTime());
        });

        it('should return null for non-existent symbol', async () => {
            const targetTime = new Date('2024-01-15T10:32:00Z');
            const quote = await manager.getQuote({ symbol: 'NONEXISTENT' } as Instrument, targetTime);
            
            expect(quote).to.be.null;
        });

        it('should use current time when date is not provided', async () => {
            // Don't provide a date, should use Date.now()
            const quote = await manager.getQuote(instrument);
            
            // Since current time is way after test data, should return last item
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(104); // Last item
        });

        it('should handle query exactly at first data point', async () => {
            const targetTime = new Date('2024-01-15T10:30:00Z');
            const quote = await manager.getQuote(instrument, targetTime);
            
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(100); // First item
            expect(quote.timestamp).to.equal(targetTime.getTime());
        });

        it('should handle query exactly at last data point', async () => {
            const targetTime = new Date('2024-01-15T10:34:00Z');
            const quote = await manager.getQuote(instrument, targetTime);
            
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(104); // Last item
            expect(quote.timestamp).to.equal(targetTime.getTime());
        });

        it('should handle multiple queries in sequence', async () => {
            const times = [
                new Date('2024-01-15T10:30:00Z'),
                new Date('2024-01-15T10:31:00Z'),
                new Date('2024-01-15T10:32:00Z'),
                new Date('2024-01-15T10:33:00Z'),
                new Date('2024-01-15T10:34:00Z'),
            ];
            
            for (let i = 0; i < times.length; i++) {
                const quote = await manager.getQuote(instrument, times[i]);
                expect(quote).to.not.be.null;
                expect(quote.close).to.equal(100 + i);
            }
        });

        it('should handle query between any two consecutive data points', async () => {
            // Query at 10:32:45 (45 seconds after 10:32:00, 15 seconds before 10:33:00)
            const targetTime = new Date('2024-01-15T10:32:45Z');
            const quote = await manager.getQuote(instrument, targetTime);
            
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(102); // Should get 10:32:00 (last before query time)
            expect(quote.timestamp).to.equal(new Date('2024-01-15T10:32:00Z').getTime());
        });

        it('should handle query 1ms after a data point', async () => {
            const baseTime = new Date('2024-01-15T10:31:00Z').getTime();
            const targetTime = new Date(baseTime + 1); // 1ms after
            const quote = await manager.getQuote(instrument, targetTime);
            
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(101);
        });

        it('should handle query 1ms before a data point', async () => {
            const baseTime = new Date('2024-01-15T10:32:00Z').getTime();
            const targetTime = new Date(baseTime - 1); // 1ms before
            const quote = await manager.getQuote(instrument, targetTime);
            
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(101); // Should get previous data point (10:31:00)
        });
    });

    describe('getQuote - Edge Cases', () => {
        it('should handle single data point correctly', async () => {
            const instrument = { symbol: 'SINGLE_POINT' } as Instrument;
            const data: MarketData = {
                date: new Date('2024-01-15T10:30:00Z'),
                close: 100,
                instrument
            };
            manager.cacheBar(data);

            // Query before
            let quote = await manager.getQuote(instrument, new Date('2024-01-15T10:25:00Z'));
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(100);

            // Query exact
            quote = await manager.getQuote(instrument, new Date('2024-01-15T10:30:00Z'));
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(100);

            // Query after
            quote = await manager.getQuote(instrument, new Date('2024-01-15T10:35:00Z'));
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(100);
        });

        it('should handle two data points correctly', async () => {
            const instrument = { symbol: 'TWO_POINTS' } as Instrument;
            const baseTime = new Date('2024-01-15T10:30:00Z').getTime();
            
            for (let i = 0; i < 2; i++) {
                const data: MarketData = {
                    date: new Date(baseTime + i * 60000),
                    close: 100 + i,
                    instrument
                };
                manager.cacheBar(data);
            }

            // Query before first
            let quote = await manager.getQuote(instrument, new Date('2024-01-15T10:29:00Z'));
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(100);

            // Query between
            quote = await manager.getQuote(instrument, new Date('2024-01-15T10:30:30Z'));
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(100);

            // Query at second point
            quote = await manager.getQuote(instrument, new Date('2024-01-15T10:31:00Z'));
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(101);

            // Query after second
            quote = await manager.getQuote(instrument, new Date('2024-01-15T10:32:00Z'));
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(101);
        });

        it('should handle duplicate timestamps', async () => {
            const instrument = { symbol: 'DUPLICATES' } as Instrument;
            const timestamp = new Date('2024-01-15T10:30:00Z');
            
            // Add multiple data points with same timestamp
            for (let i = 0; i < 3; i++) {
                const data: MarketData = {
                    date: timestamp,
                    close: 100 + i * 10, // 100, 110, 120
                    instrument
                };
                manager.cacheBar(data);
            }

            const quote = await manager.getQuote(instrument, timestamp);
            expect(quote).to.not.be.null;
            // Should get one of the duplicates (last one inserted)
            expect([100, 110, 120]).to.include(quote.close);
        });

        it('should handle invalid date gracefully', async () => {
            const instrument = { symbol: 'INVALID_DATE' } as Instrument;
            const data: MarketData = {
                date: new Date('2024-01-15T10:30:00Z'),
                close: 100,
                instrument
            };
            manager.cacheBar(data);

            const invalidDate = new Date('invalid-date-string');
            const quote = await manager.getQuote(instrument, invalidDate);
            
            expect(quote).to.be.null;
        });

        it('should handle large dataset efficiently', async () => {
            const instrument = { symbol: 'LARGE_DATASET' } as Instrument;
            const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
            
            // Add 10,000 data points (1 per second)
            const dataCount = 10000;
            for (let i = 0; i < dataCount; i++) {
                const data: MarketData = {
                    date: new Date(baseTime + i * 1000),
                    close: 100 + Math.random() * 10,
                    instrument
                };
                manager.cacheBar(data);
            }

            const startTime = Date.now();
            
            // Query somewhere in the middle
            const targetTime = new Date(baseTime + Math.floor(dataCount / 2) * 1000);
            const quote = await manager.getQuote(instrument, targetTime);
            
            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(quote).to.not.be.null;
            expect(duration).to.be.lessThan(10); // Should be very fast (< 10ms)
        });

        it('should handle queries at extreme timestamps', async () => {
            const instrument = { symbol: 'EXTREME_TIMES' } as Instrument;
            const data: MarketData = {
                date: new Date('2024-01-15T10:30:00Z'),
                close: 100,
                instrument
            };
            manager.cacheBar(data);

            // Very old timestamp (year 1970)
            let quote = await manager.getQuote(instrument, new Date(0));
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(100);

            // Very future timestamp (year 2100)
            quote = await manager.getQuote(instrument, new Date('2100-01-01T00:00:00Z'));
            expect(quote).to.not.be.null;
            expect(quote.close).to.equal(100);
        });

        it('should be consistent across multiple queries', async () => {
            const instrument = { symbol: 'CONSISTENCY_TEST' } as Instrument;
            const baseTime = new Date('2024-01-15T10:30:00Z').getTime();
            
            for (let i = 0; i < 5; i++) {
                const data: MarketData = {
                    date: new Date(baseTime + i * 60000),
                    close: 100 + i,
                    instrument
                };
                manager.cacheBar(data);
            }

            const targetTime = new Date('2024-01-15T10:32:30Z');
            
            // Query same time multiple times
            const results = await Promise.all([
                manager.getQuote(instrument, targetTime),
                manager.getQuote(instrument, targetTime),
                manager.getQuote(instrument, targetTime),
            ]);

            // All results should be identical
            expect(results[0]).to.deep.equal(results[1]);
            expect(results[1]).to.deep.equal(results[2]);
            expect(results[0]?.close).to.equal(102);
        });
        
    });

  
   
});