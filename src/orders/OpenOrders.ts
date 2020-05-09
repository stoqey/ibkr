import chalk from 'chalk';
import { ContractObject } from '../contracts/contracts.interfaces';
import { ORDER, OrderState, OrderWithContract, OrderStatus } from './orders.interfaces';
import { IbkrEvents, IBKREVENTS, publishDataToTopic } from '../events';
import { log } from '../log';
import IBKRConnection from '../connection/IBKRConnection';
// import { OrderTrade } from './OrderTrade';
import isEmpty from 'lodash/isEmpty';

const appEvents = IbkrEvents.Instance;


export default class OpenOrders {

    ib: any;

    receivedOrders: boolean = false;

    public orders: { [x: string]: OrderWithContract } = {};

    private static _instance: OpenOrders;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() { }

    public init() {
        let self = this;
        self.ib = IBKRConnection.Instance.getIBKR();

        const ib = self.ib;

        ib.on('openOrderEnd', () => {
            log(`OpenOrders > init > openOrderEnd`, chalk.blue(` ->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`));
            // Initialise OrderTrader
            // OrderTrade.Instance.init();

            const openOrders = Object.keys(self.orders).map(key => self.orders[key]);

            publishDataToTopic({
                topic: IBKREVENTS.OPEN_ORDERS,
                data: openOrders,
            });

        })

        ib.on('openOrder', function (orderId, contract: ContractObject, order: ORDER, orderState: OrderState) {
            log(`OpenOrders > init > openOrder`, chalk.red(` -> ${contract.symbol} ${order.action} ${order.totalQuantity}  ${orderState.status}`));

            self.receivedOrders = true;

            let orders = self.orders;

            self.orders = {
                ...orders,
                [orderId]: {
                    ...(orders && orders[orderId] || null),

                    // OrderId + orderState
                    orderId,
                    orderState,

                    // Add order
                    ...order,
                    // Add contract
                    ...contract
                }
            };

            const openOrders = Object.keys(self.orders).map(key => self.orders[key]);
            log(chalk.black(`OPEN ORDERS ${openOrders && openOrders.length}`))
        });

        ib.on('orderStatus', (id, status, filled, remaining, avgFillPrice, permId,
            parentId, lastFillPrice, clientId, whyHeld) => {

            const currentOrder = self.orders[id];

            const orderStatus: OrderStatus = {
                status, filled, remaining, avgFillPrice, permId,
                parentId, lastFillPrice, clientId, whyHeld
            }

            publishDataToTopic({
                topic: IBKREVENTS.ORDER_STATUS, //push to topic below,
                data: {
                    order: currentOrder,
                    orderStatus
                }
            });

            log(chalk.black(`OpenOrders > init > orderStatus`), {
                id,
                status,
                filled,
                remaining,
                symbol: currentOrder && currentOrder.symbol
            })
        });

        self.reqAllOpenOrders();

    }

    /**
     *  reqAllOpenOrders
     */
    public reqAllOpenOrders = () => {
        console.log(`OpenOrders > reqAllOpenOrders `)
        this.ib.reqAllOpenOrders();
    }

    async getOpenOrders(): Promise<OrderWithContract[]> {

        const { orders, reqAllOpenOrders } = this;

        return new Promise((resolve, reject) => {
            // listen for account summary
            const handleOpenOrders = (ordersData) => {
                appEvents.off(IBKREVENTS.OPEN_ORDERS, handleOpenOrders);
                resolve(ordersData);
            }

            if (!isEmpty(orders)) {
                const openOrders = Object.keys(orders).map(key => orders[key])
                return resolve(openOrders);
            }

            appEvents.on(IBKREVENTS.OPEN_ORDERS, handleOpenOrders);
            reqAllOpenOrders(); // refresh orders
        })
    }

    isActive(): boolean {
        return this.receivedOrders;
    }
}