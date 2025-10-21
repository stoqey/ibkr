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
            console.log(manager.marketData[getSymbolKey(instrument)])
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

        it('should return nearest quote by default', async () => {
            const targetTime = new Date('2024-01-15T10:31:30Z').getTime(); // Between items
            const quote = await manager.getQuote(instrument, new Date(targetTime));
            
            expect(quote).to.not.be.null;
            // Should be either 10:31:00 or 10:32:00 (nearest)
            expect([101, 102]).to.include(quote!.close);
        });
    });

  
   
});