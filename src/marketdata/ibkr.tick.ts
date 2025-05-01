import MarketDataManager from "./MarketDataManager";
import { delay, formatDateStr } from "../utils/time.utils";
import { log } from "../utils/log";
import { TickByTickAllLast } from "../interfaces";
import isEmpty from 'lodash/isEmpty';
import groupBy from 'lodash/groupBy';
import meanBy from 'lodash/meanBy';
import sumBy from 'lodash/sumBy';
import { Contract, WhatToShow } from "@stoqey/ib";
import { GetHistoricalData } from "../utils/instrument.utils";
import { verbose } from "../utils";
import { Instrument } from "../interfaces";

export interface GetHistoricalDataTicks {
    instrument: Instrument | Contract;
    startDate: Date;
    endDate?: Date;
    whatToShow?: WhatToShow;

    // options
    saveToDb?: (mkd: TickByTickAllLast[]) => Promise<void>;
    calculate?: boolean;
};

export const aggregateTicksBySeconds = (ticks: TickByTickAllLast[]): TickByTickAllLast[] => {
    const marketData: TickByTickAllLast[] = [];

    const groupedByHours = groupBy(ticks, (tick) => {
        const date = new Date(tick.date);
        return date.getHours();
    });

    for (const [_, valueHours] of Object.entries(groupedByHours)) {
        const groupedByMinutes = groupBy(valueHours, (tick) => {
            const date = new Date(tick.date);
            return date.getMinutes();
        });

        for (const [_, valueMinutes] of Object.entries(groupedByMinutes)) {
            const groupedBySeconds = groupBy(valueMinutes, (tick) => { 
                const date = new Date(tick.date);
                return date.getSeconds();
            });

            for (const [_, valueSeconds] of Object.entries(groupedBySeconds)) {
                const date = new Date(valueSeconds[0].date);
                const price = meanBy(valueSeconds, 'price');
                const size = sumBy(valueSeconds, 'size');
                marketData.push({ date, price, size, contract: valueSeconds[0].contract } as TickByTickAllLast);
            }
        }
    }

    return marketData;
};

export const getHistoricalDataTicks = async (opt: GetHistoricalDataTicks): Promise<TickByTickAllLast[]> => {
    const { instrument, startDate, endDate } = opt;
    // TODO: add whatToShow
    const saveToDb = opt?.saveToDb;

    const save = async (mkd: TickByTickAllLast[]): Promise<void> => {
        verbose("save mkd", mkd.length);
        verbose("save mkd first", formatDateStr(mkd[0].date));
        verbose("save mkd last", formatDateStr(mkd[mkd.length - 1].date));

        if (saveToDb) {
            await saveToDb(mkd);
            return;
        }
    };

    let dayDate = new Date(startDate);
    let endDateLoop = new Date(endDate);
    log("startDate", formatDateStr(startDate));
    log("endDate", formatDateStr(endDate));
    log("--------------------------------")
    let data: TickByTickAllLast[] = [];
    while (dayDate <= endDateLoop) {
        dayDate = new Date(new Date(dayDate).setMinutes(0, 0, 0));
        const dayEndDate = new Date(new Date(dayDate).setMinutes(59, 59, 59));
        log("dayDate", formatDateStr(dayDate));
        log("dayEndDate", formatDateStr(dayEndDate));
        const dayData = await getSecondsHourlyHistoricalDataTicks({ instrument: instrument as any, startDate: dayDate, endDate: dayEndDate });
        if (isEmpty(dayData)) {
            dayDate.setHours(dayDate.getHours() + 1);
            continue;
        }
        await save(dayData);
        data = data.concat(dayData);
        dayDate.setHours(dayDate.getHours() + 1);
    }
    return data;

};

export const getSecondsHourlyHistoricalDataTicks = async (opt: GetHistoricalData): Promise<TickByTickAllLast[]> => {
    const { instrument, startDate, endDate } = opt;
    const marketDataManager = MarketDataManager.Instance;

    let hourDate = new Date(startDate);
    let endDateLoop = new Date(endDate);
    let data: TickByTickAllLast[] = [];

    const isSameDatesByHoursMinutesSeconds = (date1: Date, date2: Date) => {
        return date1?.getHours() === date2?.getHours() && date1?.getMinutes() === date2?.getMinutes() && date1?.getSeconds() === date2?.getSeconds();
    };

    while (hourDate <= endDateLoop) {
        await delay(500);

        const currentDataUnfiltered = await marketDataManager.getHistoricalTicksLast(instrument as Contract, hourDate, endDate, 1000, false);
        log("hourDate", `${formatDateStr(hourDate)} -> ${formatDateStr(endDate)} = ${currentDataUnfiltered.length}`);

        const currentData = currentDataUnfiltered.filter(tick => tick.date.getHours() === endDateLoop.getHours());
        // log("hourDate after filter", currentData.length);
        // log("hourDate first", formatDateStr(currentData[0] && currentData[0].date));
        // log("hourDate last", formatDateStr(currentData[currentData.length - 1] && currentData[currentData.length - 1].date));
        data = data.concat(currentData);

        let lastDate = currentData[currentData.length - 1] && currentData[currentData.length - 1].date;

        if (isSameDatesByHoursMinutesSeconds(lastDate, endDateLoop)) {
            log("lastDate >= endDateLoop", formatDateStr(lastDate), formatDateStr(endDateLoop));
            break;
        };

        if (currentDataUnfiltered.some(tick => tick.date.getHours() !== endDateLoop.getHours())) {
            log("hourDate has ticks from other hours", currentDataUnfiltered.length);
            lastDate = currentDataUnfiltered[currentDataUnfiltered.length - 1] && currentDataUnfiltered[currentDataUnfiltered.length - 1].date;
            hourDate = new Date(lastDate);
            continue;
        };

        if (isEmpty(currentData) || currentData?.length === 1) {
            log("hourDate has no ticks", currentDataUnfiltered.length);
            lastDate = currentDataUnfiltered[currentDataUnfiltered.length - 1] && currentDataUnfiltered[currentDataUnfiltered.length - 1].date;
            hourDate = new Date(lastDate);
            break;
        }
        hourDate = new Date(lastDate);
    }
    const aggregatedData = aggregateTicksBySeconds(data);
    log("--------------------------------", aggregatedData.length);
    return aggregatedData;
};