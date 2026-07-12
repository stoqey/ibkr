import moment from 'moment';
import { catchError, lastValueFrom, of, Subscription } from "rxjs";
import IBKRConnection from '../connection/IBKRConnection';
import { IBApiNext, Contract, BarSizeSetting, WhatToShow, ContractDetails, HistoricalTickLast, Bar, MutableMarketData } from '@stoqey/ib';
import { MarketData, TickByTickAllLast } from '../interfaces';
import awaitP from '../utils/awaitP';
import { Instrument } from '../interfaces';
import { log, warn } from '../utils/log';
import { IBKREvents, IBKREVENTS } from "../events";
import Portfolios from '../portfolios/Portfolios';
import isEmpty from 'lodash/isEmpty';
import { formatDateStr } from '../utils/time.utils';
import { getSymbolKey } from '../utils/instrument.utils';
import { formatDec } from '../utils/data.utils';
// import { plotMkdCli } from '../utils/chart';
import sortBy from 'lodash/sortBy';
import { logBar } from '../utils';
import { createAggregator } from '../utils/mkd.utils';
import { MkdManager } from './Mkd';
import { getContractFilterLabel, isContractAllowed } from '../utils/contract-filter.utils';

const appEvents = IBKREvents.Instance;

export interface ContractInstrument extends Contract, ContractDetails {
    contract: Contract;
}

const logsNames = 'MkdMgr';

interface CurrentBarData extends Partial<MarketData> {
    barTime: number;
    barMinute?: number;
    barSecond?: number;
    cumulativeVolume?: number;
}

interface MarketDataItem extends MarketData {
    timestamp?: number;
}

interface HistoricalRawDataResult {
    bars: Bar[] | null;
    contractInstrument: ContractInstrument | null;
}

const parseHistoricalBarDate = (time?: string): Date => {
    const rawTime = time?.trim();
    if (!rawTime) {
        return new Date(Number.NaN);
    }

    if (/^\d{8}$/.test(rawTime)) {
        const parsedDate = moment.utc(rawTime, 'YYYYMMDD', true);

        return parsedDate.isValid() ? parsedDate.toDate() : new Date(Number.NaN);
    }

    const parsedDateTime = moment.utc(rawTime, ['YYYYMMDD HH:mm:ss', 'YYYYMMDD-HH:mm:ss'], true);
    if (parsedDateTime.isValid()) {
        return parsedDateTime.toDate();
    }

    return new Date(Number(rawTime) * 1000);
};

export class MarketDataManager extends MkdManager {
    logsNames = logsNames;
    ib: IBApiNext;

    private GetHistoricalDataUpdates: Map<string, Subscription> = new Map();
    private GetTickByTickDataUpdates: Map<string, Subscription> = new Map();
    private PendingHistoricalDataUpdates: Set<string> = new Set();
    private PendingTickByTickDataUpdates: Set<string> = new Set();

    private currentBarData: Map<string, CurrentBarData> = new Map();
    private currentTickBarData: Map<string, CurrentBarData> = new Map();


    private static _instance: MarketDataManager;

    public static get Instance(): MarketDataManager {
        return this._instance || (this._instance = new this());
    }

    removeHistoricalDataUpdates = (contract: Contract): void => {
        const symbolId = this.getSymbolKey(contract);
        const subscription = this.GetHistoricalDataUpdates.get(symbolId);
        if (subscription) {
            subscription.unsubscribe();
            this.GetHistoricalDataUpdates.delete(symbolId);
        }
        this.PendingHistoricalDataUpdates.delete(symbolId);
        this.currentBarData.delete(symbolId);
    };


    getHistoricalDataUpdates = async (contract: Contract, barSizeSetting: BarSizeSetting, whatToShow: WhatToShow): Promise<void> => {
        try {

            const portfoliosManager = Portfolios.Instance;

            if (!contract.conId || !contract.exchange) {
                contract = await this.getContract(contract as Contract);
            }
            const symbolId = this.getSymbolKey(contract);
            if (!isContractAllowed(contract, "marketdata")) {
                warn(`${logsNames}.getHistoricalDataUpdates`, `Contract ${symbolId} filtered by IBKR contract filter=${getContractFilterLabel("marketdata")}`);
                return;
            }

            const existingHistoricalSubscription = this.GetHistoricalDataUpdates.get(symbolId);
            if (existingHistoricalSubscription && !existingHistoricalSubscription.closed) {
                warn(`${logsNames}.getHistoricalDataUpdates`, `Already subscribed to ${symbolId}`);
                return;
            }
            if (existingHistoricalSubscription?.closed) {
                this.GetHistoricalDataUpdates.delete(symbolId);
            }
            if (this.PendingHistoricalDataUpdates.has(symbolId)) {
                warn(`${logsNames}.getHistoricalDataUpdates`, `Subscription already pending for ${symbolId}`);
                return;
            }
            this.PendingHistoricalDataUpdates.add(symbolId);

            const getMarketDataLast30Minutes = async () => {
                log(`${logsNames}.getHistoricalDataUpdates.getMarketDataLast30Minutes`, `${symbolId}`);
                const endDateTime = moment().format('YYYYMMDD HH:mm:ss');
                const durationStr = '3600 S';
                const barSizeSetting5Sec = '5 secs';
                const [historicalData] = await awaitP(this.getHistoricalData(contract, endDateTime, durationStr, barSizeSetting5Sec as BarSizeSetting, whatToShow));

                if (!isEmpty(historicalData)) {
                    const first = historicalData && historicalData[0];
                    const last = (historicalData || [])[historicalData.length - 1];

                    // plotMkdCli(historicalData);

                    log(`${logsNames}.getHistoricalDataUpdates.getMarketDataLast30Minutes.length`, `${historicalData?.length} data points for ${symbolId} from ${formatDateStr(first?.date)} to ${formatDateStr(last?.date)} @${formatDec(first?.close)} -> @${formatDec(last?.close)} whatToShow=${whatToShow}`);
                    historicalData.forEach((marketDataItem) => {
                        this.cacheBar(marketDataItem);
                    });
                    const lastMarketData = historicalData[historicalData.length - 1];
                    if (lastMarketData) {
                        portfoliosManager.updateMarketPrice(contract.conId, lastMarketData.close);
                    }
                }
            }

            await getMarketDataLast30Minutes();

            log(`${logsNames}.getHistoricalDataUpdates`, `Subscribing to ${symbolId}`);
            const subscription = IBKRConnection.Instance.ib.getHistoricalDataUpdates(contract, barSizeSetting, whatToShow, 2)
                .pipe(
                    catchError((error) => {
                        warn(`${logsNames}.getHistoricalDataUpdates`, `Error subscribing to ${symbolId}`, error);
                        this.GetHistoricalDataUpdates.delete(symbolId);
                        this.currentBarData.delete(symbolId);
                        return of(null);
                    })
                )
                .subscribe((bar) => {
                    if (!bar) return;
                    const currentTime = new Date(); // Use current time for consistent bar-to-bar timing
                    const barTime = +bar.time * 1000; // IBKR's bar timestamp
                    const barMinute = new Date(currentTime).setSeconds(0, 0); // use current time since bigger intervals send same timestamp for each bar
                    const prevBarData = this.currentBarData.get(symbolId);

                    let incrementalVolume = bar.volume;

                    if (prevBarData && prevBarData?.barMinute === barMinute) {
                        incrementalVolume = Math.max(0, bar.volume - prevBarData.cumulativeVolume);
                    }

                    this.currentBarData.set(symbolId, {
                        barTime: barTime,
                        cumulativeVolume: bar.volume,
                        barMinute
                    });

                    const marketDataItem: MarketData = {
                        instrument: contract as Instrument,
                        date: currentTime, // Use current time instead of bar.time
                        open: bar.open,
                        high: bar.high,
                        low: bar.low,
                        close: bar.close,
                        volume: incrementalVolume, // Use incremental volume
                        wap: bar.WAP,
                        vwap: bar.WAP,
                        count: bar?.count,
                    };

                    this.cacheBar(marketDataItem);


                    if (bar?.close) {
                        portfoliosManager.updateMarketPrice(contract.conId, bar.close);
                    }

                    appEvents.emit(IBKREVENTS.IBKR_BAR, marketDataItem);

                    const volumeStr = incrementalVolume > 0 ? `vol=${incrementalVolume}` : '';
                    const cumulativeStr = bar.volume !== incrementalVolume ? `cumVol=${bar.volume}` : '';
                    const isNewBar = !prevBarData || prevBarData.barMinute !== barMinute;
                    const barStatus = isNewBar ? '[NEW]' : '[UPD]';
                    log(`${logsNames}.HDU`, `bar for ${symbolId} at ${formatDateStr(currentTime)} @${bar.close} ${volumeStr} ${cumulativeStr} ${barStatus}`.trim());
                });
            if (!subscription.closed) {
                this.GetHistoricalDataUpdates.set(symbolId, subscription);
            }
            this.PendingHistoricalDataUpdates.delete(symbolId);

        } catch (e) {
            if (contract) {
                try {
                    this.PendingHistoricalDataUpdates.delete(this.getSymbolKey(contract));
                } catch {
                }
            }
            warn("getHistoricalDataUpdates error", e);
            return;
        }
    }


    private getHistoricalDataRawWithContract = async (contract: Contract, endDateTime: string | undefined, durationStr: string, barSizeSetting: BarSizeSetting, whatToShow: WhatToShow, useRTH = false): Promise<HistoricalRawDataResult> => {
        const [contractInstrument, errContract] = await awaitP(this.getContract(contract));
        if (errContract) {
            warn("getHistoricalData contract err", errContract);
            return { bars: null, contractInstrument: null };
        }
        if (!contractInstrument) {
            warn("getHistoricalData contract not found", contract);
            return { bars: null, contractInstrument: null };
        }

        const symbol = this.getSymbolKey(contractInstrument);
        if (!isContractAllowed(contractInstrument, "marketdata")) {
            warn(`${logsNames}.getHistoricalDataRaw`, `Contract ${symbol} filtered by IBKR contract filter=${getContractFilterLabel("marketdata")}`);
            return { bars: null, contractInstrument };
        }

        const [bars, err] = await awaitP(IBKRConnection.Instance.ib.getHistoricalData(contractInstrument, endDateTime, durationStr, barSizeSetting, whatToShow, useRTH, 2));
        if (err) {
            warn(`getHistoricalDataRaw err ${symbol}`, err);
        }

        return { bars: bars ?? null, contractInstrument };
    };

    getHistoricalDataRaw = async (contract: Contract, endDateTime: string | undefined, durationStr: string, barSizeSetting: BarSizeSetting, whatToShow: WhatToShow, useRTH = false): Promise<Bar[]> => {
        const { bars } = await this.getHistoricalDataRawWithContract(contract, endDateTime, durationStr, barSizeSetting, whatToShow, useRTH);

        return bars;
    };

    getHistoricalData = async (contract: Contract, endDateTime: string | undefined, durationStr: string, barSizeSetting: BarSizeSetting, whatToShow: WhatToShow, useRTH = false): Promise<MarketData[]> => {
        const { bars, contractInstrument } = await this.getHistoricalDataRawWithContract(contract, endDateTime, durationStr, barSizeSetting, whatToShow, useRTH);
        if (bars && bars.length > 0) {
            const mkd = bars.map(bar => {
                const date = parseHistoricalBarDate(bar.time);
                const marketDataItem: MarketData = {
                    instrument: contractInstrument?.contract as Instrument,
                    date,
                    open: bar.open,
                    high: bar.high,
                    low: bar.low,
                    close: bar.close,
                    volume: bar.volume,
                    wap: bar.WAP,
                    vwap: bar.WAP, // same as wap
                    count: bar?.count,
                };
                return marketDataItem;
            });

            return sortBy(mkd, 'date');
        }
        return null;
    };

    getHistoricalTicksLast = async (contract: Contract, startDate: Date | string, endDate?: Date | string, numberOfTicks = 1000, useRTH = false): Promise<TickByTickAllLast[]> => {
        if (!startDate) {
            warn("getHistoricalTicksLast startDate not set");
            return null;
        }

        if (endDate && startDate > endDate) {
            warn("getHistoricalTicksLast startDate cannot be great than endDate");
            return null;
        }

        const startDateTime = typeof startDate === 'string' ? startDate : moment(startDate).format('YYYYMMDD HH:mm:ss');
        const endDateTime = typeof endDate === 'string' ? endDate : moment(endDate).format('YYYYMMDD HH:mm:ss');

        const [contractInstrument, errContract] = await awaitP(this.getContract(contract));
        if (errContract) {
            warn("getHistoricalTicksLast contract err", errContract);
            return null;
        }
        if (!contractInstrument) {
            warn("getHistoricalTicksLast contract not found", contract);
            return null;
        }

        const symbol = this.getSymbolKey(contractInstrument);
        if (!isContractAllowed(contractInstrument, "marketdata")) {
            warn(`${logsNames}.getHistoricalTicksLast`, `Contract ${symbol} filtered by IBKR contract filter=${getContractFilterLabel("marketdata")}`);
            return null;
        }

        const [ticks, err] = await awaitP(lastValueFrom(
            IBKRConnection.Instance.ib.getHistoricalTicksLast(
                contractInstrument,
                startDateTime,
                endDateTime,
                numberOfTicks,
                useRTH
            )
        ));

        if (ticks && ticks.length > 0) {
            const mkd = ticks.map(bar => {
                const date = new Date(+bar.time * 1000);
                const tickDataItem: TickByTickAllLast = {
                    contract: contractInstrument?.contract as Contract,
                    date,
                    price: bar.price,
                    size: bar.size,
                    exchange: bar.exchange,
                    specialConditions: bar.specialConditions,
                };
                return tickDataItem;
            });

            return sortBy(mkd, 'date');
        }
        if (err) {
            warn(`getHistoricalTicksLast err ${symbol}`, err);
        }
        return null;
    };

    getTickByTickDataUpdates = async (contract: Contract): Promise<void> => {
        try {
            const portfoliosManager = Portfolios.Instance;

            if (!contract.conId || !contract.exchange) {
                const contractInstrument = (await this.getContract(contract as Contract));
                if (!contractInstrument) {
                    warn(`${logsNames}.getTickByTickDataUpdates`, `Contract not found ${contract}`);
                    return;
                }
                contract = contractInstrument.contract;
            }
            const symbolId = getSymbolKey(contract);
            if (!isContractAllowed(contract, "marketdata")) {
                warn(`${logsNames}.getTickByTickDataUpdates`, `Contract ${symbolId} filtered by IBKR contract filter=${getContractFilterLabel("marketdata")}`);
                return;
            }

            const existingTickSubscription = this.GetTickByTickDataUpdates.get(symbolId);
            if (existingTickSubscription && !existingTickSubscription.closed) {
                warn(`${logsNames}.getTickByTickDataUpdates`, `Already subscribed to ${symbolId}`);
                return;
            }
            if (existingTickSubscription?.closed) {
                this.GetTickByTickDataUpdates.delete(symbolId);
            }
            if (this.PendingTickByTickDataUpdates.has(symbolId)) {
                warn(`${logsNames}.getTickByTickDataUpdates`, `Subscription already pending for ${symbolId}`);
                return;
            }
            this.PendingTickByTickDataUpdates.add(symbolId);

            const getMarketDataLast30Minutes = async () => {
                log(`${logsNames}.getTickByTickDataUpdates.getMarketDataLast30Minutes`, `${symbolId}`);
                const endDateTime = moment().format('YYYYMMDD HH:mm:ss');
                const durationStr = '3600 S';
                const barSizeSetting5Sec = '5 secs';
                const [historicalData] = await awaitP(this.getHistoricalData(contract, endDateTime, durationStr, barSizeSetting5Sec as BarSizeSetting, WhatToShow.TRADES));

                if (!isEmpty(historicalData)) {
                    const first = historicalData && historicalData[0];
                    const last = (historicalData || [])[historicalData.length - 1];

                    // plotMkdCli(historicalData);

                    log(`${logsNames}.getTickByTickDataUpdates.getMarketDataLast30Minutes.length`, `${historicalData?.length} data points for ${symbolId} from ${formatDateStr(first?.date)} to ${formatDateStr(last?.date)} @${formatDec(first?.close)} -> @${formatDec(last?.close)} whatToShow=TRADES`);

                    historicalData.forEach((marketDataItem) => {
                        this.cacheBar(marketDataItem);
                    });
                    const lastMarketData = historicalData[historicalData.length - 1];
                    if (lastMarketData) {
                        portfoliosManager.updateMarketPrice(contract.conId, lastMarketData.close);
                    }
                }
            }

            await getMarketDataLast30Minutes();

            log(`${logsNames}.getTickByTickDataUpdates`, `Subscribing to ${symbolId}`);
            const subscription = this.ib.getTickByTickAllLastDataUpdates(contract, 0, false)
                .pipe(
                    catchError((error) => {
                        warn(`${logsNames}.getTickByTickDataUpdates`, `Error subscribing to ${symbolId}`, error);
                        this.GetTickByTickDataUpdates.delete(symbolId);
                        this.currentTickBarData.delete(symbolId);
                        return of(null);
                    })
                )
                .subscribe((tick) => {
                    if (!tick) return;
                    const tickData: TickByTickAllLast = {
                        contract,
                        date: new Date(+tick.time * 1000),
                        price: tick.price,
                        size: tick.size,
                        exchange: tick.exchange,
                        specialConditions: tick.specialConditions,
                    }
                    this.onTickByTickDataUpdates(tickData);
                    // log(`${logsNames}.TDU`, `tick for ${symbolId} at ${formatDateStr(new Date(tickData.date))} @${tickData.price} size=${tickData.size}  ${tickData.exchange ? `exchange=${tickData.exchange}` : ''} ${tickData.specialConditions ? `specialConditions=${tickData.specialConditions}` : ''}`);
                });
            if (!subscription.closed) {
                this.GetTickByTickDataUpdates.set(symbolId, subscription);
            }
            this.PendingTickByTickDataUpdates.delete(symbolId);

            log(`${logsNames}.getTickByTickDataUpdates`, `Subscribed to ${symbolId}`);


        } catch (e) {
            if (contract) {
                try {
                    this.PendingTickByTickDataUpdates.delete(getSymbolKey(contract));
                } catch {
                }
            }
            warn("getTickByTickDataUpdates error", e);
            return;
        }
    }

    private onTickByTickDataUpdates = (tick: TickByTickAllLast) => {
        if (!isContractAllowed(tick?.contract, "marketdata")) {
            return;
        }

        const symbolKey = getSymbolKey(tick.contract);
        const tickDate = tick.date;
        const tickSecond = new Date(tickDate.setMilliseconds(0));
        const currentBarData = this.currentTickBarData.get(symbolKey);

        // If we have existing data for this symbol
        if (currentBarData) {
            if (currentBarData.barSecond === tickSecond.getTime()) {
                // SAME SECOND: Update the existing bar
                currentBarData.close = tick.price;
                currentBarData.volume += (tick.size || 0);
                currentBarData.count++;
                currentBarData.high = Math.max(currentBarData.high, tick.price);
                currentBarData.low = Math.min(currentBarData.low, tick.price);

                this.currentTickBarData.set(symbolKey, currentBarData);

            } else {
                // NEW SECOND: Send completed bar, start fresh
                this.cacheBar(currentBarData as MarketData); // saves it just like the historical data updates
                appEvents.emit(IBKREVENTS.IBKR_BAR, currentBarData);
                logBar(`${logsNames}.TDU`, currentBarData as MarketData);

                // Create new bar for this tick
                const newBar: CurrentBarData = {
                    instrument: tick.contract as Instrument,
                    date: tickDate,
                    barTime: tickDate.getTime(),
                    barSecond: tickSecond.getTime(),
                    count: 1,
                    open: tick.price,
                    high: tick.price,
                    low: tick.price,
                    close: tick.price,
                    volume: tick.size
                };

                this.currentTickBarData.set(symbolKey, newBar);
            }
        } else {
            // FIRST TICK: Create initial bar
            const newBar: CurrentBarData = {
                instrument: tick.contract as Instrument,
                date: tickDate,
                barTime: tickDate.getTime(),
                barSecond: tickSecond.getTime(),
                count: 1,
                open: tick.price,
                high: tick.price,
                low: tick.price,
                close: tick.price,
                volume: tick.size
            };

            this.currentTickBarData.set(symbolKey, newBar);
        }

        if (tick?.price) {
            Portfolios.Instance.updateMarketPrice(tick.contract.conId, tick.price);
        }
    }

    removeTickByTickDataUpdates = (contract: Contract): void => {
        const symbolId = this.getSymbolKey(contract);
        const subscription = this.GetTickByTickDataUpdates.get(symbolId);
        if (subscription) {
            subscription.unsubscribe();
            this.GetTickByTickDataUpdates.delete(symbolId);
        }
        this.PendingTickByTickDataUpdates.delete(symbolId);
        this.currentTickBarData.delete(symbolId);
    };

    getMarketDataSnapshot = async (contract: Partial<Contract>, genericTickList = '', regulatorySnapshot = false): Promise<MutableMarketData> => {
        const contractInstrument = await this.getContract(contract);
        if (!contractInstrument?.contract) {
            throw new Error(`Unable to resolve contract for market data snapshot: ${JSON.stringify(contract || {})}`);
        }

        return this.ib.getMarketDataSnapshot(contractInstrument.contract, genericTickList, regulatorySnapshot);
    }

    getContract = async (contract: Partial<Contract | any>): Promise<ContractInstrument> => {
        if ((contract as ContractInstrument)?.contract) {
            return contract as ContractInstrument;
        };

        const [contracts, err] = await awaitP(this.ib.getContractDetails(contract));
        if (contracts && contracts.length > 0) {
            const firstContract = contracts[0];
            return {
                ...firstContract,
                ...firstContract.contract
            };
        }
        if (err) {
            warn(`getContract err ${JSON.stringify(contract || {})}`, err);
        }
        return null;
    }

    searchContracts = async (contract: Partial<Contract>): Promise<ContractInstrument[]> => {

        const [contracts, err] = await awaitP(this.ib.getContractDetails(contract));

        if (contracts && contracts.length > 0) {
            return contracts.map(c => {
                return {
                    ...c,
                    ...c.contract
                };
            });
        }

        if (err) {
            warn(`getContract err ${JSON.stringify(contract || {})}`, err);
        }
        return [];
    }

    init = () => {
        this.ib = IBKRConnection.Instance.ib;

        // ib.getHistoricalData // async
        // ib.getHistoricalDataUpdates() // subscribe
    }

    private constructor() {
        super();
    }

}

export default MarketDataManager;
