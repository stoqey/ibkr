import moment from "moment";
import type { MarketData } from "../interfaces";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function delay(t: number, v: any = "someValue"): Promise<any> {
    return new Promise(function (resolve) {
        setTimeout(resolve.bind(null, v), t);
    });
}

export const formatDateStr = (date: Date) => {
    const d = new Date(date);
    if(!date) {
        return "";
    }
    
    if(d.toString() === "Invalid Date") {
        return "";
    }
    return moment(d).format("YYYY-MM-DD HH:mm:ss");
}


type MarketDataWithCount = MarketData & { count: number };

export const aggregatedMarketDataToMin = (mkd: MarketData[]): MarketData[] => {
    // Aggregate market data by minutes
    const aggregatedData = [...mkd].reduce((acc, data) => {
        const minute = new Date(data.date).setSeconds(0, 0).toString();
        if (!acc[minute]) {
            acc[minute] = { ...data, count: 1 };
        } else {
            acc[minute].close += data.close;
            acc[minute].count += 1;
        }
        return acc;
    }, {});

    return Object.values(aggregatedData).map((data: MarketDataWithCount) => ({
        ...data,
        close: data.close / data.count,
    }));

};