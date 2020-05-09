import 'mocha';
import { expect } from 'chai';
import { OrderTrade } from './OrderTrade';
import { onConnected } from '../connection/connection.utilities';
import { OrderStock } from './orders.interfaces';
import { IbkrEvents, IBKREVENTS } from '../events';

const ibkrEvents = IbkrEvents.Instance;

const fsPromises = require('fs').promises

const orderTrade = OrderTrade.Instance;
let demoSymbolData;

const symbol = "PECK";
const orderParams = [2, "9999"]

const stockOrderBuyIn: OrderStock = {
    symbol: symbol,
    action: "BUY",
    type: "market",
    parameters: orderParams, // 'SELL', 1, 9999,
    size: 3,
    capital: 1000,
    exitTrade: false
}

const stockOrderBuyOut: OrderStock = {
    symbol: symbol,
    action: "SELL",
    type: "market",
    parameters: orderParams, // 'SELL', 1, 9999,
    size: 3,
    capital: 1000,
    exitTrade: true,
    exitParams: {
        entryTime: new Date(),
        entryPrice: 0,
        exitTime: new Date(),
        exitPrice: 0
    }
}

describe('Orders', () => {

    it('Place Order', async () => {

        let results = null;

        const getPlacedOrder = () => new Promise((resolve, reject) => {
            const handleData = (data) => {
                ibkrEvents.off(IBKREVENTS.ORDER_FILLED, handleData);
                resolve(data)
            };
            ibkrEvents.on(IBKREVENTS.ORDER_FILLED, handleData);
        });

        if (await onConnected()) {

            await orderTrade.placeOrder(stockOrderBuyIn);
            results = await getPlacedOrder();

        }
        expect(results).to.be.not.null;

    });
})


