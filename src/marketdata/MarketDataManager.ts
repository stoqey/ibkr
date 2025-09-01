import moment from 'moment';
import { lastValueFrom, Subscription } from "rxjs";
import IBKRConnection from '../connection/IBKRConnection';
import { IBApiNext, Contract, BarSizeSetting, WhatToShow, ContractDetails, HistoricalTickLast } from '@stoqey/ib';
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
import { plotMkdCli } from '../utils/chart';
import sortBy from 'lodash/sortBy';

const appEvents = IBKREvents.Instance;

export interface ContractInstrument extends Contract, ContractDetails {
    contract: Contract;
}

const logsNames = 'MkdMgr';

export class MarketDataManager {
    ib: IBApiNext;

    marketData: Record<string, { [date: string]: MarketData }> = {};

    private GetHistoricalDataUpdates: Map<string, Subscription> = new Map();


    private previousBarData: Map<string, { barTime: number, barMinute: number, cumulativeVolume: number }> = new Map();


    private static _instance: MarketDataManager;

    public static get Instance(): MarketDataManager {
        return this._instance || (this._instance = new this());
    }

    public getSymbolKey = (contract: Contract): string => {
        return getSymbolKey(contract);
    }

    // TODO api data
    historicalData = async (contract: Contract, startDate: Date, endDate: Date, interval: string): Promise<MarketData[]> => {
        // throw new Error("Method not implemented.");
        // i have the data as this.marketData: Record<string, { [date: string]: MarketData }> = {};
        // convert to array using key as the date, then filter by start and end date

        if (!contract) {
            log("instrument not found", contract);
            return [];
        }

        const symbol = this.getSymbolKey(contract);
        // Retrieve the market data for the given instrument
        const instrumentData = this.marketData[symbol];
        if (!instrumentData) {
            log("instrument data not found", symbol);
            return [];
        }

        // Convert the market data to an array using the date as the key
        const dataArray: MarketData[] = Object.keys(instrumentData).filter(date => {
            const dataDate = new Date(date);
            return dataDate >= new Date(startDate) && dataDate <= new Date(endDate);
        }).map(date => instrumentData[date]);

        // Filter the data by the provided start and end dates
        const filteredData = dataArray.filter(data => {
            const dataDate = new Date(data.date);
            return dataDate >= new Date(startDate) && dataDate <= new Date(endDate);
        });

        const first = filteredData && filteredData[0];
        const last = (filteredData || [])[filteredData?.length - 1];

        plotMkdCli(filteredData);

        log(`${logsNames}.historicalData`, `${filteredData.length} data points for ${symbol} from ${formatDateStr(first.date)} to ${formatDateStr(last.date)} @${formatDec(first.close)} -> @${formatDec(last.close)}`);

        return filteredData;
    }

    // TODO api data
    getQuote = async (contract: Contract, date: Date): Promise<MarketData> => {
        try {
            const symbol = this.getSymbolKey(contract);
            return this.marketData[symbol] ? this.marketData[symbol][date.toISOString()] : null;
        }
        catch (e) {
            log(`error getting quote ${JSON.stringify(contract || {})}`, e);
            return null;
        }
    }

    removeHistoricalDataUpdates = (contract: Contract): void => {
        const symbolId = this.getSymbolKey(contract);
        const subscription = this.GetHistoricalDataUpdates.get(symbolId);
        if (subscription) {
            subscription.unsubscribe();
            this.GetHistoricalDataUpdates.delete(symbolId);
        }
        this.previousBarData.delete(symbolId);
    };


    getHistoricalDataUpdates = async (contract: Contract, barSizeSetting: BarSizeSetting, whatToShow: WhatToShow): Promise<void> => {
        try {

            const portfoliosManager = Portfolios.Instance;

            if (!contract.conId || !contract.exchange) {
                contract = await this.getContract(contract as Contract);
            }
            const symbolId = this.getSymbolKey(contract);

            if (this.GetHistoricalDataUpdates.has(symbolId)) {
                warn(`${logsNames}.getHistoricalDataUpdates`, `Already subscribed to ${symbolId}`);
                return;
            }

            const getMarketDataLast30Minutes = async () => {
                log(`${logsNames}.getHistoricalDataUpdates.getMarketDataLast30Minutes`, `${symbolId}`);
                const endDateTime = moment().format('YYYYMMDD HH:mm:ss');
                const durationStr = '3600 S';
                const barSizeSetting5Sec = '5 secs';
                const [historicalData] = await awaitP(this.getHistoricalData(contract, endDateTime, durationStr, barSizeSetting5Sec as BarSizeSetting, whatToShow));

                if (!isEmpty(historicalData)) {
                    const first = historicalData && historicalData[0];
                    const last = (historicalData || [])[historicalData.length - 1];

                    plotMkdCli(historicalData);

                    log(`${logsNames}.getHistoricalDataUpdates.getMarketDataLast30Minutes.length`, `${historicalData?.length} data points for ${symbolId} from ${formatDateStr(first?.date)} to ${formatDateStr(last?.date)} @${formatDec(first?.close)} -> @${formatDec(last?.close)} whatToShow=${whatToShow}`);

                    if (!this.marketData[symbolId]) {
                        this.marketData[symbolId] = {};
                    }
                    historicalData.forEach((marketDataItem) => {
                        const dateIso = marketDataItem.date.toISOString();
                        this.marketData[symbolId] = {
                            ...this.marketData[symbolId],
                            [dateIso]: marketDataItem
                        };
                    });
                    const lastMarketData = historicalData[historicalData.length - 1];
                    if (lastMarketData) {
                        portfoliosManager.updateMarketPrice(contract.conId, lastMarketData.close);
                    }
                }
            }

            await getMarketDataLast30Minutes();

            log(`${logsNames}.getHistoricalDataUpdates`, `Subscribing to ${symbolId}`);
            this.GetHistoricalDataUpdates.set(symbolId, IBKRConnection.Instance.ib.getHistoricalDataUpdates(contract, barSizeSetting, whatToShow, 2)
                .subscribe((bar) => {
                    const currentTime = new Date(); // Use current time for consistent bar-to-bar timing
                    const barTime = +bar.time * 1000; // IBKR's bar timestamp
                    const barMinute = new Date(currentTime).setSeconds(0, 0); // use current time since bigger intervals send same timestamp for each bar
                    const prevBarData = this.previousBarData.get(symbolId);

                    let incrementalVolume = bar.volume;

                    if (prevBarData && prevBarData?.barMinute === barMinute) {
                        incrementalVolume = Math.max(0, bar.volume - prevBarData.cumulativeVolume);
                    }

                    this.previousBarData.set(symbolId, {
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

                    const currentTimeIso = currentTime.toISOString();

                    if (!this.marketData[symbolId]) {
                        this.marketData[symbolId] = {};
                    }

                    this.marketData[symbolId] = {
                        ...this.marketData[symbolId],
                        [currentTimeIso]: marketDataItem
                    };

                    if (bar?.close) {
                        portfoliosManager.updateMarketPrice(contract.conId, bar.close);
                    }

                    appEvents.emit(IBKREVENTS.IBKR_BAR, marketDataItem);

                    const volumeStr = incrementalVolume > 0 ? `vol=${incrementalVolume}` : '';
                    const cumulativeStr = bar.volume !== incrementalVolume ? `cumVol=${bar.volume}` : '';
                    const isNewBar = !prevBarData || prevBarData.barMinute !== barMinute;
                    const barStatus = isNewBar ? '[NEW]' : '[UPD]';
                    log(`${logsNames}.HDU`, `bar for ${symbolId} at ${formatDateStr(currentTime)} @${bar.close} ${volumeStr} ${cumulativeStr} ${barStatus}`.trim());
                }));

        } catch (e) {
            warn("getHistoricalDataUpdates error", e);
            return;
        }
    }


    getHistoricalData = async (contract: Contract, endDateTime: string | undefined, durationStr: string, barSizeSetting: BarSizeSetting, whatToShow: WhatToShow, useRTH = false): Promise<MarketData[]> => {
        const [contractInstrument, errContract] = await awaitP(this.getContract(contract));
        if (errContract) {
            warn("getHistoricalData contract err", errContract);
            return null;
        }
        if (!contractInstrument) {
            warn("getHistoricalData contract not found", contract);
            return null;
        }

        const symbol = this.getSymbolKey(contractInstrument);
        const [bars, err] = await awaitP(IBKRConnection.Instance.ib.getHistoricalData(contractInstrument, endDateTime, durationStr, barSizeSetting, whatToShow, useRTH, 2));
        if (bars && bars.length > 0) {
            const mkd = bars.map(bar => {
                const date = new Date(+bar.time * 1000);
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
        if (err) {
            warn(`getHistoricalData err ${symbol}`, err);
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
        const ib = IBKRConnection.Instance.ib;

        if (!this.ib) {
            this.ib = ib;

            // ib.getHistoricalData // async
            // ib.getHistoricalDataUpdates() // subscribe
        }
    }

    private constructor() {
    }

}

export default MarketDataManager;