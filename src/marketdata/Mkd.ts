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

    // Fast range query using binary search
    public async historicalData(contract: Instrument, startDate: Date, endDate: Date, interval?: string): Promise<MarketData[]> {
        const symbol = this.getSymbolKey(contract);
        const data = this.marketData[symbol];
        if (!data || data.length === 0) return [];

        const startTimestamp = startDate.getTime();
        const endTimestamp = endDate.getTime();

        const startIdx = this.findIndex(symbol, startTimestamp);
        if (startIdx === -1) return [];

        const endIdx = this.findIndex(symbol, endTimestamp, true);
        if (endIdx === -1 || endIdx < startIdx) return [];

        const slicedData = data.slice(startIdx, endIdx + 1);

        const first = slicedData && slicedData[0];
        const last = (slicedData || [])[slicedData?.length - 1];

        plotMkdCli(slicedData);

        log(`${this.logsNames}.historicalData`, `${slicedData.length} data points for ${symbol} from ${formatDateStr(first.date)} to ${formatDateStr(last.date)} @${formatDec(first.close)} -> @${formatDec(last.close)}`);

        return slicedData;
    };

    // Get closest quote to timestamp
    public async getQuote(contract: Instrument, date: Date): Promise<MarketData> {
        const symbol = this.getSymbolKey(contract);
        const timestamp = date.getTime();
        const data = this.marketData[symbol];
        if (!data || data.length === 0) return null;

        let left = 0;
        let right = data.length - 1;
        let closest = 0;
        let minDiff = Math.abs(data[0].timestamp - timestamp);

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const diff = Math.abs(data[mid].timestamp - timestamp);

            if (diff < minDiff) {
                minDiff = diff;
                closest = mid;
            }

            if (data[mid].timestamp < timestamp) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return data[closest];
    }

    // TODO: getClosest or exact?
    public async getQuoteClosest(contract: Instrument, date: Date): Promise<MarketData> {
        const symbol = this.getSymbolKey(contract);
        const timestamp = date.getTime();
        const data = this.marketData[symbol];
        if (!data || data.length === 0) return null;

        let left = 0;
        let right = data.length - 1;
        let closest = 0;
        let minDiff = Math.abs(data[0].timestamp - timestamp);

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const diff = Math.abs(data[mid].timestamp - timestamp);

            if (diff < minDiff) {
                minDiff = diff;
                closest = mid;
            }

            if (data[mid].timestamp < timestamp) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return data[closest];
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
