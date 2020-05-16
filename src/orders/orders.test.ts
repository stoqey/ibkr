import 'mocha';
import { expect } from 'chai';
import { Orders } from './Orders';
import { OrderStock, OrderWithContract, OrderStatus } from './orders.interfaces';
import { IbkrEvents, IBKREVENTS } from '../events';
import ibkr from '..';

const ibkrEvents = IbkrEvents.Instance;


const symbolX = "PECK";
const symbolY = "ACHC"; // portfolio
const orderParams = [1]

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

        const results = await openOrders.getOpenOrders();
        console.log('Open orders are', results && results.length)

        expect(results).to.be.not.null;

    });


    it('Place Order', (done) => {

        const getPlacedOrder = async () => {
            const handleData = (data) => {
                ibkrEvents.off(IBKREVENTS.ORDER_FILLED, handleData);
                done()
            };
            ibkrEvents.on(IBKREVENTS.ORDER_FILLED, handleData);


            ibkrEvents.on(IBKREVENTS.ORDER_STATUS, (data: { order: OrderWithContract, orderStatus: OrderStatus }) => {

                const { order, orderStatus } = data;

                if (['PreSubmitted', 'Filled', 'Submitted'].includes(orderStatus.status)) {
                    console.log('filled')
                    done();
                }

            });
            Orders.Instance.getOpenOrders();
        };

        const orderTrade = Orders.Instance;


        orderTrade.placeOrder(stockOrderBuyInY);
        orderTrade.placeOrder(stockOrderBuyInX).then(o => {
            orderTrade.placeOrder(stockOrderBuyInX);
            orderTrade.placeOrder(stockOrderBuyInY);
        });

        getPlacedOrder();

        // expect(results).to.be.not.null;

    });
})


