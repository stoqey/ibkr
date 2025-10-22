import { Instrument, MarketData } from "../interfaces";
import { Contract } from "@stoqey/ib";
import { getSymbolKey } from "../utils/instrument.utils";
import { plotMkdCli } from "../utils/chart";
import { log } from "../utils/log";
import { formatDateStr } from "../utils/time.utils";
import { formatDec } from "../utils/data.utils";
import { createAggregator } from "../utils/mkd.utils";

const CLEAN_UP_INTERVAL = process.env.CLEAN_UP_INTERVAL ? parseInt(process.env.CLEAN_UP_INTERVAL) : 1000 * 60 * 60 * 1; // 1 hour

export class MkdManager {
    logsNames = MkdManager.name;

    marketData: Record<string, MarketData[]> = {};
    _cleanUp: Record<string, Date> = {}; // symbol, last cleaned up date

    getSymbolKey(instrument: Instrument | Contract): string {
        return getSymbolKey(instrument);
    };

    cacheBar(data: MarketData): void {
        const symbol = getSymbolKey(data.instrument);

        if (!this.marketData[symbol]) {
            this.marketData[symbol] = [];
            this._cleanUp[symbol] = data.date;
        }

        const buffer = this.marketData[symbol];
        const ts = new Date(data.date).getTime();
        const bar: MarketData = {
            timestamp: ts,
            date: data.date,
            open: data.open ?? data.close,
            high: data.high ?? data.close,
            low: data.low ?? data.close,
            close: data.close,
            volume: data.volume ?? 0,
            vwap: data.vwap ?? data.close,
        };

        // Fast append if in order
        if (buffer.length === 0 || buffer[buffer.length - 1].timestamp <= ts) {
            buffer.push(bar);
            this.doCleanUp(symbol, data, buffer);
            return;
        }

        // Otherwise insert at correct index using binary search
        const idx = this.findIndex(symbol, ts);
        if (idx === -1) {
            buffer.push(bar);
        } else {
            buffer.splice(idx, 0, bar);
        }
        this.doCleanUp(symbol, data, buffer);
    }

    public findIndex(symbol: string, targetTimestamp: number, last = false): number {
        const data = this.marketData[symbol];
        if (!data || data.length === 0) return -1;

        let left = 0;
        let right = data.length - 1;
        let result = -1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);

            if (last) {
                if (data[mid].timestamp <= targetTimestamp) {
                    result = mid;
                    left = mid + 1;
                } else {
                    right = mid - 1;
                }
            } else {
                if (data[mid].timestamp >= targetTimestamp) {
                    result = mid;
                    right = mid - 1;
                } else {
                    left = mid + 1;
                }
            }

        }
        // If no result found and we're looking for insertion point, return the length of the array
        // This means the target timestamp is older than all existing timestamps
        if (result === -1 && !last) {
            return data.length;
        }

        return result;
    }

    /**
     * Get historical data for a given time range using binary search
     * 
     * @param contract - The instrument to query
     * @param startDate - Start of the range
     * @param endDate - End of the range
     * @param interval - Optional interval for aggregation (not yet implemented)
     * @returns Array of market data within the range
     * 
     * @example
     * const data = await manager.historicalData(
     *   instrument,
     *   new Date('2024-01-15T10:30:00Z'),
     *   new Date('2024-01-15T10:35:00Z')
     * );
     */
    public async historicalData(contract: Instrument | Contract, startDate: Date, endDate: Date, interval?: string): Promise<MarketData[]> {
        const symbol = this.getSymbolKey(contract);
        const data = this.marketData[symbol];
        if (!data || data.length === 0) return [];

        const startTimestamp = startDate.getTime();
        const endTimestamp = endDate.getTime();

        // Validate timestamps
        if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
            log(`${this.logsNames}.historicalData`, `Invalid date provided for ${symbol}`);
            return [];
        }

        // Validate date range
        if (startTimestamp > endTimestamp) {
            log(`${this.logsNames}.historicalData`, `Start date is after end date for ${symbol}`);
            return [];
        }

        let startIdx = this.findIndex(symbol, startTimestamp);
        let endIdx = this.findIndex(symbol, endTimestamp, true);

        // If startIdx is -1, it means startDate is before all data points
        // Use first item (index 0)
        if (startIdx === -1) {
            startIdx = 0;
        }

        // If endIdx is -1, it means endDate is after all data points
        // Use last item
        if (endIdx === -1) {
            endIdx = data.length - 1;
        }

        // Final validation
        if (endIdx < startIdx) {
            return [];
        }

        const slicedData = data.slice(startIdx, endIdx + 1);

        const first = slicedData && slicedData[0];
        const last = (slicedData || [])[slicedData?.length - 1];

        plotMkdCli(slicedData);

        log(`${this.logsNames}.historicalData`, `${slicedData.length} data points for ${symbol} from ${formatDateStr(first.date)} to ${formatDateStr(last.date)} @${formatDec(first.close)} -> @${formatDec(last.close)}`);

        return slicedData;
    };

    /**
     * Get quote at or before specified timestamp (point-in-time lookup)
     * Returns the most recent data point at or before the requested time.
     * If no data exists before the requested time, returns the first available data point.
     * 
     * @param contract - The instrument to query
     * @param date - The timestamp to query (defaults to current time)
     * @returns The market data at or before the specified time, or null if no data exists
     * 
     * @example
     * // Get current quote
     * const quote = await manager.getQuote(instrument);
     * 
     * @example
     * // Get historical quote at specific time
     * const quote = await manager.getQuote(instrument, new Date('2024-01-15T10:32:00Z'));
     */
    public async getQuote(contract: Instrument | Contract, date?: Date): Promise<MarketData> {
        const symbol = this.getSymbolKey(contract);
        const timestamp = date?.getTime() ?? Date.now();
        
        // Validate timestamp (check for NaN from invalid Date)
        if (isNaN(timestamp)) {
            log(`${this.logsNames}.getQuote`, `Invalid date provided for ${symbol}`);
            return null;
        }
        
        const data = this.marketData[symbol];
        if (!data || data.length === 0) return null;

        const closest = this.findIndex(symbol, timestamp, true);
        if (closest === -1) {
            const firstItem = data[0];
            const lastItem = data[data.length - 1];
            
            // If query timestamp is before first item, return first item
            if (firstItem && timestamp < firstItem.timestamp) {
                return firstItem;
            }
            
            // If query timestamp is at or after last item, return last item
            if (lastItem && timestamp >= lastItem.timestamp) {
                return lastItem;
            }
            
            // Fallback (should not reach here)
            return lastItem ?? null;
        }
        return data[closest] ?? null;
    }

    doCleanUp = (symbol, data: MarketData, buffer: MarketData[]) => {
        const now = data.date;
        const lastCleanUp = this._cleanUp[symbol];
        if (lastCleanUp && now.getTime() - lastCleanUp.getTime() > CLEAN_UP_INTERVAL) {
            this._cleanUp[symbol] = now;
            // MarketData = [dateOld, ..., dateNew] (chronological order)
            // slice items before CLEAN_UP_INTERVAL,
            // aggregate the sliced items by minute,
            // add them back to the marketData 
            const lastCleanUpTimestamp = now.getTime() - CLEAN_UP_INTERVAL;
            const oldItemsIndex = this.findIndex(symbol, lastCleanUpTimestamp, false);
            const oldItems = buffer.slice(0, oldItemsIndex);
            const lastNewItem = buffer.slice(oldItemsIndex);

            const aggregatedData = createAggregator(oldItems, "1m", {
                vwap: 'sum',
                volume: 'sum',
                close: 'last',
                open: 'first',
                high: 'max',
                low: 'min'
            });
            this.marketData[symbol] = [...aggregatedData, ...lastNewItem];
        }
    }

}
