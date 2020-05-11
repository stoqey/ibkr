import chalk from 'chalk';
import random from 'lodash/random';
import isEmpty from 'lodash/isEmpty';
import { getRadomReqId } from '../_utils/text.utils';
import { ORDER, OrderState, CreateSale, OrderWithContract } from './orders.interfaces';
import AccountOpenOrders from './OpenOrders';

import { publishDataToTopic, IbkrEvents, IBKREVENTS } from '../events';
import IBKRConnection from '../connection/IBKRConnection';
import { OrderStock } from './orders.interfaces';
import OpenOrders from './OpenOrders';
import { Portfolios } from '../portfolios';
import { onConnected } from '../connection';

const ibkrEvents = IbkrEvents.Instance;

// Place Order + Cancel Order
// Get Filled open orders


interface SymbolTickerOrder {
    tickerId: number;
    orderPermId: number; // for reference when closing it
    symbol: string;
    stockOrderRequest: OrderStock
}

export class OrderTrade {

    ib: any;
    tickerId = getRadomReqId();

    symbolsTickerOrder: { [x: string]: SymbolTickerOrder } = {}

    orders: OrderStock[] = [];

    private static _instance: OrderTrade;

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
    public init() {
        if (!this.ib) {
            const ib = IBKRConnection.Instance.getIBKR();
            this.ib = ib;
            let that = this;

            ib.on('openOrder', function (orderId, contract, order: ORDER, orderState: OrderState) {
                console.log(`OrderTrade > init > openOrder`, chalk.red(` -> ${contract.symbol} ${order.action} ${order.totalQuantity}  ${orderState.status}`));

                const allTickerOrder: SymbolTickerOrder[] = Object.keys(that.symbolsTickerOrder).map(key => that.symbolsTickerOrder[key]);

                const thisOrderTicker = allTickerOrder.find(tickerOrder => tickerOrder.tickerId === orderId);

                // Add permId to orderTickObject
                if (!isEmpty(thisOrderTicker)) {

                    // update this symbolTickerOrder
                    that.symbolsTickerOrder[thisOrderTicker.symbol] = {
                        ...(that.symbolsTickerOrder[thisOrderTicker.symbol] || null),
                        orderPermId: order.permId,
                        symbol: thisOrderTicker.symbol
                    };

                    const updatedSymbolTicker = that.symbolsTickerOrder[thisOrderTicker.symbol];

                    // create sale if order is filled
                    if (orderState.status === "Filled") {
                        // Order is filled we can record it
                        // Check if we can create new trade
                        // on if stockOrderRequest is present
                        // that.symbolsTickerOrder[thisOrderTicker.symbol]
                        if (!isEmpty(updatedSymbolTicker.stockOrderRequest)) {

                            const { stockOrderRequest } = updatedSymbolTicker;
                            const { exitTrade, exitParams, symbol, capital } = stockOrderRequest;

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

                                const dataSaleSymbolOrder: OrderWithContract = {
                                    ...order,
                                    ...contract,
                                    orderState,
                                    orderId
                                }
                                publishDataToTopic({
                                    topic: IBKREVENTS.ORDER_FILLED,
                                    data: { sale: newSale, order: dataSaleSymbolOrder }
                                })
                            }
                            else {
                                console.log(`AccountOrderStock.openOrder`, chalk.green(`FILLED, but no sale created -> ${contract.symbol} ${order.action} ${order.totalQuantity}  ${orderState.status}`));
                            }

                        }
                    }


                }




            });

            ib.on('nextValidId', (orderIdNext: number) => {

                that.tickerId = orderIdNext++;

                const currentOrders = this.orders;

                if (isEmpty(currentOrders)) {
                    return console.log(chalk.red(`Stock Orders are empty`));
                }

                // get first in the list
                const stockOrder = this.orders.shift();

                if (isEmpty(stockOrder)) {
                    return console.log(chalk.red(`First Stock Orders Item is empty`));
                }

                const tickerToUse = that.tickerId;
                const { symbol } = stockOrder;

                console.log(chalk.yellow(`Placing order for ... ${tickerToUse} ${symbol}`));

                // [symbol, reqId]
                const orderCommand: Function = ib.order[stockOrder.type];

                const args = stockOrder.parameters;

                if (isEmpty(args)) {
                    return Promise.reject(new Error(`Arguments cannot be null`))
                }

                // Just save tickerId and stockOrder
                that.symbolsTickerOrder[symbol] = {
                    ...(that.symbolsTickerOrder[symbol] || null),
                    tickerId: tickerToUse,
                    symbol,
                    stockOrderRequest: stockOrder // for reference when closing trade
                };

                setTimeout(() => {
                    // Place order
                    ib.placeOrder(that.tickerId, ib.contract.stock(stockOrder.symbol), orderCommand(stockOrder.action, ...args));

                    // request open orders
                    ib.reqAllOpenOrders(); // refresh orders

                    console.log(chalk.yellow(`nextValidId > placedOrder -> ${that.tickerId}`))
                }, 1000);


            });


            // placeOrder event
            ibkrEvents.on(IBKREVENTS.PLACE_ORDER, async ({ stockOrder }: { stockOrder: OrderStock }) => {
                return await that.placeOrder(stockOrder);
            })
        }
    }

    async placeOrder(stockOrder: OrderStock): Promise<any> {

        let that = this;

        return new Promise((resolve, reject) => {
            const { exitTrade } = stockOrder;

            async function placeOrderToIBKR() {
                console.log(chalk.magentaBright(`Place Order Request -> ${stockOrder.symbol.toLocaleUpperCase()} ${stockOrder.action} ${stockOrder.parameters[0]}`))

                if (isEmpty(stockOrder.symbol)) {
                    return Promise.reject(new Error("Please enter order"))
                }

                // TODO check if stock exist
                const checkExistingOrders = await OpenOrders.Instance.getOpenOrders();

                console.log(chalk.blue(`Existing orders are -> ${checkExistingOrders.map(i => i.symbol)}`))

                // 1. Check existing open orders
                if (!isEmpty(checkExistingOrders)) {
                    // check if we have the same order from here

                    const findMatchingAction = checkExistingOrders.filter(
                        exi => exi.action === stockOrder.action
                            && exi.symbol === stockOrder.symbol);

                    if (!isEmpty(findMatchingAction)) {
                        return console.log(chalk.red(`Order already exist for ${stockOrder.action}, ${findMatchingAction[0].symbol} ->  @${stockOrder.parameters[0]} ${findMatchingAction[0].orderState.status}`))
                    }
                }

                const checkExistingPositions = await Portfolios.Instance.getPortfolios();
                console.log(chalk.blue(`Existing portfolios are -> ${JSON.stringify(checkExistingPositions.map(i => i.symbol))}`));

                // 2. Check existing portfolios
                const foundExistingPortfolios = checkExistingPositions.filter(
                    exi => exi.symbol === stockOrder.symbol);

                console.log(chalk.blue(`foundExistingPortfolios are -> ${JSON.stringify(foundExistingPortfolios.map(i => i.symbol))}`));

                if (!isEmpty(checkExistingPositions)) {

                    // Only if this is not exit
                    if (!isEmpty(foundExistingPortfolios)) {

                        if (!exitTrade) {
                            return console.log(chalk.red(`*********************************Portfolio already exist and has position for ${stockOrder.action}, ${foundExistingPortfolios[0].symbol} ->  order@${stockOrder.parameters[0]} portfolio@${foundExistingPortfolios[0].position}`))
                        }
                        // Else existing trades are allowed
                    }

                }

                that.orders.push(stockOrder);

                that.ib.reqIds(that.tickerId);

                setTimeout(() => {
                    console.log(chalk.red(`OrderTrade > placeOrder -> tickerId ${that.tickerId}`))
                    resolve({ tickerId: that.tickerId })
                }, 1000);

            }

            placeOrderToIBKR();


        })

    }
}

export default OrderTrade;