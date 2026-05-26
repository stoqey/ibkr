import 'mocha';
import { expect } from 'chai';
import { of } from 'rxjs';
import { OrderStatus } from '@stoqey/ib';
import Orders from './Orders';
import Portfolios from '../portfolios/Portfolios';

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

    beforeEach(() => {
        const orders = Orders.Instance as any;
        orders.openOrders = new Map();
        orders.cancelledOrders = new Map();
        orders.completedTrades = new Map();
        orders.openOrderQueue = [];
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
});
