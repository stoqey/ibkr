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