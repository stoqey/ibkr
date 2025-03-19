import { Contract, Position as IbkrPosition } from "@stoqey/ib";
import { getSymbolKey } from "./utils/instrument.utils";

export interface Instrument {
    symbol: string,
    exchange: string,
    type?: string,
    secType?: string,
    lastTradeDate?: string,
    lastTradeDateOrContractMonth?: string,

    // other fields
}

export interface TickByTickAllLast {
    date: Date;
    price: number;
    size: number;
    exchange: string;
    specialConditions: string;
    contract: Contract;
};

export interface MarketData {
    instrument?: Instrument;
    open?: number;
    high?: number;
    low?: number;
    close: number;
    volume?: number;

    date: Date;
    bid?: number;
    ask?: number;

    wap?: number;
    vwap?: number;

    count?: number;
};


export enum OrderAction {
    BUY = 'BUY',
    SELL = 'SELL',
}

export enum OrderType {
    MARKET = 'MARKET',
    LIMIT = 'LIMIT',
    STOP = 'STOP',
    STOP_LIMIT = 'STOP_LIMIT',
}

export interface Position {
    id?: string,
    instrument: Instrument,
    price: number,
    lastPrice?: number,
    quantity: number,
    action: OrderAction,
    entryDate?: Date,
}

export interface Order {
    id: string,
    instrument?: Instrument,
    quantity: number,
    action: OrderAction,
    type: OrderType,
    limitPrice?: number,
    stopPrice?: number,
    status?: string,
    filled?: number,
    remaining?: number,
    avgFillPrice?: number,
    commission?: number,
    commissionCurrency?: string,
    ocaGroup?: string,
    useRth?: boolean,
    tif?: string,
    date?: Date,
}

export interface Trade {
    id: string,
    instrument?: Instrument,
    entryPrice: number,
    price: number,
    quantity: number,
    action: OrderAction,
    type: OrderType,
    date: Date,
}

export const ibkrPositionTossPosition = (position: IbkrPosition): Position => {
    const contract = position.contract;
    const symbol = getSymbolKey(contract);
    const newPosition: Position = {
        id: symbol,
        instrument: contract as Instrument,
        action: position.pos > 0 ? OrderAction.BUY : OrderAction.SELL,
        quantity: Math.abs(position.pos),
        price: position.avgCost,
        lastPrice: position.marketPrice,
        // TODO date, entryDate
    };
    return newPosition;
}