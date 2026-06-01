import 'mocha';
import { expect } from 'chai';
import { of } from 'rxjs';
import { OrderStatus } from '@stoqey/ib';
import Orders from './Orders';
import Portfolios from '../portfolios/Portfolios';
import { IBKREvents, IBKREVENTS } from '../events';

const buildOpenOrder = (permId: number, status: OrderStatus, contract = {
    conId: permId,
    symbol: 'NQ',
    secType: 'FUT',
    exchange: 'CME',
}) => ({
    contract,
    order: {
        permId,
        orderId: permId,
        action: 'BUY',
        totalQuantity: 1,
        orderType: 'MKT',
    },
    orderState: {
        status,
    },
    orderStatus: {
        status,
        avgFillPrice: 0,
    },
});

describe('IBKR Orders active order cache', () => {
    const originalContracts = process.env.IBKR_CONTRACTS;
    const originalOrderContracts = process.env.IBKR_CONTRACTS_ORDERS;
    const portfolios = Portfolios.Instance as any;
    const originalPortfolioInit = portfolios.init;
    const ibkrEvents = IBKREvents.Instance;

    beforeEach(() => {
        const orders = Orders.Instance as any;
        orders.openOrders = new Map();
        orders.cancelledOrders = new Map();
        orders.completedTrades = new Map();
        orders.openOrderQueue = [];
        ibkrEvents.removeAllListeners(IBKREVENTS.IBKR_OPEN_ORDERS_UPDATED);
        ibkrEvents.removeAllListeners(IBKREVENTS.IBKR_COMPLETED_TRADES_UPDATED);
        portfolios.init = () => undefined;
        delete process.env.IBKR_CONTRACTS;
        delete process.env.IBKR_CONTRACTS_ORDERS;
    });

    after(() => {
        portfolios.init = originalPortfolioInit;
        if (originalContracts === undefined) {
            delete process.env.IBKR_CONTRACTS;
        } else {
            process.env.IBKR_CONTRACTS = originalContracts;
        }
        if (originalOrderContracts === undefined) {
            delete process.env.IBKR_CONTRACTS_ORDERS;
        } else {
            process.env.IBKR_CONTRACTS_ORDERS = originalOrderContracts;
        }
        ibkrEvents.removeAllListeners(IBKREVENTS.IBKR_OPEN_ORDERS_UPDATED);
        ibkrEvents.removeAllListeners(IBKREVENTS.IBKR_COMPLETED_TRADES_UPDATED);
    });

    it('should remove inactive orders from active orders', async () => {
        const orders = Orders.Instance as any;
        const inactiveOrder = buildOpenOrder(1001, OrderStatus.Inactive);

        orders.openOrders.set(1001, buildOpenOrder(1001, OrderStatus.Submitted));
        orders.openOrderQueue.push(inactiveOrder);

        await orders.processOrderQueue();

        expect(orders.orders).to.deep.equal([]);
        expect(orders.openOrders.has(1001)).to.equal(false);
    });

    it('should return the processed active cache from open order snapshots', async () => {
        const orders = Orders.Instance as any;
        orders.ib = {
            getOpenOrders: () => of({
                all: [
                    buildOpenOrder(1001, OrderStatus.Inactive),
                    buildOpenOrder(1002, OrderStatus.Submitted),
                ],
            }),
        };

        const activeOrders = await orders.asyncOpenOrders();

        expect(activeOrders.map((order) => order.order.permId)).to.deep.equal([1002]);
    });

    it('should ignore orders outside IBKR_CONTRACTS', async () => {
        process.env.IBKR_CONTRACTS = 'NQ-FUT';
        const orders = Orders.Instance as any;
        const esFuture = {
            conId: 2001,
            symbol: 'ES',
            secType: 'FUT',
            exchange: 'CME',
        };

        orders.openOrderQueue.push(buildOpenOrder(1001, OrderStatus.Submitted));
        orders.openOrderQueue.push(buildOpenOrder(2001, OrderStatus.Submitted, esFuture));

        await orders.processOrderQueue();

        expect(orders.orders.map((order) => order.contract.symbol)).to.deep.equal(['NQ']);
    });

    it('should emit open orders updated after processing the queue', async () => {
        const orders = Orders.Instance as any;
        let eventPayload: { updatedAt: number };
        let observedOrderIds: number[];

        ibkrEvents.once(IBKREVENTS.IBKR_OPEN_ORDERS_UPDATED, (payload) => {
            eventPayload = payload;
            observedOrderIds = orders.orders.map((order) => order.order.permId);
        });

        orders.openOrderQueue.push(buildOpenOrder(1001, OrderStatus.Submitted));
        await orders.processOrderQueue();

        expect(eventPayload.updatedAt).to.be.a('number');
        expect(observedOrderIds).to.deep.equal([1001]);
    });

    it('should emit completed trades updated after adding a filled trade', async () => {
        const orders = Orders.Instance as any;
        let eventPayload: { updatedAt: number };
        let observedTradeIds: string[];
        let eventCount = 0;

        const listener = (payload) => {
            eventCount += 1;
            eventPayload = payload;
            observedTradeIds = orders.trades.map((trade) => trade.id);
        };

        ibkrEvents.on(IBKREVENTS.IBKR_COMPLETED_TRADES_UPDATED, listener);
        orders.openOrders.set(1001, buildOpenOrder(1001, OrderStatus.Submitted));
        orders.openOrderQueue.push(buildOpenOrder(1001, OrderStatus.Filled));
        orders.openOrderQueue.push(buildOpenOrder(1001, OrderStatus.Filled));

        await orders.processOrderQueue();
        ibkrEvents.removeListener(IBKREVENTS.IBKR_COMPLETED_TRADES_UPDATED, listener);

        expect(eventCount).to.equal(1);
        expect(eventPayload.updatedAt).to.be.a('number');
        expect(observedTradeIds).to.deep.equal(['1001']);
        expect(orders.orders).to.deep.equal([]);
    });
});
