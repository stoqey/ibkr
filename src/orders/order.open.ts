import chalk from 'chalk';
import IbConnection from "../ibConnection";
import { ContractObject } from '../contract/interface.contract';
import { ORDER, OrderState } from './order.interfaces';
import { AppEvents } from '../servers/app.EventEmitter';
import { publishDataToTopic } from '../servers/MQ.Publishers';
import OrderDB, { OrderDatabase } from '../database/order.db';
import isEmpty from 'lodash/isEmpty';

const ib = IbConnection.Instance.getIBKR();

const appEvents = AppEvents.Instance;

// TODO
// Place Order + Cancel Order
// Get All open orders
// Buy/Sell stock
// Close order



interface OpenOrders {
    orderId?: number
    contract: ContractObject;
    order: ORDER;
    orderState: OrderState;
}


export default class AccountOpenOrders {

    receivedOrders: boolean = false;

    public orders: { [x: string]: OpenOrders } = {};

    private static _instance: AccountOpenOrders;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        let that = this;

        // .on('openOrder', function (orderId, contract, order, orderState))
        // .on('openOrderEnd', function ())
        // .on('orderStatus', function (id, status, filled, remaining, avgFillPrice, permId, parentId, lastFillPrice, clientId, whyHeld))

        ib.on('openOrder', function (orderId, contract, order: ORDER, orderState: OrderState) {
            console.log(`AccountOpenOrders.openOrder`,chalk.red(` -> ${contract.symbol} ${order.action} ${order.totalQuantity}  ${orderState.status}`));

            that.receivedOrders = true;

            that.orders = {
                ...that.orders,
                [orderId]: {
                    ...(that.orders && that.orders[orderId] || null),
                    orderId,
                    order,
                    orderState,
                    contract
                }
            };

            console.log(chalk.black(`OPEN ORDERS ${Object.keys(that.orders)}`))
        });

        ib.on('orderStatus', (id, status, filled, remaining, avgFillPrice, permId,
            parentId, lastFillPrice, clientId, whyHeld) => {

            publishDataToTopic({
                topic: 'saveOrder', //push to topic below,
                data: {
                    status, filled, remaining, avgFillPrice, permId,
                    parentId, lastFillPrice, clientId, whyHeld
                }
            });
        });

        appEvents.on('saveOrder', async ({
            status, filled, remaining,
            avgFillPrice, permId,
            parentId, lastFillPrice,
            clientId, whyHeld
        }) => {

            // TODO Save Order here if filled
            const orderDb = new OrderDB();

            const orderTosave: OrderDatabase = {
                name: `${permId}`,
                status,
                filled,
                remaining,
                avgFillPrice,
                permId,
                parentId,
                lastFillPrice,
                clientId,
                whyHeld
            };

            const savedOrder = await orderDb.add(orderTosave);

            if (!isEmpty(savedOrder && savedOrder.id)) {
                console.log(`saveOrder:success`, chalk.dim(`${JSON.stringify(savedOrder)}`))
            }
            else {
                console.log(`saveOrder:fail`, chalk.dim(`${JSON.stringify(savedOrder || orderTosave)}`))
            }
        });

        
        setTimeout(() => {
            console.log(`AccountOpenOrders.getOpenOrders`, chalk.black(`reqAllOpenOrders`))
            // ib.placeOrder(1, ib.contract.stock('MREO'), ib.order.market('BUY', 1));
            ib.reqAllOpenOrders();
        }, 2000);

    }

    getOpenOrders(): OpenOrders[] {

        setTimeout(() => {
            console.log(`AccountOpenOrders.getOpenOrders`, chalk.black(`reqAllOpenOrders`))
            ib.reqAllOpenOrders();
        }, 2000)


        const openOrders = Object.keys(this.orders).map(key => this.orders[key])
        return openOrders;
    }

    isActive(): boolean {
        return this.receivedOrders;
    }
}