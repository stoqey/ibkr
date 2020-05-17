import 'mocha';
import { expect } from 'chai';
import { Orders } from './Orders';
import { OrderStock, OrderWithContract, OrderStatus } from './orders.interfaces';
import { IbkrEvents, IBKREVENTS } from '../events';
import ibkr from '..';
import { log } from '../log';


const ibkrEvents = IbkrEvents.Instance;


const symbol = "TSLA";
const symbolX = "PECK";
const symbolY = "ACHC"; // portfolio
const orderParams = [1]

const stockOrderBuyInZ: OrderStock = {
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
    action: "BUY",
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

        log('connected now, placing order now');
        const results = await openOrders.getOpenOrders();
        log('Open orders are', results && results.length)

        expect(results).to.be.not.null;

    });


    it('Place Order', (done) => {

        let completed = false;
        const orderTrade = Orders.Instance;

        const getPlacedOrder = async () => {
            const handleData = (data) => {
                ibkrEvents.off(IBKREVENTS.ORDER_FILLED, handleData);
                if (!completed) {
                    done()
                    completed = true;
                }
            };
            // ibkrEvents.on(IBKREVENTS.ORDER_FILLED, handleData);


            // ibkrEvents.on(IBKREVENTS.ORDER_STATUS, (data: { order: OrderWithContract, orderStatus: OrderStatus }) => {

            //     const { order, orderStatus } = data;

            //     if (['PreSubmitted', 'Filled', 'Submitted'].includes(orderStatus.status)) {
            //         console.log('filled')
            //         if (!completed) {
            //             done()
            //             completed = true;
            //         }
            //     }

            // });
            Orders.Instance.getOpenOrders();

            const orders = [
                orderTrade.placeOrder(stockOrderBuyInZ),
                orderTrade.placeOrder(stockOrderBuyInZ),
                orderTrade.placeOrder(stockOrderBuyInZ),
                orderTrade.placeOrder(stockOrderBuyInY),
                orderTrade.placeOrder(stockOrderBuyInY),
                orderTrade.placeOrder(stockOrderBuyInY),
                orderTrade.placeOrder(stockOrderBuyInX),
                orderTrade.placeOrder(stockOrderBuyInX),
                orderTrade.placeOrder(stockOrderBuyInX),
                orderTrade.placeOrder(stockOrderBuyInX),
                orderTrade.placeOrder(stockOrderBuyInY)
            ];

            for (const order of orders) {
                await order;
            }
        };

        getPlacedOrder();

    });
})


