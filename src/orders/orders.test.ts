import 'mocha';
import {expect} from 'chai';
import {Orders} from './Orders';
import {OrderStock, OrderWithContract, OrderStatus} from './orders.interfaces';
import {IbkrEvents, IBKREVENTS} from '../events';
import ibkr from '..';
import {log} from '../log';

const ibkrEvents = IbkrEvents.Instance;

const symbol = 'TSLA';
const symbolX = 'PECK';
const symbolY = 'ACHC'; // portfolio
const orderParams = [1];

const stockOrderBuyInZ: OrderStock = {
    symbol: symbol,
    action: 'BUY',
    type: 'market',
    parameters: orderParams, // 'SELL', 1, 9999,
    size: 3,
    capital: 1000,
    exitTrade: false,
};

const stockOrderBuyInX: OrderStock = {
    symbol: symbolX,
    action: 'BUY',
    type: 'market',
    parameters: orderParams, // 'SELL', 1, 9999,
    size: 3,
    capital: 1000,
    exitTrade: false,
};

const stockOrderBuyInY: OrderStock = {
    symbol: symbolY,
    action: 'BUY',
    type: 'market',
    parameters: orderParams, // 'SELL', 1, 9999,
    size: 3,
    capital: 1000,
    exitTrade: false,
};

function delay(t: number): Promise<any> {
    return new Promise(function (resolve) {
        setTimeout(resolve.bind(null, {d: true}), t);
    });
}

before((done) => {
    ibkr().then((started) => {
        if (started) {
            return done();
        }
        done(new Error('error starting ibkr'));
    });
});

describe('Orders', () => {
    it('should get open orders', async () => {
        const OrdersManager = Orders.Instance;

        log('connected now, placing order now');
        const results = await OrdersManager.getOpenOrders();

        log('Open orders are', JSON.stringify(results));

        for (const res of results) {
            OrdersManager.cancelOrder(res.orderId);
            await delay(1000);
        };
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

            await Orders.Instance.getOpenOrders();

            const delayTime = 1000;

            const opt = { unique: true };

            const orders = [
                async () => orderTrade.placeOrder(stockOrderBuyInZ, opt),
                async () => delay(delayTime),
                async () => orderTrade.placeOrder(stockOrderBuyInZ, opt),
                async () => delay(delayTime),
                async () => orderTrade.placeOrder(stockOrderBuyInZ, opt),
                async () => delay(delayTime),
                async () => orderTrade.placeOrder(stockOrderBuyInY, opt),
                async () => delay(delayTime),
                async () => orderTrade.placeOrder(stockOrderBuyInY, opt),
                async () => delay(delayTime),
                async () => orderTrade.placeOrder(stockOrderBuyInY, opt),
                async () => delay(delayTime),
                async () => orderTrade.placeOrder(stockOrderBuyInX, opt),
                async () => delay(delayTime),
                async () => orderTrade.placeOrder(stockOrderBuyInX, opt),
                async () => delay(delayTime),
                async () => orderTrade.placeOrder(stockOrderBuyInX, opt),
                async () => delay(delayTime),
                async () => orderTrade.placeOrder(stockOrderBuyInX, opt),
                async () => delay(delayTime),
                async () => orderTrade.placeOrder(stockOrderBuyInY, opt)
            ];

            for (const order of orders) {
                await order();
            }
        };

        getPlacedOrder();

    });
});
