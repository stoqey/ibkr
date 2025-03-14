import isEmpty from 'lodash/isEmpty';
import moment from 'moment';
import differenceBy from 'lodash/differenceBy';
import uniqBy from 'lodash/uniqBy';
import { WhatToShow, SecType, BarSizeSetting, Bar } from '@stoqey/ib';
import { log, delay} from '../utils';
import { MarketData } from '../interfaces';
import MarketDataManager from './MarketDataManager';
import { GetHistoricalData, getSymbolKey } from '../utils/instrument.utils';

/**
 * IBKR Utils 
 * separate from db, and other modules/business logic
 */

const throttleDelay = 500;

export const getHistoricalData = async (opt: GetHistoricalData): Promise<MarketData[]> => {
    const { instrument, startDate, endDate, whatToShow } = opt;
    const saveToDb = opt?.saveToDb;

    const save = async (mkd: MarketData[]): Promise<void> => {
        if (saveToDb) {
            await saveToDb(mkd);
            return;
        }
    };

    if (!endDate) {
        const singleDayMkd = await getSecondsHistoricalDataFromIb(instrument, startDate, whatToShow);
        await save(singleDayMkd);

        return singleDayMkd;
    } else {
        // loop through days
        let dayDate = new Date(startDate);
        let endDateLoop = new Date(endDate);
        let data: MarketData[] = [];
        while (dayDate <= endDateLoop) {
            const dayData = await getSecondsHistoricalDataFromIb(instrument, dayDate, whatToShow);
            if (isEmpty(dayData)) {
                dayDate.setDate(dayDate.getDate() + 1);
                continue;
            }
            await save(dayData);
            data = data.concat(dayData);
            dayDate.setDate(dayDate.getDate() + 1);
        }
        return data;
    }
};


export async function getSecondsHistoricalDataFromIb(
    symbol: string | Object,
    dayDate: Date,
    whatToShow: WhatToShow = WhatToShow.ASK
): Promise<MarketData[]> {

    let fetchedData: MarketData[] = [];
    let prev = null;

    try {

        const marketDataManager = MarketDataManager.Instance;
        let contract: any = symbol;

        if (typeof symbol === 'string') {
            contract = await marketDataManager.getContract({ symbol, secType: SecType.STK, exchange: 'SMART', currency: 'USD' });
        }

        // Default to 8 - 5:30
        let date = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 17, 30, 0); // set date to 5:30 when market closes
        let count = 10; // 10 hours back

        if (contract?.secType === SecType.FUT) {
            // futures e.t.c ...
            date = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 0);
            count = 23; // 23 hours back
        }

        const resolve = (): MarketData[] => {
            if (isEmpty(fetchedData)) {
                return [];
            }
            const sorted = uniqBy(fetchedData, 'date').sort((a: Bar, b: Bar) => {
                if (new Date(a.time) > new Date(b.time)) {
                    return 1;
                }
                return -1;
            });

            return sorted;
        };

        const symbolKey = getSymbolKey(contract);
        for (const x of new Array(count).fill('x')) {
            date = new Date(date.setHours(date.getHours() - 1));
            const endDateTime = moment(date).format('yyyyMMDD-HH:mm:ss');
            log(`ibApi.reqHistoricalData -----> ${symbolKey}`, endDateTime);

            const timeout = 1000 * 50; // 50 seconds

            const timeoutPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve([]);
                }, timeout);
            });

            const marketData = await Promise.race([
                marketDataManager.getHistoricalData(
                    contract,
                    endDateTime,
                    '3600 S',
                    BarSizeSetting.SECONDS_FIVE,
                    whatToShow
                ),
                timeoutPromise
            ]) as MarketData[];

            if (!marketData || marketData?.length === 0) {
                log('ibApi.reqHistoricalData -----> no data fetched', `${symbolKey} ${JSON.stringify(marketData)}`);
                break;
            }

            log('ibApi.reqHistoricalData -----> fetched', `${symbolKey} ${marketData && marketData.length}`);
            fetchedData = [...fetchedData, ...marketData];

            await delay(throttleDelay, count);

            if (prev) {
                const differences = differenceBy(prev, marketData, 'date');
                const duplicates = isEmpty(differences);

                if (duplicates) {
                    log('ibApi.reqHistoricalData -----> duplicates', `${symbolKey} ${marketData && marketData.length}`);
                    count = 0;
                    break;
                }
            }

            prev = marketData; // record prev
            --count; // decrease count
        }

        return resolve();
    } catch (error) {
        log('error getting round trip market data', error);
        return [];
    }
};