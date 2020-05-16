import 'mocha';
import { expect } from 'chai';
import { Orders } from './Orders';
import { onConnected } from '../connection/connection.utilities';
import { OrderStock, OrderWithContract, OrderStatus, OrderStatusType } from './orders.interfaces';
import { IbkrEvents, IBKREVENTS } from '../events';
import ibkr from '..';

const ibkrEvents = IbkrEvents.Instance;

const fsPromises = require('fs').promises

let demoSymbolData;

const symbol = "TSLA";
const symbolX = "PECK";
const symbolY = "ACHC"; // portfolio
const orderParams = [1]

const stockOrderBuyIn: OrderStock = {
    symbol: symbol,
    action: "BUY",
    type: "market",
    parameters: orderParams, // 'SELL', 1, 9999,
    size: 3,
    capital: 1000,
    exitTrade: false
}

const stockOrderBuyInX: OrderStock = {
    symbol: symbolX,
    action: "BUY",
    type: "market",
    parameters: orderParams, // 'SELL', 1, 9999,
    size: 3,
    capital: 1000,
    exitTrade: false
}

const stockOrderBuyInY: OrderStock = {
    symbol: symbolY,
    action: "SELL",
    type: "market",
    parameters: orderParams, // 'SELL', 1, 9999,
    size: 3,
    capital: 1000,
    exitTrade: false
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

        const results = await openOrders.getOpenOrders();
        console.log('Open orders are', results && results.length)

        expect(results).to.be.not.null;

    });


    it('Place Order', (done) => {

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
                    console.log('filled')
                    resolve(data);
                }

            });
            Orders.Instance.getOpenOrders();
        });

        const orderTrade = Orders.Instance;

        // orderTrade.placeOrder(stockOrderBuyIn);
        orderTrade.placeOrder(stockOrderBuyInX);
        orderTrade.placeOrder(stockOrderBuyInX);
        orderTrade.placeOrder(stockOrderBuyInX);
        // orderTrade.placeOrder(stockOrderBuyIn);
        // orderTrade.placeOrder(stockOrderBuyIn);
        // orderTrade.placeOrder(stockOrderBuyInY);
        // orderTrade.placeOrder(stockOrderBuyInY);
        // orderTrade.placeOrder(stockOrderBuyInY);
        // setTimeout(() => {
        //     orderTrade.placeOrder(stockOrderBuyIn);
        //     orderTrade.placeOrder(stockOrderBuyInX);
        //     orderTrade.placeOrder(stockOrderBuyInY);
        // }, 9000)
        // setTimeout(() => {
        //     orderTrade.placeOrder(stockOrderBuyIn);
        //     orderTrade.placeOrder(stockOrderBuyInX);
        //     orderTrade.placeOrder(stockOrderBuyInY);
        // }, 5000)


        getPlacedOrder();

        // expect(results).to.be.not.null;

    });
})


