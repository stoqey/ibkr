import 'mocha';
import { expect } from 'chai';
import { Orders } from './Orders';
import { onConnected } from '../connection/connection.utilities';
import { OrderStock, OrderWithContract, OrderStatus, OrderStatusType } from './orders.interfaces';
import { IbkrEvents, IBKREVENTS } from '../events';
import ibkr from '..';
import { log } from '../log';


const ibkrEvents = IbkrEvents.Instance;

const fsPromises = require('fs').promises

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

before((done) => {
    ibkr().then(started => {
        if (started) {
            return done();
        }
        done(new Error('error starting ibkr'))

    })
})

describe('Orders', () => {

    it('should get open orders', async () => {

        const openOrders = Orders.Instance;

        log('connected now, placing order now');
        const results = await openOrders.getOpenOrders();
        log('Open orders are', results && results.length)

        expect(results).to.be.not.null;

    });


    it('Place Order', async () => {

        let results = null;

        const getPlacedOrder = () => new Promise((resolve, reject) => {
            const handleData = (data) => {
                ibkrEvents.off(IBKREVENTS.ORDER_FILLED, handleData);
                resolve(data)
            };
            ibkrEvents.on(IBKREVENTS.ORDER_FILLED, handleData);


            ibkrEvents.on(IBKREVENTS.ORDER_STATUS, (data: { order: OrderWithContract, orderStatus: OrderStatus }) => {

                const { order, orderStatus } = data;

                if (['PreSubmitted', 'Filled', 'Submitted'].includes(orderStatus.status)) {
                    resolve(data);
                }

            });
        });

        const orderTrade = Orders.Instance;

        await orderTrade.placeOrder(stockOrderBuyIn);

        results = await getPlacedOrder();

        expect(results).to.be.not.null;

    });
})


