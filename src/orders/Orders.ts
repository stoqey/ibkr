import chalk from 'chalk';
import random from 'lodash/random';
import IB from '@stoqey/ib';
import isEmpty from 'lodash/isEmpty';
import { getRadomReqId } from '../_utils/text.utils';
import { ORDER, OrderState, CreateSale, OrderWithContract, OrderStatus } from './orders.interfaces';

import { publishDataToTopic, IbkrEvents, IBKREVENTS } from '../events';
import IBKRConnection from '../connection/IBKRConnection';
import { OrderStock } from './orders.interfaces';

import { Portfolios } from '../portfolios';
import { onConnected } from '../connection';
import { log } from '../log';

const ibkrEvents = IbkrEvents.Instance;


// Place Order + Cancel Order
// Get Filled open orders


interface SymbolTickerOrder {
    tickerId: number;
    orderPermId: number; // for reference when closing it
    symbol: string;
    stockOrderRequest: OrderStock
}

export class Orders {

    ib: IB = null;

    // StockOrders
    tickerId = 0;
    stockOrders: OrderStock[] = [];
    symbolsTickerOrder: { [x: string]: SymbolTickerOrder } = {}

    // NEW
    validOrderIds: { [x: number]: OrderStock } = {}

    orderIdNext: number = null;

    // OPEN ORDERS
    public openOrders: { [x: string]: OrderWithContract } = {};
    public receivedOrders: boolean = false;

    private static _instance: Orders;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const self = this;

        // only when connected createSale
        ibkrEvents.on(IBKREVENTS.CONNECTED, async (sale: CreateSale) => {
            self.init();
        });

        ibkrEvents.emit(IBKREVENTS.PING); // ping connection
    }

    /**
     * init
     */
    public init = async (): Promise<void> => {
        let self = this;

        if (!self.ib) {
            const ib = IBKRConnection.Instance.getIBKR();
            self.ib = ib;


            ib.on('openOrderEnd', () => {
                log(`Orders > init > openOrderEnd`, chalk.blue(` ->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`));
                // Initialise OrderTrader
                // OrderTrade.Instance.init();

                const openOrders = Object.keys(self.openOrders).map(key => self.openOrders[key]);

                publishDataToTopic({
                    topic: IBKREVENTS.OPEN_ORDERS,
                    data: openOrders,
                });

            })

            ib.on('orderStatus', (id, status, filled, remaining, avgFillPrice, permId,
                parentId, lastFillPrice, clientId, whyHeld) => {

                const currentOrder = self.openOrders[id];

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

                // log(chalk.black(`Orders > orderStatus`), {
                //     id,
                //     status,
                //     filled,
                //     remaining,
                //     symbol: currentOrder && currentOrder.symbol
                // })
            });

            ib.on('openOrder', function (orderId, contract, order: ORDER, orderState: OrderState) {
                console.log(`Order> openOrder`, chalk.red(` -> ${contract.symbol} ${order.action} ${order.totalQuantity}  ${orderState.status}`));


                // 1. Update OpenOrders
                // Orders that need to be filled
                // -----------------------------------------------------------------------------------
                self.receivedOrders = true;

                let openOrders = self.openOrders;

                self.openOrders = {
                    ...openOrders,
                    [orderId]: {
                        ...(openOrders && openOrders[orderId] || null),

                        // OrderId + orderState
                        orderId,
                        orderState,

                        // Add order
                        ...order,
                        // Add contract
                        ...contract
                    }
                };
                //  Delete order from openOrders list
                if (orderState.status === "Filled") {
                    log(chalk.black(`Filled -----> DELETE FROM OPEN ORDERS -------> ${JSON.stringify(contract)}`))
                    delete self.openOrders[orderId];
                }

                const openOrdersArr = Object.keys(self.openOrders).map(key => self.openOrders[key]);
                log(chalk.black(`OPEN ORDERS ${openOrdersArr && openOrdersArr.length}`))
                // -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                // -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


                // 2. Update OrderStocks
                // Orders requests to send to transmit
                // Using ticker Ids
                // -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                const allTickerOrder: SymbolTickerOrder[] = Object.keys(self.symbolsTickerOrder).map(key => self.symbolsTickerOrder[key]);

                const thisOrderTicker = allTickerOrder.find(tickerOrder => tickerOrder.tickerId === orderId);

                // Add permId to orderTickObject
                if (!isEmpty(thisOrderTicker)) {

                    // update this symbolTickerOrder
                    self.symbolsTickerOrder[thisOrderTicker.symbol] = {
                        ...(self.symbolsTickerOrder[thisOrderTicker.symbol] || null),
                        orderPermId: order.permId,
                        symbol: thisOrderTicker.symbol
                    };

                    const updatedSymbolTicker = self.symbolsTickerOrder[thisOrderTicker.symbol];

                    // create sale if order is filled
                    if (orderState.status === "Filled") {
                        // Order is filled we can record it
                        // Check if we can create new trade
                        // on if stockOrderRequest is present
                        // that.symbolsTickerOrder[thisOrderTicker.symbol]
                        if (!isEmpty(updatedSymbolTicker.stockOrderRequest)) {

                            const { stockOrderRequest } = updatedSymbolTicker;
                            const { exitTrade, exitParams, symbol, capital } = stockOrderRequest;

                            const dataSaleSymbolOrder: OrderWithContract = {
                                ...order,
                                ...contract,
                                orderState,
                                orderId
                            }

                            if (exitTrade) {
                                const { exitPrice, exitTime, entryTime, entryPrice } = exitParams;
                                // If this trade is for exiting then record the sale
                                // create sale now
                                const newSale: CreateSale = {
                                    capital,
                                    exitPrice,
                                    exitTime,
                                    entryTime,
                                    entryPrice,
                                    symbol,
                                    profit: entryPrice - exitPrice
                                };

                                console.log(`AccountOrderStock.openOrder`, chalk.green(`FILLED, TO CREATE SALE -> ${contract.symbol} ${order.action} ${order.totalQuantity}  ${orderState.status}`));

                                return publishDataToTopic({
                                    topic: IBKREVENTS.ORDER_FILLED,
                                    data: { sale: newSale, order: dataSaleSymbolOrder }
                                })
                            }

                            console.log(`AccountOrderStock.openOrder`, chalk.green(`FILLED, but no sale created -> ${contract.symbol} ${order.action} ${order.totalQuantity}  ${orderState.status}`));

                            publishDataToTopic({
                                topic: IBKREVENTS.ORDER_FILLED,
                                data: { sale: null, order: dataSaleSymbolOrder }
                            })

                        }
                    }


                }




            });

            ib.on('nextValidId', (orderIdNext: number) => {

                const tickerToUse = orderIdNext++;

                const currentOrders = self.stockOrders;

                if (isEmpty(currentOrders)) {
                    return console.log(chalk.red(`Stock Orders are empty`));
                }

                // get order by it's tickerId
                const stockOrder = self.stockOrders.shift();

                // Save ticker
                self.validOrderIds[tickerToUse] = stockOrder;

                if (isEmpty(stockOrder)) {
                    return console.log(chalk.red(`First Stock Orders Item is empty`));
                }

                const { symbol } = stockOrder;

                console.log(chalk.yellow(`Placing order for ... tickerToUse=${tickerToUse} orderIdNext=${orderIdNext} tickerId=${self.tickerId} ${symbol}`));

                // [symbol, reqId]
                const orderCommand: Function = ib.order[stockOrder.type];

                const args = stockOrder.parameters;

                if (isEmpty(args)) {
                    return Promise.reject(new Error(`Arguments cannot be null`))
                }

                // Just save tickerId and stockOrder
                self.symbolsTickerOrder[symbol] = {
                    ...(self.symbolsTickerOrder[symbol] || null),
                    tickerId: tickerToUse,
                    symbol,
                    stockOrderRequest: stockOrder // for reference when closing trade
                };

                // Place order
                ib.placeOrder(tickerToUse, ib.contract.stock(stockOrder.symbol), orderCommand(stockOrder.action, ...args));

                // Set the new orderId

                // If orderIdNext === 1
                // If orderIdNext > 
                // self.tickerId = orderIdNext;

                // Delete this from valid orders
                // delete self.validOrderIds[orderIdNext];

                self.orderIdNext = tickerToUse;
                ib.reqAllOpenOrders(); // refresh orders

            });


            // placeOrder event
            ibkrEvents.on(IBKREVENTS.PLACE_ORDER, async ({ stockOrder }: { stockOrder: OrderStock }) => {
                return await self.placeOrder(stockOrder);
            })
        }

        return self.reqAllOpenOrders();
    }

    /**
     *  reqAllOpenOrders
     */
    private reqAllOpenOrders = (): void => {

        const that = this;

        setTimeout(() => {
            if (that.ib) {
                console.log(`Orders > reqAllOpenOrders `)
                that.ib.reqAllOpenOrders();
            }
        }, 1000)

    }

    public getOpenOrders = async (): Promise<OrderWithContract[]> => {

        const self = this;
        const reqAllOpenOrders = self.reqAllOpenOrders;

        const openOrders = self && self.openOrders || null;

        return new Promise((resolve, reject) => {

            // listen for account summary
            const handleOpenOrders = (ordersData) => {
                ibkrEvents.off(IBKREVENTS.OPEN_ORDERS, handleOpenOrders);
                resolve(ordersData);
            }

            if (!isEmpty(openOrders)) {
                const allopenOrders = Object.keys(openOrders).map(key => openOrders[key])
                return resolve(allopenOrders)
            }

            ibkrEvents.on(IBKREVENTS.OPEN_ORDERS, handleOpenOrders);
            reqAllOpenOrders(); // refresh orders
        })
    }

    public isActive = (): boolean => {
        return this.receivedOrders;
    }

    public placeOrder = async (stockOrder: OrderStock): Promise<any> => {

        let self = this;
        const checkExistingOrders = self.stockOrders;

        const { exitTrade } = stockOrder;
        console.log(chalk.magentaBright(`Place Order Request -> ${stockOrder.symbol.toLocaleUpperCase()} ${stockOrder.action} ${stockOrder.parameters[0]}`))

        if (isEmpty(stockOrder.symbol)) {
            return Promise.reject(new Error("Please enter order"))
        }

        // TODO check if stock exist
        // const allOrders = self.stockOrders;


        console.log(chalk.blue(`Existing orders are -> ${checkExistingOrders.map(i => i.symbol)}`))

        // 1. Check existing open orders
        if (!isEmpty(checkExistingOrders)) {
            // check if we have the same order from here

            const findMatchingAction = checkExistingOrders.filter(
                exi =>
                    exi.action === stockOrder.action &&
                    exi.symbol === stockOrder.symbol
            );

            if (!isEmpty(findMatchingAction)) {
                return console.log(chalk.red(`Order already exist for ${stockOrder.action}, ${findMatchingAction[0].symbol} ->  @${stockOrder.parameters[0]}`))
            }
        }

        const checkExistingPositions = await Portfolios.Instance.getPortfolios();
        console.log(chalk.blue(`Existing portfolios -> ${JSON.stringify(checkExistingPositions.map(i => i.symbol))}`));

        // 2. Check existing portfolios
        const foundExistingPortfolios = !isEmpty(checkExistingPositions) ? checkExistingPositions.filter(
            exi => exi.symbol === stockOrder.symbol) : [];

        console.log(chalk.blue(`foundExistingPortfolios -> ${JSON.stringify(foundExistingPortfolios.map(i => i.symbol))}`));


        if (!isEmpty(foundExistingPortfolios)) {

            // Only if this is not exit
            if (!exitTrade) {
                return console.log(chalk.red(`*********************** Portfolio already exist and has position for ${stockOrder.action}, order=${JSON.stringify(foundExistingPortfolios.map(i => i.symbol))}`))
            }
            // Else existing trades are allowed
        }

        self.tickerId = self.tickerId + 1;

        self.stockOrders.push(stockOrder);

        // self.ib.reqIds(self.tickerId);

        console.log(chalk.green(`Order > placeOrder -> tickerId=${self.tickerId} symbol=${stockOrder.symbol}`))
        return ({ tickerId: self.tickerId })

    }
}

export default Orders;