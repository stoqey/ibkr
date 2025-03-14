import type { MarketData, Position, Trade as SSTrade } from "../interfaces";
import { ibkrPositionTossPosition } from "../interfaces";
import { getSymbolKey } from "../utils/instrument.utils";
import { formatDateStr } from "./time.utils";
import { log, warn } from "./log";
import type { Contract } from "@stoqey/ib";
import { Position as IbkrPosition} from "@stoqey/ib"
import { calculatePnl } from "../utils/portfolio.utils";

export const logBar = (title: string = 'MkdMgr.logBar', bar: MarketData, warning = false): void => {
    try {
        const { date, instrument, close, volume } = bar;
        const symbol = getSymbolKey(instrument);
        const msg = `${date ? formatDateStr(date) : ""} ${symbol ? symbol : ""} ${close ? `@${close}` : ""} ${volume ? `vol=${volume}` : ""}`;
        if (warning) {
            return warn(title, msg);
        };
        log(title, msg);
    } catch (error) { }
}

// type AnyOrder = Order;
export const logOrder = (title: string = 'Orders', orderContract: { contract?: Contract, order?: any }, warning = false): void => {
    try {
        const date = new Date();

        const order = orderContract.order;
        const contract = orderContract.contract || order?.instrument;
        if (!order && !contract) return;

        let msg = formatDateStr(date);

        if (contract) {
            const symbol = getSymbolKey(contract);
            msg += `: ${symbol}`;
        };

        if (order) {
            msg += `${order.orderId || order.id ? `id=${(`${order.orderId || order.id || ""}`).slice(0, 4)}` : ""} ${order.action} ${order?.totalQuantity || order.quantity} ${order.auxPrice || order.stopPrice ? `@${order.auxPrice || order.stopPrice}` : ""}, ${order.lmtPrice || order.limitPrice ? `LMT=${order.lmtPrice || order.limitPrice}` : ""} ${order.orderType || order.type} ${order.tif || ""} ${order.outsideRth || order.useRth ? "RTH" : ""}`;
        }

        if (warning) {
            return warn(title, msg);
        };

        log(title, msg);

    } catch (error) { }
}

export const logPosition = (title: string = 'Position', portfolio: IbkrPosition | Position, warning = false): void => {
    try {
        const position = (portfolio as IbkrPosition)?.avgCost? ibkrPositionTossPosition(portfolio as IbkrPosition) : portfolio as Position;
        const date = new Date();

        const contract = position?.instrument;
        if (!position && !contract) return;

        let msg = formatDateStr(date);

        if (contract) {
            const symbol = getSymbolKey(contract);
            msg += `: ${symbol}`;
        };

        if (position) {
            const pnl = calculatePnl([position]);
            msg += `${position.entryDate ? `entry=${formatDateStr(position.entryDate)}` : ""} ${position.action} ${position?.quantity} @${position.price} ${position.lastPrice ? `last=${position.lastPrice}` : ""} ${pnl ? `pnl=${pnl}` : ""}`;
        }

        if (warning) {
            return warn(title, msg);
        };

        log(title, msg);

    } catch (error) { }
}

export const logTrade = (title: string = 'Trade', trade: SSTrade, warning = true): void => {
    try {
        const date = new Date();

        const contract = trade?.instrument;
        if (!trade && !contract) return;

        let msg = formatDateStr(date);

        if (contract) {
            const symbol = getSymbolKey(contract);
            msg += `: ${symbol}`;
        };

        if (trade) {

            const position = {
                price: trade.entryPrice || trade.price,
                lastPrice: trade.price,
                quantity: trade.quantity,
                action: trade.action === "BUY" ? "SELL" : "BUY",
            } as Position;

            const pnl = calculatePnl([position]);
            
            msg += `id=${trade.id ? trade.id.slice(0, 4) : ""} ${trade.date ? `date=${formatDateStr(trade.date)}`: ""} ${trade.action} ${trade.type} ${trade?.quantity} @${trade.price} ${pnl ? `pnl=${pnl}` : ""}`;
        }

        if (warning) {
            return warn(title, msg);
        };

        log(title, msg);

    } catch (error) { }
}