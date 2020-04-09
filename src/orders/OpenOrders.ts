import chalk from 'chalk';
import { ContractObject } from '../contracts/contracts.interfaces';
import { ORDER, OrderState } from './orders.interfaces';
import { AppEvents, APPEVENTS, publishDataToTopic } from '../events';
import { log } from '../log';
import IBKRConnection from '../connection/IBKRConnection';

const ib = IBKRConnection.Instance.getIBKR();

const appEvents = AppEvents.Instance;


export default class OpenOrders {

    receivedOrders: boolean = false;

    public orders: { [x: string]: OpenOrders } = {};

    private static _instance: OpenOrders;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        let that = this;

        // .on('openOrder', function (orderId, contract, order, orderState))
        // .on('openOrderEnd', function ())
        // .on('orderStatus', function (id, status, filled, remaining, avgFillPrice, permId, parentId, lastFillPrice, clientId, whyHeld))

        ib.on('openOrder', function (orderId, contract, order: ORDER, orderState: OrderState) {
            log(`AccountOpenOrders.openOrder`,chalk.red(` -> ${contract.symbol} ${order.action} ${order.totalQuantity}  ${orderState.status}`));

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

            log(chalk.black(`OPEN ORDERS ${Object.keys(that.orders)}`))
        });

        ib.on('orderStatus', (id, status, filled, remaining, avgFillPrice, permId,
            parentId, lastFillPrice, clientId, whyHeld) => {

            publishDataToTopic({
                topic: APPEVENTS.SAVE_ORDER, //push to topic below,
                data: {
                    status, filled, remaining, avgFillPrice, permId,
                    parentId, lastFillPrice, clientId, whyHeld
                }
            });
        });

        appEvents.on(APPEVENTS.GET_OPEN_ORDERS, () => {
            log(`AccountOpenOrders.getOpenOrders`, chalk.black(`reqAllOpenOrders`))
            ib.reqAllOpenOrders();
        })

        
        setTimeout(() => {
            console.log(`AccountOpenOrders.getOpenOrders init`, chalk.black(`reqAllOpenOrders`))
            // ib.placeOrder(1, ib.contract.stock('MREO'), ib.order.market('BUY', 1));
            ib.reqAllOpenOrders();
        }, 500);

    }

    getOpenOrders(): OpenOrders[] {
        appEvents.emit(APPEVENTS.GET_OPEN_ORDERS, { data: true })
        const openOrders = Object.keys(this.orders).map(key => this.orders[key])
        return openOrders;
    }

    isActive(): boolean {
        return this.receivedOrders;
    }
}